export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthService {
  createSession(user: AuthUser): Promise<string>;
  getUser(request: Request): Promise<AuthUser | null>;
  requireUser(request: Request): Promise<AuthUser>;
  destroySession(): void;
}
