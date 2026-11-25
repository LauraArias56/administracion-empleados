import { formatDate } from "../domain";
import { Avatar, Money } from "../ui";

const FIELD = { cargo: "Cargo", salario: "Salario", estado: "Estado" };
const VACATION = { aprobada: "Aprobada", rechazada: "Rechazada" };

export function History({ employees, vacations, role }) {
  const hidden = role === "Consulta";
  const changes = employees.flatMap((employee) =>
    employee.history.map((entry, index) => ({
      kind: "cambio",
      ...entry,
      key: `cambio-${employee.id}-${index}-${entry.changedAt}`,
      when: entry.changedAt,
      employeeName: employee.fullName,
    }))
  );
  const decisions = vacations
    .filter((vacation) => vacation.status === "aprobada" || vacation.status === "rechazada")
    .map((vacation) => {
      const employee = employees.find((item) => item.id === vacation.employeeId);
      return {
        kind: "vacacion",
        key: `vacacion-${vacation.id}`,
        when: vacation.startDate,
        employeeName: employee?.fullName ?? "Empleado",
        previousValue: `${formatDate(vacation.startDate)} – ${formatDate(vacation.endDate)}`,
        newValue: VACATION[vacation.status],
      };
    });
  const rows = [...changes, ...decisions].sort((a, b) => b.when.localeCompare(a.when));

  return (
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Empleado</th>
              <th>Cambio</th>
              <th>Antes</th>
              <th>Después</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="empty">Todavía no hay cambios ni vacaciones aprobadas o rechazadas.</td></tr>
            ) : rows.map((entry) => (
              <tr key={entry.key}>
                <td>{formatDate(entry.when)}</td>
                <td><div className="person"><Avatar name={entry.employeeName} />{entry.employeeName}</div></td>
                <td>{entry.kind === "vacacion" ? "Vacaciones" : (FIELD[entry.type] ?? entry.type)}</td>
                <td>
                  {entry.kind === "cambio" && entry.type === "salario"
                    ? <Money value={entry.previousValue} hidden={hidden} />
                    : entry.previousValue}
                </td>
                <td>
                  {entry.kind === "cambio" && entry.type === "salario"
                    ? <Money value={entry.newValue} hidden={hidden} />
                    : entry.newValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
