export const basethresholds = {
    //porcentaje deb errores
    http_req_failed: ['rate<0.05'],

    //tiempos de respuesta
    http_req_duration: [
        'p(95)<1000',
        'p(99)<1500',
        'p(99)<2500',
        'avg<800'
    ],

    //tiempo backend
    http_req_waiting: ['avg<700'],

    //checks 
    checks: ['rate>0.9'],
}