import { TypeOrmSQLITETestingModule } from 'test-utils/TypeORMSQLITETestingModule';
import { UsersService } from './users.service';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from './entities/user.entity';
import { BadRequestException } from '@nestjs/common';

describe('users.service', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [...TypeOrmSQLITETestingModule(User)],
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should register a user', async () => {
    await service.register({
      email: 'max@musterman.com',
      password: '12345678',
      username: 'max',
    });
    const max = await service.findOne('max');
    expect(max).toBeDefined();
    expect(max?.email).toBe('max@musterman.com');
    expect(max?.username).toBe('max');
    expect(max?.password === '12345678').toBe(false);
  });

  it('email exists', async () => {
    await service.register({
      email: 'max@musterman.com',
      password: '12345678',
      username: 'max',
    });
    const f = async () => {
      await service.register({
        email: 'max@musterman.com',
        password: '12345678',
        username: 'max',
      });
    };
    expect(f).rejects.toThrow(BadRequestException);
    expect(f).rejects.toThrow('email-taken');
  });

  it('username exists', async () => {
    await service.register({
      email: 'max1@musterman.com',
      password: '12345678',
      username: 'max',
    });
    const f = async () => {
      await service.register({
        email: 'max@musterman.com',
        password: '12345678',
        username: 'max',
      });
    };
    expect(f).rejects.toThrow(BadRequestException);
    expect(f).rejects.toThrow('username-taken');
  });
});
