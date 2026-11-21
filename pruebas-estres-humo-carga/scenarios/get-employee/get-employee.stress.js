import {check, fail, sleep } from 'k6';
import { basethresholds } from '../../config/base.config.js';
import { createEmployee, getEmployee } from '../../services/employees.service.js';
import { buildEmployee, uniqueDocument } from '../../utils/test-data.js';

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
    const created = createEmployee(buildEmployee(uniqueDocument(Date.now(), 0, 0)));
    if (created.status !== 201) {
        fail(`No se pudo crear el empleado de prueba (status ${created.status})`);
    }
    return { employee_id: created.json('id') };
}


export default function (data) {
    const response = getEmployee(data.employee_id);
    check(response, { 
        "status is 200": (r) => r.status === 200 
    });
    sleep(1);
}
