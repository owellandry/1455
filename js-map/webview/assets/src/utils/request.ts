// This file was adapted from https://github.com/openai/openai/blob/master/chatgpt/web/src/utils/request.ts
import type { paths as codexPaths } from "@oai/codex-backend-client";
import type { paths as saPaths } from "@oai/sa-server-client";

import { WebFetchWrapper } from "../web-fetch-wrapper";

// Add more as needed.
type HttpMethod = "get" | "post";

export type ParamLocation = "cookie" | "path" | "query" | "header";

type ResponseT = {
  content: {
    [contentType in string]?: unknown;
  };
};

type OperationShapeT = {
  parameters?: {
    [location in ParamLocation]?: {
      [name in string]?: unknown;
    };
  };
  responses: {
    [code in number]?: ResponseT;
  };
  requestBody?: {
    content: {
      [contentType in string]?: unknown;
    };
  };
};

type PathsShapeT = {
  [path in string]?: {
    [method in string]?: OperationShapeT;
  };
};

type WithMethod<Paths extends object, Method extends HttpMethod> = {
  [Pathname in keyof Paths as Paths[Pathname] extends {
    [K in Method]: unknown;
  }
    ? Pathname
    : never]: Paths[Pathname];
};

type Paths<
  Method extends HttpMethod,
  PathSpec extends PathsShapeT,
> = keyof WithMethod<PathSpec, Method> & string;

/**
 * RequiredKeys<T> is the keys of T which are required.
 * e.g.
 *   RequiredKeys<{a: string, b?: number}> = "a"
 *
 * This is a bit of a gnarly type. Here's how it works.
 * - Pick<T, K> gives us a subset of an object, so e.g.
 *   Pick<{a: string, b: number}, "a"> is {a: string}.
 * - The X extends Y ? A : B is a [conditional type](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html).
 * - {} extends Pick<T, K> will be true if K is optional in T, because
 *   {} extends {b?: number} but {} does not extend {a: string}
 * - so {} extends Pick<T, K> ? never : K will be never if K is optional,
 *   and K otherwise.
 *
 * So e.g. if T is {a: string, b?: number}, then we construct the type
 *   { a: "a", b: never }
 * and then index it with [keyof T] (i.e. ["a" | "b"]) to get "a" | never, which
 * collapses to just "a".
 *
 */
type RequiredKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * If RequiredKeys<T> is never, then T has no required keys.
 */
type HasRequiredKeys<T> = RequiredKeys<T> extends never ? false : true;

type PathParameters<T> = T extends {
  parameters: {
    path?: Record<string, string | number>;
    query?: Record<string, unknown>;
  };
}
  ? HasRequiredKeys<T["parameters"]> extends true
    ? { parameters: T["parameters"] }
    : { parameters?: T["parameters"] }
  : { parameters?: undefined };

/**
 * This is a tuple with one element. If T has required keys, then the first
 * element will be required, otherwise it's optional.
 */
type RequiredIfHasRequiredKeys<T> =
  HasRequiredKeys<T> extends true ? [T] : [T?];

type Operation<
  Pathname extends Paths<Method, PathSpec>,
  Method extends HttpMethod,
  PathSpec extends PathsShapeT,
> =
  WithMethod<PathSpec, Method>[Pathname] extends Record<Method, infer Op>
    ? Op
    : never;

type RequestBodyParameters<T> = T extends {
  requestBody: { content: { "application/json": object } };
}
  ? {
      requestBody: T["requestBody"]["content"]["application/json"];
    }
  : T extends {
        requestBody?: { content: { "application/json": object } };
      }
    ? {
        requestBody?: NonNullable<
          T["requestBody"]
        >["content"]["application/json"];
      }
    : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      {};

type AdditionalHeadersOptions = {
  additionalHeaders?: Record<string, string>;
};

type GenericOptions<
  Pathname extends Paths<Method, PathSpec>,
  Method extends HttpMethod,
  PathSpec extends PathsShapeT,
> = PathParameters<Operation<Pathname, Method, PathSpec>> &
  RequestBodyParameters<Operation<Pathname, Method, PathSpec>> &
  AdditionalHeadersOptions;

/**
 * Support 200 or 201 success responses
 */
type SuccessfulJSONResponse<T> = T extends {
  responses: { [200]: { content: { "application/json": infer U } } };
}
  ? U
  : T extends {
        responses: { [201]: { content: { "application/json": infer U } } };
      }
    ? U
    : never;

/**
 * Replaces placeholders in a path string with values from the replacements
 * object. For example, serializePath("/api/{id}/hello", {id: 123}) returns
 * "/api/123/hello". Only supports string or number values, and assumes that
 * any { or } character in the path indicates a placeholder.
 */
export function serializePath(
  path: string,
  replacements: Record<string, string | number>,
): string {
  return path.replace(/\{([^}]+)\}/g, (_, p1) => replacements[p1].toString());
}

/**
 * Map query parameters to a URL string. E.g. serializeQueryParams({a: 1, b: 2}) => ?a=1&b=2
 */
export function serializeQueryParams(params?: Record<string, unknown>): string {
  if (!params) {
    return "";
  }
  const builder = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        builder.append(name, serializeQueryParamValue(v));
      }
    } else if (value != null) {
      builder.append(name, serializeQueryParamValue(value));
    }
  }
  const serialized = builder.toString();
  if (serialized.length === 0) {
    return "";
  }
  return `?${serialized}`;
}

function serializeQueryParamValue(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  const serialized = JSON.stringify(value);
  return serialized ?? "";
}

class SaServerHttpClient<PathSpec extends PathsShapeT> {
  private async makeRequest<
    Method extends HttpMethod,
    Pathname extends Paths<Method, PathSpec>,
  >(
    method: Method,
    path: Pathname,
    options?: GenericOptions<Pathname, Method, PathSpec>,
  ): Promise<SuccessfulJSONResponse<Operation<Pathname, Method, PathSpec>>> {
    const query =
      options?.parameters && "query" in options.parameters
        ? options.parameters.query
        : undefined;
    const pathSubstitutions =
      options?.parameters &&
      "path" in options.parameters &&
      options.parameters.path
        ? options.parameters.path
        : {};
    const serializedPath = serializePath(path, pathSubstitutions);
    const serializedParams = serializeQueryParams(query);
    const additionalHeaders = options?.additionalHeaders;

    const url = `${serializedPath}${serializedParams}`;

    switch (method) {
      case "get": {
        const response = await WebFetchWrapper.getInstance().get<
          SuccessfulJSONResponse<Operation<Pathname, Method, PathSpec>>
        >(url, additionalHeaders);
        return response.body;
      }
      case "post": {
        const requestBody =
          options && "requestBody" in options
            ? JSON.stringify(options.requestBody)
            : undefined;
        const response = await WebFetchWrapper.getInstance().post<
          SuccessfulJSONResponse<Operation<Pathname, Method, PathSpec>>
        >(url, requestBody, additionalHeaders);
        return response.body;
      }
    }
  }

  /**
   * typesafe GET request to /api.
   *
   * Only handles "application/json" content type.
   */
  async safeGet<Pathname extends Paths<"get", PathSpec>>(
    path: Pathname,
    ...args: RequiredIfHasRequiredKeys<
      GenericOptions<Pathname, "get", PathSpec>
    >
  ): Promise<SuccessfulJSONResponse<Operation<Pathname, "get", PathSpec>>>;
  async safeGet<Pathname extends Paths<"get", PathSpec>>(
    path: Pathname,
    ...args: RequiredIfHasRequiredKeys<
      GenericOptions<Pathname, "get", PathSpec>
    >
  ): Promise<SuccessfulJSONResponse<Operation<Pathname, "get", PathSpec>>> {
    return this.makeRequest("get", path, args[0]);
  }

  /**
   * typesafe POST request to /api.
   *
   * Only handles "application/json" content type.
   */
  async safePost<Pathname extends Paths<"post", PathSpec>>(
    path: Pathname,
    ...args: RequiredIfHasRequiredKeys<
      GenericOptions<Pathname, "post", PathSpec>
    >
  ): Promise<SuccessfulJSONResponse<Operation<Pathname, "post", PathSpec>>>;
  async safePost<Pathname extends Paths<"post", PathSpec>>(
    path: Pathname,
    ...args: RequiredIfHasRequiredKeys<
      GenericOptions<Pathname, "post", PathSpec>
    >
  ): Promise<SuccessfulJSONResponse<Operation<Pathname, "post", PathSpec>>> {
    return this.makeRequest("post", path, args[0]);
  }
}
type RemapCodexPaths<Paths extends object> = {
  [K in keyof Paths as K extends `/api/codex/${infer Rest}`
    ? `/wham/${Rest}`
    : never]: Paths[K];
};
type NonCodexSaPaths<Paths extends object> = {
  [K in keyof Paths as K extends `/api/codex/${string}`
    ? never
    : K extends `/api/${infer Rest}`
      ? `/${Rest}`
      : never]: Paths[K];
};
type CombinedPaths = RemapCodexPaths<codexPaths> & NonCodexSaPaths<saPaths>;
export const CodexRequest = new SaServerHttpClient<CombinedPaths>();
