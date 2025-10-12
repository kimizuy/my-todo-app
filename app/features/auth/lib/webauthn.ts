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
import { passkeys, users, webauthnChallenges } from "../schema";

// Relying Party (RP) の設定
export const RP_NAME = "Daily Tasks";
export const RP_ID = "localhost"; // 本番環境では実際のドメインに変更

// チャレンジの有効期限（5分）
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * パスキー登録のためのオプションを生成
 */
export async function generatePasskeyRegistrationOptions(
  userId: number,
  userEmail: string,
  db: DrizzleD1Database,
) {
  // 既存のパスキーを取得（除外リストのため）
  const userPasskeys = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, userId))
    .all();

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
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
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
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
  // データベースから最新のチャレンジを取得
  const challengeRecord = await db
    .select()
    .from(webauthnChallenges)
    .where(eq(webauthnChallenges.userId, userId))
    .orderBy(desc(webauthnChallenges.createdAt))
    .limit(1)
    .get();

  if (!challengeRecord) {
    throw new Error("チャレンジが見つかりません");
  }

  // チャレンジの有効期限をチェック
  if (new Date(challengeRecord.expiresAt) < new Date()) {
    await db
      .delete(webauthnChallenges)
      .where(eq(webauthnChallenges.id, challengeRecord.id));
    throw new Error("チャレンジの有効期限が切れています");
  }

  // 登録レスポンスを検証
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: RP_ID,
  });

  // チャレンジを削除（一度のみ使用可能）
  await db
    .delete(webauthnChallenges)
    .where(eq(webauthnChallenges.id, challengeRecord.id));

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("パスキーの登録検証に失敗しました");
  }

  const { credential } = verification.registrationInfo;

  // 既存のパスキーを削除（1ユーザー1パスキーのみ許可）
  await db.delete(passkeys).where(eq(passkeys.userId, userId));

  // パスキーをデータベースに保存
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
  db: DrizzleD1Database,
) {
  // メールアドレスが指定されている場合、そのユーザーのパスキーのみを許可
  let allowedPasskeys: {
    credentialId: string;
    transports: string | null;
  }[] = [];

  if (userEmail) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .get();

    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    // 最新のパスキーのみを取得（最後に使用された、または最新に作成されたもの）
    const latestPasskey = await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.userId, user.id))
      .orderBy(desc(passkeys.lastUsedAt), desc(passkeys.createdAt))
      .limit(1)
      .get();

    if (latestPasskey) {
      allowedPasskeys = [latestPasskey];
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
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
    userVerification: "preferred",
  });

  // チャレンジをデータベースに保存
  const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS).toISOString();
  await db.insert(webauthnChallenges).values({
    challenge: options.challenge,
    userId: userEmail
      ? (await db.select().from(users).where(eq(users.email, userEmail)).get())
          ?.id
      : null,
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

  // 最新のチャレンジを取得
  // このユーザー専用のチャレンジ、または全ユーザー対象（userId=null）のチャレンジを探す
  const challengeRecord = await db
    .select()
    .from(webauthnChallenges)
    .where(eq(webauthnChallenges.type, "authentication"))
    .orderBy(desc(webauthnChallenges.createdAt))
    .limit(1)
    .get();

  // チャレンジが存在し、かつそのチャレンジがこのユーザーのものか確認
  if (
    challengeRecord &&
    challengeRecord.userId !== null &&
    challengeRecord.userId !== passkey.userId
  ) {
    throw new Error(
      "チャレンジが見つかりません（別のユーザーのチャレンジです）",
    );
  }

  if (!challengeRecord) {
    throw new Error("チャレンジが見つかりません");
  }

  // チャレンジの有効期限をチェック
  if (new Date(challengeRecord.expiresAt) < new Date()) {
    await db
      .delete(webauthnChallenges)
      .where(eq(webauthnChallenges.id, challengeRecord.id));
    throw new Error("チャレンジの有効期限が切れています");
  }

  // 認証レスポンスを検証
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64")),
      counter: passkey.counter,
    },
  });

  // チャレンジを削除
  await db
    .delete(webauthnChallenges)
    .where(eq(webauthnChallenges.id, challengeRecord.id));

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
