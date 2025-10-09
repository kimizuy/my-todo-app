import type { AppLoadContext } from "react-router";
import { redirect } from "react-router";
import { getCookie } from "./cookies.server";
import { createJWT, verifyJWT } from "./jwt.server";

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

// JWT 実装
class JWTAuthService implements AuthService {
  constructor(private secret: string) {}

  async createSession(user: AuthUser): Promise<string> {
    return createJWT({ userId: user.id, email: user.email }, this.secret);
  }

  async getUser(request: Request): Promise<AuthUser | null> {
    const token = getCookie(request, "auth_token");
    if (!token) return null;

    const payload = await verifyJWT(token, this.secret);
    if (!payload) return null;

    return { id: payload.userId, email: payload.email };
  }

  async requireUser(request: Request): Promise<AuthUser> {
    const user = await this.getUser(request);
    if (!user) {
      throw redirect("/auth");
    }
    return user;
  }

  destroySession(): void {
    // JWT はクライアント側で削除
  }
}

// 将来的に KV 実装を追加可能
// class KVAuthService implements AuthService { ... }

export function createAuthService(context: AppLoadContext): AuthService {
  const secret = context.cloudflare.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return new JWTAuthService(secret);
}

// 便利な関数
export async function requireAuth(
  request: Request,
  context: AppLoadContext,
): Promise<AuthUser> {
  const auth = createAuthService(context);
  return auth.requireUser(request);
}

export async function getAuthUser(
  request: Request,
  context: AppLoadContext,
): Promise<AuthUser | null> {
  const auth = createAuthService(context);
  return auth.getUser(request);
}
