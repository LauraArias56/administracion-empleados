import {check, sleep } from 'k6';
import { basethresholds } from '../../config/base.config.js';
import { createEmployee, requestVacation } from '../../services/employees.service.js';
import { resolveVacation } from '../../services/vacations.service.js';
import { buildEmployee, uniqueDocument, vacationDay } from '../../utils/test-data.js';

// Cada VU trabaja con su propio empleado; en cada iteracion crea una solicitud
// pendiente (dia distinto) y luego la aprueba o la rechaza alternando.
let employee_id;
let iteration = 0;

export const options = {
    thresholds: {
        ...basethresholds
    },

    stages: [
        { duration: '10s', target: 5 },
        { duration: '30s', target: 100 },


        { duration: '1.5m', target: 1000 },
        { duration: '1m', target: 1000 },

        { duration: '20s', target: 5 },
    ],
};


export function setup() {
    return { run_id: Date.now() };
}


export default function (data) {
    if (!employee_id) {
        const created = createEmployee(buildEmployee(uniqueDocument(data.run_id, __VU, 0)));
        if (created.status === 201) {
            employee_id = created.json('id');
        }
    }
    if (!employee_id) {
        sleep(1);
        return;
    }

    const day = vacationDay(iteration++);
    const vacation = requestVacation(employee_id, { startDate: day, endDate: day });
    if (vacation.status !== 201) {
        sleep(1);
        return;
    }

    const decision = iteration % 2 === 0 ? 'aprobar' : 'rechazar';
    const response = resolveVacation(vacation.json('id'), { decision: decision });
    check(response, { 
        "status is 200": (r) => r.status === 200 
    });
    sleep(1);
}
