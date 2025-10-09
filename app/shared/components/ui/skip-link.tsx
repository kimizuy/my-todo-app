import { cn } from "~/shared/lib/utils";

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50",
        "bg-primary text-primary-foreground rounded-md px-4 py-2",
        "focus:outline-ring focus:outline-2 focus:outline-offset-2",
      )}
    >
      {children}
    </a>
  );
}
