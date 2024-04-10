import { User } from 'users/entities/user.entity';
import { FriendRequest } from '../entities/friendRequest.entity';

export class FriendRequestDto extends FriendRequest {
  initiatorUser: User;
  requestedUser: User;
}
