import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'friend_request',
})
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  initiator: string;

  @Column()
  requested: string;

  @Column({ name: 'requestedat', type: 'timestamptz' })
  requestedAt: Date;
}
