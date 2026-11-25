import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadEmployees, loadVacations } from "./api";
import { millions } from "./domain";
import { Contracts } from "./modules/Contracts";
import { Employees } from "./modules/Employees";
import { History } from "./modules/History";
import { Reports } from "./modules/Reports";
import { Vacations } from "./modules/Vacations";
import { Toast } from "./ui";

const TABS = [
  ["empleados", "Empleados"],
  ["contratos", "Contratos"],
  ["vacaciones", "Vacaciones"],
  ["historial", "Historial"],
  ["reportes", "Reportes"],
];

const ROLES = ["Administrador", "RRHH", "Consulta"];

function mergeEmployees(...groups) {
  const byId = new Map();
  for (const group of groups) {
    for (const employee of group) {
      if (employee?.id != null) byId.set(String(employee.id), employee);
    }
  }
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [role, setRole] = useState("Administrador");
  const [tab, setTab] = useState("empleados");
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const reloadRequest = useRef(0);

  const reload = useCallback(async (extraEmployees = []) => {
    const requestId = ++reloadRequest.current;
    try {
      const [people, requests] = await Promise.all([loadEmployees(), loadVacations()]);
      if (requestId !== reloadRequest.current) return;
      const incoming = Array.isArray(people) ? people : [];
      const added = Array.isArray(extraEmployees) ? extraEmployees : [];
      setEmployees((current) => mergeEmployees(current, incoming, added));
      setVacations(Array.isArray(requests) ? requests : []);
      setLoadError("");
    } catch (error) {
      if (requestId !== reloadRequest.current) return;
      const added = Array.isArray(extraEmployees) ? extraEmployees : [];
      if (added.length > 0) {
        setEmployees((current) => mergeEmployees(current, added));
      }
      setLoadError(error.message || "No hay conexión con la base de datos.");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const active = employees.filter((employee) => employee.status === "activo");
  const payroll = active.reduce((total, employee) => total + employee.salary, 0);
  const pending = vacations.filter((vacation) => vacation.status === "pendiente").length;
  const hidden = role === "Consulta";

  const view = useMemo(() => {
    const shared = { employees, vacations, role, reload, notify: setToast };
    if (tab === "contratos") return <Contracts {...shared} />;
    if (tab === "vacaciones") return <Vacations {...shared} />;
    if (tab === "historial") return <History employees={employees} role={role} />;
    if (tab === "reportes") return <Reports employees={employees} vacations={vacations} />;
    return <Employees {...shared} />;
  }, [tab, employees, vacations, role, reload]);

  return (
    <>
      <header className="hero">
        <svg className="curve" viewBox="0 0 320 150" aria-hidden="true">
          <defs>
            <linearGradient id="exp" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
          <path className="curve-path" d="M8 132 C 78 130, 110 124, 150 104 S 230 42, 292 22" />
          <circle className="curve-dot" cx="292" cy="22" r="6" fill="#f472b6" />
        </svg>

        <div className="hero-top">
          <div className="brand">
            <span className="logo-mark" aria-hidden="true" />
            <div>
              <strong>Empleados</strong>
              <span>Gestión de empleados</span>
            </div>
          </div>
          <div className="role">
            <label htmlFor="role">Rol</label>
            <select id="role" value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="hero-copy">
          <h1>Gestión de empleados</h1>
          <p>Consulta y actualiza cargos, salarios, contratos y vacaciones, y conserva el registro de cada cambio.</p>
        </div>

        <div className="kpis">
          <article className="kpi">
            <small>Empleados activos</small>
            <strong>{active.length}</strong>
          </article>
          <article className="kpi">
            <small>Nómina mensual activa</small>
            <strong>{hidden ? "••••••" : millions(payroll)}</strong>
          </article>
          <article className="kpi">
            <small>Vacaciones por aprobar</small>
            <strong>{pending}</strong>
          </article>
        </div>

        <nav className="tabs" aria-label="Módulos">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {loadError ? <p className="banner" role="alert">{loadError}</p> : null}
        {view}
      </main>
      <Toast message={toast} />
    </>
  );
}
