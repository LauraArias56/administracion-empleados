# Administración de empleados

API REST para centralizar empleados, contratos, vacaciones e historial de cargo y salario.

<<<<<<< HEAD
La estructura sigue la arquitectura en capas de los ejercicios de referencia: rutas, controlador, servicio, DTOs, contenedor Awilix y manejo global de errores. Las reglas de negocio viven en el servicio y se cubren con Vitest.
=======
La estructura sigue la arquitectura en capas de los ejercicios de referencia: rutas, controlador, servicio, DTOs, contenedor Awilix y manejo global de errores. Las reglas de negocio viven en el servicio y se cubren con Vitest. El servicio accede a los datos mediante repositorios.
>>>>>>> yeison

## Endpoints

Prefijo: `/api/v1`

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/employees` | Crea un empleado con cargo, salario, estado y contrato |
| GET | `/employees/:id` | Consulta el empleado, su contrato y el historial |
| PATCH | `/employees/:id` | Actualiza cargo, salario o estado y registra el cambio |
| POST | `/employees/:id/vacations` | Solicita vacaciones y valida fechas y solapes |
| PATCH | `/vacations/:id` | Aprueba o rechaza una solicitud pendiente |

<<<<<<< HEAD
=======
## Persistencia (base de datos en JSON)

Los datos se guardan en un archivo JSON, por defecto `data/db.json` (se crea solo en la primera escritura; la carpeta `data/` está en `.gitignore`). Se puede cambiar la ubicación con la variable de entorno `DATABASE_FILE`:

```bash
DATABASE_FILE=./mis-datos/empleados.json npm run dev
```

Estructura del archivo:

```json
{
  "sequences": { "employees": 1, "vacations": 1 },
  "employees": [],
  "vacations": []
}
```

Capas involucradas:

| Archivo | Responsabilidad |
| --- | --- |
| `src/database/json-database.ts` | Lee/escribe el archivo. Serializa las escrituras y las hace de forma atómica |
| `src/database/schema.ts` | Tipos de los registros y forma del archivo |
| `src/repositories/*` | Interfaces `IEmployeeRepository` / `IVacationRepository` y sus implementaciones JSON |
| `src/services/employee.service.ts` | Reglas de negocio; solo conoce las interfaces de repositorio |

Para migrar a una base de datos real basta con crear nuevos repositorios que implementen las mismas interfaces y registrarlos en `src/config/container.ts`; el servicio y los controladores no cambian.

>>>>>>> yeison
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
