# Administración de empleados

API REST para centralizar empleados, contratos, vacaciones e historial de cargo y salario.

Arquitectura en capas: rutas, controlador, servicio, DTOs, contenedor Awilix y manejo global de errores. Las reglas de negocio viven en el servicio y acceden a los datos mediante repositorios. La persistencia es **SQLite** (archivo local `.db`).

## Requisitos

- **Node.js 22.13 o superior** (`node -v`). SQLite se usa mediante el módulo `node:sqlite` incluido en Node.js: no hay que instalar nada más, ni compilar, ni usar Docker o un administrador de bases de datos.
- Opcional: `npm install` solo si falta la carpeta `node_modules` (el proyecto ya la incluye).

> Node muestra al arrancar el aviso `ExperimentalWarning: SQLite is an experimental feature`. Es normal y no afecta al funcionamiento.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Inicia la API (`dist/main.js`) en `http://localhost:3000`. Ejecutar antes `npm run build` |
| `npm run dev` | Inicia la API en modo desarrollo (`tsx watch`) |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:api` | Compila y ejecuta las pruebas de API con Playwright contra la app real y SQLite |
| `npm run test:api:report` | Abre el reporte HTML de la última ejecución de Playwright |
| `npm run check:endpoints` | Verifica que cada endpoint de la app tiene pruebas Playwright |
| `npm run verify:persistence` | Arranca la app, crea datos, la reinicia y comprueba que los datos siguen |
| `npm run migrate:json` | Importa manualmente un JSON antiguo a SQLite (seguro de repetir) |
| `npm run typecheck:api` | Comprueba los tipos de las pruebas Playwright |

Inicio rápido para presentar:

```bash
npm run build
npm start
```

## Endpoints

Prefijo: `/api/v1`

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/employees` | Crea un empleado con cargo, salario, estado y contrato |
| GET | `/employees/:id` | Consulta el empleado, su contrato y el historial |
| PATCH | `/employees/:id` | Actualiza cargo, salario o estado y registra el cambio |
| POST | `/employees/:id/vacations` | Solicita vacaciones y valida fechas y solapes |
| PATCH | `/vacations/:id` | Aprueba o rechaza una solicitud pendiente |

## Persistencia (SQLite)

El archivo es `data/employees.db` (se crea solo en el primer arranque, junto con las tablas; `data/` está en `.gitignore`). Variables de entorno opcionales:

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `SQLITE_DB_FILE` | `data/employees.db` | Ubicación del archivo SQLite |
| `LEGACY_JSON_FILE` | `data/db.json` | JSON de la versión anterior a migrar (vacío = no migrar) |
| `PORT` | `3000` | Puerto de la API |

Para llevar los datos a otro equipo basta copiar `data/employees.db`.

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

- **Unitarias (Vitest, `test/`)**: servicio, controlador, middleware, repositorios SQLite y migración.
- **API (Playwright, `api-tests/`)**: se ejecutan contra la aplicación real compilada, con SQLite. `npm run test:api` levanta la app en el puerto **3100** con una base independiente (`data/test/employees.test.db`, recreada vacía en cada ejecución), así que no toca los datos de la presentación. Cada prueba crea sus propios datos con documentos únicos, por lo que se pueden repetir y ejecutar en cualquier orden. No requieren navegadores.

### Cobertura de endpoints

| Endpoint | Archivo de pruebas | Pruebas | Qué cubren |
| --- | --- | --- | --- |
| `POST /api/v1/employees` | `api-tests/tests/employees/create-employee.spec.ts` | 37 | 201 con valores por defecto, recorte de texto, estados y tipos de contrato, salario 0/decimal, persistencia, ids distintos, 409 documento duplicado (también concurrente), 24 casos de validación 400 (documento, nombre, apellido, cargo, salario, estado, contrato, fechas), JSON inválido |
| `GET /api/v1/employees/:id` | `api-tests/tests/employees/get-employee.spec.ts` | 11 | 200 con datos, contrato e historial (adaptada de la prueba original), 404 inexistente / id no numérico / con ceros a la izquierda, 400 id vacío |
| `PATCH /api/v1/employees/:id` | `api-tests/tests/employees/update-employee.spec.ts` | 17 | Cambio de cargo, salario y estado con historial, varios cambios a la vez, historial acumulado, persistencia, sin cambios, cuerpo vacío, campos ignorados, 404, 400 de validaciones y atomicidad |
| `POST /api/v1/employees/:id/vacations` | `api-tests/tests/employees/request-vacation.spec.ts` | 32 | 201 pendiente, un día, otro empleado, tras un rechazo, 14 casos de solape (pendiente/aprobada), 404, 400 id vacío, 409 empleado inactivo, 7 casos de fechas inválidas |
| `PATCH /api/v1/vacations/:id` | `api-tests/tests/vacations/resolve-vacation.spec.ts` | 16 | Aprobar, rechazar, efecto en solapes, 4 casos de 409 ya resuelta, 404, 400 id vacío, 4 decisiones inválidas |

`npm run check:endpoints` lee las rutas reales de Express y confirma que cada una tiene su `test.describe` con ese nombre.

## Estructura

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
api-tests/                       Pruebas Playwright (services, fixtures, support, tests)
scripts/                         migrate-json, check-endpoint-coverage, verify-persistence
playwright.config.ts
```
