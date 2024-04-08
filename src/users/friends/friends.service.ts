import { BadRequestException, Injectable } from '@nestjs/common';
import { Friendship } from './entities/friendship.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FriendRequest } from './entities/friendRequest.entity';
import { UsersService } from '../users.service';

export enum AddFriendError {
  sameUser = 'same user',
  invalidUser = 'invalid user',
  alreadyFriends = 'already friends',
  alreadySent = 'already sent',
}

export enum DeleteFriendShipRequestError {
  requestDoesNotExist = 'request does not exist',
}

export enum DeleteFriendError {
  friendDoesNotExist = 'friendship does not exist',
}

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendsRepository: Repository<Friendship>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    private usersService: UsersService,
  ) {}

  public async addFriendRequest(initiator: string, requested: string) {
    if (initiator === requested) {
      throw new BadRequestException(AddFriendError.sameUser);
    }
    const initiatorUser = await this.usersService.findById(initiator);
    if (initiatorUser === null) {
      throw new BadRequestException(AddFriendError.invalidUser);
    }
    const requestedUser = await this.usersService.findById(requested);
    if (requestedUser === null) {
      throw new BadRequestException(AddFriendError.invalidUser);
    }
    const friendShip = await this.findFriendship(initiator, requested);
    if (friendShip !== null) {
      throw new BadRequestException(AddFriendError.alreadyFriends);
    }
    const ownRequest = await this.findSpecificFriendshipRequest(
      initiator,
      requested,
    );
    if (ownRequest) {
      throw new BadRequestException(AddFriendError.alreadySent);
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

  public findFriends(userID: string): Promise<Friendship[]> {
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

  public findSendRequests(userID: string): Promise<FriendRequest[]> {
    return this.friendRequestRepository.find({
      where: {
        initiator: userID,
      },
    });
  }

  public findReceivedRequests(userID: string): Promise<FriendRequest[]> {
    return this.friendRequestRepository.find({
      where: {
        requested: userID,
      },
    });
  }

  public async deleteFriend(userA: string, userB: string) {
    const friendShip = await this.findFriendship(userA, userB);
    if (friendShip === null) {
      throw new BadRequestException(DeleteFriendError.friendDoesNotExist);
    }
    await this.friendsRepository.remove(friendShip);
  }

  public async deleteFriendShipRequest(userA: string, userB: string) {
    const friendRequest = await this.findFriendshipRequest(userA, userB);
    if (friendRequest === null) {
      throw new BadRequestException(
        DeleteFriendShipRequestError.requestDoesNotExist,
      );
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
