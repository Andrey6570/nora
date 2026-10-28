import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  // es2022 for top-level await: the store is chosen at start (Firebase, demo or none)
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" }
});
