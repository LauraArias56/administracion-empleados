import { CONTRACT_TYPES, businessDays, formatDate, labelOf } from "../domain";
import { Avatar, Pill } from "../ui";

export function Reports({ employees, vacations }) {
  const active = employees.filter((employee) => employee.status === "activo");
  const pending = vacations.filter((vacation) => vacation.status === "pendiente");

  return (
    <div className="stack">
      <div className="report-cards">
        <article className="report-card">
          <strong>{active.length}</strong>
          <span>Empleados activos</span>
        </article>
        <article className="report-card">
          <strong>{pending.length}</strong>
          <span>Vacaciones pendientes</span>
        </article>
      </div>

      <h2 className="section-title">Empleados activos</h2>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Cargo</th>
                <th>Contrato vigente</th>
                <th>Inicio</th>
              </tr>
            </thead>
            <tbody>
              {active.length === 0 ? (
                <tr><td colSpan={4} className="empty">No hay empleados activos.</td></tr>
              ) : active.map((employee) => (
                <tr key={employee.id}>
                  <td><div className="person"><Avatar name={employee.fullName} />{employee.fullName}</div></td>
                  <td>{employee.position}</td>
                  <td>{employee.contract.status === "vigente" ? labelOf(CONTRACT_TYPES, employee.contract.type) : "Sin contrato vigente"}</td>
                  <td>{employee.contract.status === "vigente" ? formatDate(employee.contract.startDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="section-title">Vacaciones pendientes</h2>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Días hábiles</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr><td colSpan={5} className="empty">No hay vacaciones por aprobar.</td></tr>
              ) : pending.map((vacation) => {
                const employee = employees.find((item) => item.id === vacation.employeeId);
                return (
                  <tr key={vacation.id}>
                    <td>{employee?.fullName}</td>
                    <td>{formatDate(vacation.startDate)}</td>
                    <td>{formatDate(vacation.endDate)}</td>
                    <td>{businessDays(vacation.startDate, vacation.endDate)}</td>
                    <td><Pill value="Pendiente" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
