const { default: axios } = require('axios');
const getClientBuilder = require('./src');

const buildHttpClient = getClientBuilder({
    requestAdapter: (req) => {
        console.debug(req);
        return axios(req);
    },
    responseAdapter: (res) => res.data,
    errorAdapter: (e) => {
        if (e.response) {
            const { status, statusText, data } = e.response;
            const error = new Error(`${status} ${statusText}`);
            error.data = data;
            error.status = status;
            throw error;
        }
        const errorMsg = e.isAxiosError ? 'Could not reach the API' : e.message;
        throw new Error(errorMsg || 'Something went awry and you can probably fix it');
    },
});

const httpClient = buildHttpClient({
    baseUrl: 'https://random-data-api.com/api/v2'
});

httpClient.get('/beers', { queryParams: { size: 5 } })
    .then(console.log)
    .catch(console.error);
