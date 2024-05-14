import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'users/entities/user.entity';

export enum BotType {
  WEAK_BOT = 'weak_bot',
  MEDIUM_BOT = 'medium_bot',
  STRONG_BOT = 'strong_bot',
}

@Entity({
  name: 'player_plays_game',
})
export class PlayerPlaysGame {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({
    name: 'bot_type',
    type: 'enum',
    enum: BotType,
    nullable: true,
    default: null,
  })
  botType: BotType | null;

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

  @Column({ name: 'is_winner', default: false })
  isWinner: boolean;

  @Column({ name: 'game_finished', default: false })
  gameFinished: boolean;

  @Column({
    name: 'player_name',
    default: null,
    nullable: true,
    type: 'varchar',
  })
  playerName: string | null;
}
