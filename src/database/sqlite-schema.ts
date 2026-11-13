/**
 * Esquema SQLite derivado de lo que realmente usa la aplicación:
 *
 * - `employees`: un registro por empleado (EmployeeRecord). El contrato no tiene
 *   id propio, siempre es 1:1 con el empleado y solo se consulta junto a él, por
 *   eso sus tres campos viven como columnas `contract_*`.
 *   `fullName` no se guarda: es `firstName + " " + lastName` y se calcula al leer.
 * - `employee_history`: historial de cambios (HistoryEntryDTO) de un empleado.
 * - `vacations`: solicitudes de vacaciones (VacationRecord) de un empleado.
 *
 * Los ids son INTEGER AUTOINCREMENT (no se reutilizan, igual que `sequences` en el
 * JSON); la API los sigue exponiendo como string.
 * Los CHECK reflejan las validaciones que ya hace el servicio.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS employees (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  document            TEXT    NOT NULL UNIQUE,
  first_name          TEXT    NOT NULL,
  last_name           TEXT    NOT NULL,
  position            TEXT    NOT NULL,
  salary              REAL    NOT NULL CHECK (salary >= 0),
  status              TEXT    NOT NULL CHECK (status IN ('activo', 'inactivo')),
  contract_start_date TEXT    NOT NULL,
  contract_type       TEXT    NOT NULL CHECK (contract_type IN ('indefinido', 'fijo', 'obra_labor')),
  contract_status     TEXT    NOT NULL CHECK (contract_status IN ('vigente', 'finalizado'))
);

CREATE TABLE IF NOT EXISTS employee_history (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER NOT NULL REFERENCES employees (id),
  type           TEXT    NOT NULL CHECK (type IN ('cargo', 'salario', 'estado')),
  previous_value TEXT    NOT NULL,
  new_value      TEXT    NOT NULL,
  changed_at     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employee_history_employee_id ON employee_history (employee_id);

CREATE TABLE IF NOT EXISTS vacations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees (id),
  start_date  TEXT    NOT NULL,
  end_date    TEXT    NOT NULL,
  status      TEXT    NOT NULL CHECK (status IN ('pendiente', 'aprobada', 'rechazada')),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_vacations_employee_id ON vacations (employee_id);
`;
