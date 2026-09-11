import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        privacyPolicy: resolve(__dirname, "privacy-policy.html"),
        termsOfService: resolve(__dirname, "terms-of-service.html"),
        optIn: resolve(__dirname, "opt-in.html"),
      },
    },
  },
});
