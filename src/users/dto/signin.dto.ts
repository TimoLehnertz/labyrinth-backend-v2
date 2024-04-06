import { z } from 'zod';

export const signinSchema = z
  .object({
    usernamePassword: z.string().min(2).max(320),
    password: z.string().max(200).min(8),
  })
  .required();

export type SigninDto = z.infer<typeof signinSchema>;
