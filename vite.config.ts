import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Deploy: Nitro sceglie il preset in automatico (`vercel` quando la build gira su
// Vercel, `node-server` in locale). Per riprodurre in locale l'output di Vercel:
// `NITRO_PRESET=vercel npm run build` → `.vercel/output`.

// Service Worker e Nitro — tre vincoli:
// 1. Nitro scrive la build client direttamente nella cartella pubblica del preset
//    (`.vercel/output/static` su Vercel, `.output/public` in locale), mentre
//    vite-plugin-pwa ragiona sul `build.outDir` globale (`dist`). Leggiamo la
//    cartella reale del client dalla config risolta e la passiamo al plugin PWA.
// 2. Il plugin PWA genera `sw.js` alla fine di OGNI ambiente (client, ssr, nitro).
//    Lo limitiamo al client: una sola generazione, prima che Nitro registri
//    dimensioni ed etag degli asset pubblici (altrimenti il server Node serve un
//    `sw.js` troncato).
// 3. Nitro disattiva la copia di `public/` nella build client e la fa lui più
//    tardi: la riattiviamo, così icone e manifest sono già presenti quando il SW
//    calcola il precache.
let clientOutDir: string | undefined;

const captureClientOutDir: Plugin = {
  name: "roundrobinarena:capture-client-outdir",
  configResolved(config) {
    const outDir = config.environments.client?.build.outDir;
    if (outDir) clientOutDir = resolve(config.root, outDir);
  },
};

const pwaPlugins = VitePWA({
  integration: {
    beforeBuildServiceWorker(options) {
      if (!clientOutDir) {
        throw new Error("[pwa] cartella della build client non trovata");
      }
      const swDest = resolve(clientOutDir, options.filename.replace(/\.ts$/, ".js"));
      options.outDir = clientOutDir;
      options.swDest = swDest;
      options.injectManifest.swDest = swDest;
      options.injectManifest.globDirectory = clientOutDir;
    },
  },
  // Custom Service Worker (injectManifest): serve un fallback offline
  // intelligente perché l'app è SSR e non esiste un /index.html statico da
  // usare come navigateFallback.
  strategies: "injectManifest",
  srcDir: "src",
  filename: "sw.ts",
  registerType: "autoUpdate",
  injectRegister: false, // registriamo a mano in src/pwa-register.ts
  manifest: false, // ne serviamo uno nostro da public/manifest.webmanifest
  devOptions: {
    enabled: false,
  },
  // Niente includeAssets: icone e manifest sono già coperti da globPatterns
  // e duplicarli genererebbe entry in conflitto nel precache.
  injectManifest: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,webmanifest}"],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  },
}).map((plugin): Plugin =>
  plugin.name === "vite-plugin-pwa:build"
    ? { ...plugin, applyToEnvironment: (environment) => environment.name === "client" }
    : plugin,
);

export default defineConfig({
  resolve: {
    // Alias `@/*` → `src/*` letto da tsconfig.json.
    tsconfigPaths: true,
  },
  environments: {
    client: {
      build: { copyPublicDir: true },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
    captureClientOutDir,
    ...pwaPlugins,
  ],
});
