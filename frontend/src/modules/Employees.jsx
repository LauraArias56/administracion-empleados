import { useMemo, useState } from "react";
import { createEmployee, updateEmployee } from "../api";
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  EMPLOYMENT,
  POSITIONS,
  clampSalary,
  contractStartError,
  cop,
  documentError,
  labelOf,
  personNameError,
  salaryError,
  todayISO,
} from "../domain";
import { Avatar, Modal, Money, Pill } from "../ui";

const emptyForm = () => ({
  mode: "create",
  firstName: "",
  lastName: "",
  document: "",
  position: POSITIONS[1].name,
  salary: POSITIONS[1].min,
  status: "activo",
  startDate: todayISO(),
  contractType: "indefinido",
  contractStatus: "vigente",
});

export function Employees({ employees, role, reload, notify }) {
  const canWrite = role !== "Consulta";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return employees
      .filter((employee) => {
        const matchesText =
          !text ||
          employee.fullName.toLowerCase().includes(text) ||
          employee.document.includes(text) ||
          employee.position.toLowerCase().includes(text);
        const matchesStatus = status === "todos" || employee.status === status;
        return matchesText && matchesStatus;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  }, [employees, query, status]);

  function changePosition(position) {
    const range = POSITIONS.find((item) => item.name === position);
    setForm((current) => ({
      ...current,
      position,
      salary: range ? clampSalary(current.salary, range) : current.salary,
    }));
  }

  function fieldError(draft, key) {
    if (key === "firstName") return personNameError(draft.firstName, "nombre");
    if (key === "lastName") return personNameError(draft.lastName, "apellido");
    if (key === "document") return documentError(draft.document);
    if (key === "salary") return salaryError(draft.salary, POSITIONS.find((item) => item.name === draft.position));
    if (key === "startDate") return contractStartError(draft.startDate);
    return "";
  }

  function formError(draft) {
    const range = POSITIONS.find((item) => item.name === draft.position);
    if (draft.mode === "create") {
      const nameMessage = personNameError(draft.firstName, "nombre") || personNameError(draft.lastName, "apellido");
      if (nameMessage) return nameMessage;
      const cedulaMessage = documentError(draft.document);
      if (cedulaMessage) return cedulaMessage;
    }
    if (!range) return "Selecciona un cargo válido.";
    if (!EMPLOYMENT.some(([id]) => id === draft.status)) return "Selecciona un estado laboral válido.";
    const salaryMessage = salaryError(draft.salary, range);
    if (salaryMessage) return salaryMessage;
    if (draft.mode !== "create") return "";
    if (!CONTRACT_TYPES.some(([id]) => id === draft.contractType)) return "Selecciona un tipo de contrato válido.";
    if (!CONTRACT_STATUSES.some(([id]) => id === draft.contractStatus)) return "Selecciona un estado de contrato válido.";
    return contractStartError(draft.startDate);
  }

  function updateField(key, value) {
    const next = { ...form, [key]: value };
    setForm(next);
    setError(fieldError(next, key));
  }

  async function save() {
    const message = formError(form);
    if (message) return setError(message);
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const document = form.document.trim();
    const salary = Number(form.salary);

    try {
      if (form.mode === "create") {
        const saved = await createEmployee({
          document,
          firstName,
          lastName,
          position: form.position,
          salary,
          status: form.status,
          contract: {
            startDate: form.startDate,
            type: form.contractType,
            status: form.contractStatus,
          },
        });
        notify("Empleado guardado en la base de datos.");
        setForm(null);
        await reload(saved ? [saved] : []);
        return;
      } else {
        await updateEmployee(form.id, {
          position: form.position,
          salary,
          status: form.status,
        });
        notify("Empleado actualizado en la base de datos.");
      }
      setForm(null);
      await reload();
    } catch (caught) {
      setError(caught.message);
    }
  }

  const selected = form ? POSITIONS.find((item) => item.name === form.position) : null;

  return (
    <section>
      <div className="toolbar">
        <input
          aria-label="Buscar empleados"
          placeholder="Buscar por nombre, documento o cargo"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="todos">Todos los estados</option>
          {EMPLOYMENT.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        {canWrite ? <button className="btn grow" onClick={() => { setError(""); setForm(emptyForm()); }}>Nuevo empleado</button> : null}
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Documento</th>
                <th>Cargo</th>
                <th>Salario mensual</th>
                <th>Estado</th>
                {canWrite ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="empty">No hay empleados con ese filtro.</td></tr>
              ) : rows.map((employee) => (
                <tr key={employee.id}>
                  <td><div className="person"><Avatar name={employee.fullName} />{employee.fullName}</div></td>
                  <td>{employee.document}</td>
                  <td>{employee.position}</td>
                  <td><Money value={employee.salary} hidden={role === "Consulta"} /></td>
                  <td><Pill value={labelOf(EMPLOYMENT, employee.status)} /></td>
                  {canWrite ? (
                    <td>
                      <button
                        className="btn-ghost tiny"
                        onClick={() => {
                          setError("");
                          setForm({
                            mode: "edit",
                            id: employee.id,
                            firstName: employee.firstName,
                            lastName: employee.lastName,
                            document: employee.document,
                            position: employee.position,
                            salary: employee.salary,
                            status: employee.status,
                          });
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={Boolean(form)} title={form?.mode === "edit" ? "Editar empleado" : "Nuevo empleado"} onClose={() => setForm(null)} onSubmit={save}>
        <label>Nombre
          <input value={form?.firstName ?? ""} readOnly={form?.mode === "edit"} onChange={(event) => updateField("firstName", event.target.value)} />
        </label>
        <label>Apellido
          <input value={form?.lastName ?? ""} readOnly={form?.mode === "edit"} onChange={(event) => updateField("lastName", event.target.value)} />
        </label>
        <label>Cédula
          <input
            inputMode="numeric"
            placeholder="10 dígitos"
            value={form?.document ?? ""}
            onChange={(event) => updateField("document", event.target.value)}
            readOnly={form?.mode === "edit"}
          />
        </label>
        <label>Cargo
          <select value={form?.position ?? ""} onChange={(event) => changePosition(event.target.value)}>
            {form?.position && !POSITIONS.some((item) => item.name === form.position)
              ? <option>{form.position}</option>
              : null}
            {POSITIONS.map((position) => <option key={position.name}>{position.name}</option>)}
          </select>
        </label>
        <label>Salario mensual
          <input inputMode="numeric" value={form?.salary ?? ""} onChange={(event) => updateField("salary", event.target.value)} />
        </label>
        {selected ? <p className="hint">Rango del cargo: {cop(selected.min)} – {cop(selected.max)}</p> : null}
        <label>Estado laboral
          <select value={form?.status ?? "activo"} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            {EMPLOYMENT.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        {form?.mode === "create" ? (
          <>
            <label>Inicio del contrato
              <input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
            </label>
            <label>Tipo de contrato
              <select value={form.contractType} onChange={(event) => setForm({ ...form, contractType: event.target.value })}>
                {CONTRACT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label>Estado del contrato
              <select value={form.contractStatus} onChange={(event) => setForm({ ...form, contractStatus: event.target.value })}>
                {CONTRACT_STATUSES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          </>
        ) : null}
        {error ? <p className="error" role="alert">{error}</p> : null}
      </Modal>
    </section>
  );
}
