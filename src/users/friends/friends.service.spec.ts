import { Test } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { UsersService } from 'users/users.service';
import { DataSource } from 'typeorm';
import { setupTestDataSource } from 'test-utils/testPosgres';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'users/entities/user.entity';
import { Friendship } from './entities/friendship.entity';
import { FriendRequest } from './entities/friendRequest.entity';
import { BadRequestException } from '@nestjs/common';

describe('friends.service', () => {
  let friendsService: FriendsService;
  let usersService: UsersService;
  let _dataSource: DataSource;

  let tom: User;
  let max: User;

  beforeEach(async () => {
    const { forRoot, dataSource } = await setupTestDataSource();
    _dataSource = dataSource;
    const testingModule = await Test.createTestingModule({
      imports: [
        forRoot,
        TypeOrmModule.forFeature([User, Friendship, FriendRequest]),
      ],
      providers: [FriendsService, UsersService],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile();

    friendsService = testingModule.get<FriendsService>(FriendsService);
    usersService = testingModule.get<UsersService>(UsersService);

    friendsService;
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
    const tom1 = await usersService.findOne('max');
    const max1 = await usersService.findOne('tom');
    if (tom1 && max1) {
      max = tom1;
      tom = max1;
    }
  });

  afterEach(() => {
    _dataSource.destroy();
  });

  it('send friend request', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    const requests = await friendsService.findSendRequests(max.id);
    expect(requests.length).toBe(1);
    expect(requests[0].initiator).toBe(max.id);
    expect(requests[0].requested).toBe(tom.id);
  });

  it('accept friend request', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    expect((await friendsService.findSendRequests(max.id)).length).toBe(1);
    await friendsService.addFriendRequest(tom.id, max.id);
    expect((await friendsService.findSendRequests(max.id)).length).toBe(0);
    const maxFriends = await friendsService.findFriends(max.id);
    expect(maxFriends.length).toBe(1);
    expect(maxFriends[0].userA).toBe(max.id);
    expect(maxFriends[0].userB).toBe(tom.id);
  });

  it('same user', async () => {
    const f = async () => {
      await friendsService.addFriendRequest(max.id, max.id);
    };
    expect(f).rejects.toThrow(BadRequestException);
    expect(f).rejects.toThrow('same user');
  });

  it('invalid user1', async () => {
    try {
      await friendsService.addFriendRequest(
        'a51529c7-23a5-4686-ba75-91b79e4a442d',
        max.id,
      );
      fail('Exception expected');
    } catch (e) {
      expect(e.message).toMatch('invalid user');
    }
  });

  it('invalid user2', async () => {
    try {
      await friendsService.addFriendRequest(
        max.id,
        'a51529c7-23a5-4686-ba75-91b79e4a442d',
      );
      fail('Exception expected');
    } catch (e) {
      expect(e.message).toMatch('invalid user');
    }
  });

  it('already friends', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    await friendsService.addFriendRequest(tom.id, max.id);
    try {
      await friendsService.addFriendRequest(max.id, tom.id);
      fail('expected exception');
    } catch (e) {
      expect(e.message).toBe('already friends');
    }
  });

  it('already sent', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    try {
      await friendsService.addFriendRequest(max.id, tom.id);
      fail('expected exception');
    } catch (e) {
      expect(e.message).toBe('already sent');
    }
  });

  it('findFriends', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    await friendsService.addFriendRequest(tom.id, max.id);
    const friends = await friendsService.findFriends(max.id);
    expect(friends.length).toBe(1);
    expect(friends[0].userA).toBe(max.id);
    expect(friends[0].userB).toBe(tom.id);
  });

  it('findSendRequests', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    const sendRequests = await friendsService.findSendRequests(max.id);
    expect(sendRequests.length).toBe(1);
    expect(sendRequests[0].initiator).toBe(max.id);
    expect(sendRequests[0].requested).toBe(tom.id);
  });

  it('findReceivedRequests', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    const receivedRequests = await friendsService.findReceivedRequests(tom.id);
    expect(receivedRequests.length).toBe(1);
    expect(receivedRequests[0].initiator).toBe(max.id);
    expect(receivedRequests[0].requested).toBe(tom.id);
  });

  it('removeFriendShip', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    await friendsService.addFriendRequest(tom.id, max.id);
    let friends = await friendsService.findFriends(max.id);
    expect(friends.length).toBe(1);
    await friendsService.deleteFriend(max.id, tom.id);
    friends = await friendsService.findFriends(max.id);
    expect(friends.length).toBe(0);

    await friendsService.addFriendRequest(max.id, tom.id);
    await friendsService.addFriendRequest(tom.id, max.id);
    friends = await friendsService.findFriends(max.id);
    expect(friends.length).toBe(1);
    await friendsService.deleteFriend(tom.id, max.id); // other way around
    friends = await friendsService.findFriends(max.id);
    expect(friends.length).toBe(0);
  });

  it('friendship does not exist', async () => {
    try {
      await friendsService.deleteFriend(max.id, tom.id);
      fail('expected exception');
    } catch (e) {
      expect(e.message).toBe('friendship does not exist');
    }
  });

  it('removeFriendShipRequest', async () => {
    await friendsService.addFriendRequest(max.id, tom.id);
    let requests = await friendsService.findReceivedRequests(tom.id);
    expect(requests.length).toBe(1);
    await friendsService.deleteFriendShipRequest(max.id, tom.id);
    requests = await friendsService.findReceivedRequests(max.id);
    expect(requests.length).toBe(0);

    await friendsService.addFriendRequest(max.id, tom.id);
    requests = await friendsService.findReceivedRequests(tom.id);
    expect(requests.length).toBe(1);
    await friendsService.deleteFriendShipRequest(tom.id, max.id); // other way around
    requests = await friendsService.findReceivedRequests(max.id);
    expect(requests.length).toBe(0);
  });

  it('removeFriendShipRequest does not exist', async () => {
    try {
      await friendsService.deleteFriendShipRequest(max.id, tom.id);
      fail('expected exception');
    } catch (e) {
      expect(e.message).toBe('request does not exist');
    }
  });
});
