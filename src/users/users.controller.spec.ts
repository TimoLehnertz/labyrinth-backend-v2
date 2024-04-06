import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ZodPipe } from 'pipes/ZodPipe';

describe('UserController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [ZodPipe],
    })
      .useMocker((token) => {
        const results = ['test1', 'test2'];
        if (token === UsersService) {
          return {
            register: () => results,
          };
        }
      })
      .compile();
    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should delegate to users.service', async () => {
    await controller.register({
      email: 'max@gmail.com',
      password: '12345678',
      username: 'max',
    });
  });
});
