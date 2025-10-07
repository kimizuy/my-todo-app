import { useId } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getAuthUser } from "~/lib/auth.server";
import type { Route } from "./+types/route";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getAuthUser(request, context);
  if (user) {
    throw redirect("/");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const response = await fetch(new URL("/api/auth/login", request.url), {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return { error: data.error || "Login failed" };
  }

  const cookie = response.headers.get("Set-Cookie");

  return redirect("/", {
    headers: cookie ? { "Set-Cookie": cookie } : undefined,
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const emailId = useId();
  const passwordId = useId();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ログイン</h1>
        </div>

        <Form method="post" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={emailId}>メールアドレス</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={passwordId}>パスワード</Label>
            <Input
              id={passwordId}
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>

          {actionData?.error && (
            <div className="text-sm text-red-600">{actionData.error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </Button>
        </Form>

        <div className="text-center text-sm">
          アカウントをお持ちでない方は{" "}
          <a href="/register" className="underline">
            登録
          </a>
        </div>
      </div>
    </div>
  );
}
