const nodePath = require('path');

const resolveBaseUrl = (baseUrl, reqElements) => (
  typeof baseUrl === 'function' ? baseUrl(reqElements) : baseUrl
);

const urlBuilder = (clientBaseUrl) => (reqElements = {}) => {
  const { url = '', pathParams = [], queryParams = {} } = reqElements;
  let finalUrl;
  try {
    // check if consumer intends to pass a full url (thereby ignoring baseUrl for this request)
    const reqUrl = new URL(url);
    finalUrl = new URL(nodePath.join(reqUrl.href, ...pathParams));
  } catch (e) {
    // if consumer did not pass a full url, use baseUrl and assume url is a relative path
    const baseUrl = reqElements.baseUrl === undefined ? clientBaseUrl : reqElements.baseUrl;
    const resolvedBaseUrl = resolveBaseUrl(baseUrl, reqElements);
    const base = new URL(resolvedBaseUrl || 'about:blank');
    finalUrl = new URL(nodePath.join(base.href, url, ...pathParams));
  }
  Object.entries(queryParams).forEach(([key, value]) => finalUrl.searchParams.set(key, value));
  return finalUrl.toString();
};

const headersBuilder = (
  setDefaultHeaders,
  setFixedHeaders,
) => ({ headers } = {}) => {
  // Allow setting headers as null to send headerless requests
  if (setDefaultHeaders && headers === undefined) {
    headers = setDefaultHeaders();
  }
  if (setFixedHeaders) {
    if (headers) {
      // Allow overriding fixedHeaders on a per-request basis
      headers = { ...setFixedHeaders(), ...headers };
    // TODO: think some more about this. There may be value in pushing consumers
    // to pass a setDefaultHeaders
    } else if (headers === undefined) {
      headers = setFixedHeaders();
    }
  }
  return headers;
};

const reqBuilder = (buildUrl, buildHeaders) => (reqElements = {}) => {
  const req = {
    method: reqElements.method ? reqElements.method.toUpperCase() : 'GET',
    url: buildUrl(reqElements),
    headers: buildHeaders(reqElements),
    attemptNumber: reqElements.attemptNumber || 1
  };
  if (reqElements.data) {
    const { data } = reqElements;
    req.data = typeof data === 'string' ? data : JSON.stringify(data);
  }
  return req;
};

const getBuilder = ({
  requestAdapter,
  responseAdapter,
  errorAdapter
} = {}) => ({
  baseUrl,
  successHandler,
  failureHandler,
  setDefaultHeaders,
  setFixedHeaders,
} = {}) => {
  const buildUrl = urlBuilder(baseUrl);
  const buildHeaders = headersBuilder(setDefaultHeaders, setFixedHeaders);
  const buildReq = reqBuilder(buildUrl, buildHeaders);
  const send = (reqElements) => {
    const req = buildReq(reqElements);
    return requestAdapter(req)
      .then(responseAdapter)
      .catch(errorAdapter)
      .then((res) => successHandler ? successHandler(res, req) : res)
      .catch((err) => {
        if (failureHandler) {
          return failureHandler(err, req);
        }
        throw err;
      });
  };
  return {
    send,
    get: (url, { baseUrl, queryParams, pathParams, headers } = {}) => send({ baseUrl, url, queryParams, pathParams, headers }),
    post: (url, data, { baseUrl, pathParams, headers } = {}) => send({ method: 'post', baseUrl, url, pathParams, headers, data }),
    put: (url, data, { baseUrl, pathParams, headers } = {}) => send({ method: 'put', baseUrl, url, pathParams, headers, data }),
    patch: (url, data, { baseUrl, pathParams, headers } = {}) => send({ method: 'patch', baseUrl, url, pathParams, headers, data }),
    delete: (url, { baseUrl, pathParams, headers } = {}) => send({ method: 'delete', baseUrl, url, pathParams, headers }),
    options: (url, { baseUrl, pathParams, headers } = {}) => send({ method: 'options', baseUrl, url, pathParams, headers }),
  };
};

module.exports = getBuilder;
