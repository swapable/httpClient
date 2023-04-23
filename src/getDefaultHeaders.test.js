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
  describe('getDefaultHeaders', () => {
    let apiClient;
    let defaultHeaders;
    let getDefaultHeaders;
    let expectedRequest;
    beforeEach(() => {
      defaultHeaders = { 'Content-Type': 'application/json' };
      getDefaultHeaders = jest.fn(() => defaultHeaders);
      apiClient = clientBuilder({ getDefaultHeaders });
      expectedRequest = {
        attemptNumber: 1,
        headers: defaultHeaders,
        method: 'GET',
        url: API_BASE_URL,
      };
    });
    test('should NOT be called when headers are null', () => {
      expectedRequest.headers = null;
      return apiClient.get(API_BASE_URL, { headers: null }).then(() => {
        expect(getDefaultHeaders).not.toHaveBeenCalled();
        expect(sendRequest).toHaveBeenCalledWith(expectedRequest);
      });
    });
    test('should NOT be called when headers are explicitly set', () => {
      const explicitHeaders = { timeStamp: 'in the moment' };
      expectedRequest.headers = explicitHeaders;
      return apiClient
        .get(API_BASE_URL, { headers: explicitHeaders })
        .then(() => {
          expect(getDefaultHeaders).not.toHaveBeenCalled();
          expect(sendRequest).toHaveBeenCalledWith(expectedRequest);
        });
    });
    describe('should be called when headers are undefined', () => {
      test('and imposableHeaders are undefined', () => {
        expectedRequest.headers = { ...defaultHeaders };
        return apiClient.get(API_BASE_URL).then(() => {
          expect(getDefaultHeaders).toHaveBeenCalled();
          expect(sendRequest).toHaveBeenCalledWith(expectedRequest);
        });
      });
      test('and imposableHeaders are defined', () => {
        const imposableHeaders = { 'User-Agent': 'Unit test' };
        const getImposableHeaders = jest.fn(() => imposableHeaders);
        apiClient = clientBuilder({ getDefaultHeaders, getImposableHeaders });
        expectedRequest.headers = { ...defaultHeaders, ...imposableHeaders };
        return apiClient.get(API_BASE_URL).then(() => {
          expect(getDefaultHeaders).toHaveBeenCalled();
          expect(sendRequest).toHaveBeenCalledWith(expectedRequest);
        });
      });
    });
  });
});
