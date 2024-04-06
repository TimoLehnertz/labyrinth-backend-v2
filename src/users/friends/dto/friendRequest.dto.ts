import { z } from 'zod';

export const friendRequestSchema = z
  .object({
    user: z.string().uuid(),
  })
  .required();

export type FriendRequestDto = z.infer<typeof friendRequestSchema>;
