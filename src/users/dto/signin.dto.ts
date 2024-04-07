import { IsString, MaxLength, MinLength } from 'class-validator';

export class SignInDto {
  @IsString()
  @MinLength(2)
  @MaxLength(320)
  usernamePassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;
}
