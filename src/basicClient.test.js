const getClientBuilder = require('.');

const API_BASE_URL = 'https://lol.com';
let sendRequest;
let successAdapter;
let failureAdapter;
let clientBuilder;
let apiResponse;
let originalRequest;
let basicClient;
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
  basicClient = clientBuilder();
});

describe('httpClient', () => {
  describe('basicClient', () => {
    describe('get', () => {
      test('without query string', () => {
        return basicClient.get(API_BASE_URL).then((res) => {
          expect(res).toStrictEqual(apiResponse);
          expect(sendRequest).toHaveBeenCalledWith(originalRequest);
          expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
          expect(failureAdapter).not.toHaveBeenCalled();
        });
      });
      test('with query string', () => {
        const queryParameters = { some: 'query', parameters: 'test' };
        return basicClient
          .get(API_BASE_URL, { queryParameters })
          .then((res) => {
            expect(res).toStrictEqual(apiResponse);
            expect(sendRequest).toHaveBeenCalledWith({
              ...originalRequest,
              url: `${API_BASE_URL}?some=query&parameters=test`,
            });
            expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
            expect(failureAdapter).not.toHaveBeenCalled();
          });
      });
    });
    describe('post', () => {
      test('with json data, custom headers and query params', () => {
        const payload = { some: 'data' };
        const headers = { justFor: 'this request' };
        const queryParameters = { why: 'though' };
        return basicClient
          .post(API_BASE_URL, { data: payload, headers, queryParameters })
          .then((res) => {
            expect(res).toStrictEqual(apiResponse);
            expect(sendRequest).toHaveBeenCalledWith({
              ...originalRequest,
              headers,
              method: 'POST',
              url: `${API_BASE_URL}?why=though`,
              data: JSON.stringify(payload),
            });
            expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
            expect(failureAdapter).not.toHaveBeenCalled();
          });
      });
      test('with string data', () => {
        const payload = 'some=data';
        return basicClient.post(API_BASE_URL, { data: payload }).then((res) => {
          expect(res).toStrictEqual(apiResponse);
          expect(sendRequest).toHaveBeenCalledWith({
            ...originalRequest,
            method: 'POST',
            data: payload,
          });
          expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
          expect(failureAdapter).not.toHaveBeenCalled();
        });
      });
      test('without payload will not throw, but maybe it should?', () => {
        return basicClient.post(API_BASE_URL).then((res) => {
          expect(res).toStrictEqual(apiResponse);
          expect(sendRequest).toHaveBeenCalledWith({
            ...originalRequest,
            method: 'POST',
          });
          expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
          expect(failureAdapter).not.toHaveBeenCalled();
        });
      });
    });
    describe('put', () => {
      test('with json data', () => {
        const payload = { some: 'data' };
        return basicClient.put(API_BASE_URL, { data: payload }).then((res) => {
          expect(res).toStrictEqual(apiResponse);
          expect(sendRequest).toHaveBeenCalledWith({
            ...originalRequest,
            method: 'PUT',
            data: JSON.stringify(payload),
          });
          expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
          expect(failureAdapter).not.toHaveBeenCalled();
        });
      });
      test('with string data', () => {
        const payload = 'some=data';
        return basicClient.put(API_BASE_URL, { data: payload }).then((res) => {
          expect(res).toStrictEqual(apiResponse);
          expect(sendRequest).toHaveBeenCalledWith({
            ...originalRequest,
            method: 'PUT',
            data: payload,
          });
          expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
          expect(failureAdapter).not.toHaveBeenCalled();
        });
      });
      test('without payload will not throw, but maybe it should?', () => {
        return basicClient.put(API_BASE_URL).then((res) => {
          expect(res).toStrictEqual(apiResponse);
          expect(sendRequest).toHaveBeenCalledWith({
            ...originalRequest,
            method: 'PUT',
          });
          expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
          expect(failureAdapter).not.toHaveBeenCalled();
        });
      });
    });
    describe('patch', () => {
      test('with json data', () => {
        const payload = { some: 'data' };
        return basicClient
          .patch(API_BASE_URL, { data: payload })
          .then((res) => {
            expect(res).toStrictEqual(apiResponse);
            expect(sendRequest).toHaveBeenCalledWith({
              ...originalRequest,
              method: 'PATCH',
              data: JSON.stringify(payload),
            });
            expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
            expect(failureAdapter).not.toHaveBeenCalled();
          });
      });
      test('with string data', () => {
        const payload = 'some=data';
        return basicClient
          .patch(API_BASE_URL, { data: payload })
          .then((res) => {
            expect(res).toStrictEqual(apiResponse);
            expect(sendRequest).toHaveBeenCalledWith({
              ...originalRequest,
              method: 'PATCH',
              data: payload,
            });
            expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
            expect(failureAdapter).not.toHaveBeenCalled();
          });
      });
      test('without payload will not throw, but maybe it should?', () => {
        return basicClient.patch(API_BASE_URL).then((res) => {
          expect(res).toStrictEqual(apiResponse);
          expect(sendRequest).toHaveBeenCalledWith({
            ...originalRequest,
            method: 'PATCH',
          });
          expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
          expect(failureAdapter).not.toHaveBeenCalled();
        });
      });
    });
    test('delete', () => {
      const url = `${API_BASE_URL}/deletables`;
      return basicClient.delete(url).then((res) => {
        expect(res).toStrictEqual(apiResponse);
        expect(sendRequest).toHaveBeenCalledWith({
          ...originalRequest,
          method: 'DELETE',
          url,
        });
        expect(successAdapter).toHaveBeenCalledWith({ data: apiResponse });
        expect(failureAdapter).not.toHaveBeenCalled();
      });
    });
  });
});
