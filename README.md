# Administración de empleados

[![CI](https://github.com/LauraArias56/administracion-empleados/actions/workflows/ci.yml/badge.svg)](https://github.com/LauraArias56/administracion-empleados/actions/workflows/ci.yml)

Aplicación web para gestionar empleados, contratos, vacaciones e historial laboral. La interfaz usa React y Vite. La API REST usa Express, TypeScript y Awilix, con SQLite para la persistencia local.

## Enlaces

| Recurso | Enlace |
| --- | --- |
| Repositorio | [LauraArias56/administracion-empleados](https://github.com/LauraArias56/administracion-empleados) |
| Aplicación web | [Administración de empleados en Vercel](https://administracion-empleados.vercel.app/) |
| Pipeline de CI | [Ejecuciones en GitHub Actions](https://github.com/LauraArias56/administracion-empleados/actions/workflows/ci.yml) |

## Pipeline de integración continua

El [workflow de CI](.github/workflows/ci.yml) se ejecuta con Node.js 22 en Ubuntu al abrir, actualizar o reabrir un pull request, y al subir cambios a `main`, `master` o `fix/sonar-duplication-cleanup`. Instala las dependencias de la API y del frontend, compila ambos, ejecuta las pruebas unitarias con cobertura, valida los tipos de las pruebas de API y ejecuta Playwright con una base SQLite independiente.

### SonarCloud

El análisis está pendiente de configuración. Para habilitarlo, completa `sonar.projectKey` y `sonar.organization` en [sonar-project.properties](sonar-project.properties) y guarda `SONAR_TOKEN` como secreto del repositorio en **Settings → Secrets and variables → Actions**. Mientras falte algún valor, el workflow omite el análisis y ejecuta la compilación y las pruebas.

El análisis incluye la API y el frontend. La cobertura corresponde a las pruebas unitarias de la API y se importa desde `coverage/lcov.info`.

## Requisitos

- **Node.js 22.13 o superior** y npm.
- SQLite se usa mediante el módulo `node:sqlite` incluido en Node.js.

## Instalación y ejecución local

Clona el repositorio e instala las dependencias desde la raíz del proyecto.

```bash
git clone https://github.com/LauraArias56/administracion-empleados.git
cd administracion-empleados
npm ci
npm ci --prefix frontend
```

Inicia la API en una terminal y la interfaz en otra, ambas desde la raíz.

| Componente | Comando | URL local |
| --- | --- | --- |
| API | `npm run dev` | `http://localhost:3000/api/v1` |
| Interfaz web | `npm run dev --prefix frontend` | `http://localhost:5173` |

Para ejecutar la versión compilada de la API, usa `npm run build` seguido de `npm start`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Compila la API a `dist/` y el frontend a `frontend/dist/` |
| `npm start` | Inicia la API (`dist/main.js`) en `http://localhost:3000`. Ejecutar antes `npm run build` |
| `npm run dev` | Inicia la API en modo desarrollo (`tsx watch`) |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:coverage` | Ejecuta Vitest y genera los informes `coverage/index.html` y `coverage/lcov.info` |
| `npm run test:api` | Compila y ejecuta las pruebas de API con Playwright contra la app real y SQLite |
| `npm run test:api:report` | Abre el reporte HTML de la última ejecución de Playwright |
| `npm run check:endpoints` | Verifica que cada endpoint de la app tiene pruebas Playwright |
| `npm run verify:persistence` | Arranca la app, crea datos, la reinicia y comprueba que los datos siguen |
| `npm run migrate:json` | Importa manualmente un JSON antiguo a SQLite (seguro de repetir) |
| `npm run typecheck:api` | Comprueba los tipos de las pruebas Playwright |

## Endpoints

La URL base de la API local es `http://localhost:3000/api/v1`. El frontend usa las mismas rutas con el prefijo `/datos/v1`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/employees` | Lista los empleados |
| POST | `/employees` | Crea un empleado con cargo, salario, estado y contrato |
| GET | `/employees/:id` | Consulta el empleado, su contrato y el historial |
| PATCH | `/employees/:id` | Actualiza el cargo, el salario, el estado laboral o el estado del contrato. Registra en el historial los cambios de cargo, salario y estado laboral |
| POST | `/employees/:id/vacations` | Solicita vacaciones y valida fechas y solapes |
| GET | `/vacations` | Lista las solicitudes de vacaciones |
| PATCH | `/vacations/:id` | Aprueba o rechaza una solicitud pendiente |

Los cuerpos de las solicitudes y respuestas están definidos en [employee.dto.ts](src/dto/employee.dto.ts).

## Persistencia (SQLite)

En local, la aplicación crea `data/employees.db` y sus tablas en el primer arranque. En Vercel, el backend usa `/tmp/employees.db` de forma predeterminada, por lo que los datos pueden perderse al cambiar de instancia o desplegar de nuevo.

La API local admite estas variables de entorno.

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `SQLITE_DB_FILE` | `data/employees.db` | Ubicación del archivo SQLite |
| `LEGACY_JSON_FILE` | `data/db.json` | JSON de la versión anterior a migrar (vacío = no migrar) |
| `PORT` | `3000` | Puerto de la API |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido para el cliente web |

La base usa el modo WAL de SQLite (más rápido al escribir): mientras la app corre aparecen también `employees.db-wal` y `employees.db-shm`, y al cerrarse limpiamente se vuelcan al `.db` y desaparecen. Para llevar los datos a otro equipo, cierra la app y copia `data/employees.db` (si la copias con la app abierta, copia también los archivos `-wal` y `-shm`).

### Tablas

Derivadas de lo que ya usaba la aplicación (`EmployeeRecord`, `HistoryEntryDTO`, `VacationRecord`):

| Tabla | Columnas | Restricciones |
| --- | --- | --- |
| `employees` | `id` (PK, autoincremental), `document`, `first_name`, `last_name`, `position`, `salary`, `status`, `contract_start_date`, `contract_type`, `contract_status` | `document` UNIQUE; `salary >= 0`; CHECK de `status`, `contract_type`, `contract_status` con los valores del DTO |
| `employee_history` | `id` (PK), `employee_id` (FK → `employees.id`), `type`, `previous_value`, `new_value`, `changed_at` | CHECK de `type` (`cargo`, `salario`, `estado`); índice por `employee_id` |
| `vacations` | `id` (PK, autoincremental), `employee_id` (FK → `employees.id`), `start_date`, `end_date`, `status` | CHECK de `status`; `end_date >= start_date`; índice por `employee_id` |

### Migración desde JSON

Al arrancar, si la base SQLite está vacía y existe `data/db.json`, sus datos se importan conservando los ids originales y la secuencia de ids. El JSON nunca se modifica ni se borra. Como después de importar la base ya no está vacía, no se vuelve a importar. `npm run migrate:json [archivo.json] [archivo.db]` repite la importación de forma idempotente (omite lo ya existente). Si hay un conflicto o un registro inválido, se cancela todo (ROLLBACK).

## Pruebas

- **Unitarias (Vitest)**. Cubren el servicio, el controlador, el middleware de errores, los repositorios SQLite y la migración.
- **API (Playwright)**. `npm run test:api` levanta la aplicación compilada en el puerto `3100` y recrea su base aislada en `data/test/employees.test.db`. Las pruebas hacen solicitudes HTTP y pueden ejecutarse sin instalar navegadores.
- **Rendimiento (k6)**. Los escenarios de humo, carga y estrés se ejecutan por separado del CI. [Instrucciones y comandos de k6](pruebas-estres-humo-carga/README.md).

Para probar un entorno de integración remoto, establece `TEST_API_BASE_URL` con su URL base hasta `/api/`. Esta opción se usa fuera del CI y las pruebas crean empleados y solicitudes de vacaciones en ese entorno.

### Cobertura de endpoints

| Endpoint | Archivo de pruebas | Pruebas | Qué cubren |
| --- | --- | --- | --- |
| `GET /api/v1/employees` | `api-tests/tests/employees/list-employees.spec.ts` | 1 | Lista empleados guardados en SQLite |
| `POST /api/v1/employees` | `api-tests/tests/employees/create-employee.spec.ts` | 37 | 201 con valores por defecto, recorte de texto, estados y tipos de contrato, salario 0/decimal, persistencia, ids distintos, 409 documento duplicado (también concurrente), 24 casos de validación 400 (documento, nombre, apellido, cargo, salario, estado, contrato, fechas), JSON inválido |
| `GET /api/v1/employees/:id` | `api-tests/tests/employees/get-employee.spec.ts` | 11 | 200 con datos, contrato e historial (adaptada de la prueba original), 404 inexistente / id no numérico / con ceros a la izquierda, 400 id vacío |
| `PATCH /api/v1/employees/:id` | `api-tests/tests/employees/update-employee.spec.ts` | 17 | Cambio de cargo, salario y estado con historial, varios cambios a la vez, historial acumulado, persistencia, sin cambios, cuerpo vacío, campos ignorados, 404, 400 de validaciones y atomicidad |
| `POST /api/v1/employees/:id/vacations` | `api-tests/tests/employees/request-vacation.spec.ts` | 32 | 201 pendiente, un día, otro empleado, tras un rechazo, 14 casos de solape (pendiente/aprobada), 404, 400 id vacío, 409 empleado inactivo, 7 casos de fechas inválidas |
| `GET /api/v1/vacations` | `api-tests/tests/vacations/list-vacations.spec.ts` | 1 | Lista solicitudes guardadas en SQLite |
| `PATCH /api/v1/vacations/:id` | `api-tests/tests/vacations/resolve-vacation.spec.ts` | 16 | Aprobar, rechazar, efecto en solapes, 4 casos de 409 ya resuelta, 404, 400 id vacío, 4 decisiones inválidas |

`npm run check:endpoints` lee las rutas reales de Express y confirma que cada una tiene su `test.describe` con ese nombre.

## Estructura

La API organiza las solicitudes en rutas, controladores, servicios y repositorios. Awilix conecta estas capas y un middleware centraliza el manejo de errores.

```
src/
  config/container.ts            Contenedor Awilix (registra SQLite)
  database/
    sqlite-database.ts           Conexión, transacciones, creación de tablas
    sqlite-schema.ts             SQL de las tablas
    json-migration.ts            Migración JSON -> SQLite (idempotente)
    bootstrap.ts                 Inicialización + migración al arrancar
    schema.ts                    Tipos de registro (y formato del JSON antiguo)
  repositories/
    sqlite-employee.repository.ts / sqlite-vacation.repository.ts / sqlite-id.ts
frontend/                        Interfaz React y configuración de Vite
test/                            Pruebas unitarias con Vitest
api-tests/                       Pruebas Playwright (services, fixtures, support, tests)
pruebas-estres-humo-carga/         Escenarios de rendimiento con k6
scripts/                         migrate-json, check-endpoint-coverage, verify-persistence
.github/workflows/ci.yml         Pipeline de GitHub Actions
```
