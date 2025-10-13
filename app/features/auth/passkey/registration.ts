import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import { passkeyApi } from "~/client/rpc";

export type PasskeyRegistrationStatus =
  | "idle"
  | "registering"
  | "success"
  | "error";

export interface UsePasskeyRegistrationOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function usePasskeyRegistration(
  options?: UsePasskeyRegistrationOptions,
) {
  const [status, setStatus] = useState<PasskeyRegistrationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const register = async () => {
    try {
      setStatus("registering");
      setError(null);

      // 1. 登録オプション取得 (Hono RPC経由)
      // 戻り値の型はHono RPCから自動推論される
      const registrationOptions = await passkeyApi.getRegisterOptions();

      // 2. WebAuthn登録プロセス開始
      const registrationResponse = await startRegistration({
        optionsJSON: registrationOptions,
      });

      // 3. 検証リクエスト送信 (Hono RPC経由)
      // registrationResponseはRegistrationResponseJSON型なのでそのまま渡せる
      await passkeyApi.verifyRegistration(registrationResponse);

      setStatus("success");
      options?.onSuccess?.();
    } catch (err) {
      // ユーザーがキャンセルした場合はエラー表示しない
      if (err instanceof Error && err.name === "NotAllowedError") {
        setStatus("idle");
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : "パスキーの登録に失敗しました";
      setError(errorMessage);
      setStatus("error");
      options?.onError?.(errorMessage);
    }
  };

  return {
    register,
    status,
    error,
    isRegistering: status === "registering",
    isSuccess: status === "success",
    isError: status === "error",
  };
}
