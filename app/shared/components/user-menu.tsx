import { Menu } from "lucide-react";
import { Form, Link } from "react-router";
import { Button } from "~/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";

interface UserMenuProps {
  user?: {
    email: string;
  } | null;
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline" aria-label="メニュー">
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end">
        <DropdownMenuItem asChild>
          <Link to="/archives">アーカイブページへ</Link>
        </DropdownMenuItem>
        {user && (
          <>
            <DropdownMenuSeparator />
            <div className="text-muted-foreground px-2 py-1.5 text-sm">
              {user.email}
            </div>
            <div className="flex justify-end">
              <DropdownMenuItem asChild>
                <Form method="post" action="/api/auth/logout">
                  <Button type="submit" variant="default" size="sm">
                    ログアウト
                  </Button>
                </Form>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
