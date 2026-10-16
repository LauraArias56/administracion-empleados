import { promises as fs } from "fs";
import path from "path";
import { createEmptyDatabase, DatabaseSchema } from "./schema";

/**
 * "Base de datos" respaldada por un archivo JSON.
 *
 * - Las escrituras pasan por `transaction`, que las ejecuta de una en una
 *   (cola interna) para que dos peticiones simultáneas no se pisen.
 * - La escritura es atómica: se escribe en un archivo temporal y luego se
 *   renombra, así el archivo nunca queda a medias si el proceso se cae.
 * - Si la operación lanza un error, no se escribe nada.
 */
export class JsonDatabase {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async read(): Promise<DatabaseSchema> {
    // Espera las escrituras pendientes para leer siempre el último estado.
    await this.queue;
    return this.load();
  }

  transaction<T>(operation: (data: DatabaseSchema) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.load();
      const result = await operation(data);
      await this.persist(data);
      return result;
    });

    // Un error en una operación no debe bloquear las siguientes.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async load(): Promise<DatabaseSchema> {
    let raw: string;

    try {
      raw = await fs.readFile(this.filePath, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return createEmptyDatabase();
      }
      throw error;
    }

    if (raw.trim() === "") {
      return createEmptyDatabase();
    }

    let parsed: Partial<DatabaseSchema>;
    try {
      parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    } catch {
      // No se sobrescribe un archivo corrupto para no perder datos.
      throw new Error(`El archivo de base de datos no contiene un JSON válido: ${this.filePath}`);
    }

    const empty = createEmptyDatabase();
    return {
      sequences: { ...empty.sequences, ...parsed.sequences },
      employees: parsed.employees ?? empty.employees,
      vacations: parsed.vacations ?? empty.vacations,
    };
  }

  private async persist(data: DatabaseSchema): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tempPath, this.filePath);
  }
}
