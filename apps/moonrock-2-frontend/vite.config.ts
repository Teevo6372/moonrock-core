import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // @clerk/clerk-js does its own internal dynamic import() to lazy-load its
  // UI components chunk. Vite's dev-mode dependency pre-bundling rewrites
  // that in a way that breaks it (throws "Clerk was not loaded with Ui
  // components" at runtime) - excluding it from optimizeDeps makes Vite
  // serve the package's own pre-built ESM as-is instead. Production builds
  // aren't affected (this only controls the dev-server dependency cache).
  optimizeDeps: {
    exclude: ["@clerk/clerk-js"],
  },
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
