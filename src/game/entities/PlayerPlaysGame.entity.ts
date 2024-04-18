import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'users/entities/user.entity';

export enum BotType {
  PLAYER = 'player',
  WEAK_BOT = 'weak_bot',
}

@Entity({
  name: 'player_plays_game',
})
export class PlayerPlaysGame {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ name: 'bot_type' })
  botType: BotType;

  @Column({ name: 'game' })
  gameID: string;

  @Column({ name: 'userid', nullable: true })
  userID: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: 'userid',
  })
  user: User | null;

  @Column({ name: 'playerindex' })
  playerIndex: number;

  @Column({ type: 'boolean' })
  ready: boolean;
}
