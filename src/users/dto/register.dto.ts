import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[^@]*$/)
  username: string;

  @IsString()
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @MaxLength(200)
  @MinLength(8)
  password: string;
}
