// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        // Custom Service Worker (injectManifest) — ci serve un fallback offline
        // intelligente perché l'app è SSR su Cloudflare Workers e non esiste
        // un /index.html statico da usare come navigateFallback.
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "prompt",
        injectRegister: false, // registriamo a mano in src/pwa-register.ts
        manifest: false, // ne serviamo uno nostro da public/manifest.webmanifest
        devOptions: {
          enabled: false,
        },
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "icon-192.png",
          "icon-512.png",
          "icon-512-maskable.png",
          "manifest.webmanifest",
        ],
        injectManifest: {
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,webp,woff,woff2,webmanifest}",
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
  },
});
