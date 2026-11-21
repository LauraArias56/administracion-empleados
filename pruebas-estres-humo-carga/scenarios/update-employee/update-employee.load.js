import {check, sleep } from 'k6';
import { basethresholds } from '../../config/base.config.js';
import { createEmployee, updateEmployee } from '../../services/employees.service.js';
import { buildEmployee, uniqueDocument } from '../../utils/test-data.js';

// Cada VU trabaja con su propio empleado y cambia su salario en cada iteracion.
let employee_id;
let iteration = 0;

export const options = {
    thresholds: {
        ...basethresholds
    },

    stages: [
        { duration: '20s', target: 3 },
        { duration: '20s', target: 8 },


        { duration: '20s', target: 30 },
        { duration: '1m', target: 30 },

        { duration: '20s', target: 0 },
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

    // Salario distinto en cada iteracion para que siempre haya un cambio real (y entrada de historial).
    const response = updateEmployee(employee_id, { salary: 3000000 + iteration++ });
    check(response, { 
        "status is 200": (r) => r.status === 200 
    });
    sleep(1);
}
