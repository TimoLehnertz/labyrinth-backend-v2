import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as fs from 'fs';
import { FriendRequest } from 'users/friends/entities/friendRequest.entity';
import { Friendship } from 'users/friends/entities/friendship.entity';
import { User } from 'users/entities/user.entity';
import { DynamicModule } from '@nestjs/common';
import { Game } from 'game/entities/game.entity';
import { PlayerPlaysGame } from 'game/entities/PlayerPlaysGame.entity';

export async function setupTestDataSource(): Promise<{
  forRoot: DynamicModule;
  dataSource: DataSource;
}> {
  const config: TypeOrmModuleOptions & DataSourceOptions = {
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'PredictIT',
    database: 'postgres',
    entities: [User, Friendship, FriendRequest, PlayerPlaysGame, Game],
  };
  const forRoot = TypeOrmModule.forRoot(config);

  const dataSource = new DataSource(config);

  await dataSource.initialize();

  const readSqlFile = (filepath: string): string[] => {
    return fs
      .readFileSync(filepath)
      .toString()
      .replace(/\r?\n|\r/g, '')
      .split(';')
      .filter((query) => query?.length);
  };

  const queries = readSqlFile('./src/sql/createDB.sql');

  for (let i = 0; i < queries.length; i++) {
    await dataSource.query(queries[i]);
  }
  // await dataSource.manager.query('DELETE FROM users;');
  // const usersRaw = await dataSource.manager.query('SELECT * from users;');
  // console.log('raw:', usersRaw);
  // const users = await dataSource.manager.find(User);
  // console.log(users);

  return { forRoot, dataSource };
}
