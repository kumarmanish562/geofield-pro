import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
  esbuild: {
    loader: "js",
    include: /\.js$/,
    exclude: [],
  },
});
