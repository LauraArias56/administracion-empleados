// Documento unico por empleado: run_id (distinto en cada ejecucion) + VU + iteracion.
export const uniqueDocument = (run_id, vu, iteration) => {
    return `K6-${run_id}-${vu}-${iteration}`;
}

export const buildEmployee = (document) => {
    return {
        document: document,
        firstName: 'Laura',
        lastName: 'Gomez',
        position: 'Analista',
        salary: 2500000,
        contract: { startDate: '2026-01-15', type: 'indefinido' },
    };
}

// Un dia distinto por cada indice (desde 2030-01-01) para que las vacaciones
// de un mismo empleado nunca se solapen.
export const vacationDay = (index) => {
    return new Date(Date.UTC(2030, 0, 1 + index)).toISOString().slice(0, 10);
}
