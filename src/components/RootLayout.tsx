import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import { OfflineBadge } from "@/components/OfflineBadge";
import { UpdatePrompt } from "@/components/UpdatePrompt";

/** Documento HTML della app (`shellComponent` della root route). */
export function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Layout comune a tutte le pagine (`component` della root route). */
export function RootComponent() {
  return (
    <>
      <Outlet />
      <OfflineBadge />
      <UpdatePrompt />
    </>
  );
}
