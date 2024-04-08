import {
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  AddFriendError,
  DeleteFriendError,
  DeleteFriendShipRequestError,
  FriendsService,
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
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from 'auth/ws-auth.guard';
import { FriendRequestSubscriber } from './friendRequest.subscriber';
import { FriendRequest } from './entities/friendRequest.entity';
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

@Controller('friends')
@WebSocketGateway({
  namespace: 'friends',
})
export class FriendsController {
  @WebSocketServer()
  sever: Server;

  constructor(
    private friendsService: FriendsService,
    private friendRequestSubscriber: FriendRequestSubscriber,
  ) {}

  @SubscribeMessage('requests')
  @UseGuards(WsAuthGuard)
  handleEvent(@MessageBody() data: string, @ConnectedSocket() client: Socket) {
    this.friendRequestSubscriber.manageClient(client, {
      pipe: (friendRequest: FriendRequest) =>
        friendRequest.requested === (client as any).user.id,
    });
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getFriends(@Req() request: any) {
    return await this.friendsService.findFriends(request.user.id);
  }

  @Delete('friend')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: DeleteFriendErrorResponse })
  async deleteFriend(
    @Req() request: any,
    @Query('user', ParseUUIDPipe) user: string,
  ) {
    await this.friendsService.deleteFriend(request.user.id, user);
  }

  @Get('send-requests')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getSendFriendRequests(@Req() request: any) {
    return await this.friendsService.findSendRequests(request.user.id);
  }

  @Get('received-requests')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getFriendRequests(@Req() request: any) {
    return await this.friendsService.findReceivedRequests(request.user.id);
  }

  @Post('request')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: 'Request was send successfully',
  })
  @ApiBadRequestResponse({ type: AddFriendRequestErrorResponse })
  async addFriendRequest(
    @Query('user', ParseUUIDPipe) user: string,
    @Req() request: any,
  ) {
    await this.friendsService.addFriendRequest(request.user.id, user);
  }

  @Delete('request')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'request was deleted' })
  @ApiBadRequestResponse({ type: DeleteFriendRequestErrorResponse })
  async deleteFriendRequest(
    @Req() request: any,
    @Query('user', ParseUUIDPipe)
    user: string,
  ) {
    return await this.friendsService.deleteFriendShipRequest(
      request.user.id,
      user,
    );
  }
}
