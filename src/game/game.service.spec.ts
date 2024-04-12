import { Test } from '@nestjs/testing';
import { CreateGameError, GameService, UpdateGameError } from './game.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { setupTestDataSource } from 'test-utils/testPosgres';
import { DataSource } from 'typeorm';
import { User } from 'users/entities/user.entity';
import { FriendsService } from 'users/friends/friends.service';
import { UsersService } from 'users/users.service';
import { Game, GameVisibility } from './entities/game.entity';
import { PlayerPlaysGame } from './entities/PlayerPlaysGame.entity';
import {
  generateMoves,
  generateShiftPositions,
  Game as LabyrinthGame,
} from 'labyrinth-game-logic';
import { Friendship } from 'users/friends/entities/friendship.entity';
import { FriendRequest } from 'users/friends/entities/friendRequest.entity';
import { GameSetupDto } from './dto/create-game.dto';

describe('GameService', () => {
  let gameService: GameService;
  let usersService: UsersService;
  let friendsService: FriendsService;

  let max: User;
  let tom: User;

  let _dataSource: DataSource;

  beforeEach(async () => {
    const { forRoot, dataSource } = await setupTestDataSource();
    _dataSource = dataSource;
    const testingModule = await Test.createTestingModule({
      imports: [
        forRoot,
        TypeOrmModule.forFeature([
          Friendship,
          FriendRequest,
          Game,
          PlayerPlaysGame,
          User,
        ]),
      ],
      providers: [FriendsService, UsersService, GameService, FriendsService],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile();

    gameService = testingModule.get<GameService>(GameService);
    usersService = testingModule.get<UsersService>(UsersService);
    friendsService = testingModule.get<FriendsService>(FriendsService);

    gameService;
    await usersService.register({
      email: 'max@musterman.com',
      password: '12345678',
      username: 'max',
    });
    await usersService.register({
      email: 'tom@musterman.com',
      password: '12345678',
      username: 'tom',
    });
    const tom1 = await usersService.findByUsername('max');
    const max1 = await usersService.findByUsername('tom');
    if (tom1 && max1) {
      max = tom1;
      tom = max1;
    }
    max;
    tom;
  });

  afterEach(() => {
    _dataSource.destroy();
  });

  test('createGame', async () => {
    const defaultSetup = LabyrinthGame.getDefaultSetup();
    await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: defaultSetup,
    });
    const games = await gameService.findByUser(max.id);
    expect(games.length).toBe(1);
    await await gameService.addUserToGame(tom.id, games[0].id);
    const gamePlayers = await gameService.findGamePlayers(games[0].id);
    expect(gamePlayers.length).toBe(2);
    expect(gamePlayers[0].playerIndex).toBe(0);
    expect(gamePlayers[0].gameID).toBe(games[0].id);
    expect(gamePlayers[0].ready).toBe(false);
    expect(gamePlayers[0].userID).toBe(max.id);

    expect(gamePlayers[1].playerIndex).toBe(1);
    expect(gamePlayers[1].gameID).toBe(games[0].id);
    expect(gamePlayers[1].ready).toBe(false);
    expect(gamePlayers[1].userID).toBe(tom.id);
  });

  test('create invalid setup', async () => {
    const defaultSetup = LabyrinthGame.getDefaultSetup();
    defaultSetup.boardHeight = 123;
    try {
      await gameService.create(max.id, {
        visibility: GameVisibility.PUBLIC,
        gameSetup: defaultSetup,
      });
      fail('expected exception');
    } catch (e) {
      expect(e.message).toBe(CreateGameError.INVALID_SETUP);
    }
  });

  test('find public games to join', async () => {
    const defaultSetup = LabyrinthGame.getDefaultSetup();
    await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: defaultSetup,
    });
    let games = await gameService.findAvailableToJoin(tom.id);
    expect(games.length).toBe(1);
    games = await gameService.findAvailableToJoin(max.id);
    expect(games.length).toBe(0);
  });

  test('find friend games to join', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    await friendsService.addFriendRequest(tom.id, max.id);
    await gameService.create(max.id, {
      visibility: GameVisibility.FRIENDS,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    const games = await gameService.findAvailableToJoin(tom.id);
    expect(games.length).toBe(1);
  });

  test('findOne', async () => {
    await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    const games = await gameService.findAvailableToJoin(tom.id);
    expect(games.length).toBe(1);
    const game = await gameService.findOne(games[0].id);
    expect(game?.id).toBe(games[0].id);
  });

  test('startGame', async () => {
    await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    let games = await gameService.findAvailableToJoin(tom.id);
    expect(games.length).toBe(1);
    await gameService.startGame(max.id, games[0]!.id);
    games = await gameService.findAvailableToJoin(tom.id);
    expect(games.length).toBe(0);
  });

  test('move', async () => {
    await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    const games = await gameService.findAvailableToJoin(tom.id);
    expect(games.length).toBe(1);
    await gameService.startGame(max.id, games[0]!.id);
    const game = await gameService.findOne(games[0].id);
    expect(game?.id).toBe(games[0].id);
    const gameHelper = LabyrinthGame.buildFromString(game!.gameState);
    const shiftPositions = generateShiftPositions(gameHelper.gameState);
    const moves = generateMoves(gameHelper.gameState, shiftPositions[0], 0);
    await gameService.move(max.id, game!.id, moves[0]);
  });

  test('update OK', async () => {
    const dbGame = await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    await gameService.update(max.id, {
      id: dbGame.id,
      visibility: GameVisibility.PRIVATE,
      gameSetup: JSON.parse(dbGame.gameSetup),
    });
    const updatedGame = await gameService.findOne(dbGame.id);
    if (updatedGame === null) {
      fail();
    }
    expect(updatedGame.visibility).toBe(GameVisibility.PRIVATE);
  });

  test('update change ownership', async () => {
    const dbGame = await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    await gameService.update(max.id, {
      id: dbGame.id,
      visibility: GameVisibility.PUBLIC,
      ownerID: tom.id,
      gameSetup: JSON.parse(dbGame.gameSetup),
    });
    const updatedGame = await gameService.findOne(dbGame.id);
    if (updatedGame === null) {
      fail();
    }
    expect(updatedGame.ownerUserID).toBe(tom.id);

    try {
      await gameService.update(max.id, {
        id: dbGame.id,
        visibility: GameVisibility.PUBLIC,
        ownerID: tom.id,
        gameSetup: JSON.parse(dbGame.gameSetup),
      });
      fail();
    } catch (e) {
      expect(e.message).toBe(UpdateGameError.NO_PERMISSION);
    }
  });

  test('update game does not exist', async () => {
    const dbGame = await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    try {
      await gameService.update(max.id, {
        id: max.id,
        visibility: GameVisibility.PUBLIC,
        ownerID: tom.id,
        gameSetup: JSON.parse(dbGame.gameSetup),
      });
      fail();
    } catch (e) {
      expect(e.message).toBe(UpdateGameError.GAME_DOES_NOT_EXIST);
    }
  });

  test('update already started', async () => {
    const dbGame = await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    await gameService.startGame(max.id, dbGame.id);
    try {
      await gameService.update(max.id, {
        id: dbGame.id,
        visibility: GameVisibility.PUBLIC,
        ownerID: tom.id,
        gameSetup: JSON.parse(dbGame.gameSetup),
      });
      fail();
    } catch (e) {
      expect(e.message).toBe(UpdateGameError.GAME_ALREADY_STARTED);
    }
  });

  test('update invalid user', async () => {
    const dbGame = await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    try {
      await gameService.update(max.id, {
        id: dbGame.id,
        visibility: GameVisibility.PUBLIC,
        ownerID: dbGame.id, // invalid id
        gameSetup: JSON.parse(dbGame.gameSetup),
      });
      fail();
    } catch (e) {
      expect(e.message).toBe(UpdateGameError.NO_PERMISSION);
    }
  });

  test('update setup', async () => {
    const dbGame = await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    const newSetup: GameSetupDto = {
      boardHeight: 9,
      boardWidth: 7,
      cardsRatio: {
        lCards: 0,
        streightCards: 0,
        tCards: 0,
      },
      playerCount: 4,
      seed: 'seed123',
      treasureCardChances: {
        fixCardTreasureChance: 1,
        lCardTreasureChance: 1,
        streightCardTreasureChance: 1,
        tCardTreasureChance: 1,
      },
    };
    await gameService.update(max.id, {
      id: dbGame.id,
      visibility: GameVisibility.PUBLIC,
      gameSetup: newSetup,
    });
    const updatedGame = await gameService.findOne(dbGame.id);
    if (updatedGame === null) {
      fail();
    }
    const updatedSetup = JSON.parse(updatedGame.gameSetup);
    expect(updatedSetup.boardHeight).toBe(9);
  });

  test('kick player', async () => {
    const dbGame = await gameService.create(max.id, {
      visibility: GameVisibility.PUBLIC,
      gameSetup: LabyrinthGame.getDefaultSetup(),
    });
    let gamePlayers = await gameService.findGamePlayers(dbGame.id);
    expect(gamePlayers.length).toBe(1);
    await gameService.removeGamePlayer(max.id, dbGame.id, max.id);
    gamePlayers = await gameService.findGamePlayers(dbGame.id);
    expect(gamePlayers.length).toBe(0);
  });
});
