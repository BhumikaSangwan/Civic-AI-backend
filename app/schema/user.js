import zod from 'zod';
import { roles } from '../constants/index.js';


export const UserCreationSchema = zod.object({
    'name': zod.string().min(1).max(120),
    'email': zod.string().email(),
    'profile': zod.string().url().optional(),
});

export const UserUpdateSchema = UserCreationSchema.omit({
    email: true,
}).strict();
