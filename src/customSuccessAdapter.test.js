const getClientBuilder = require('.');

const API_BASE_URL = 'https://lol.com';
let sendRequest;
let successAdapter;
let failureAdapter;
let clientBuilder;
let apiResponse;
let originalRequest;
beforeEach(() => {
  originalRequest = {
    attemptNumber: 1,
    headers: {},
    method: 'GET',
    url: API_BASE_URL,
  };
  apiResponse = { api: 'res' };
  sendRequest = jest.fn(() => Promise.resolve({ data: apiResponse }));
  successAdapter = jest.fn((res) => res.data);
  failureAdapter = jest.fn((e) => {
    throw e.data;
  });
  clientBuilder = getClientBuilder({
    sendRequest,
    successAdapter,
    failureAdapter,
  });
});

describe('httpClient', () => {
  describe('customSuccessAdapter', () => {
    test('should be skipped when undefined, and successAdapter response should be returned', () => {
      const apiClient = clientBuilder();
      return apiClient.get(API_BASE_URL).then((res) => {
        expect(res).toStrictEqual(apiResponse);
      });
    });
    test('should be called with the successAdapter response', () => {
      const customSuccessAdapter = jest.fn((res) =>
        Promise.resolve({ ...res, aLittle: 'extra' })
      );
      const apiClient = clientBuilder({ customSuccessAdapter });
      return apiClient.get(API_BASE_URL).then((res) => {
        expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
        expect(customSuccessAdapter).toHaveBeenCalledWith(
          apiResponse,
          originalRequest
        );
        expect(res).toStrictEqual({ ...apiResponse, aLittle: 'extra' });
      });
    });
  });
});
