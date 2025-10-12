import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { desc, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  passkeys,
  users,
  type WebauthnChallenge,
  webauthnChallenges,
} from "../schema";

// Relying Party (RP) の設定
export const RP_NAME = "Daily Tasks";

// チャレンジの有効期限（5分）
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * URLからRP IDを取得する
 * localhostの場合は "localhost"、本番環境の場合はドメインを返す
 */
function getRpIdFromOrigin(origin: string): string {
  const url = new URL(origin);
  // localhostの場合はそのまま返す
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return "localhost";
  }
  // 本番環境の場合はホスト名を返す
  return url.hostname;
}

interface ChallengeValidationOptions {
  userId?: number | null;
  type: "registration" | "authentication";
}

/**
 * チャレンジを取得・検証し、使用済みとしてマークする
 * @returns 有効なチャレンジ文字列
 * @throws チャレンジが無効な場合
 */
async function validateAndConsumeChallenge(
  options: ChallengeValidationOptions,
  db: DrizzleD1Database,
): Promise<string> {
  const { userId, type } = options;

  // チャレンジ取得クエリを構築
  let challengeRecord: WebauthnChallenge | undefined;

  if (type === "registration") {
    // 登録時はuserIdで絞り込む
    challengeRecord = await db
      .select()
      .from(webauthnChallenges)
      .where(eq(webauthnChallenges.userId, userId ?? 0))
      .orderBy(desc(webauthnChallenges.createdAt))
      .limit(1)
      .get();
  } else {
    // 認証時は最新のauthenticationチャレンジを取得
    challengeRecord = await db
      .select()
      .from(webauthnChallenges)
      .where(eq(webauthnChallenges.type, "authentication"))
      .orderBy(desc(webauthnChallenges.createdAt))
      .limit(1)
      .get();

    // ユーザーIDが指定されている場合、そのユーザーのチャレンジか確認
    if (
      challengeRecord &&
      challengeRecord.userId !== null &&
      challengeRecord.userId !== userId
    ) {
      throw new Error(
        "チャレンジが見つかりません（別のユーザーのチャレンジです）",
      );
    }
  }

  if (!challengeRecord) {
    throw new Error("チャレンジが見つかりません");
  }

  // 有効期限チェック
  if (new Date(challengeRecord.expiresAt) < new Date()) {
    await db
      .delete(webauthnChallenges)
      .where(eq(webauthnChallenges.id, challengeRecord.id));
    throw new Error("チャレンジの有効期限が切れています");
  }

  // チャレンジを削除（使用済み）
  await db
    .delete(webauthnChallenges)
    .where(eq(webauthnChallenges.id, challengeRecord.id));

  return challengeRecord.challenge;
}

/**
 * パスキー登録のためのオプションを生成
 */
export async function generatePasskeyRegistrationOptions(
  userId: number,
  userEmail: string,
  origin: string,
  db: DrizzleD1Database,
) {
  const rpId = getRpIdFromOrigin(origin);

  // 既存のパスキーを取得（除外リストのため）
  const userPasskeys = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, userId))
    .all();

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId,
    userID: new Uint8Array(Buffer.from(userId.toString())),
    userName: userEmail,
    userDisplayName: userEmail,
    // 既存のパスキーを除外
    excludeCredentials: userPasskeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports
        ? (JSON.parse(passkey.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
  });

  // チャレンジをデータベースに保存
  const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS).toISOString();
  await db.insert(webauthnChallenges).values({
    challenge: options.challenge,
    userId,
    type: "registration",
    expiresAt,
  });

  return options;
}

/**
 * パスキー登録レスポンスを検証
 */
export async function verifyPasskeyRegistration(
  userId: number,
  response: RegistrationResponseJSON,
  origin: string,
  db: DrizzleD1Database,
) {
  const rpId = getRpIdFromOrigin(origin);

  // チャレンジを検証して取得
  const challenge = await validateAndConsumeChallenge(
    { userId, type: "registration" },
    db,
  );

  // 登録レスポンスを検証
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("パスキーの登録検証に失敗しました");
  }

  const { credential } = verification.registrationInfo;

  // パスキーをデータベースに保存
  // 複数パスキー対応: 既存のパスキーを削除せず、新しいパスキーを追加
  const [newPasskey] = await db
    .insert(passkeys)
    .values({
      userId,
      credentialId: response.id, // response.idを使用（credential.idと同じ値）
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      transports: response.response.transports
        ? JSON.stringify(response.response.transports)
        : null,
      aaguid: null, // aaguidはオプショナルなのでnullを設定
    })
    .returning();

  return {
    verified: true,
    passkey: newPasskey,
  };
}

/**
 * パスキー認証のためのオプションを生成
 */
export async function generatePasskeyAuthenticationOptions(
  userEmail: string | null,
  origin: string,
  db: DrizzleD1Database,
) {
  const rpId = getRpIdFromOrigin(origin);

  // メールアドレスが指定されている場合、そのユーザーのパスキーのみを許可
  let allowedPasskeys: {
    credentialId: string;
    transports: string | null;
  }[] = [];
  let userId: number | null = null;

  if (userEmail) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .get();

    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    userId = user.id;

    // 複数パスキー対応: ユーザーの全パスキーを取得
    allowedPasskeys = await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.userId, user.id))
      .all();
  }

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials:
      allowedPasskeys.length > 0
        ? allowedPasskeys.map((passkey) => ({
            id: passkey.credentialId,
            transports: passkey.transports
              ? (JSON.parse(
                  passkey.transports,
                ) as AuthenticatorTransportFuture[])
              : undefined,
          }))
        : [],
  });

  // チャレンジをデータベースに保存
  const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS).toISOString();
  await db.insert(webauthnChallenges).values({
    challenge: options.challenge,
    userId,
    type: "authentication",
    expiresAt,
  });

  return options;
}

/**
 * パスキー認証レスポンスを検証
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  origin: string,
  db: DrizzleD1Database,
) {
  const rpId = getRpIdFromOrigin(origin);

  // credentialIdからパスキーを取得
  const credentialId = response.rawId;

  const passkey = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.credentialId, credentialId))
    .get();

  if (!passkey) {
    throw new Error("パスキーが見つかりません");
  }

  // チャレンジを検証して取得
  const challenge = await validateAndConsumeChallenge(
    { userId: passkey.userId, type: "authentication" },
    db,
  );

  // 認証レスポンスを検証
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64")),
      counter: passkey.counter,
    },
  });

  if (!verification.verified) {
    throw new Error("パスキーの認証検証に失敗しました");
  }

  // カウンターを更新
  await db
    .update(passkeys)
    .set({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date().toISOString(),
    })
    .where(eq(passkeys.id, passkey.id));

  // ユーザー情報を取得
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, passkey.userId))
    .get();

  if (!user) {
    throw new Error("ユーザーが見つかりません");
  }

  return {
    verified: true,
    user,
  };
}
