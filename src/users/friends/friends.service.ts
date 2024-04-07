import { BadRequestException, Injectable } from '@nestjs/common';
import { Friendship } from './entities/friendship.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FriendRequest } from './entities/friendRequest.entity';
import { UsersService } from '../users.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendsRepository: Repository<Friendship>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    private usersService: UsersService,
  ) {}

  async addFriendRequest(initiator: string, requested: string) {
    if (initiator === requested) {
      throw new BadRequestException('same user');
    }
    const initiatorUser = await this.usersService.findById(initiator);
    if (initiatorUser === null) {
      throw new BadRequestException('invalid user');
    }
    const requestedUser = await this.usersService.findById(requested);
    if (requestedUser === null) {
      throw new BadRequestException('invalid user');
    }
    const friendShip = await this.findFriendship(initiator, requested);
    if (friendShip !== null) {
      throw new BadRequestException('already friends');
    }
    const ownRequest = await this.findSpecificFriendshipRequest(
      initiator,
      requested,
    );
    if (ownRequest) {
      throw new BadRequestException('already sent'); // Request has already been added
    }
    const receivedRequest = await this.findSpecificFriendshipRequest(
      requested,
      initiator,
    );
    if (receivedRequest !== null) {
      await this.acceptRequest(receivedRequest); // there is already a request pending from the requested user -> accept it
      return;
    }
    const friendRequest = this.friendRequestRepository.create({
      initiator,
      requested,
      requestedAt: new Date(),
    });
    await this.friendRequestRepository.insert(friendRequest);
  }

  findFriends(userID: string): Promise<Friendship[]> {
    return this.friendsRepository.find({
      where: [
        {
          userA: userID,
        },
        {
          userB: userID,
        },
      ],
    });
  }

  findSendRequests(userID: string): Promise<FriendRequest[]> {
    return this.friendRequestRepository.find({
      where: {
        initiator: userID,
      },
    });
  }

  findReceivedRequests(userID: string): Promise<FriendRequest[]> {
    return this.friendRequestRepository.find({
      where: {
        requested: userID,
      },
    });
  }

  async removeFriendShip(userA: string, userB: string) {
    const friendShip = await this.findFriendship(userA, userB);
    if (friendShip === null) {
      throw new BadRequestException('friendship does not exist');
    }
    await this.friendsRepository.remove(friendShip);
  }

  async deleteFriendShipRequest(userA: string, userB: string) {
    const friendRequest = await this.findFriendshipRequest(userA, userB);
    if (friendRequest === null) {
      throw new BadRequestException('request does not exist');
    }
    await this.friendRequestRepository.remove(friendRequest);
  }

  private findFriendship(
    userA: string,
    userB: string,
  ): Promise<Friendship | null> {
    return this.friendsRepository.findOne({
      where: [
        {
          userA: userA,
          userB: userB,
        },
        {
          userB: userA,
          userA: userB,
        },
      ],
    });
  }

  private findSpecificFriendshipRequest(
    initiator: string,
    requested: string,
  ): Promise<FriendRequest | null> {
    return this.friendRequestRepository.findOne({
      where: {
        initiator,
        requested,
      },
    });
  }

  private findFriendshipRequest(
    initiator: string,
    requested: string,
  ): Promise<FriendRequest | null> {
    return this.friendRequestRepository.findOne({
      where: [
        {
          initiator,
          requested,
        },
        {
          initiator: requested,
          requested: initiator,
        },
      ],
    });
  }

  private async acceptRequest(friendRequest: FriendRequest) {
    const friendship = this.friendsRepository.create({
      userA: friendRequest.initiator,
      userB: friendRequest.requested,
      since: new Date(),
    });
    await this.friendRequestRepository.remove(friendRequest);
    await this.friendsRepository.insert(friendship);
  }
}
