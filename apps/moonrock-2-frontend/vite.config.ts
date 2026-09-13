import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        services: resolve(__dirname, "services.html"),
        contact: resolve(__dirname, "contact.html"),
        privacyPolicy: resolve(__dirname, "privacy-policy.html"),
        termsOfService: resolve(__dirname, "terms-of-service.html"),
        optIn: resolve(__dirname, "opt-in.html"),
      },
    },
  },
});
