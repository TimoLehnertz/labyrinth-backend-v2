import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Delete,
  Query,
} from '@nestjs/common';
import { FriendRequestDto } from './dto/friendRequest.dto';
import { FriendsService } from './friends.service';
import { AuthGuard } from '../../auth/auth.guard';
import { DeleteFriendRequestDto } from './dto/deleteFriendRequest.dto';
import { ApiQuery } from '@nestjs/swagger';

@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}
  @Post('request')
  @UseGuards(AuthGuard)
  async addFriendRequest(
    @Body() friendRequestDto: FriendRequestDto,
    @Req() request: any,
  ) {
    await this.friendsService.addFriendRequest(
      request.user.id,
      friendRequestDto.user,
    );
  }

  @Get('send-requests')
  @UseGuards(AuthGuard)
  async getSendFriendRequests(@Req() request: any) {
    return await this.friendsService.findSendRequests(request.user.id);
  }

  @ApiQuery({ type: DeleteFriendRequestDto })
  @Delete('request')
  @UseGuards(AuthGuard)
  async deleteFriendRequest(
    @Req() request: any,
    @Query()
    deleteFriendRequestDto: DeleteFriendRequestDto,
  ) {
    return await this.friendsService.deleteFriendShipRequest(
      request.user.id,
      deleteFriendRequestDto.user,
    );
  }

  @Get('requests')
  @UseGuards(AuthGuard)
  async getFriendRequests(@Req() request: any) {
    return await this.friendsService.findReceivedRequests(request.user.id);
  }
}
