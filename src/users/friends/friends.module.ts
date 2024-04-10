import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { FriendRequest } from './entities/friendRequest.entity';
import { UsersService } from '../users.service';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { FriendRequestSubscriber } from './friendRequest.subscriber';
import { FriendshipSubscriber } from './friendship.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, FriendRequest, User])],
  providers: [
    FriendsService,
    UsersService,
    JwtService,
    FriendsController,
    FriendRequestSubscriber,
    FriendshipSubscriber,
  ],
  controllers: [FriendsController],
  exports: [FriendsService],
})
export class FriendsModule {}
