import { IsString, MaxLength } from 'class-validator';

export class SignInDto {
  @IsString()
  @MaxLength(320)
  usernameEmail: string;

  @IsString()
  @MaxLength(200)
  password: string;
}
