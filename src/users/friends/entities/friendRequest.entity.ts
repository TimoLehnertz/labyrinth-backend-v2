import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'users/entities/user.entity';

@Entity({
  name: 'friend_request',
})
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  initiator: string;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'initiator',
  })
  initiatorUser: User;

  @Column()
  requested: string;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'requested',
  })
  requestedUser: User;

  @Column({ name: 'requestedat', type: 'timestamptz' })
  requestedAt: Date;

  @Column({
    default: false,
  })
  ignored: boolean;
}
