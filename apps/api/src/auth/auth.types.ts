import { UserRole } from '@prisma/client';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  authVersion: number;
}
