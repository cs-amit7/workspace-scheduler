import { z } from 'zod';

export const demoLoginSchema = {
  body: z
    .object({
      role: z.enum(['user', 'admin']).optional().default('user'),
    })
    .default({}),
};

export default {
  demoLoginSchema,
};
