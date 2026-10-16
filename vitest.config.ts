import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "**/*spec.ts",
        "**/node_modules/**",
        "src/config/**",
        "src/services/interfaces/**",
        "src/dto/**",
        "src/routes/**",
        "src/main.ts",
        "src/server.ts",
      ],
    },
  },
});
