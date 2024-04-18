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
import { AuthGuard } from './auth.guard';
import { SignInDto } from 'auth/dto/login.dto';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from 'users/entities/user.entity';
// import { Response } from 'express';
class LoginResponse {
  @ApiProperty()
  access_token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiUnauthorizedResponse({ description: 'incorrect username or password' })
  @ApiOkResponse({ type: LoginResponse })
  async login(
    @Body() signInDto: SignInDto,
    // @Res({ passthrough: true }) response: Response,
  ) {
    const token = await this.authService.login(
      signInDto.usernameEmail,
      signInDto.password,
    );
    // response.cookie('jwt', token.access_token, {
    //   httpOnly: true,
    // });
    return token;
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    type: User,
  })
  getProfile(@Request() req: any) {
    return req.user;
  }
}
