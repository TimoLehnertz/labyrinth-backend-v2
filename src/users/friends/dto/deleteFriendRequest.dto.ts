import { IsUUID } from 'class-validator';

export class DeleteFriendRequestDto {
  @IsUUID()
  user: string;
}
