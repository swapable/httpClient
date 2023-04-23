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
  sendRequest = jest.fn(() => Promise.reject({ data: apiResponse }));
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
  describe('customFailureAdapter', () => {
    test('should be skipped when undefined, and failureAdapter error should be thrown', () => {
      const apiClient = clientBuilder();
      return apiClient.get(API_BASE_URL).catch((e) => {
        expect(e).toStrictEqual(apiResponse);
      });
    });
    test('should be called with the failureAdapter error', () => {
      const customFailureAdapter = jest.fn((e) =>
        Promise.reject({ ...e, aLittle: 'extra' })
      );
      const apiClient = clientBuilder({ customFailureAdapter });
      return apiClient.get(API_BASE_URL).catch((e) => {
        expect(failureAdapter).toHaveBeenCalledWith({ data: apiResponse });
        expect(customFailureAdapter).toHaveBeenCalledWith(
          apiResponse,
          originalRequest
        );
        expect(e).toStrictEqual({ ...apiResponse, aLittle: 'extra' });
      });
    });
  });
});
