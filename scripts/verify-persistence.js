/**
 * Comprueba de extremo a extremo que los datos sobreviven a un reinicio de la aplicación:
 * arranca la app real con una base SQLite temporal, crea datos, la detiene, la vuelve a
 * arrancar y verifica que los datos siguen ahí. No toca data/employees.db.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.VERIFY_PORT) || 3199;
const BASE = `http://127.0.0.1:${PORT}/api/v1`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-persistencia-"));
const dbFile = path.join(dir, "employees.db");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(method, route, body) {
  const response = await fetch(BASE + route, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function startServer() {
  const child = spawn(process.execPath, [path.join(root, "dist", "main.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT), SQLITE_DB_FILE: dbFile, LEGACY_JSON_FILE: "" },
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw new Error("La aplicación terminó al arrancar");
    try {
      await fetch(`${BASE}/employees/1`);
      return child;
    } catch {
      await sleep(200);
    }
  }
  child.kill();
  throw new Error("La aplicación no respondió a tiempo");
}

function stopServer(child) {
  return new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill();
  });
}

(async () => {
  let server;
  try {
    console.log("1) Arrancando la aplicación con una base SQLite nueva...");
    server = await startServer();

    const created = await api("POST", "/employees", {
      document: "PERSIST-1",
      firstName: "Laura",
      lastName: "Gomez",
      position: "Analista",
      salary: 2500000,
      contract: { startDate: "2026-01-15", type: "indefinido" },
    });
    assert.strictEqual(created.status, 201);
    const id = created.body.id;
    assert.strictEqual((await api("PATCH", `/employees/${id}`, { position: "Lider", salary: 3000000 })).status, 200);
    const vacation = await api("POST", `/employees/${id}/vacations`, { startDate: "2026-07-01", endDate: "2026-07-10" });
    assert.strictEqual(vacation.status, 201);
    assert.strictEqual((await api("PATCH", `/vacations/${vacation.body.id}`, { decision: "aprobar" })).status, 200);
    console.log(`   creado empleado ${id} con 2 cambios en el historial y una vacación aprobada`);

    console.log("2) Deteniendo la aplicación...");
    await stopServer(server);
    assert.ok(fs.existsSync(dbFile), "el archivo .db debe existir");
    console.log(`   archivo ${dbFile} (${fs.statSync(dbFile).size} bytes)`);

    console.log("3) Arrancando de nuevo con el mismo archivo...");
    server = await startServer();

    const employee = await api("GET", `/employees/${id}`);
    assert.strictEqual(employee.status, 200);
    assert.strictEqual(employee.body.document, "PERSIST-1");
    assert.strictEqual(employee.body.position, "Lider");
    assert.strictEqual(employee.body.salary, 3000000);
    assert.deepStrictEqual(employee.body.history.map((h) => h.type), ["cargo", "salario"]);

    const overlap = await api("POST", `/employees/${id}/vacations`, { startDate: "2026-07-05", endDate: "2026-07-06" });
    assert.strictEqual(overlap.status, 409);
    assert.strictEqual(overlap.body.code, "VACATION_OVERLAP");

    const next = await api("POST", "/employees", {
      document: "PERSIST-2",
      firstName: "Carlos",
      lastName: "Perez",
      position: "Dev",
      salary: 1,
      contract: { startDate: "2026-02-01", type: "fijo" },
    });
    assert.strictEqual(next.status, 201);
    assert.strictEqual(next.body.id, String(Number(id) + 1), "los ids deben continuar");
    console.log("   empleado, historial, vacación aprobada y secuencia de ids intactos tras el reinicio");

    console.log("\nOK: los datos persisten después de reiniciar la aplicación.");
  } catch (error) {
    console.error(`\nFALLO: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (server && server.exitCode === null) await stopServer(server);
    fs.rmSync(dir, { recursive: true, force: true });
  }
})();
