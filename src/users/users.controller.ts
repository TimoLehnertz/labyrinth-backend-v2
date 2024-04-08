import { Controller, Post, Body } from '@nestjs/common';
import { RegisterError, UsersService } from './users.service';
import { RegisterDto } from './dto/register.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiProperty,
} from '@nestjs/swagger';

export class RegisterErrorResponse {
  @ApiProperty({
    enum: RegisterError,
  })
  message: Error;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiBadRequestResponse({
    type: RegisterErrorResponse,
  })
  @ApiCreatedResponse({
    description: 'The registration was successful',
  })
  async register(@Body() registerDto: RegisterDto) {
    await this.usersService.register(registerDto);
  }
}
