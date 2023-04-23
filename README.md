# httpClient
Facilitate the swapability of HTTP client dependencies in a Node.js project.

## Swapability
Dependency injection's fraternal twin.

Dependencies, and the security vulnerabilities that come with them, are burdens on node.js project maintainers. We want to promote code that makes replacing 1 dependency with another easy.

### Case in point:
The `request` _npm package_ used to be a _dependency_ for millions of _node_ projects.

Then came this update:
> As of Feb 11th 2020, request is fully deprecated. No new changes are expected [to] land.
> In fact, none have landed for some time.

`Axios` and `node-fetch` presented themselves as obvious choices to migrate to. At some point the
`fetch API` is probably going to become native to node. Even then, what is to say that something
better won't surface down the road?

This project reduces the time and effort required to transition from `request`
to `axios` to `fetch API` to `whatever is the new shiny thing today`.

One amazing side-effect of using this library, is that it also organically promotes good unit tests,
because now you can easily mock responses for any http request.

## How to use
### With Axios example
```js
// buildHttpClient.js
const getClientBuilder = require('httpClient');
const { default: axios } = require('axios');

const buildHttpClient = getClientBuilder({
  sendRequest: axios,
  successAdapter: (res) => res.data,
  failureAdapter: (error) => {
    const e = new Error('No response received from the API');
    if (error.response) {
      e.status = error.response.status;
      e.payload = error.response.data;
      e.message = error.message || `API responded with [${e.status}]`;
    }
    throw e;
  },
});

module.exports = buildHttpClient;
```
`getClientBuilder` returns a function (named `buildHttpClient` here)
that allows you to spin up as many http Clients as your project needs.

You might want that because your node.js app might make requests to `2 different APIs`,
and no 2 APIs are the same.

For example, imagine an app that fetches data from your company and then posts a message to
a Slack channel. There's at least 1 call to your company's API and 1 call to the Slack API.

One of the interesting things about the Slack API,
is that it rarely returns any status other than `200`.
What you get instead is an `{ ok: false, ...etc }` payload.

Maybe you'd like to write logic so that not ok responses throw errors instead,
and you'd very much like writing this logic only once. So:

```js
// slackApiClient.js
const buildHttpClient = require('./path/to/buildHttpClient');

const slackApiClient = buildHttpClient({
  customSuccessAdapter: (res) => {
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
  getDefaultHeaders: () => ({
    'Content-Type': 'application/json; charset=utf-8',
  }),
});
```

Then your company's API is secured by OAuth, and you'd like the logic for automatically refreshing
tokens to be writen only once as well.
Here is how this might look like:

```js
// myCompanyApiClient.js
const buildHttpClient = require('./path/to/buildHttpClient');

function MyCompanyApiClient() {
  this.token = 'originalTokenBoundToExpire';
  this.apiHttpClient = buildHttpClient({
    customFailureAdapter: (error, originalRequet) => {
      if (error.status === 403 && originalRequet.attemptNumber < 2) {
        return this.refreshOAuthToken()
          .then(() => this.apiHttpClient.execute({
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
    getDefaultHeaders: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    }),
    getImposableHeaders: () => ({
      'User-Agent': 'My app (5.0.5)'
    }),
  });
}

MyCompanyApiClient.prototype.refreshOAuthToken = function refreshOAuthToken() {
  this.token = 'refreshedTokenOverwritingOriginalToken';
  return Promise.resolve(this.token);
};

MyCompanyApiClient.prototype.fetchUsers = function fetchUsers() {
  return this.apiHttpClient.get('https://lol.com/users');
};
```

#### sendRequest (required)
Typically provided by a separate library like `axios` or `fetch`,
this is the function that will actually execute the http request.

It will be called with:
```json
{
  "headers": { "or": null },
  "method": "UPPERCASE http method",
  "url": "fully qualified url",
  "attemptNumber": 1,
  "data": "json string or undefined"
}
```
Must always return a `promise`.

#### successAdapter & failureAdapter
These are the callbacks that will `always` be called when a promise settles,
for `all` clients.

In other words, this is about transforming the API responses and errors
from the swapable dependency, _regardless_ of which _API_ returns or throws them.

You can think of it as a _vendor adapter_, where the `vendor` is the swapable library (eg: axios).

This is a good place to add debug logs.

If really you're happy with the response or error just the way the vendor delivers them,
then just do:
```js
successAdapter = res => res;
failureAdapter = err => { throw err };
```

#### customSuccessAdapter & customFailureAdapter
These are the optional callbacks that you may want to be called when a promise settles,
for `a specific` client.

In other words, this is about transforming the API responses and errors of a specific API,
_regardless_ of which _library_ executes the request.

This is a good place to handle OAuth token expirations.

Both customSuccessAdapter & customFailureAdapter receive the original request as their 2nd argument.

#### getDefaultHeaders (optional)
If set, it is called automatically when no headers are provided to a client's method.
```js
// getDefaultHeaders will be called
apiClient
  .get('https://lol.com')
  .catch(console.error);

// getDefaultHeaders will not be called
const headers = { 'Content-Type': 'application/json' };
apiClient
  .get('https://lol.com', { headers })
  .catch(console.error);
```

#### getImposableHeaders (optional)
If set, it is called automatically unless headers are explicitly set to `null`.
This is useful if, for example, you want to specify a User-Agent on all requests,
regardless of whether the headers are set at the method level or at the default headers level.
```js
// getImposableHeaders will be called
apiClient
  .get('https://lol.com')
  .catch(console.error);
// getImposableHeaders will be called
const headers = { 'Content-Type': 'application/json' };
apiClient
  .get('https://lol.com', { headers })
  .catch(console.error);

// getImposableHeaders will not be called
apiClient
  .get('https://lol.com', { headers: null })
  .catch(console.error);
```
