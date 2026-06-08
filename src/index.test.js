const getBuilder = require('./index');

const responseMock = {
  status: 200,
  data: {
    lol: 'ok',
  },
};
const errorMock = {
  status: 400,
  data: {
    lol: 'error',
  },
};
const aLilSomething = {
  smtg: '1',
};
const requestAdapter = jest.fn(() => Promise.resolve(responseMock));
const responseAdapter = jest.fn((res) => res.data);
const errorAdapter = jest.fn((e) => {
  throw e.data;
});

const BASE_URL = 'http://localhost:3000/api';
const contentTypeHeader = { 'Content-Type': 'application/json' };
const userAgentHeader = {
  'User-Agent': 'MyApp 1.0.0 (http://myapp.com) Node.js',
};
const authHeader = { Authorization: 'Bearer 1234567890' };
const setDefaultHeaders = jest.fn(() => contentTypeHeader);
const setFixedHeaders = jest.fn(() => userAgentHeader);
const successHandler = jest.fn((res) => {
  const resWithALilSomething = { ...res, ...aLilSomething };
  return resWithALilSomething;
});
const failureHandler = jest.fn((e) => {
  const errorWithALilSomethin = { ...e, ...aLilSomething };
  throw errorWithALilSomethin;
});

let httpClientBuilder;
beforeEach(() => {
  httpClientBuilder = getBuilder({
    requestAdapter,
    responseAdapter,
    errorAdapter,
  });
  jest.clearAllMocks();
});

describe('getBuilder', () => {
  test('should return a function', () => {
    expect(typeof httpClientBuilder).toBe('function');
  });
  describe('closure is used to produce an httpClient with baseUrl, setDefaultHeaders and setFixedHeaders', () => {
    let httpClient;
    const path = '/users';
    beforeEach(() => {
      httpClient = httpClientBuilder({
        baseUrl: BASE_URL,
        setDefaultHeaders,
        setFixedHeaders,
      });
    });
    describe('when requestAdapter resolves, responseAdapter should be called', () => {
      test('path is appended to baseUrl, default headers are set when none are provided, and fixed headers are applied', () => {
        return httpClient.get(path).then((response) => {
          expect(setDefaultHeaders).toHaveBeenCalledTimes(1);
          expect(setFixedHeaders).toHaveBeenCalledTimes(1);
          expect(requestAdapter).toHaveBeenCalledWith({
            url: BASE_URL + path,
            method: 'GET',
            headers: {
              ...contentTypeHeader,
              ...userAgentHeader,
            },
            attemptNumber: 1,
          });
          expect(responseAdapter).toHaveBeenCalledWith(responseMock);
          expect(errorAdapter).not.toHaveBeenCalled();
          expect(response).toEqual(responseMock.data);
        });
      });
      test('consumer can pass queryParams that will be used to generate a query string', () => {
        const queryParams = {
          firstName: 'peter',
          lastName: 'parker',
        };
        return httpClient.get(path, { queryParams }).then(() => {
          expect(requestAdapter).toHaveBeenCalledWith(
            expect.objectContaining({
              url: BASE_URL + path + '?firstName=peter&lastName=parker',
            })
          );
        });
      });
      test('client baseUrl can be resolved dynamically for each request', () => {
        const baseUrl = jest.fn(({ url }) => (
          url === '/oauth/token'
            ? 'https://login.salesforce.com'
            : 'https://my-domain.my.salesforce.com'
        ));
        httpClient = httpClientBuilder({
          baseUrl,
          setDefaultHeaders,
          setFixedHeaders,
        });
        return httpClient.get('/oauth/token').then(() => (
          httpClient.get('/services/data/v59.0/sobjects/Account')
        )).then(() => {
          expect(baseUrl).toHaveBeenCalledTimes(2);
          expect(baseUrl).toHaveBeenNthCalledWith(1, expect.objectContaining({
            url: '/oauth/token',
          }));
          expect(baseUrl).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: '/services/data/v59.0/sobjects/Account',
          }));
          expect(requestAdapter).toHaveBeenNthCalledWith(1, expect.objectContaining({
            url: 'https://login.salesforce.com/oauth/token',
          }));
          expect(requestAdapter).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: 'https://my-domain.my.salesforce.com/services/data/v59.0/sobjects/Account',
          }));
        });
      });
      test('request baseUrl overrides client baseUrl', () => {
        return httpClient.get('/oauth/token', {
          baseUrl: 'https://login.salesforce.com',
        }).then(() => {
          expect(requestAdapter).toHaveBeenCalledWith(
            expect.objectContaining({
              url: 'https://login.salesforce.com/oauth/token',
            })
          );
        });
      });
      test('request baseUrl override can be resolved dynamically', () => {
        const baseUrl = jest.fn(() => 'https://test.salesforce.com');
        return httpClient.get('/oauth/token', { baseUrl }).then(() => {
          expect(baseUrl).toHaveBeenCalledWith(expect.objectContaining({
            url: '/oauth/token',
          }));
          expect(requestAdapter).toHaveBeenCalledWith(
            expect.objectContaining({
              url: 'https://test.salesforce.com/oauth/token',
            })
          );
        });
      });
      test('full url still overrides client and request baseUrl', () => {
        const baseUrl = jest.fn(() => 'https://login.salesforce.com');
        return httpClient.get('https://lol.com/overridingBaseUrl', { baseUrl }).then(() => {
          expect(baseUrl).not.toHaveBeenCalled();
          expect(requestAdapter).toHaveBeenCalledWith(
            expect.objectContaining({
              url: 'https://lol.com/overridingBaseUrl',
            })
          );
        });
      });
      ['post', 'put', 'patch'].forEach((method) => {
        test(`${method} method sends data in body`, () => {
          const payload = { add: 'user' };
          return httpClient[method](path, payload).then((response) => {
            expect(setDefaultHeaders).toHaveBeenCalledTimes(1);
            expect(setFixedHeaders).toHaveBeenCalledTimes(1);
            expect(requestAdapter).toHaveBeenCalledWith({
              url: BASE_URL + path,
              method: method.toUpperCase(),
              headers: {
                ...contentTypeHeader,
                ...userAgentHeader,
              },
              attemptNumber: 1,
              data: JSON.stringify(payload),
            });
            expect(responseAdapter).toHaveBeenCalledWith(responseMock);
            expect(errorAdapter).not.toHaveBeenCalled();
            expect(response).toEqual(responseMock.data);
          });
        });
      });
      ['delete', 'options'].forEach((method) => {
        test(`${method} method works without data nor query string`, () => {
          return httpClient[method](path).then((response) => {
            expect(setDefaultHeaders).toHaveBeenCalledTimes(1);
            expect(setFixedHeaders).toHaveBeenCalledTimes(1);
            expect(requestAdapter).toHaveBeenCalledWith({
              url: BASE_URL + path,
              method: method.toUpperCase(),
              headers: {
                ...contentTypeHeader,
                ...userAgentHeader,
              },
              attemptNumber: 1,
            });
            expect(responseAdapter).toHaveBeenCalledWith(responseMock);
            expect(errorAdapter).not.toHaveBeenCalled();
            expect(response).toEqual(responseMock.data);
          });
        });
      });
      describe('the send method can be called directly', () => {
        test('with a pathParams array that will be used to generate a path', () => {
          const req = {
            url: 'https://lol.com/overridingBaseUrl',
            pathParams: ['users', '123'],
          };
          return httpClient.send(req).then((response) => {
            expect(setDefaultHeaders).toHaveBeenCalledTimes(1);
            expect(setFixedHeaders).toHaveBeenCalledTimes(1);
            expect(requestAdapter).toHaveBeenCalledWith({
              url: 'https://lol.com/overridingBaseUrl/users/123',
              method: 'GET',
              headers: {
                ...contentTypeHeader,
                ...userAgentHeader,
              },
              attemptNumber: 1,
            });
            expect(responseAdapter).toHaveBeenCalledWith(responseMock);
            expect(errorAdapter).not.toHaveBeenCalled();
            expect(response).toEqual(responseMock.data);
          });
        });
        test('without specifying anything', () => {
          return httpClient.send().then(() => {
            expect(requestAdapter).toHaveBeenCalledWith(
              expect.objectContaining({
                url: BASE_URL,
                method: 'GET',
              })
            );
          });
        });
        test('posting string data', () => {
          const data = 'grant_type=password&username=foo&password=bar';
          return httpClient.send({ method: 'POST', data }).then(() => {
            expect(requestAdapter).toHaveBeenCalledWith(
              expect.objectContaining({
                url: BASE_URL,
                method: 'POST',
                data,
              })
            );
          });
        });
        test('setting headers as null to prevent default headers and fixed headers getting set', () => {
          return httpClient.send({ headers: null }).then(() => {
            expect(requestAdapter).toHaveBeenCalledWith(
              expect.objectContaining({
                headers: null,
              })
            );
          });
        });
      });
      test('should not set default headers when some are provided, but still apply fixed headers', () => {
        return httpClient
          .get(path, { headers: authHeader })
          .then((response) => {
            expect(setDefaultHeaders).not.toHaveBeenCalled();
            expect(setFixedHeaders).toHaveBeenCalledTimes(1);
            expect(requestAdapter).toHaveBeenCalledWith({
              url: BASE_URL + path,
              method: 'GET',
              headers: {
                ...authHeader,
                ...userAgentHeader,
              },
              attemptNumber: 1,
            });
            expect(responseAdapter).toHaveBeenCalledWith(responseMock);
            expect(errorAdapter).not.toHaveBeenCalled();
            expect(response).toEqual(responseMock.data);
          });
      });
      test('Allow overriding fixedHeaders on a per request basis', () => {
        const overridingHeaders = { 'User-Agent': 'Overridden' };
        return httpClient
          .get(path, { headers: overridingHeaders })
          .then((response) => {
            expect(setDefaultHeaders).not.toHaveBeenCalled();
            expect(setFixedHeaders).toHaveBeenCalledTimes(1);
            expect(requestAdapter).toHaveBeenCalledWith({
              url: BASE_URL + path,
              method: 'GET',
              headers: overridingHeaders,
              attemptNumber: 1,
            });
            expect(responseAdapter).toHaveBeenCalledWith(responseMock);
            expect(errorAdapter).not.toHaveBeenCalled();
            expect(response).toEqual(responseMock.data);
          });
      });
    });
    test('when requestAdapter rejects, errorAdapter should be called', () => {
      requestAdapter.mockImplementationOnce(() => Promise.reject(errorMock));
      return httpClient.get(path).catch((error) => {
        expect(setDefaultHeaders).toHaveBeenCalledTimes(1);
        expect(setFixedHeaders).toHaveBeenCalledTimes(1);
        expect(requestAdapter).toHaveBeenCalledWith({
          url: BASE_URL + path,
          method: 'GET',
          headers: {
            ...contentTypeHeader,
            ...userAgentHeader,
          },
          attemptNumber: 1,
        });
        expect(responseAdapter).not.toHaveBeenCalled();
        expect(errorAdapter).toHaveBeenCalledWith(errorMock);
        expect(error).toEqual(errorMock.data);
      });
    });
  });
  describe('closure is used to produce an httpClient with successHandler and failureHandler', () => {
    let httpClient;
    beforeEach(() => {
      httpClient = httpClientBuilder({ successHandler, failureHandler });
    });
    const expectedReq = {
      url: BASE_URL,
      method: 'GET',
      attemptNumber: 1,
    };
    test('when requestAdapter and responseAdapter resolve, successHandler should be called', () => {
      return httpClient.get(BASE_URL).then((res) => {
        expect(responseAdapter).toHaveBeenCalledWith(responseMock);
        expect(errorAdapter).not.toHaveBeenCalled();
        expect(failureHandler).not.toHaveBeenCalled();
        expect(successHandler).toHaveBeenCalledWith(
          responseMock.data,
          expectedReq
        );
        expect(res).toEqual({ ...responseMock.data, ...aLilSomething });
      });
    });
    test('when requestAdapter and errorAdapter reject, failureHandler should be called', () => {
      requestAdapter.mockImplementationOnce(() => Promise.reject(errorMock));
      return httpClient.get(BASE_URL).catch((e) => {
        expect(responseAdapter).not.toHaveBeenCalled();
        expect(errorAdapter).toHaveBeenCalledWith(errorMock);
        expect(failureHandler).toHaveBeenCalledWith(
          errorMock.data,
          expectedReq
        );
        expect(successHandler).not.toHaveBeenCalled();
        expect(e).toEqual({ ...errorMock.data, ...aLilSomething });
      });
    });
    test('when requestAdapter resolves and responseAdapter rejects, successHandler should not be called', () => {
      // for example, if slack API responds with 200 { ok : false }
      // and the client is configured to throw on non-ok responses
      responseAdapter.mockImplementationOnce(() => Promise.reject(errorMock));
      return httpClient.get(BASE_URL).catch((e) => {
        expect(responseAdapter).toHaveBeenCalledWith(responseMock);
        expect(errorAdapter).toHaveBeenCalledWith(errorMock);
        expect(failureHandler).toHaveBeenCalledWith(
          errorMock.data,
          expectedReq
        );
        expect(successHandler).not.toHaveBeenCalled();
        expect(e).toEqual({ ...errorMock.data, ...aLilSomething });
      });
    });
    test('when requestAdapter rejects and errorAdapter resolves, failureHandler should not be called, but successHandler should be', () => {
      // if someone feels compelled to have a client with a very positive attitude
      requestAdapter.mockImplementationOnce(() => Promise.reject(errorMock));
      errorAdapter.mockImplementationOnce(() =>
        Promise.resolve(responseMock.data)
      );
      return httpClient.get(BASE_URL).then((res) => {
        expect(responseAdapter).not.toHaveBeenCalled();
        expect(errorAdapter).toHaveBeenCalledWith(errorMock);
        expect(failureHandler).not.toHaveBeenCalled();
        expect(successHandler).toHaveBeenCalledWith(
          responseMock.data,
          expectedReq
        );
        expect(res).toEqual({ ...responseMock.data, ...aLilSomething });
      });
    });
  });
});
