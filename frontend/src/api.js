/* Cliente de la API. /datos llega al programa publicado; /api/v1 lo corta Vercel. */

async function request(path, options = {}) {
  const response = await fetch(`/datos/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("La API no respondió con datos.");
  }
  if (!response.ok) {
    throw new Error(data?.message || "No se pudo completar la operación.");
  }
  return data;
}

export const loadEmployees = () => request("/employees");
export const loadVacations = () => request("/vacations");

export const createEmployee = (body) =>
  request("/employees", { method: "POST", body: JSON.stringify(body) });

export const updateEmployee = (id, body) =>
  request(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const requestVacation = (employeeId, body) =>
  request(`/employees/${employeeId}/vacations`, { method: "POST", body: JSON.stringify(body) });

export const resolveVacation = (id, decision) =>
  request(`/vacations/${id}`, { method: "PATCH", body: JSON.stringify({ decision }) });
