import { User } from 'users/entities/user.entity';
import { Friendship } from '../entities/friendship.entity';

export class FriendshipDto extends Friendship {
  useraUser: User;
  userbUser: User;
}
