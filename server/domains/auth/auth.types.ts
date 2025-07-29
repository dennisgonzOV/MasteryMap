// Authentication domain types
import { z } from 'zod';

// Login request/response types
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const AuthResponseSchema = z.object({
  message: z.string(),
  user: z.object({
    id: z.number(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum(['admin', 'teacher', 'student']),
    schoolId: z.number().nullable()
  }),
  token: z.string()
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// User context for authenticated requests
export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: 'admin' | 'teacher' | 'student';
}

// Extended Request type with user context
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}