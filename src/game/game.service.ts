import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import {
  BoardPosition,
  GameSetup,
  Game as LabyrinthGame,
  Move,
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
}

export enum RemoveGamePlayerError {
  GAME_DOES_NOT_EXIST = 'game does not exist',
  NO_PERMISSION = 'no permission',
  GAME_ALREADY_STARTED = 'game has already started',
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

  async startGame(gameID: string) {
    const game = await this.findOne(gameID);
    if (game === null) {
      throw new BadRequestException(StartGameError.GAME_DOES_NOT_EXIST);
    }
    game.started = true;
    await this.gameRepository.update({ id: game.id }, game);
  }

  findGamePlayers(gameID: string): Promise<PlayerPlaysGame[]> {
    return this.playerPlaysGameRepository.find({
      where: {
        gameID: gameID,
      },
      relations: {
        user: true,
      },
    });
  }

  async setReady(userID: string, gameID: string, ready: boolean) {
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
      { id: userID },
      playerPlaysGame,
    );
    const players = await this.findGamePlayers(gameID);
    if (players.length < 2) {
      return; // not enough to start
    }
    for (const player of players) {
      if (!player.ready) {
      }
      return; // not ready
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
        console.log('updated owner: ', player.userID);
      }
    }
    await this.playerPlaysGameRepository.remove(removePlayer);
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

  async addUserToGame(userID: string, gameID: string) {
    const user = await this.usersService.findById(userID);
    if (user === null) {
      throw new BadRequestException(AddUserToGameError.USER_DOES_NOT_EXIST);
    }
    const game = await this.findOne(gameID);
    if (game === null) {
      throw new BadRequestException(AddUserToGameError.GAME_DOES_NOT_EXIST);
    }
    const existingPlayers = await this.findGamePlayers(game.id);
    let playerIndex = 0;
    while (true) {
      let found = false;
      for (const existingPlayer of existingPlayers) {
        if (existingPlayer.playerIndex === playerIndex) {
          playerIndex++;
          found = true;
          break;
        }
      }
      if (!found) {
        break;
      }
    }
    if (
      await this.playerPlaysGameRepository.exists({
        where: {
          gameID,
          userID,
        },
      })
    ) {
      throw new BadRequestException(AddUserToGameError.ALREADY_PLAYING);
    }
    const userPlaysGame = this.playerPlaysGameRepository.create({
      botType: BotType.PLAYER,
      gameID,
      playerIndex,
      ready: false,
      userID,
    });
    await this.playerPlaysGameRepository.insert(userPlaysGame);
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
      GameService.shiftPositionFromDTO(moveDto.shiftPosition),
      GameService.boardPositionFromDTO(moveDto.from),
      GameService.boardPositionFromDTO(moveDto.to),
      GameService.treasureFromDTO(moveDto.collectedTreasure),
    );
  }

  async move(userID: string, gameID: string, move: MoveDto | Move) {
    if (move instanceof MoveDto) {
      move = GameService.moveFromDto(move);
    }
    const gamePlayer = await this.playerPlaysGameRepository.findOne({
      where: {
        gameID,
        userID,
      },
    });
    if (gamePlayer === null) {
      throw new BadRequestException(MoveError.GAME_DOES_NOT_EXIST);
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
      throw new BadRequestException(MoveError.INVALID_MOVE);
    }
    dbGame.gameState = game.stringify();
    await this.gameRepository.update({ id: dbGame.id }, dbGame);
    for (const moveListener of this.moveListeners) {
      moveListener(dbGame.id, move);
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
    game.gameSetup = JSON.stringify(this.gameSetupByDto(updateGameDto));
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
      player.ready = false;
      await this.playerPlaysGameRepository.update({ id: player.id }, player);
    }
  }
}
