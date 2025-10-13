import type { RegistrationResponseJSON } from "@simplewebauthn/browser";
import { hc } from "hono/client";
import type { AppType } from "~/server/rpc";

/**
 * 型安全なRPCクライアント
 * サーバーサイドのAPI型定義を使用して、完全な型安全性を実現
 *
 * 使用例:
 * ```ts
 * const res = await rpcClient.passkey["register-options"].$get();
 * if (res.ok) {
 *   const data = await res.json();
 *   // data は型推論される
 * }
 * ```
 */
export const rpcClient = hc<AppType>("/");

/**
 * パスキー関連のAPIクライアント
 * よく使うAPIをラップして使いやすくする
 */
export const passkeyApi = {
  /**
   * パスキー登録オプションを取得
   */
  getRegisterOptions: async () => {
    const res = await rpcClient.rpc.passkey["register-options"].$get();
    if (!res.ok) {
      throw new Error("パスキー登録オプションの取得に失敗しました");
    }
    return res.json();
  },

  /**
   * パスキー登録を検証
   * @param registrationResponse WebAuthn登録レスポンス
   */
  verifyRegistration: async (
    registrationResponse: RegistrationResponseJSON,
  ) => {
    const res = await rpcClient.rpc.passkey["register-verify"].$post({
      json: registrationResponse,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(
        "error" in error
          ? (error.error as string)
          : "パスキー登録の検証に失敗しました",
      );
    }
    return res.json();
  },
};
