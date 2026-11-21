import http from 'k6/http';
import { config } from '../config/env.js';

const params = {
    headers: { 'Content-Type': 'application/json' },
};

export const resolveVacation = (id, payload) => {
    return http.patch(
        `${config.BASE_URL}/v1/vacations/${id}`,
        JSON.stringify(payload),
        params
    );
}
