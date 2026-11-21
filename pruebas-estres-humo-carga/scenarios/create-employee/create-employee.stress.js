import {check, sleep } from 'k6';
import { basethresholds } from '../../config/base.config.js';
import { createEmployee } from '../../services/employees.service.js';
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
    return { run_id: Date.now() };
}


export default function (data) {
    const document = uniqueDocument(data.run_id, __VU, __ITER);
    const response = createEmployee(buildEmployee(document));
    check(response, { 
        "status is 201": (r) => r.status === 201 
    });
    sleep(1);
}
