# Pruebas de rendimiento (k6)

Pruebas de humo (smoke), carga (load) y estrés (stress) de la API de administración de empleados. Los escenarios consumen la API por HTTP y se ejecutan por separado del pipeline de CI.

## Requisitos

- k6 instalado y disponible en `PATH`. Puedes comprobarlo con `k6 version`. [Instalación de k6](https://grafana.com/docs/k6/latest/get-started/installation/)
- Una instancia de la API en ejecución. [Instrucciones para arrancar la API local](../README.md#instalación-y-ejecución-local).

## Ejecución local

La URL predeterminada de [config/env.js](config/env.js) apunta al despliegue en Vercel (`https://administracion-empleados.vercel.app/api`). Para ejecutar los escenarios en local, establece `BASE_URL` antes de lanzar k6. Los escenarios escriben datos, así que inicia la API con una base dedicada.

En PowerShell, desde la raíz del repositorio, compila e inicia la API.

```powershell
npm run build
$env:SQLITE_DB_FILE = 'data/performance.db'
npm start
```

En otra terminal PowerShell, también desde la raíz, selecciona la API local y ejecuta el escenario de humo.

```powershell
$env:BASE_URL = 'http://localhost:3000/api'
npm run smoke:create-employee --prefix pruebas-estres-humo-carga
```

También puedes pasar la URL a k6 mediante `-e BASE_URL=http://localhost:3000/api`. Cada escenario añade `/v1` al prefijo `/api`.

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

Ejecuta estos comandos desde `pruebas-estres-humo-carga/` o agrega `--prefix pruebas-estres-humo-carga` al ejecutarlos desde la raíz. `npm run smoke:all` ejecuta las cinco pruebas de humo seguidas.

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
