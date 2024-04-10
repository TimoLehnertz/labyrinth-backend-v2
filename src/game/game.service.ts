import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import {
  BoardPosition,
  Game as LabyrinthGame,
  Move,
  ShiftPosition,
} from 'labyrinth-game-logic';
import { Game, GameVisibility } from './entities/game.entity';
import { Not, Repository } from 'typeorm';
import { BotType, UserPlaysGame } from './entities/UserPlaysGame.entity';
import { UsersService } from 'users/users.service';
import { FriendsService } from 'users/friends/friends.service';
import { MoveDto } from './dto/move.dto';
import { InjectRepository } from '@nestjs/typeorm';

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
  NOT_PERMISSION = 'no permission',
}

export type MoveListener = (gameID: string, move: Move) => void;

@Injectable()
export class GameService {
  private moveListeners: MoveListener[] = [];

  constructor(
    @InjectRepository(Game) private gameRepository: Repository<Game>,
    @InjectRepository(UserPlaysGame)
    private userPlaysGameRepository: Repository<UserPlaysGame>,
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

  async create(ownerUser: string, createGameDto: CreateGameDto) {
    let game: LabyrinthGame;
    try {
      game = LabyrinthGame.buildFromSetup(createGameDto.gameSetup);
    } catch (e) {
      throw new BadRequestException(CreateGameError.INVALID_SETUP);
    }

    const dbGame = this.gameRepository.create({
      gameState: game.stringify(),
      gameSetup: JSON.stringify(createGameDto),
      startTime: new Date(),
      ownerUserID: ownerUser,
      visibility: createGameDto.visibility,
      finished: false,
      started: false,
    });
    await this.gameRepository.insert(dbGame);
    await this.addUserToGame(ownerUser, dbGame.id);
  }

  async startGame(byUserID: string, gameID: string) {
    const game = await this.findOne(gameID);
    if (game === null) {
      throw new BadRequestException(StartGameError.GAME_DOES_NOT_EXIST);
    }
    if (game.ownerUserID !== byUserID) {
      throw new BadRequestException(StartGameError.NOT_PERMISSION);
    }
    game.started = true;
    await this.gameRepository.update({ id: game.id }, game);
  }

  findGamePlayers(gameID: string): Promise<UserPlaysGame[]> {
    return this.userPlaysGameRepository.find({
      where: {
        gameID,
      },
      relations: {
        user: true,
      },
    });
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
    for (const existingPlayer of existingPlayers) {
      if (existingPlayer.id === userID) {
        throw new BadRequestException(AddUserToGameError.ALREADY_PLAYING);
      }
    }
    const userPlaysGame = this.userPlaysGameRepository.create({
      botType: BotType.PLAYER,
      gameID,
      playerIndex: existingPlayers.length,
      ready: false,
      userID,
    });
    await this.userPlaysGameRepository.insert(userPlaysGame);
  }

  async move(userID: string, gameID: string, moveDto: MoveDto) {
    const gamePlayer = await this.userPlaysGameRepository.findOne({
      where: {
        gameID,
        userID,
      },
    });
    if (gamePlayer === null) {
      throw new BadRequestException(MoveError.GAME_DOES_NOT_EXIST);
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
    const shiftPosition = new ShiftPosition(
      moveDto.shiftPosition.shiftHeading,
      moveDto.shiftPosition.index,
    );
    if (!shiftPosition) {
      throw new BadRequestException(MoveError.INVALID_MOVE);
    }
    const currentTreasure = game.gameState.allPlayerStates.getPlayerState(
      gamePlayer.playerIndex,
    ).currentTreasure;
    if (currentTreasure?.id !== moveDto.collectedTreasure) {
      throw new BadRequestException(MoveError.INVALID_MOVE);
    }
    const move = new Move(
      gamePlayer.playerIndex,
      moveDto.rotateBeforeShift,
      shiftPosition,
      new BoardPosition(moveDto.from.x, moveDto.from.y),
      new BoardPosition(moveDto.to.x, moveDto.to.y),
      currentTreasure,
    );
    const moveWasValid = game.move(move);
    if (!moveWasValid) {
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
}
