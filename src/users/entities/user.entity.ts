import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude, instanceToPlain } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ length: 320 })
  email: string;

  @Column({ length: 20 })
  username: string;

  @Column({ length: 200 })
  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ name: 'games_won', default: 0 })
  gamesWon: number;

  @Column({ name: 'games_lost', default: 0 })
  gamesLost: number;

  toJSON() {
    return instanceToPlain(this);
  }
}
