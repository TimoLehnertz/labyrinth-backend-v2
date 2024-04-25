import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Friendship } from './users/friends/entities/friendship.entity';
import { FriendRequest } from './users/friends/entities/friendRequest.entity';
import { GameModule } from './game/game.module';
import { PlayerPlaysGame } from 'game/entities/PlayerPlaysGame.entity';
import { Game } from 'game/entities/game.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env1',
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST', 'localhost'),
          port: configService.get<number>('DATABASE_PORT', 5433),
          username: configService.get<string>('DATABASE_USER', 'postgres'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_SCHEMA'),
          entities: [User, Friendship, FriendRequest, PlayerPlaysGame, Game],
          retryAttempts: 2,
          // synchronize: true, ??
        };
      },
    }),
    UsersModule,
    AuthModule,
    GameModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
