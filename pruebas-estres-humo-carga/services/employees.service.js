import http from 'k6/http';
import { config } from '../config/env.js';

const params = {
    headers: { 'Content-Type': 'application/json' },
};

export const createEmployee = (payload) => {
    return http.post(
        `${config.BASE_URL}/v1/employees`,
        JSON.stringify(payload),
        params
    );
}

export const getEmployee = (id) => {
    return http.get(
        `${config.BASE_URL}/v1/employees/${id}`
    );
}

export const updateEmployee = (id, payload) => {
    return http.patch(
        `${config.BASE_URL}/v1/employees/${id}`,
        JSON.stringify(payload),
        params
    );
}

export const requestVacation = (id, payload) => {
    return http.post(
        `${config.BASE_URL}/v1/employees/${id}/vacations`,
        JSON.stringify(payload),
        params
    );
}
