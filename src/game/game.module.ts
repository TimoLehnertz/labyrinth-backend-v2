import { Module } from '@nestjs/common';
import { GameService } from './game.service';
// import { GameGateway } from './game.gateway';
import { GameController } from './game.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from 'users/friends/entities/friendship.entity';
import { FriendRequest } from 'users/friends/entities/friendRequest.entity';
import { User } from 'users/entities/user.entity';
import { Game } from './entities/game.entity';
import { UserPlaysGame } from './entities/UserPlaysGame.entity';
import { UsersService } from 'users/users.service';
import { FriendsService } from 'users/friends/friends.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      Friendship,
      FriendRequest,
      User,
      UserPlaysGame,
    ]),
  ],
  providers: [UsersService, FriendsService, GameService, JwtService],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}
