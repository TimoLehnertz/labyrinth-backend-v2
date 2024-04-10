import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'users/entities/user.entity';

export enum GameVisibility {
  PUBLIC = 'public',
  FRIENDS = 'friends',
  PRIVATE = 'private',
}

@Entity({
  name: 'game',
})
export class Game {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'enum', enum: GameVisibility })
  visibility: GameVisibility;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'game_state' })
  gameState: string;

  @Column({ name: 'game_setup' })
  gameSetup: string;

  @Column({ name: 'owner_user' })
  ownerUserID: string;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'owner_user',
  })
  ownerUser: User;

  @Column({ default: false })
  finished: boolean;

  @Column({ default: false })
  started: boolean;
}
