# httpClient
Facilitate the swappability of HTTP client dependencies in a Node.js project.

## Swappability
Dependency injection's fraternal twin.

Dependencies, and the security vulnerabilities that come with them, are burdens on node.js project maintainers. We want to promote code that makes replacing 1 dependency with another, easy.

Some call this the `façade` design pattern.

### Case in point:
The `request` _npm package_ used to be a _dependency_ for millions of _node_ projects.

Then came this update:
> As of Feb 11th 2020, request is fully deprecated. No new changes are expected [to] land.
> In fact, none have landed for some time.

`Axios` and `node-fetch` presented themselves as obvious choices to migrate to. At some point the
`fetch API` is probably going to become native to node. Even then, what is to say that something
better won't surface down the road?

This project reduces the time and efforts required to transition from `request`
to `axios` to `fetch API` to `whatever is the new shiny thing today`.

One amazing side-effect of using this library, is that it also organically promotes good unit tests,
because now you can easily mock responses for any http request.

## How to use
### Example with Axios
```js
// buildHttpClient.js
const getClientBuilder = require('@swappable/httpclient');
const axios = require('axios').default;

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
          throw error;
      }
      const errorMsg = e.isAxiosError ? 'Could not reach the API' : e.message;
      throw new Error(errorMsg || 'Something went awry and you can probably fix it');
  },
});

module.exports = buildHttpClient;
```
`getClientBuilder` returns a function (named `buildHttpClient` here)
that allows you to spin up as many http Clients as your project needs.

You might want that because your node.js app might make requests to `2+ different APIs`,
and no 2 APIs are the same.

For example, imagine an app that fetches data from your company, and then posts a message to
a Slack channel. There's at least 1 call to your company's API and 1 call to the Slack API.

One of the interesting things about the Slack API,
is that it rarely returns any status other than `200`.
What you get instead is an `{ ok: false, ...etc }` payload.

Maybe you'd like to write logic so that not ok responses throw errors instead,
and you'd very much like to write this logic only once. So:

```js
// in another file eg: slackApiClient.js
// make use of the buildHttpClient you just created
const buildHttpClient = require('./path/to/buildHttpClient');

const slackApiClient = buildHttpClient({
  baseUrl: 'https://slack.com/api',
  successHandler: (res) => {
    if (res.ok) {
      return res;
    }
    throw {
      response: {
        status: 'ok false',
        data: res,
      }
    };
  },
  setDefaultHeaders: () => ({
    'Content-Type': 'application/json; charset=utf-8',
  }),
});

slackApiClient.postMessage = (channel, message) => {
  return slackApiClient.post('chat.postMessage', {
    channel,
    text: message,
  });
};
```

Adjacent to this in your app, your company's API is secured by OAuth, and you'd like the logic
for automatically refreshing tokens to be writen only once as well.
Here is how this might look like:

```js
// myCompanyApiClient.js
const buildHttpClient = require('./path/to/buildHttpClient');

function MyCompanyApiClient() {
  this.token = 'originalTokenBoundToExpire';
  this.apiClient = buildHttpClient({
    baseUrl: 'https://mycompany.com/api',
    failureHandler: (error, originalRequet) => {
      if (error.status === 403 && originalRequet.attemptNumber < 2) {
        return this.refreshOAuthToken()
          .then(() => this.apiClient.send({
            ...originalRequet,
            attemptNumber: originalRequet.attemptNumber + 1,
            headers: {
              ...originalRequet.headers,
              'Authorization': `Bearer ${this.token}`,
            },
          }));
      }
      if (error.payload) {
        const humanReadableMessage = error.payload.reason;
        error.message = `My company Api responded with [${error.status}] ${humanReadableMessage}`;
      }
      throw error;
    },
    setDefaultHeaders: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    }),
    setFixedHeaders: () => ({
      'User-Agent': 'My app (5.0.5)'
    }),
  });
}

MyCompanyApiClient.prototype.refreshOAuthToken = function refreshOAuthToken() {
  this.token = 'refreshedTokenOverwritingOriginalToken';
  return Promise.resolve(this.token);
};

MyCompanyApiClient.prototype.fetchUsers = function fetchUsers() {
  return this.apiClient.get('/users');
};
```

<details>
  <summary>requestAdapter</summary>

  #### requestAdapter
  Adapts the request to the swappable dependency.
  Http client libraries like `axios` or `fetch` always expose a function that actually sends the request over the wire. Their signatures vary, hence the adapter.

  It will always be called with:
  ```json
  {
    "headers": { "or": null },
    "method": "UPPERCASE http method",
    "url": "fully qualified url",
    "attemptNumber": 1
    "data": "json string or undefined"
  }
  ```
  The adapter `must` return a `promise`.
</details>

<details>
  <summary>responseAdapter & errorAdapter</summary>

  #### responseAdapter & errorAdapter
  These are the callbacks that will `always` be called when a promise settles,
  for `all` clients.

  In other words, this is about transforming the API responses and errors
  from the swappable dependency, _regardless_ of which _API_ returns or throws them.

  You can think of it as a _vendor adapter_, where the `vendor` is the swappable library (eg: axios).

  This is a good place to add debug logs.

  If really you're happy with the response or error just the way the vendor delivers them,
  then just do:
  ```js
  const responseAdapter = res => res;
  const errorAdapter = err => { throw err };
  ```
</details>

<details>
  <summary>successHandler & failureHandler</summary>

  #### successHandler & failureHandler
  These are the optional callbacks that you may want called when a promise settles,
  for `a specific` client.

  In other words, this is about transforming the API responses and errors of a specific API,
  _regardless_ of which _library_ executes the request.

  This is a good place to handle OAuth token expirations.

  Both customSuccessAdapter & customFailureAdapter receive the original request as their 2nd argument.
  ```js
  const successHandler = (res, req) => /* do your thing */;
  const failureHandler = (err, req) => /* do your thing */;
  ```
</details>

<details>
  <summary>
    Order of precedence for setting headers is:
    setDefaultHeaders < setFixedHeaders < <b>headers</b> < <b>null</b>
  </summary>

  #### `setDefaultHeaders` < `setFixedHeaders` < per-request headers < `null`
  The latter will take precedence over the former.

  What this means is:
  If the consumer specifies headers on a per-request basis,
  like so: `apiClient.get(url, { headers })`, while also specifying the `setFixedHeaders` and
  `setDefaultHeaders` functions:
  1. `setDefaultHeaders` does not even get called for this request
  2. the return value of `setFixedHeaders` is merged with the request headers,
  but when 2 keys match, the per-request specification is used
  3. every single key of the per-request headers is guaranteed to be sent to the api
  4. every key of the fixed headers that isn't overridden by the per-request headers, is sent
  5. `apiClient.get(url, { headers: null })` specifies that `no` headers should be sent
  with this request
</details>

<details>
  <summary>setDefaultHeaders</summary>

#### setDefaultHeaders
If provided, it is called automatically when no headers are provided on a per-request basis.
```js
// setDefaultHeaders will be called
apiClient
  .get('https://lol.com')
  .catch(console.error);

// setDefaultHeaders will not be called
const headers = { 'Content-Type': 'application/json' };
apiClient
  .get('https://lol.com', { headers })
  .catch(console.error);
```
</details>

<details>
  <summary>setFixedHeaders</summary>

#### setFixedHeaders
If provided, it is called automatically unless headers are explicitly set to `null`.
This is useful if, for example, you want to specify an additional "User-Agent" header on all requests,
regardless of how the other headers are set.
```js
// apiClient was instantiated with
// setFixedHeaders: () => ({ 'Content-Type': 'application/json' })

apiClient
  .get('https://lol.com')
  .catch(console.error);
// applied as headers === { 'Content-Type': 'application/json' }

const headers = { 'timeout': 5000 };
apiClient
  .get('https://lol.com', { headers })
  .catch(console.error);
// merged as headers === { 'Content-Type': 'application/json', 'timeout': 5000 }

const headers = { 'Content-Type': 'x-www-form-urlencoded' };
apiClient
  .post('https://lol.com/auth', 'grant_type=password+stuff=etc', { headers })
  .catch(console.error);
// overridden as headers === { 'Content-Type': 'x-www-form-urlencoded' }

apiClient
  .get('https://lol.com', { headers: null })
  .catch(console.error);
// setFixedHeaders was not called
```
</details>


<details>
  <summary>Methods of the produced clients</summary>

#### Methods of the produced clients
+ `get`: (url, { queryParams, pathParams, headers } = {}) => Promise
+ `post`: (url, data, { pathParams, headers } = {}) => Promise
+ `put`: (url, data, { pathParams, headers } = {}) => Promise
+ `patch`: (url, data, { pathParams, headers } = {}) => Promise
+ `delete`: (url, { pathParams, headers } = {}) => Promise
+ `options`: (url, { pathParams, headers } = {}) => Promise
And for when you need full control over the request:
+ `send`: ({ headers, method, url, data, queryParams, pathParams, attemptNumber }) => Promise
  + `pathParams` is an `array` of strings used to build a `/path/appended/to/url`
  + `queryParams` is an `object` literal used to build a `?query=string&appendedto=url%26path`
  + `attemptNumber` is the `number` of time this request has been attempted. Defaults to `1`
</details>

When assessing whether this tool is right for you,
take a look at the [sandbox](sandbox.js) and [test](src/index.test.js) files, to see it being used.