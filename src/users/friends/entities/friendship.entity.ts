import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'users/entities/user.entity';

@Entity({
  name: 'users_are_friends',
})
export class Friendship {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  usera: string;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'usera',
  })
  useraUser: User;

  @Column()
  userb: string;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'userb',
  })
  userbUser: User;

  @Column({ type: 'timestamptz' })
  since: Date;

  public getFriendID(ownID: string): string {
    if (ownID === this.usera) {
      return this.userb;
    } else {
      return this.usera;
    }
  }
}
