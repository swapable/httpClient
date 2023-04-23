// Crude so that it can be used to build a url query string
// as well as a form-data and x-www-form-urlencoded payload
const buildCrudeQueryString = (queryParameters) =>
  Object.entries(queryParameters)
    .map(([k, v]) => k + '=' + v)
    .join('&');

const plugImposableHeadersIn = (headers, getImposableHeaders) => {
  if (headers) {
    const imposableHeaders = getImposableHeaders ? getImposableHeaders() : {};
    return { ...headers, ...imposableHeaders };
  }
  return headers;
};

const buildHeaders = ({ headers, getDefaultHeaders, getImposableHeaders }) =>
  headers === undefined // Allow setting headers as null to send headerless requests
    ? plugImposableHeadersIn(
        getDefaultHeaders ? getDefaultHeaders() : {},
        getImposableHeaders
      )
    : plugImposableHeadersIn(headers, getImposableHeaders);

const getClientBuilder =
  ({ sendRequest, successAdapter, failureAdapter }) =>
  ({
    customSuccessAdapter,
    customFailureAdapter,
    getDefaultHeaders, // Function so that JS 'this' can be used by consumer
    getImposableHeaders, // Function so that JS 'this' can be used by consumer
  } = {}) => {
    const execute = ({
      headers,
      method,
      url,
      data,
      queryParameters,
      attemptNumber = 1,
    }) => {
      const qs = queryParameters
        ? `?${buildCrudeQueryString(queryParameters)}`
        : '';
      const request = {
        headers: buildHeaders({
          headers,
          getDefaultHeaders,
          getImposableHeaders,
        }),
        method: method.toUpperCase(),
        url: url + qs,
        attemptNumber,
      };
      if (data) {
        request.data = typeof data === 'string' ? data : JSON.stringify(data);
      }
      return sendRequest(request)
        .then(successAdapter)
        .then((response) =>
          customSuccessAdapter
            ? customSuccessAdapter(response, request)
            : response
        )
        .catch(failureAdapter)
        .catch((error) => {
          if (customFailureAdapter) {
            return customFailureAdapter(error, request);
          }
          throw error;
        });
    };
    return {
      buildCrudeQueryString,
      execute,
      get: (url, { headers, queryParameters } = {}) =>
        execute({ headers, url, queryParameters, method: 'GET' }),
      post: (url, { headers, queryParameters, data } = {}) =>
        execute({ headers, url, queryParameters, data, method: 'POST' }),
      put: (url, { headers, queryParameters, data } = {}) =>
        execute({ headers, url, queryParameters, data, method: 'PUT' }),
      patch: (url, { headers, queryParameters, data } = {}) =>
        execute({ headers, url, queryParameters, data, method: 'PATCH' }),
      delete: (url, { headers, queryParameters } = {}) =>
        execute({ headers, url, queryParameters, method: 'DELETE' }),
    };
  };

module.exports = getClientBuilder;
