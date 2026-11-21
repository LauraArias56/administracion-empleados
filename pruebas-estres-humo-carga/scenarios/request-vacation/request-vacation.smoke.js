import {check, sleep } from 'k6';
import { basethresholds } from '../../config/base.config.js';
import { createEmployee, requestVacation } from '../../services/employees.service.js';
import { buildEmployee, uniqueDocument, vacationDay } from '../../utils/test-data.js';

// Cada VU trabaja con su propio empleado y pide un dia distinto en cada iteracion.
let employee_id;
let iteration = 0;

export const options = {
    thresholds: {
        ...basethresholds
    },

    stages: [
        { duration: '10s', target: 1 },
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
    const response = requestVacation(employee_id, { startDate: day, endDate: day });
    check(response, { 
        "status is 201": (r) => r.status === 201 
    });
    sleep(1);
}
