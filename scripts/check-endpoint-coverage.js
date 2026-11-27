/**
 * Comprueba que TODOS los endpoints registrados en la aplicación tienen pruebas Playwright.
 *
 * - Lee las rutas reales del router de Express (dist/routes/v1/employees.route.js).
 * - Lee las pruebas con `playwright test --list`; cada endpoint debe tener un
 *   test.describe cuyo título sea "MÉTODO /ruta" (por ejemplo "GET /api/v1/employees/:id").
 * - Termina con error si algún endpoint no tiene pruebas.
 */
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
// server.ts monta las rutas en "/api" y routes/v1/index.ts en "/v1".
const PREFIX = "/api/v1";

const router = require(path.join(root, "dist", "routes", "v1", "employees.route.js")).default;
const routes = router.stack
  .filter((layer) => layer.route)
  .flatMap((layer) =>
    Object.keys(layer.route.methods)
      .filter((method) => layer.route.methods[method])
      .map((method) => `${method.toUpperCase()} ${PREFIX}${layer.route.path}`)
  );

const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
const output = execFileSync(process.execPath, [playwrightCli, "test", "--list", "--reporter=json"], {
  cwd: root,
  encoding: "utf-8",
  maxBuffer: 64 * 1024 * 1024,
});
const report = JSON.parse(output);

const countSpecs = (suite) =>
  (suite.specs || []).length + (suite.suites || []).reduce((total, child) => total + countSpecs(child), 0);

const testsByTitle = new Map();
const visit = (suite) => {
  for (const child of suite.suites || []) {
    if (/^(GET|POST|PUT|PATCH|DELETE) \//.test(child.title)) {
      testsByTitle.set(child.title, (testsByTitle.get(child.title) || 0) + countSpecs(child));
    }
    visit(child);
  }
};
(report.suites || []).forEach(visit);

let missing = 0;
console.log("Endpoint".padEnd(46) + "Pruebas");
console.log("-".repeat(56));
for (const route of routes) {
  const total = testsByTitle.get(route) || 0;
  if (total === 0) missing += 1;
  console.log(route.padEnd(46) + (total > 0 ? String(total) : "SIN PRUEBAS"));
}

const unknown = [...testsByTitle.keys()].filter((title) => !routes.includes(title));
unknown.forEach((title) => console.warn(`Aviso: hay pruebas para "${title}" pero ese endpoint no existe`));

console.log("-".repeat(56));
if (missing > 0) {
  console.error(`${missing} endpoint(s) sin pruebas.`);
  process.exit(1);
}
console.log(`OK: los ${routes.length} endpoints tienen pruebas (${[...testsByTitle.values()].reduce((a, b) => a + b, 0)} en total).`);
