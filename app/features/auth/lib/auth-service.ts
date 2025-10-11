import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import type { AppLoadContext } from "react-router";
import { redirect } from "react-router";
import { getCookie } from "~/shared/lib/cookies";
import { users } from "../schema";
import type { AuthService, AuthUser } from "../types";
import { createJWT, verifyJWT } from "./jwt";

// JWT 実装
class JWTAuthService implements AuthService {
  constructor(
    private secret: string,
    private db: DrizzleD1Database,
  ) {}

  async createSession(user: AuthUser): Promise<string> {
    return createJWT({ userId: user.id, email: user.email }, this.secret);
  }

  async getUser(request: Request): Promise<AuthUser | null> {
    const token = getCookie(request, "auth_token");
    if (!token) return null;

    const payload = await verifyJWT(token, this.secret);
    if (!payload) return null;

    // DBでユーザーの存在を確認
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .get();

    // ユーザーが存在しない場合は無効
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: !!user.emailVerified,
    };
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

  const db = drizzle(context.cloudflare.env.DB);

  return new JWTAuthService(secret, db);
}

// 便利な関数
export async function requireAuth(
  request: Request,
  context: AppLoadContext,
): Promise<AuthUser> {
  const auth = createAuthService(context);
  return auth.requireUser(request);
}

export async function requireEmailVerified(
  request: Request,
  context: AppLoadContext,
): Promise<AuthUser> {
  const user = await requireAuth(request, context);
  if (!user.emailVerified) {
    throw redirect("/verify-email-pending");
  }
  return user;
}

export async function getAuthUser(
  request: Request,
  context: AppLoadContext,
): Promise<AuthUser | null> {
  const auth = createAuthService(context);
  return auth.getUser(request);
}
