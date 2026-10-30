import { randomUUID } from "crypto";

/** Documento único por llamada: las pruebas no dependen de registros previos ni chocan entre sí. */
export const uniqueDocument = (): string => `PW-${randomUUID().replace(/-/g, "").slice(0, 16)}`;

export const validEmployee = (overrides: Record<string, unknown> = {}) => ({
  document: uniqueDocument(),
  firstName: "Laura",
  lastName: "Gomez",
  position: "Analista",
  salary: 2500000,
  contract: { startDate: "2026-01-15", type: "indefinido" },
  ...overrides,
});

/** Copia del objeto sin la propiedad indicada (para probar campos ausentes). */
export const without = <T extends Record<string, unknown>>(data: T, key: string) => {
  const copy: Record<string, unknown> = { ...data };
  delete copy[key];
  return copy;
};

/** Fecha actual en formato YYYY-MM-DD (así guarda el servicio `changedAt`). */
export const today = (): string => new Date().toISOString().slice(0, 10);
