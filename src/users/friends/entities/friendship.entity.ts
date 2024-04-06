import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'users_are_friends',
})
export class Friendship {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ name: 'usera' })
  userA: string;

  @Column({ name: 'userb' })
  userB: string;

  @Column({ type: 'timestamptz' })
  since: Date;
}
