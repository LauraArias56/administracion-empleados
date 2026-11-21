import { useState } from "react";
import { requestVacation, resolveVacation } from "../api";
import { businessDays, formatDate, validateVacation } from "../domain";
import { Avatar, Modal, Pill } from "../ui";

const STATUS = [
  ["pendiente", "Pendiente"],
  ["aprobada", "Aprobada"],
  ["rechazada", "Rechazada"],
];

const label = (value) => STATUS.find(([id]) => id === value)?.[1] ?? value;

export function Vacations({ employees, vacations, role, reload, notify }) {
  const canWrite = role !== "Consulta";
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const rows = [...vacations].sort((a, b) => {
    if (a.status === "pendiente" && b.status !== "pendiente") return -1;
    if (b.status === "pendiente" && a.status !== "pendiente") return 1;
    return b.startDate.localeCompare(a.startDate);
  });

  async function save() {
    const message = validateVacation(employees, vacations, form);
    if (message) return setError(message);
    try {
      await requestVacation(form.employeeId, { startDate: form.startDate, endDate: form.endDate });
      setForm(null);
      notify("Solicitud guardada en la base de datos.");
      await reload();
    } catch (caught) {
      setError(caught.message);
    }
  }

  async function resolve(vacation, decision) {
    try {
      await resolveVacation(vacation.id, decision);
      notify(decision === "aprobar" ? "Vacaciones aprobadas." : "Vacaciones rechazadas.");
      await reload();
    } catch (caught) {
      notify(caught.message);
    }
  }

  return (
    <section>
      <div className="toolbar">
        {canWrite ? (
          <button className="btn" onClick={() => { setError(""); setForm({ employeeId: "", startDate: "", endDate: "" }); }}>
            Solicitar vacaciones
          </button>
        ) : null}
      </div>
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
                {canWrite ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="empty">No hay solicitudes de vacaciones.</td></tr>
              ) : rows.map((vacation) => {
                const employee = employees.find((item) => item.id === vacation.employeeId);
                return (
                  <tr key={vacation.id}>
                    <td><div className="person"><Avatar name={employee?.fullName ?? "?"} />{employee?.fullName ?? "Empleado"}</div></td>
                    <td>{formatDate(vacation.startDate)}</td>
                    <td>{formatDate(vacation.endDate)}</td>
                    <td>{businessDays(vacation.startDate, vacation.endDate)}</td>
                    <td><Pill value={label(vacation.status)} /></td>
                    {canWrite ? (
                      <td className="actions">
                        {vacation.status === "pendiente" ? (
                          <>
                            <button className="btn tiny" onClick={() => resolve(vacation, "aprobar")}>Aprobar</button>
                            <button className="btn-ghost tiny" onClick={() => resolve(vacation, "rechazar")}>Rechazar</button>
                          </>
                        ) : "—"}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={Boolean(form)} title="Solicitar vacaciones" onClose={() => setForm(null)} onSubmit={save}>
        <label>Empleado
          <select value={form?.employeeId ?? ""} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
            <option value="">Selecciona</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </label>
        <label>Desde
          <input type="date" value={form?.startDate ?? ""} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        </label>
        <label>Hasta
          <input type="date" value={form?.endDate ?? ""} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
        </label>
        {error ? <p className="error" role="alert">{error}</p> : null}
      </Modal>
    </section>
  );
}
