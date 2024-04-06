import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { friendRequestSchema, FriendRequestDto } from './dto/friendRequest.dto';
import { FriendsService } from './friends.service';
import { AuthGuard } from '../../auth/auth.guard';
import { ZodPipe } from '../../pipes/ZodPipe';

@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}
  @Post('request')
  @UseGuards(AuthGuard)
  async addFriendRequest(
    @Body(new ZodPipe(friendRequestSchema)) friendRequestDto: FriendRequestDto,
    @Req() request: any,
  ) {
    await this.friendsService.addFriendRequest(
      request.user.id,
      friendRequestDto.user,
    );
  }

  @Get('requests')
  @UseGuards(AuthGuard)
  async getFriendRequests(@Req() request: any) {
    return await this.friendsService.findReceivedRequests(request.user.id);
  }
}
