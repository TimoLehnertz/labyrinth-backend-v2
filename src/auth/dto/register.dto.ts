import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { z } from 'zod';

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(2)
      .max(20)
      .refine((username) => {
        return !username.includes('@');
      }), // force usernames to be distinct from emails
    email: z.string().max(320).email(),
    password: z.string().max(200).min(8),
  })
  .required();

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
