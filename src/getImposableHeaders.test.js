const getClientBuilder = require('.');

const API_BASE_URL = 'https://lol.com';
let sendRequest;
let successAdapter;
let failureAdapter;
let clientBuilder;
beforeEach(() => {
  sendRequest = jest.fn(() => Promise.resolve({ data: {} }));
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
  describe('getImposableHeaders', () => {
    let apiClient;
    let imposableHeaders;
    let getImposableHeaders;
    let expectedRequest;
    beforeEach(() => {
      imposableHeaders = { 'User-Agent': 'Unit test' };
      getImposableHeaders = jest.fn(() => imposableHeaders);
      apiClient = clientBuilder({ getImposableHeaders });
      expectedRequest = {
        attemptNumber: 1,
        headers: null,
        method: 'GET',
        url: API_BASE_URL,
      };
    });
    test('should NOT be called when headers are null', () => {
      return apiClient.get(API_BASE_URL, { headers: null }).then(() => {
        expect(getImposableHeaders).not.toHaveBeenCalled();
        expect(sendRequest).toHaveBeenCalledWith(expectedRequest);
      });
    });
    describe('should be called when headers are undefined', () => {
      test('and defaultHeaders are undefined', () => {
        expectedRequest.headers = { ...imposableHeaders };
        return apiClient.get(API_BASE_URL).then(() => {
          expect(getImposableHeaders).toHaveBeenCalled();
          expect(sendRequest).toHaveBeenCalledWith(expectedRequest);
        });
      });
      test('and defaultHeaders are defined', () => {
        const defaultHeaders = { 'Content-Type': 'application/json' };
        const getDefaultHeaders = jest.fn(() => defaultHeaders);
        apiClient = clientBuilder({ getDefaultHeaders, getImposableHeaders });
        expectedRequest.headers = { ...defaultHeaders, ...imposableHeaders };
        return apiClient.get(API_BASE_URL).then(() => {
          expect(getImposableHeaders).toHaveBeenCalled();
          expect(sendRequest).toHaveBeenCalledWith(expectedRequest);
        });
      });
    });
    test('should be called when headers are explicitly set', () => {
      const explicitHeaders = { 'Content-Type': 'application/json' };
      expectedRequest.headers = { ...explicitHeaders, ...imposableHeaders };
      return apiClient
        .get(API_BASE_URL, { headers: explicitHeaders })
        .then(() => {
          expect(getImposableHeaders).toHaveBeenCalled();
          expect(sendRequest).toHaveBeenCalledWith(expectedRequest);
        });
    });
  });
});
