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

export enum IgnoreFriendRequestError {
  friendDoesNotExist = 'request not exist',
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
          usera: userID,
        },
        {
          userb: userID,
        },
      ],
      relations: {
        useraUser: true,
        userbUser: true,
      },
    });
  }

  public findSendRequests(userID: string): Promise<FriendRequest[]> {
    return this.friendRequestRepository.find({
      where: {
        initiator: userID,
      },
      relations: {
        initiatorUser: true,
        requestedUser: true,
      },
    });
  }

  public async upgradeFriendship(friendship: Friendship): Promise<Friendship> {
    const fullFriendship = await this.friendsRepository.findOne({
      where: {
        id: friendship.id,
      },
      relations: {
        useraUser: true,
        userbUser: true,
      },
    });
    if (fullFriendship === null) {
      return friendship;
    }
    return fullFriendship;
  }

  public async upgradeFriendRequest(
    friendRequest: FriendRequest,
  ): Promise<FriendRequest> {
    const fullFriendRequest = await this.friendRequestRepository.findOne({
      where: {
        id: friendRequest.id,
      },
      relations: {
        initiatorUser: true,
        requestedUser: true,
      },
    });
    if (fullFriendRequest === null) {
      return friendRequest;
    }
    return fullFriendRequest;
  }

  public async ignoreFriendRequest(id: string): Promise<void> {
    const friendRequest = await this.friendRequestRepository.findOne({
      where: { id },
    });
    if (friendRequest === null) {
      throw new BadRequestException(
        IgnoreFriendRequestError.friendDoesNotExist,
      );
    }
    friendRequest.ignored = true;
    await this.friendRequestRepository.update(friendRequest.id, friendRequest);
  }

  public findReceivedRequests(userID: string): Promise<FriendRequest[]> {
    return this.friendRequestRepository.find({
      where: {
        requested: userID,
        ignored: false,
      },
      relations: {
        requestedUser: true,
        initiatorUser: true,
      },
    });
  }

  public async deleteFriendship(userID: string, id: string) {
    const friendShip = await this.friendsRepository.findOne({
      where: [
        {
          id,
          usera: userID,
        },
        {
          id,
          userb: userID,
        },
      ],
    });
    if (friendShip === null) {
      throw new BadRequestException(DeleteFriendError.friendDoesNotExist);
    }
    await this.friendsRepository.remove(friendShip);
  }

  public async deleteFriendShipRequest(userID: string, requestID: string) {
    const friendRequest = await this.findFriendshipRequest(requestID);
    if (friendRequest === null) {
      throw new BadRequestException(
        DeleteFriendShipRequestError.requestDoesNotExist,
      );
    }
    if (
      friendRequest.initiator !== userID &&
      friendRequest.requested !== userID
    ) {
      throw new BadRequestException(
        DeleteFriendShipRequestError.requestDoesNotExist,
      );
    }
    await this.friendRequestRepository.remove(friendRequest);
  }

  private findFriendship(
    usera: string,
    userb: string,
  ): Promise<Friendship | null> {
    return this.friendsRepository.findOne({
      where: [
        {
          usera,
          userb,
        },
        {
          userb: usera,
          usera: userb,
        },
      ],
      relations: {
        useraUser: true,
        userbUser: true,
      },
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
      relations: {
        initiatorUser: true,
        requestedUser: true,
      },
    });
  }

  private findFriendshipRequest(id: string): Promise<FriendRequest | null> {
    return this.friendRequestRepository.findOne({
      where: [
        {
          id,
        },
      ],
      relations: {
        initiatorUser: true,
        requestedUser: true,
      },
    });
  }

  private async acceptRequest(friendRequest: FriendRequest) {
    const friendship = this.friendsRepository.create({
      usera: friendRequest.initiator,
      userb: friendRequest.requested,
      since: new Date(),
    });
    await this.friendRequestRepository.remove(friendRequest);
    await this.friendsRepository.insert(friendship);
  }
}
