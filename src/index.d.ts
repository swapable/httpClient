type Headers = Record<string, string>;
type PathParams = (string | number)[];
type QueryParams = Record<string, string>;

type RequestElements = {
  /**
   * When not specified, defaults to `1` to signify "1st attempt".
   * 
   * Consumers are responsible for incrementing this value
   * if and when implementing retry logic.
   */
  attemptNumber?: number,
  data?: any,
  headers?: Headers,
  method?: string,
  /**
   * Used to build a `/path/appended/to/url`.
   */
  pathParams?: PathParams,
  /**
   * Used to build a `?query=string&appendedto=url%26path`.
   */
  queryParams?: QueryParams,
  url?: string,
};

type Requestor = (options: RequestElements) => Promise<any>;

// Utility type: ExcludeKeys
// ExcludeKeys<T, K> excludes keys specified in K from the keys of type T
// K is a list of props that should be excluded when we're trying to list all the props of an obj T
type ExcludeKeys<T, K extends keyof T> = Exclude<keyof T, K>;

// You can "type" something as
// RequestOptions<'{any key on RequestElements except method, url and data}'>
// eg: RequestOptions<'queryParams'> but not RequestOptions<'url'>
// with "Pick", you get an auto-suggest list of acceptable value as soon as you type RequestOptions<'
type RequestOptions<T extends ExcludeKeys<RequestElements, 'method' | 'url' | 'data'> = ExcludeKeys<RequestElements, 'method' | 'url' | 'data'>> = Pick<RequestElements, T>;

type MutatingRequestor = (url: string, data: any, options?: RequestOptions) => Promise<any>;
type NonMutatingRequestor = (url: string, options?: RequestOptions) => Promise<any>;

type RequestFunctions = {
  send: Requestor;
  get: NonMutatingRequestor;
  post: MutatingRequestor;
  put: MutatingRequestor;
  patch: MutatingRequestor;
  options: NonMutatingRequestor;
  delete: NonMutatingRequestor; // Considered non-mutating in this context
};

type ClientConfig = {
  /**
   * The url `all requests` should be sent to for this `specific client`.
   * 
   * Can be overridden on a per-request basis.
   * example: `apiClient.get('https://api.com');`
   */
  baseUrl?: string,
  /**
   * Called when a promise resolves.
   * 
   * Define a behaviour common to `all requests` sent by this `specific client`.
   */
  successHandler?: (res: any, req: RequestElements) => any,
  /**
   * Called when a promise rejects.
   * 
   * Define a behaviour common to `all requests` sent by this `specific client`.
   */
  failureHandler?: (err: any, req: RequestElements) => any | never,
  /**
   * If provided, this function is called automatically
   * when no headers are provided at the request level.
   * @returns {Headers} Headers
   */
  setDefaultHeaders?: () => Headers,
  /**
   * If provided, this function is called automatically
   * unless headers are explicitly set to `null` at the request level.
   * 
   * This is useful if, for example, you want to specify an additional `User-Agent` header
   * on all requests, regardless of how the other headers are set.
   * @returns {Headers} Headers
   */
  setFixedHeaders?: () => Headers,
};

/**
 * Use this to build an Http Client tailored to a specific API.
 * @param {ClientConfig} config 
 * @returns {RequestFunctions} A collection of functions to send requests to a given API.
 */
declare function builder({
  baseUrl,
  successHandler,
  failureHandler,
  setDefaultHeaders,
  setFixedHeaders,
}: ClientConfig) : RequestFunctions;

type VendorAdapters = {
  /**
   * Adapts the request to the swappable dependency.
   */
  requestAdapter: Requestor,
  /**
   * Always called when a promise resolves.
   * 
   * Define a behaviour common to `all clients` instantiated with this builder.
   */
  responseAdapter: (res: any) => any,
  /**
   * Always called when a promise rejects.
   * 
   * Define a behaviour common to `all clients` instantiated with this builder.
   */
  errorAdapter: (err: any) => any | never,
};

/**
 * Configure the behaviours common to all clients.
 * @param {VendorAdapters} vendorAdapters
 * @returns {Builder} A function to configure the behaviours common to all requests
 * for a specific API's client.
 */
declare function getBuilder({
  requestAdapter,
  responseAdapter,
  errorAdapter
}: VendorAdapters) : typeof builder

export = getBuilder;
