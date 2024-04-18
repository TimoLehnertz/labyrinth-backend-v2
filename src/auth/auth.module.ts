import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WsAuthGuard } from './ws-auth.guard';
import { UsersService } from 'users/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'users/entities/user.entity';

@Module({
  controllers: [AuthController],
  providers: [AuthService, WsAuthGuard, UsersService],
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          global: true,
          secret: configService.getOrThrow<string>('AUTH_SECRET'),
          signOptions: { expiresIn: '1y' },
        };
      },
    }),
  ],
})
export class AuthModule {}
