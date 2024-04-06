import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';
import { FriendRequest } from './entities/friendRequest.entity';
import { Friendship } from './entities/friendship.entity';

describe('FriendsService', () => {
  let service: FriendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TypeOrmModule.forFeature([Friendship, FriendRequest, User])],
      providers: [FriendsService, UsersService, JwtService],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
