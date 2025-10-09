interface JWTPayload {
  userId: number;
  email: string;
  exp: number;
}

export async function createJWT(
  payload: Omit<JWTPayload, "exp">,
  secret: string,
  expiresInSeconds: number = 60 * 60 * 24 * 7, // 7日間
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const header = { alg: "HS256", typ: "JWT" };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload | null> {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    const expectedSignature = await sign(
      `${encodedHeader}.${encodedPayload}`,
      secret,
    );

    if (signature !== expectedSignature) {
      return null;
    }

    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return base64UrlEncode(signature);
}

function base64UrlEncode(data: string | ArrayBuffer): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }
  return atob(str);
}
