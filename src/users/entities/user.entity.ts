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
  password: string;
}
