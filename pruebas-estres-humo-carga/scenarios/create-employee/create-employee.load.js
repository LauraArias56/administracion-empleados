import {check, sleep } from 'k6';
import { basethresholds } from '../../config/base.config.js';
import { createEmployee } from '../../services/employees.service.js';
import { buildEmployee, uniqueDocument } from '../../utils/test-data.js';

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
    const document = uniqueDocument(data.run_id, __VU, __ITER);
    const response = createEmployee(buildEmployee(document));
    check(response, { 
        "status is 201": (r) => r.status === 201 
    });
    sleep(1);
}
