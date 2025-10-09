import type { ZodError } from "zod";

/**
 * エラーレスポンスの型定義
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  message?: string;
  details?: unknown;
}

/**
 * カスタムエラーの基底クラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Invalid credentials") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

/**
 * 認可エラー
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

/**
 * リソースが見つからないエラー
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * メール認証が未完了のエラー
 */
export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(
      "Please verify your email address before logging in",
      403,
      "EMAIL_NOT_VERIFIED",
    );
    this.name = "EmailNotVerifiedError";
  }
}

/**
 * トークンが無効または期限切れのエラー
 */
export class InvalidTokenError extends AppError {
  constructor(message: string = "Invalid or expired token") {
    super(message, 400, "INVALID_TOKEN");
    this.name = "InvalidTokenError";
  }
}

/**
 * Zodのバリデーションエラーを整形
 */
export function formatZodError(error: ZodError<any>): ValidationError {
  const firstError = error.issues[0];
  const message = firstError?.message || "Validation failed";
  return new ValidationError(message, error.issues);
}

/**
 * エラーからレスポンスオブジェクトを生成
 */
export function createErrorResponse(error: unknown): {
  response: ErrorResponse;
  status: number;
} {
  if (error instanceof AppError) {
    return {
      response: {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && { details: error.details }),
      },
      status: error.statusCode,
    };
  }

  // 未知のエラー
  console.error("Unexpected error:", error);
  return {
    response: {
      error: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    },
    status: 500,
  };
}

/**
 * エラーレスポンスを返すヘルパー
 */
export function errorResponse(error: unknown): Response {
  const { response, status } = createErrorResponse(error);
  return Response.json(response, { status });
}
