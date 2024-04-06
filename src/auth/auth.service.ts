import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JWTUser } from './entities/jwtUser.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(
    usernameOrEmail: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(usernameOrEmail);
    if (user === null) {
      throw new UnauthorizedException();
    }
    const pwMatch = await bcrypt.compare(password, user.password);
    if (!pwMatch) {
      throw new UnauthorizedException();
    }
    const jwtUser = new JWTUser(user.id, user.email, user.username);
    const payload = {};
    Object.assign(payload, jwtUser);
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
