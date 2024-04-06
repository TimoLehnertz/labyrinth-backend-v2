import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SigninDto, signinSchema } from '../users/dto/signin.dto';
import { AuthGuard } from './auth.guard';
import { ZodPipe } from '../pipes/ZodPipe';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body(new ZodPipe(signinSchema)) signInDto: SigninDto) {
    return this.authService.signIn(
      signInDto.usernamePassword,
      signInDto.password,
    );
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
