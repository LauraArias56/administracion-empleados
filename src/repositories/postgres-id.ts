export const parseId = (id: string): string | null => {
  if (typeof id !== "string" || !/^[1-9]\d{0,15}$/.test(id)) return null;
  return Number.isSafeInteger(Number(id)) ? id : null;
};
