import { Controller, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterDto, registerSchema } from '../auth/dto/register.dto';
import { ZodPipe } from '../pipes/ZodPipe';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body(new ZodPipe(registerSchema)) registerDto: RegisterDto) {
    await this.usersService.register(registerDto);
  }
}
