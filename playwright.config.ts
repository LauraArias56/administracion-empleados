import { defineConfig } from "@playwright/test";

// Las pruebas de API se ejecutan contra la aplicación real (dist/main.js) usando SQLite,
// en un puerto y con una base de datos de prueba independientes de los de la presentación.
const PORT = Number(process.env.TEST_PORT) || 3100;

export default defineConfig({
  testDir: "./api-tests/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/api/`,
  },
  projects: [{ name: "api" }],
  webServer: {
    command: "node api-tests/support/start-test-server.js",
    port: PORT,
    env: { TEST_PORT: String(PORT) },
    // Nunca reutilizar un servidor ya levantado: evita tocar la base de datos de la presentación.
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
