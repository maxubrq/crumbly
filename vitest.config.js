import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: [],
    environment: "node", // or 'happy-dom' if you need DOM
    exclude: ["node_modules"],
    coverage: {
      include: ["src"],
    },
  },
});
