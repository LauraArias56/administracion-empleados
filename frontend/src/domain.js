/* Catálogo y textos. Los valores que se envían a la API son los de la base SQLite. */

export const POSITIONS = [
  { name: "Auxiliar administrativo", min: 1600000, max: 2400000 },
  { name: "Analista", min: 2500000, max: 4500000 },
  { name: "Desarrollador", min: 4000000, max: 8500000 },
  { name: "Coordinador", min: 5000000, max: 8000000 },
  { name: "Líder de talento", min: 6500000, max: 11000000 },
  { name: "Gerente", min: 10000000, max: 18000000 },
];

export const EMPLOYMENT = [
  ["activo", "Activo"],
  ["inactivo", "Inactivo"],
];

export const CONTRACT_TYPES = [
  ["indefinido", "Indefinido"],
  ["fijo", "Fijo"],
  ["obra_labor", "Obra o labor"],
];

export const CONTRACT_STATUSES = [
  ["vigente", "Vigente"],
  ["finalizado", "Finalizado"],
];

export const labelOf = (pairs, value) => pairs.find(([id]) => id === value)?.[1] ?? value;

export const cop = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export const millions = (value) => {
  const text = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 1000000);
  return `${text} millones`;
};

export const formatDate = (iso) => {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const todayISO = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const parseISO = (iso) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

export const businessDays = (start, end) => {
  if (!start || !end || end < start) return 0;
  const cursor = parseISO(start);
  const last = parseISO(end);
  let count = 0;
  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

export const clampSalary = (salary, position) => {
  const amount = Math.round(Number(salary));
  if (!Number.isFinite(amount)) return position.min;
  return Math.min(position.max, Math.max(position.min, amount));
};

export const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const ANNUAL_DAYS = 15;

export function validateVacation(employees, vacations, draft) {
  if (!draft.employeeId) return "Selecciona un empleado.";
  if (!draft.startDate || !draft.endDate) return "Indica la fecha de inicio y la de fin.";
  if (draft.endDate < draft.startDate) return "La fecha final no puede ser anterior a la inicial.";
  const today = todayISO();
  if (draft.startDate < today || draft.endDate < today) return "No se aceptan fechas pasadas.";

  const employee = employees.find((item) => item.id === draft.employeeId);
  if (!employee || employee.status !== "activo" || employee.contract?.status !== "vigente") {
    return "Solo empleados activos con contrato vigente pueden solicitar vacaciones.";
  }

  const days = businessDays(draft.startDate, draft.endDate);
  if (days === 0) return "La solicitud no incluye días hábiles.";

  const clash = vacations.some(
    (item) =>
      item.employeeId === draft.employeeId &&
      item.status !== "rechazada" &&
      item.startDate <= draft.endDate &&
      draft.startDate <= item.endDate
  );
  if (clash) return "Esas fechas se cruzan con otra solicitud de este empleado.";

  const year = draft.startDate.slice(0, 4);
  const used = vacations
    .filter(
      (item) =>
        item.employeeId === draft.employeeId &&
        item.status !== "rechazada" &&
        item.startDate.startsWith(year)
    )
    .reduce((total, item) => total + businessDays(item.startDate, item.endDate), 0);
  if (days > ANNUAL_DAYS - used) {
    return `El saldo anual es de ${ANNUAL_DAYS} días hábiles. Quedan ${Math.max(ANNUAL_DAYS - used, 0)}.`;
  }
  return "";
}
