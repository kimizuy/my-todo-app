import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { errorResponse, formatZodError } from "~/lib/errors.server";
import { verifyEmailSchema } from "~/lib/validation.server";
import {
  markEmailAsVerified,
  verifyEmailToken,
} from "~/lib/verification.server";

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const rawData = {
      token: formData.get("token"),
    };

    // バリデーション
    const validation = verifyEmailSchema.safeParse(rawData);
    if (!validation.success) {
      throw formatZodError(validation.error);
    }

    const { token } = validation.data;
    const db = drizzle(context.cloudflare.env.DB);

    // トークン検証
    const user = await verifyEmailToken(token, db);

    // メール認証完了
    await markEmailAsVerified(user.id, db);

    return Response.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
