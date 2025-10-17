import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      serverModuleFormat: "esm",
    }),
  ],
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
    },
  },
  ssr: {
    noExternal: ["@prisma/client", "prisma"],
  },
});
