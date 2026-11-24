# Administración de empleados

API REST para centralizar empleados, contratos, vacaciones e historial de cargo y salario.

Arquitectura en capas: rutas, controlador, servicio, DTOs, contenedor Awilix y manejo global de errores. Las reglas de negocio viven en el servicio y acceden a los datos mediante repositorios. La persistencia usa PostgreSQL en Supabase mediante el driver `pg`.

## Requisitos

- **Node.js 22.13 o superior** (`node -v`) y una base PostgreSQL de Supabase. Configura `DATABASE_URL` en `.env` a partir de `.env.example`; la contraseña solo se introduce en ese archivo local.
- Opcional: `npm install` solo si falta la carpeta `node_modules` (el proyecto ya la incluye).


## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Inicia la API (`dist/main.js`) en `http://localhost:3000`. Ejecutar antes `npm run build` |
| `npm run dev` | Inicia la API en modo desarrollo (`tsx watch`) |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:api` | Compila y ejecuta las pruebas de API con Playwright contra la app real y PostgreSQL en `test_api` |
| `npm run test:api:report` | Abre el reporte HTML de la última ejecución de Playwright |
| `npm run check:endpoints` | Verifica que cada endpoint de la app tiene pruebas Playwright |
| `npm run verify:persistence` | Arranca la app, crea datos, la reinicia y comprueba que los datos siguen |
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

## Persistencia (PostgreSQL)

Las tablas se crean al iniciar con `CREATE TABLE IF NOT EXISTS`. No se importan datos de archivos locales anteriores. Variables de entorno:

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `DATABASE_URL` | — | URI PostgreSQL de Supabase; obligatoria |
| `DB_SCHEMA` | `public` | Esquema PostgreSQL |
| `PORT` | `3000` | Puerto de la API |


### Tablas

Derivadas de lo que ya usaba la aplicación (`EmployeeRecord`, `HistoryEntryDTO`, `VacationRecord`):

| Tabla | Columnas | Restricciones |
| --- | --- | --- |
| `employees` | `id` BIGINT identity PRIMARY KEY, `document`, `first_name`, `last_name`, `position`, `salary` DOUBLE PRECISION, `status`, `contract_start_date` TEXT, `contract_type`, `contract_status` | `document` UNIQUE; `salary >= 0`; CHECK de `status`, `contract_type`, `contract_status` con los valores del DTO |
| `employee_history` | `id` BIGINT identity PRIMARY KEY, `employee_id` (FK → `employees.id`), `type`, `previous_value`, `new_value`, `changed_at` | CHECK de `type` (`cargo`, `salario`, `estado`); índice por `employee_id` |
| `vacations` | `id` BIGINT identity PRIMARY KEY, `employee_id` (FK → `employees.id`), `start_date`, `end_date` TEXT, `status` | CHECK de `status`; `end_date >= start_date`; índice por `employee_id` |



## Pruebas

- **Unitarias (Vitest, `test/`)**: servicio, controlador, middleware, repositorios PostgreSQL.
- **API (Playwright, `api-tests/`)**: se ejecutan contra la aplicación real compilada en el esquema `test_api`, que se recrea para cada ejecución. Requieren `DATABASE_URL`. Los scripts solo recrean esquemas con prefijos `test_` o `verify_`, nunca `public`.

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
  config/container.ts            Contenedor Awilix (registra PostgreSQL)
  database/
    postgres-database.ts         Pool pg, transacciones y tablas
    schema.ts                    Tipos de registro
  repositories/
    postgres-employee.repository.ts / postgres-vacation.repository.ts
api-tests/                       Pruebas Playwright (services, fixtures, support, tests)
scripts/                         check-endpoint-coverage, verify-persistence
playwright.config.ts
```
