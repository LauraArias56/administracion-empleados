import { updateEmployee } from "../api";
import { CONTRACT_STATUSES, CONTRACT_TYPES, formatDate, labelOf } from "../domain";
import { Avatar, Pill } from "../ui";

export function Contracts({ employees, role, reload, notify }) {
  const canWrite = role !== "Consulta";
  const rows = [...employees].sort((a, b) => b.contract.startDate.localeCompare(a.contract.startDate));

  async function finish(employee) {
    try {
      await updateEmployee(employee.id, { contractStatus: "finalizado" });
      notify("Contrato finalizado en la base de datos.");
      await reload();
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <section>
      <p className="hint outside">El contrato se registra al crear el empleado y queda en la misma base SQLite.</p>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Inicio</th>
                <th>Tipo</th>
                <th>Estado</th>
                {canWrite ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="empty">Todavía no hay contratos.</td></tr>
              ) : rows.map((employee) => (
                <tr key={employee.id}>
                  <td><div className="person"><Avatar name={employee.fullName} />{employee.fullName}</div></td>
                  <td>{formatDate(employee.contract.startDate)}</td>
                  <td>{labelOf(CONTRACT_TYPES, employee.contract.type)}</td>
                  <td><Pill value={labelOf(CONTRACT_STATUSES, employee.contract.status)} /></td>
                  {canWrite ? (
                    <td>
                      {employee.contract.status === "vigente"
                        ? <button className="btn-ghost tiny" onClick={() => finish(employee)}>Finalizar</button>
                        : "—"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
