const nodePath = require('path');

const urlBuilder = (baseUrl) => ({ url = '', pathParams = [], queryParams = {} } = {}) => {
  let finalUrl;
  try {
    // check if consumer intends to pass a full url (thereby ignoring baseUrl for this request)
    const reqUrl = new URL(url);
    finalUrl = new URL(nodePath.join(reqUrl.href, ...pathParams));
  } catch (e) {
    // check if consumer passed a url without a protocol (e.g. 'google.com')
    if (/\.([a-z]{2,})$/i.test(url)) {
      console.warn("Did you intend to pass a full url? Make sure to include 'http://' or 'https://'.");
    }
    // if consumer did not pass a full url, use baseUrl and assume url is a relative path
    const base = new URL(baseUrl || 'about:blank');
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
    get: (url, { queryParams, pathParams, headers } = {}) => send({ url, queryParams, pathParams, headers }),
    post: (url, data, { pathParams, headers } = {}) => send({ method: 'post', url, pathParams, headers, data }),
    put: (url, data, { pathParams, headers } = {}) => send({ method: 'put', url, pathParams, headers, data }),
    patch: (url, data, { pathParams, headers } = {}) => send({ method: 'patch', url, pathParams, headers, data }),
    delete: (url, { pathParams, headers } = {}) => send({ method: 'delete', url, pathParams, headers }),
    options: (url, { pathParams, headers } = {}) => send({ method: 'options', url, pathParams, headers }),
  };
};

module.exports = getBuilder;
