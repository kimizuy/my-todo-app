import type { User } from "./schema";

/**
 * 認証済みユーザーの型
 * DBスキーマから必要なフィールドのみを抽出
 */
export type AuthUser = Pick<User, "id" | "email" | "emailVerified">;

export interface AuthSessionResult {
  user: AuthUser | null;
  newToken?: string;
}

export interface AuthService {
  createSession(user: AuthUser): Promise<string>;
  getUser(request: Request): Promise<AuthSessionResult>;
  requireUser(request: Request): Promise<AuthUser>;
  destroySession(): void;
}
