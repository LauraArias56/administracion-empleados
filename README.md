# Administración de empleados

API REST para centralizar empleados, contratos, vacaciones e historial de cargo y salario.

La estructura sigue la arquitectura en capas de los ejercicios de referencia: rutas, controlador, servicio, DTOs, contenedor Awilix y manejo global de errores. Las reglas de negocio viven en el servicio y se cubren con Vitest.

## Endpoints

Prefijo: `/api/v1`

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/employees` | Crea un empleado con cargo, salario, estado y contrato |
| GET | `/employees/:id` | Consulta el empleado, su contrato y el historial |
| PATCH | `/employees/:id` | Actualiza cargo, salario o estado y registra el cambio |
| POST | `/employees/:id/vacations` | Solicita vacaciones y valida fechas y solapes |
| PATCH | `/vacations/:id` | Aprueba o rechaza una solicitud pendiente |

## Ejecución

```bash
npm install
npm run dev
```

La API queda en `http://localhost:3000`.

## Pruebas

```bash
npm test
npm run test:coverage
```
