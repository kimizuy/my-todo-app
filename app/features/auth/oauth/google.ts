import { Google, generateCodeVerifier, generateState } from "arctic";

/**
 * Google OAuthクライアントを作成
 */
export function createGoogleOAuthClient(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Google {
  return new Google(clientId, clientSecret, redirectUri);
}

/**
 * Google認証URLを生成
 * @param google Googleクライアントインスタンス
 * @param state CSRF保護用のstate
 * @param codeVerifier PKCE用のcodeVerifier
 * @returns 認証URL
 */
export function createGoogleAuthorizationURL(
  google: Google,
  state: string,
  codeVerifier: string,
): URL {
  const scopes = ["email", "profile"];
  return google.createAuthorizationURL(state, codeVerifier, scopes);
}

/**
 * Google認証コードを検証してトークンを取得
 * @param google Googleクライアントインスタンス
 * @param code 認証コード
 * @param codeVerifier PKCE用のcodeVerifier
 * @returns アクセストークン等
 */
export async function validateGoogleAuthorizationCode(
  google: Google,
  code: string,
  codeVerifier: string,
) {
  return await google.validateAuthorizationCode(code, codeVerifier);
}

/**
 * Googleユーザー情報を取得
 * @param accessToken アクセストークン
 * @returns ユーザー情報
 */
export async function getGoogleUser(accessToken: string): Promise<{
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
}> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google user info");
  }

  return await response.json();
}

/**
 * OAuth state値を生成
 */
export function generateOAuthState(): string {
  return generateState();
}

/**
 * PKCE code verifierを生成
 */
export function generateOAuthCodeVerifier(): string {
  return generateCodeVerifier();
}
