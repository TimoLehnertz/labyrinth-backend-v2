import {
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
  Delete,
  ParseUUIDPipe,
  Query,
  BadRequestException,
  Put,
} from '@nestjs/common';
import {
  AddFriendError,
  DeleteFriendError,
  DeleteFriendShipRequestError,
  FriendsService,
  IgnoreFriendRequestError,
} from './friends.service';
import { AuthGuard } from '../../auth/auth.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
} from '@nestjs/swagger';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthGuard } from 'auth/ws-auth.guard';
import { FriendRequestSubscriber } from './friendRequest.subscriber';
import { FriendRequest } from './entities/friendRequest.entity';
import { FriendshipSubscriber } from './friendship.subscriber';
import { Friendship } from './entities/friendship.entity';
import { AsyncApiPub } from 'nestjs-asyncapi';
import { UsersService } from 'users/users.service';
class AddFriendRequestErrorResponse {
  @ApiProperty({ enum: AddFriendError })
  message: AddFriendError;
}

class DeleteFriendErrorResponse {
  @ApiProperty({ enum: DeleteFriendError })
  message: DeleteFriendError;
}

class DeleteFriendRequestErrorResponse {
  @ApiProperty({ enum: DeleteFriendShipRequestError })
  message: DeleteFriendShipRequestError;
}

class IgnoreFriendRequestErrorResponse {
  @ApiProperty({ enum: IgnoreFriendRequestError })
  message: IgnoreFriendRequestError;
}

@Controller('friends')
@WebSocketGateway({
  namespace: 'friends',
  cors: true,
})
export class FriendsController {
  constructor(
    private friendsService: FriendsService,
    private usersService: UsersService,
    private friendRequestSubscriber: FriendRequestSubscriber,
    private friendshipSubscriber: FriendshipSubscriber,
  ) {}

  @SubscribeMessage('received-requests')
  @UseGuards(WsAuthGuard)
  @AsyncApiPub({
    channel: 'friends/received-requests',
    message: [
      {
        name: 'add',
        payload: FriendRequest,
      },
      {
        name: 'remove',
        payload: FriendRequest,
      },
      {
        name: 'init',
        payload: Array<FriendRequest>,
      },
    ],
  })
  public async handleReceivedRequests(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('handleReceivedRequests');
    try {
      this.friendRequestSubscriber.manageClient(client, {
        filter: (friendRequest: FriendRequest) =>
          friendRequest.requested === (client as any).user.id,
        operations: ['insert', 'remove'],
        pipe: (data) => this.friendsService.upgradeFriendRequest(data),
      });
      client.emit(
        'init',
        await this.friendsService.findReceivedRequests((client as any).user.id),
      );
    } catch (e) {
      throw new WsException(e.message ?? 'An error occurred');
    }
  }

  @SubscribeMessage('sent-requests')
  @UseGuards(WsAuthGuard)
  public async handleSentRequests(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.friendRequestSubscriber.manageClient(client, {
        filter: (friendRequest: FriendRequest) =>
          friendRequest.initiator === (client as any).user.id,
        pipe: (data) => this.friendsService.upgradeFriendRequest(data),
      });
      client.emit(
        'init',
        await this.friendsService.findSendRequests((client as any).user.id),
      );
    } catch (e) {
      throw new WsException(e.message ?? 'An error occurred');
    }
  }

  @SubscribeMessage('friends')
  @UseGuards(WsAuthGuard)
  public async handleFriends(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.friendshipSubscriber.manageClient(client, {
        filter: (friendRequest: Friendship) =>
          friendRequest.usera === (client as any).user.id ||
          friendRequest.userb === (client as any).user.id,
        pipe: (data) => this.friendsService.upgradeFriendship(data),
      });
      client.emit(
        'init',
        await this.friendsService.findFriends((client as any).user.id),
      );
    } catch (e) {
      throw new WsException(e.message ?? 'An error occurred');
    }
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  public async getFriends(@Req() request: any) {
    return await this.friendsService.findFriends(request.user.id);
  }

  @Delete('friend')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: DeleteFriendErrorResponse })
  public async deleteFriend(
    @Req() request: any,
    @Query('friendshipID', ParseUUIDPipe) friendshipID: string,
  ) {
    await this.friendsService.deleteFriendship(request.user.id, friendshipID);
  }

  @Get('send-requests')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  public async getSendFriendRequests(@Req() request: any) {
    return await this.friendsService.findSendRequests(request.user.id);
  }

  @Get('received-requests')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  public async getFriendRequests(@Req() request: any) {
    return await this.friendsService.findReceivedRequests(request.user.id);
  }

  @Post('request')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: 'Request was send successfully',
  })
  @ApiBadRequestResponse({ type: AddFriendRequestErrorResponse })
  public async addFriendRequest(
    @Query('username') username: string,
    @Req() request: any,
  ) {
    const friend = await this.usersService.findByUsername(username);
    if (friend === null) {
      throw new BadRequestException(AddFriendError.invalidUser);
    }
    await this.friendsService.addFriendRequest(request.user.id, friend.id);
  }

  @Delete('request')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'request was deleted' })
  @ApiBadRequestResponse({ type: DeleteFriendRequestErrorResponse })
  public async deleteFriendRequest(
    @Req() request: any,
    @Query('requestID', ParseUUIDPipe)
    requestID: string,
  ) {
    return await this.friendsService.deleteFriendShipRequest(
      request.user.id,
      requestID,
    );
  }

  @Put('ignore-request')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'request was ignored' })
  @ApiBadRequestResponse({ type: IgnoreFriendRequestErrorResponse })
  public async ignoreFriendRequest(
    @Req() request: any,
    @Query('requestID', ParseUUIDPipe)
    requestID: string,
  ) {
    await this.friendsService.ignoreFriendRequest(requestID);
  }
}
