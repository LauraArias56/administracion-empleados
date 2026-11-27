/**
 * Los ids se guardan como INTEGER pero la API los maneja como string.
 * Solo se aceptan strings canónicos ("1", "25"); cualquier otro valor
 * ("abc", "01", "1.5", " 1") nunca coincidió con un id en la versión JSON,
 * así que se trata como "no existe" para conservar el mismo comportamiento.
 */
export const parseId = (id: string): number | null => {
  if (typeof id !== "string" || !/^[1-9]\d{0,15}$/.test(id)) {
    return null;
  }

  const value = Number(id);
  return Number.isSafeInteger(value) ? value : null;
};

export const isUniqueViolation = (error: unknown, column: string): boolean =>
  error instanceof Error &&
  error.message.includes(`UNIQUE constraint failed: ${column}`);
