import type { AdminRole } from '../../db/schema';

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminAuthProvider {
  login(input: { email: string }): Promise<{ token: string; identity: AdminIdentity } | null>;
  verify(token: string): Promise<AdminIdentity | null>;
  logout(token: string): Promise<void>;
}
