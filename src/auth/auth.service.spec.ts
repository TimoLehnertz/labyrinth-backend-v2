import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { setupTestDataSource } from 'test-utils/testPosgres';
import { User } from 'users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let _dataSource: DataSource;

  beforeEach(async () => {
    const { forRoot, dataSource } = await setupTestDataSource();
    _dataSource = dataSource;
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UsersService],
      imports: [
        forRoot,
        TypeOrmModule.forFeature([User]),
        JwtModule.register({ secretOrPrivateKey: 'secret' }),
      ],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    _dataSource.destroy();
  });

  it("should fail because user doesn't exist", async () => {
    try {
      await authService.signIn('max', '12345678');
      fail('expected login to fail');
    } catch (e) {
      expect(e.message).toBe('Unauthorized');
    }
  });

  it('should fail because of mismatched password', async () => {
    await usersService.register({
      email: 'max@muster.com',
      password: '12345678',
      username: 'max',
    });
    try {
      await authService.signIn('max', '12345678!');
      fail('expected login to fail');
    } catch (e) {
      expect(e.message).toBe('Unauthorized');
    }
  });

  it('should sign in', async () => {
    await usersService.register({
      email: 'max@muster.com',
      password: '12345678',
      username: 'max',
    });
    const token = await authService.signIn('max', '12345678');
    expect(token).toBeDefined();
  });
});
