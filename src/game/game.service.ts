import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import {
  BoardPosition,
  buildMoveGenerator,
  GameSetup,
  Game as LabyrinthGame,
  manhattanEvaluator,
  Move,
  MoveGenerator,
  printBoard,
  ShiftPosition,
  Treasure,
} from 'labyrinth-game-logic';
import { Game, GameVisibility } from './entities/game.entity';
import { Not, Repository } from 'typeorm';
import { BotType, PlayerPlaysGame } from './entities/PlayerPlaysGame.entity';
import { UsersService } from 'users/users.service';
import { FriendsService } from 'users/friends/friends.service';
import { BoardPositionDto, MoveDto, ShiftPositionDto } from './dto/move.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateGameDto } from './dto/update-game.dto';

export enum CreateGameError {
  INVALID_SETUP = 'invalid setup',
}

export enum AddUserToGameError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  ALREADY_PLAYING = 'already playing',
  USER_DOES_NOT_EXIST = 'user does not exist',
  GAME_ALREADY_STARTED = 'game has already started',
  GAME_FULL = 'game full',
}

export enum MoveError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  INVALID_MOVE = 'invalid move',
  GAME_NOT_STARTED = 'the game did not start yet',
}

export enum StartGameError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  NO_PERMISSION = 'no permission',
}

export enum MakeAdminError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  NO_PERMISSION = 'no permission',
}

export type MoveListener = (gameID: string, move: Move) => void;

export enum UpdateGameError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  INVALID_SETUP = 'invalid setup',
  NO_PERMISSION = 'no permission',
  GAME_ALREADY_STARTED = 'game has already started',
  GAME_INVALID_PLAYER_COUNT = 'cant reduce player count',
}

export enum RemoveGamePlayerError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  NO_PERMISSION = 'no permission',
  GAME_ALREADY_STARTED = 'game has already started',
}

export enum SetReadyError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  GAME_ALREADY_STARTED = 'game has already started',
}

export enum AddBotError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  NO_PERMISSION = 'no permission',
  GAME_ALREADY_STARTED = 'game has already started',
  GAME_FULL = 'game full',
}

@Injectable()
export class GameService {
  private moveListeners: MoveListener[] = [];

  constructor(
    @InjectRepository(Game) private gameRepository: Repository<Game>,
    @InjectRepository(PlayerPlaysGame)
    private playerPlaysGameRepository: Repository<PlayerPlaysGame>,
    private usersService: UsersService,
    private friendsService: FriendsService,
  ) {}

  addMoveListener(moveListener: MoveListener) {
    this.moveListeners.push(moveListener);
  }

  removeMoveListener(moveListener: MoveListener) {
    const index = this.moveListeners.indexOf(moveListener);
    if (index !== -1) {
      this.moveListeners.splice(index, 1);
    }
  }

  private gameSetupByDto(createGameDto: CreateGameDto): GameSetup {
    try {
      return LabyrinthGame.finalizeSetup(createGameDto.gameSetup);
    } catch (e) {
      throw new BadRequestException(CreateGameError.INVALID_SETUP);
    }
  }

  async create(ownerUser: string, createGameDto: CreateGameDto): Promise<Game> {
    let game: LabyrinthGame;
    try {
      game = LabyrinthGame.buildFromSetup(createGameDto.gameSetup);
    } catch (e) {
      throw new BadRequestException(CreateGameError.INVALID_SETUP);
    }
    const setup = this.gameSetupByDto(createGameDto);

    const dbGame = this.gameRepository.create({
      gameState: game.stringify(),
      gameSetup: JSON.stringify(setup),
      startTime: new Date(),
      ownerUserID: ownerUser,
      visibility: createGameDto.visibility,
      finished: false,
      started: false,
    });
    await this.gameRepository.insert(dbGame);
    await this.addUserToGame(ownerUser, dbGame.id);
    return dbGame;
  }

  private async startGame(gameID: string) {
    const game = await this.findOne(gameID);
    if (game === null) {
      throw new BadRequestException(StartGameError.GAME_DOES_NOT_EXIST);
    }
    // fix player indices
    const players = await this.findGamePlayers(gameID);
    const gameSetup: GameSetup = JSON.parse(game.gameSetup);
    gameSetup.playerCount = players.length;
    game.gameState = LabyrinthGame.buildFromSetup(gameSetup).stringify();
    game.started = true;
    await this.gameRepository.update({ id: game.id }, game);
    const firstPlayer = await this.findGamePlayerToMove(gameID);
    if (firstPlayer !== null && firstPlayer.botType !== null) {
      setTimeout(() => {
        this.playBot(firstPlayer, gameID);
      }, 3000);
    }
  }

  findGamePlayers(gameID: string): Promise<PlayerPlaysGame[]> {
    return this.playerPlaysGameRepository.find({
      where: {
        gameID: gameID,
      },
      relations: {
        user: true,
      },
      order: {
        playerIndex: 'ASC',
      },
    });
  }

  async setReady(userID: string, gameID: string, ready: boolean) {
    const game = await this.findOne(gameID);
    if (game === null) {
      throw new BadRequestException(SetReadyError.GAME_DOES_NOT_EXIST);
    }
    if (game.started) {
      throw new BadRequestException(SetReadyError.GAME_ALREADY_STARTED);
    }
    const playerPlaysGame = await this.playerPlaysGameRepository.findOne({
      where: {
        gameID,
        userID,
      },
    });
    if (playerPlaysGame === null) {
      return;
    }
    playerPlaysGame.ready = ready;
    await this.playerPlaysGameRepository.update(
      { id: playerPlaysGame.id },
      playerPlaysGame,
    );
    const players = await this.findGamePlayers(gameID);
    if (players.length < 2) {
      return; // not enough to start
    }
    for (const player of players) {
      if (!player.ready) {
        return; // not ready
      }
    }
    await this.startGame(gameID);
  }

  async removeGamePlayer(
    executeUserID: string,
    gameID: string,
    playerIndex: number,
  ) {
    const game = await this.gameRepository.findOne({
      where: {
        id: gameID,
      },
    });
    if (game === null) {
      throw new BadRequestException(RemoveGamePlayerError.GAME_DOES_NOT_EXIST);
    }
    if (game.started) {
      throw new BadRequestException(RemoveGamePlayerError.GAME_ALREADY_STARTED);
    }
    const removePlayer = await this.playerPlaysGameRepository.findOne({
      where: {
        gameID: gameID,
        playerIndex,
      },
    });
    if (removePlayer === null) {
      throw new BadRequestException(RemoveGamePlayerError.NO_PERMISSION);
    }
    const hasPermission =
      executeUserID === removePlayer.userID ||
      executeUserID === game.ownerUserID;
    if (!hasPermission) {
      throw new BadRequestException(RemoveGamePlayerError.NO_PERMISSION);
    }
    if (removePlayer.userID === game.ownerUserID) {
      const players = await this.findGamePlayers(gameID);
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (
          player.userID === null ||
          player.user === null ||
          player.userID === removePlayer.userID
        ) {
          continue;
        }
        game.ownerUserID = player.userID;
        await this.gameRepository.update({ id: game.id }, game);
      }
    }
    await this.playerPlaysGameRepository.remove(removePlayer);
    // fix player indices
    let allPlayersReady = true;
    const players = await this.findGamePlayers(gameID);
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (player.playerIndex !== i) {
        player.playerIndex = i;
        await this.playerPlaysGameRepository.update({ id: player.id }, player);
      }
      if (!player.ready) {
        allPlayersReady = false;
      }
    }
    if (allPlayersReady && players.length >= 2) {
      await this.startGame(gameID);
    }
  }

  async makeAdmin(initiatorID: string, newAdminID: string, gameID: string) {
    const game = await this.gameRepository.findOneBy({
      id: gameID,
    });
    if (game === null) {
      throw new BadRequestException(MakeAdminError.GAME_DOES_NOT_EXIST);
    }
    if (initiatorID !== game.ownerUserID) {
      throw new BadRequestException(MakeAdminError.NO_PERMISSION);
    }
    const user = await this.usersService.findById(newAdminID);
    if (user === null) {
      throw new BadRequestException(MakeAdminError.NO_PERMISSION);
    }
    game.ownerUserID = newAdminID;
    await this.gameRepository.update({ id: gameID }, game);
  }

  async findOwnGames(userID: string): Promise<Game[]> {
    const players = await this.playerPlaysGameRepository.findBy({
      userID,
    });
    const games: Game[] = await this.gameRepository.findBy({
      ownerUserID: userID,
    });
    for (const player of players) {
      const game = await this.findOne(player.gameID);
      if (game !== null && game.ownerUserID !== userID) {
        games.push(game);
      }
    }
    return games.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async addUserToGame(userID: string, gameID: string) {
    const user = await this.usersService.findById(userID);
    if (user === null) {
      throw new BadRequestException(AddUserToGameError.USER_DOES_NOT_EXIST);
    }
    const game = await this.findOne(gameID);
    if (game === null) {
      throw new BadRequestException(AddUserToGameError.GAME_DOES_NOT_EXIST);
    }
    if (game.started) {
      throw new BadRequestException(AddUserToGameError.GAME_ALREADY_STARTED);
    }

    const playerExists = await this.playerPlaysGameRepository.exists({
      where: {
        gameID,
        userID,
      },
    });
    if (playerExists) {
      throw new BadRequestException(AddUserToGameError.ALREADY_PLAYING);
    }
    const maxPlayerCount = JSON.parse(game.gameSetup).playerCount;
    const existingPlayers = await this.findGamePlayers(gameID);
    if (existingPlayers.length >= maxPlayerCount) {
      throw new BadRequestException(AddUserToGameError.GAME_FULL);
    }
    const playerIndex = existingPlayers.length;
    const userPlaysGame = this.playerPlaysGameRepository.create({
      botType: null,
      gameID,
      playerIndex,
      ready: false,
      userID,
    });
    await this.playerPlaysGameRepository.insert(userPlaysGame);
  }

  public async addBot(userID: string, gameID: string, botType: BotType) {
    const game = await this.findOne(gameID);
    if (game === null) {
      throw new BadRequestException(AddBotError.GAME_DOES_NOT_EXIST);
    }
    if (game.ownerUserID !== userID) {
      throw new BadRequestException(AddBotError.NO_PERMISSION);
    }
    if (game.started) {
      throw new BadRequestException(AddBotError.GAME_ALREADY_STARTED);
    }
    const maxPlayerCount = JSON.parse(game.gameSetup).playerCount;
    const existingPlayers = await this.findGamePlayers(gameID);
    if (existingPlayers.length >= maxPlayerCount) {
      throw new BadRequestException(AddBotError.GAME_FULL);
    }
    const playerIndex = existingPlayers.length;

    const gamePlayer = this.playerPlaysGameRepository.create({
      gameID,
      playerIndex,
      botType,
      ready: true, // bots are always ready
    });
    await this.playerPlaysGameRepository.insert(gamePlayer);
  }

  private static shiftPositionFromDTO(
    shiftPositionDto: ShiftPositionDto,
  ): ShiftPosition {
    return new ShiftPosition(shiftPositionDto.heading, shiftPositionDto.index);
  }

  private static boardPositionFromDTO(
    boardPosition: BoardPositionDto,
  ): BoardPosition {
    return new BoardPosition(boardPosition.x, boardPosition.y);
  }

  private static treasureFromDTO(index: number | null): Treasure | null {
    if (index === null) {
      return null;
    }
    return new Treasure(index);
  }

  private static moveFromDto(moveDto: MoveDto): Move {
    return new Move(
      moveDto.playerIndex,
      moveDto.rotateBeforeShift,
      GameService.shiftPositionFromDTO(moveDto.fromShiftPosition),
      GameService.shiftPositionFromDTO(moveDto.toShiftPosition),
      GameService.boardPositionFromDTO(moveDto.from),
      GameService.boardPositionFromDTO(moveDto.to),
      GameService.treasureFromDTO(moveDto.collectedTreasure),
    );
  }

  public async playBot(gamePlayer: PlayerPlaysGame, gameID: string) {
    const dbGame = await this.findOne(gameID);
    if (dbGame === null) {
      throw new BadRequestException('game does not exist');
    }
    if (!dbGame.started) {
      throw new BadRequestException('game not yet started');
    }
    if (dbGame.finished) {
      throw new BadRequestException('game is finished');
    }
    let generator: MoveGenerator;
    // @todo add other bots
    switch (gamePlayer.botType) {
      default:
        generator = buildMoveGenerator(manhattanEvaluator);
        break;
    }
    const game = LabyrinthGame.buildFromString(dbGame.gameState);
    const move = generator(game.gameState);
    await this.move(gameID, move, null);
  }

  async findGamePlayerToMove(gameID: string): Promise<PlayerPlaysGame | null> {
    const dbGame = await this.findOne(gameID);
    if (dbGame === null) {
      return null;
    }
    const game = LabyrinthGame.buildFromString(dbGame.gameState);
    const playerIndex = game.gameState.allPlayerStates.playerIndexToMove;
    const gamePlayer = await this.playerPlaysGameRepository.findOneBy({
      gameID,
      playerIndex,
    });
    if (gamePlayer === null) {
      return null;
    }
    return gamePlayer;
  }

  async move(
    gameID: string,
    move: MoveDto | Move,
    userID: string | null,
    botDelay: number = 500,
  ) {
    if (!(move instanceof Move)) {
      move = GameService.moveFromDto(move);
    }

    const gamePlayer = await this.findGamePlayerToMove(gameID);
    if (gamePlayer === null) {
      throw new BadRequestException(MoveError.GAME_DOES_NOT_EXIST);
    }
    if (userID !== gamePlayer.userID) {
      throw new BadRequestException(MoveError.INVALID_MOVE);
    }
    if (gamePlayer.playerIndex !== move.playerIndex) {
      throw new BadRequestException(MoveError.INVALID_MOVE);
    }
    const dbGame = await this.gameRepository.findOne({
      where: {
        id: gameID,
      },
    });
    if (dbGame === null) {
      throw new BadRequestException(MoveError.GAME_DOES_NOT_EXIST);
    }
    if (!dbGame.started) {
      throw new BadRequestException(MoveError.GAME_NOT_STARTED);
    }
    const game = LabyrinthGame.buildFromString(dbGame.gameState);
    try {
      game.move(move);
    } catch (e) {
      console.log('invalid move', e);
      console.log(move);
      const newBoard = game.gameState.board
        .setShiftPosition(move.toShiftPosition)
        .rotateLooseTile(move.rotateBeforeShift)
        .insertLooseTile();
      printBoard(newBoard);
      console.log(newBoard.getTile(new BoardPosition(1, 0)).rotation);
      console.log(game.gameState.board.looseTile.rotation);
      throw new BadRequestException(MoveError.INVALID_MOVE);
    }
    const winnerIndex = game.gameState.getWinnerIndex();
    if (winnerIndex !== null) {
      dbGame.finished = true;
      const gamePlayers = await this.playerPlaysGameRepository.findBy({
        gameID,
      });
      for (const gamePlayer of gamePlayers) {
        const isWinner = gamePlayer.playerIndex === winnerIndex;
        if (gamePlayer.userID !== null) {
          await this.usersService.userFinishedGame(gamePlayer.userID, isWinner);
        }
        gamePlayer.gameFinished = true;
        gamePlayer.isWinner = isWinner;
        await this.playerPlaysGameRepository.update(
          { id: gamePlayer.id },
          gamePlayer,
        );
      }
    }
    dbGame.gameState = game.stringify();
    await this.gameRepository.update({ id: dbGame.id }, dbGame);
    for (const moveListener of this.moveListeners) {
      moveListener(dbGame.id, move);
    }
    if (winnerIndex === null) {
      const nextPlayer = await this.findGamePlayerToMove(gameID);
      if (nextPlayer !== null) {
        if (nextPlayer.botType !== null) {
          // inline for testability
          if (botDelay === 0) {
            this.playBot(nextPlayer, gameID);
          } else {
            setTimeout(() => {
              this.playBot(nextPlayer, gameID);
            }, botDelay);
          }
        }
      }
    }
  }

  async findAvailableToJoin(forUserID: string): Promise<Game[]> {
    // public games
    let games: Game[] = await this.gameRepository.find({
      where: {
        visibility: GameVisibility.PUBLIC,
        ownerUserID: Not(forUserID),
        started: false,
      },
      relations: {
        ownerUser: true,
      },
    });
    // games by friends
    const friends = await this.friendsService.findFriends(forUserID);
    for (const friend of friends) {
      const friendID = friend.getFriendID(forUserID);
      const friendGames = await this.gameRepository.find({
        where: {
          started: false,
          ownerUserID: friendID,
          visibility: GameVisibility.FRIENDS,
        },
        relations: {
          ownerUser: true,
        },
      });
      games = games.concat(friendGames);
    }
    return games;
  }

  findByUser(ownerUserID: string): Promise<Game[]> {
    return this.gameRepository.find({
      where: {
        ownerUserID,
      },
    });
  }

  findOne(id: string): Promise<Game | null> {
    return this.gameRepository.findOne({
      where: {
        id,
      },
      relations: {
        ownerUser: true,
      },
    });
  }

  async update(userID: string, updateGameDto: UpdateGameDto) {
    const game = await this.findOne(updateGameDto.id);
    if (game === null) {
      throw new BadRequestException(UpdateGameError.GAME_DOES_NOT_EXIST);
    }
    if (userID !== game.ownerUserID) {
      throw new BadRequestException(UpdateGameError.NO_PERMISSION);
    }
    if (game.started) {
      throw new BadRequestException(UpdateGameError.GAME_ALREADY_STARTED);
    }
    const playerCount = await this.playerPlaysGameRepository.countBy({
      gameID: game.id,
    });
    const newSetup = this.gameSetupByDto(updateGameDto);
    if (playerCount > newSetup.playerCount) {
      throw new BadRequestException(UpdateGameError.GAME_INVALID_PLAYER_COUNT);
    }

    game.gameSetup = JSON.stringify(newSetup);
    game.visibility = updateGameDto.visibility;
    if (
      updateGameDto.ownerID !== undefined &&
      game.ownerUserID !== updateGameDto.ownerID
    ) {
      const user = await this.usersService.findById(updateGameDto.ownerID);
      if (user === null) {
        throw new BadRequestException(UpdateGameError.NO_PERMISSION);
      }
      game.ownerUserID = user.id;
      game.ownerUser = user;
    }
    await this.gameRepository.update({ id: game.id }, game);
    const players = await this.findGamePlayers(updateGameDto.id);
    for (const player of players) {
      if (player.botType === null) {
        player.ready = false;
        await this.playerPlaysGameRepository.update({ id: player.id }, player);
      }
    }
  }
}
