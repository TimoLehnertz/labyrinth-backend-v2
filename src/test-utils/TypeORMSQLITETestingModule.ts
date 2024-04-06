import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'users/entities/user.entity';

export const TypeOrmSQLITETestingModule = (...entities: any) => [
  TypeOrmModule.forRoot({
    type: 'better-sqlite3',
    database: ':memory:',
    dropSchema: true,
    entities,
    synchronize: true,
  }),
  TypeOrmModule.forFeature([User]),
];
