import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import {
  markEmailAsVerified,
  verifyEmailToken,
} from "~/features/auth/lib/verification";
import { verifyEmailSchema } from "~/features/auth/validation";
import { errorResponse, formatZodError } from "~/shared/lib/errors";

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
