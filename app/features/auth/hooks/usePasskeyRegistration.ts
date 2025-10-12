import {
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useState } from "react";

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

      // 1. 登録オプション取得
      const optionsResponse = await fetch("/api/passkey/register-options");
      if (!optionsResponse.ok) {
        throw new Error("登録オプションの取得に失敗しました");
      }
      const registrationOptions =
        (await optionsResponse.json()) as PublicKeyCredentialCreationOptionsJSON;

      // 2. WebAuthn登録プロセス開始
      const registrationResponse = await startRegistration({
        optionsJSON: registrationOptions,
      });

      // 3. 検証リクエスト送信
      const verifyResponse = await fetch("/api/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationResponse),
      });

      if (!verifyResponse.ok) {
        const errorData = (await verifyResponse.json()) as { error?: string };
        throw new Error(errorData.error || "パスキーの登録に失敗しました");
      }

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
