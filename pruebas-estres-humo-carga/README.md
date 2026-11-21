# Pruebas de rendimiento (k6)

Pruebas de humo (smoke), carga (load) y estrés (stress) de la API de administración de empleados. Es un proyecto independiente: solo consume los endpoints HTTP de la aplicación (`config/env.js`).

## Requisitos

- [k6](https://k6.io/docs/get-started/installation/) instalado (`k6 version`). No es un paquete de npm.
- La aplicación en ejecución, por defecto en `http://localhost:3000/api`. Otra dirección: `k6 run -e BASE_URL=http://localhost:3100/api <archivo>`.

> Estas pruebas **crean datos reales** (empleados, vacaciones, historial), sobre todo carga y estrés. Arranca la aplicación con una base aparte para no ensuciar la de la presentación: `SQLITE_DB_FILE=data/performance.db npm start` (PowerShell: `$env:SQLITE_DB_FILE="data/performance.db"; npm start`).

## Estructura

```
config/      base.config.js (umbrales), env.js (BASE_URL)
services/    employees.service.js, vacations.service.js
utils/       test-data.js (documentos únicos, empleado válido, fechas)
scenarios/
  create-employee/    create-employee.{smoke,load,stress}.js
  get-employee/       get-employee.{smoke,load,stress}.js
  update-employee/    update-employee.{smoke,load,stress}.js
  request-vacation/   request-vacation.{smoke,load,stress}.js
  resolve-vacation/   resolve-vacation.{smoke,load,stress}.js
```

## Endpoints y comandos

| Endpoint | Humo | Carga | Estrés |
| --- | --- | --- | --- |
| `POST /api/v1/employees` | `npm run smoke:create-employee` | `npm run load:create-employee` | `npm run stress:create-employee` |
| `GET /api/v1/employees/:id` | `npm run smoke:get-employee` | `npm run load:get-employee` | `npm run stress:get-employee` |
| `PATCH /api/v1/employees/:id` | `npm run smoke:update-employee` | `npm run load:update-employee` | `npm run stress:update-employee` |
| `POST /api/v1/employees/:id/vacations` | `npm run smoke:request-vacation` | `npm run load:request-vacation` | `npm run stress:request-vacation` |
| `PATCH /api/v1/vacations/:id` | `npm run smoke:resolve-vacation` | `npm run load:resolve-vacation` | `npm run stress:resolve-vacation` |

`npm run smoke:all` ejecuta las cinco pruebas de humo seguidas.

## Perfiles (iguales para todos los endpoints)

| Tipo | Etapas (duración → usuarios virtuales) |
| --- | --- |
| smoke | 10s → 1 |
| load | 20s → 3, 20s → 8, 20s → 30, 1m → 30, 20s → 0 |
| stress | 10s → 5, 30s → 100, 1.5m → 1000, 1m → 1000, 20s → 5 |

## Datos

Los escenarios crean sus propios datos (no dependen de registros previos; la base puede estar vacía):
- `create-employee`: crea un empleado con documento único en cada iteración (201).
- `get-employee`: crea un empleado en `setup()` y lo consulta (200).
- `update-employee`: cada usuario virtual crea su empleado y cambia su salario en cada iteración (200); cada cambio añade una entrada al historial.
- `request-vacation`: cada usuario virtual crea su empleado y pide un día distinto en cada iteración (201).
- `resolve-vacation`: pide un día distinto y aprueba o rechaza esa solicitud, alternando (200).
