import { formatDate } from "../domain";
import { Avatar, Money } from "../ui";

const FIELD = { cargo: "Cargo", salario: "Salario", estado: "Estado" };

export function History({ employees, role }) {
  const hidden = role === "Consulta";
  const rows = employees
    .flatMap((employee) =>
      employee.history.map((entry, index) => ({
        ...entry,
        key: `${employee.id}-${index}-${entry.changedAt}`,
        employeeName: employee.fullName,
      }))
    )
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));

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
              <tr><td colSpan={5} className="empty">Todavía no hay cambios registrados.</td></tr>
            ) : rows.map((entry) => (
              <tr key={entry.key}>
                <td>{formatDate(entry.changedAt)}</td>
                <td><div className="person"><Avatar name={entry.employeeName} />{entry.employeeName}</div></td>
                <td>{FIELD[entry.type] ?? entry.type}</td>
                <td>{entry.type === "salario" ? <Money value={entry.previousValue} hidden={hidden} /> : entry.previousValue}</td>
                <td>{entry.type === "salario" ? <Money value={entry.newValue} hidden={hidden} /> : entry.newValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
