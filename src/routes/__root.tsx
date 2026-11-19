import { createRootRoute } from "@tanstack/react-router";

import { NotFoundComponent } from "@/components/NotFoundComponent";
import { RootComponent, RootShell } from "@/components/RootLayout";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no",
      },
      { title: "Ping Pong Tournament — All vs All" },
      {
        name: "description",
        content:
          "Gestisci un torneo di ping pong all vs all con 3-12 giocatori configurabili, classifica live e salvataggio automatico.",
      },
      // PWA / theming
      { name: "theme-color", content: "#0a0a14" },
      { name: "color-scheme", content: "dark" },
      { name: "application-name", content: "Ping Pong" },
      // iOS standalone
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Ping Pong" },
      { name: "format-detection", content: "telephone=no" },
      // Open Graph / Twitter
      { property: "og:title", content: "Ping Pong Tournament — All vs All" },
      {
        property: "og:description",
        content:
          "Torneo round-robin con giocatori configurabili, classifica live e gestione automatica dei numeri dispari.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "/icon-512.png" },
      { name: "twitter:title", content: "Ping Pong Tournament — All vs All" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});
