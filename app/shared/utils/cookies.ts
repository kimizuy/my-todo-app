export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));

  if (!cookie) return null;

  return cookie.split("=")[1];
}

export function setCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    maxAge?: number;
    path?: string;
  } = {},
): string {
  const {
    httpOnly = true,
    secure = true,
    sameSite = "Lax",
    maxAge = 60 * 60 * 24 * 7, // 7日間
    path = "/",
  } = options;

  let cookie = `${name}=${value}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}`;

  if (httpOnly) cookie += "; HttpOnly";
  if (secure) cookie += "; Secure";

  return cookie;
}

export function deleteCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0`;
}
