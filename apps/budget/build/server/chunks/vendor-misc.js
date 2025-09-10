import { clsx as clsx$1 } from "clsx";
import { json, text, error } from "@sveltejs/kit";
import { HttpError, SvelteKitError, Redirect, ActionFailure } from "@sveltejs/kit/internal";
import { with_request_store, merge_tracing, get_request_store } from "@sveltejs/kit/internal/server";
import * as devalue from "devalue";
import { parse, serialize } from "cookie";
import * as set_cookie_parser from "set-cookie-parser";
import parse$1 from "style-to-object";
import { i as $35ea8db9cb2ccb90$export$ca871e8dbb80966f, b as $35ea8db9cb2ccb90$export$99faa760c7908e4f, $ as $14e0f24ef4ac5c92$export$aa8b41735afcabd2, j as $35ea8db9cb2ccb90$export$d3b7288e7994edea, k as $fae977aafc393c5c$export$fd7893f06e92a6a4, l as $fae977aafc393c5c$export$588937bcd60ade55, e as $fae977aafc393c5c$export$6b862160d295c8e, m as $11d87f3f76e88657$export$b4a036af3fc0b032, n as $14e0f24ef4ac5c92$export$2061056d06d7cdf7, c as $fb18d541ea1ad717$export$ad991b66133851cf, o as $14e0f24ef4ac5c92$export$a5a3b454ada2268e, p as $14e0f24ef4ac5c92$export$a2258d9c4118825c, q as $14e0f24ef4ac5c92$export$ea39ec197993aef0, r as $14e0f24ef4ac5c92$export$a18c89cbd24170ff, s as $14e0f24ef4ac5c92$export$629b0a497aa65267 } from "./vendor-date.js";
import { tabbable, focusable, isFocusable, isTabbable } from "tabbable";
import { computePosition, offset, shift, flip, size, arrow, hide, limitShift } from "@floating-ui/dom";
import { format, localPoint, sortFunc, Logger, unique, isLiteralObject, Duration, DateToken, PeriodType, greatestAbs, endOfInterval } from "@layerstack/utils";
import { cls } from "@layerstack/tailwind";
import { interpolatePath } from "d3-interpolate-path";
import "@dagrejs/dagre";
import { objectId } from "@layerstack/utils/object";
import "d3-tile";
import "d3-sankey";
import { curveLinearClosed, lineRadial, line, pointRadial, arc, areaRadial, area, pie } from "d3-shape";
import { scaleTime, scaleLinear, scaleBand, scaleSqrt, scaleOrdinal } from "d3-scale";
import { get as get$4 } from "lodash-es";
import { rgb } from "d3-color";
import memoize from "memoize";
import { InternSet, max, min, bisector, extent, range, quantile, index } from "d3-array";
import { quadtree } from "d3-quadtree";
import { Delaunay } from "d3-delaunay";
import { geoVoronoi } from "d3-geo-voronoi";
import { geoPath, geoTransform } from "d3-geo";
import { path } from "d3-path";
import { quantize, interpolate, interpolateRound } from "d3-interpolate";
import { timeTicks, timeYear, timeDay, timeHour, timeMinute, timeSecond, timeMillisecond, timeWeek, timeDays, timeMonths } from "d3-time";
const BROWSER = false;
const DEV = true;
let base = "";
let assets = base;
const app_dir = "_app";
const initial = { base, assets };
function override(paths) {
  base = paths.base;
  assets = paths.assets;
}
function reset() {
  base = initial.base;
  assets = initial.assets;
}
function set_assets(path2) {
  assets = initial.assets = path2;
}
const SVELTE_KIT_ASSETS = "/_svelte_kit_assets";
const ENDPOINT_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const PAGE_METHODS = ["GET", "POST", "HEAD"];
function negotiate(accept, types) {
  const parts = [];
  accept.split(",").forEach((str, i) => {
    const match = /([^/ \t]+)\/([^; \t]+)[ \t]*(?:;[ \t]*q=([0-9.]+))?/.exec(str);
    if (match) {
      const [, type, subtype, q = "1"] = match;
      parts.push({ type, subtype, q: +q, i });
    }
  });
  parts.sort((a, b) => {
    if (a.q !== b.q) {
      return b.q - a.q;
    }
    if (a.subtype === "*" !== (b.subtype === "*")) {
      return a.subtype === "*" ? 1 : -1;
    }
    if (a.type === "*" !== (b.type === "*")) {
      return a.type === "*" ? 1 : -1;
    }
    return a.i - b.i;
  });
  let accepted;
  let min_priority = Infinity;
  for (const mimetype of types) {
    const [type, subtype] = mimetype.split("/");
    const priority = parts.findIndex(
      (part) => (part.type === type || part.type === "*") && (part.subtype === subtype || part.subtype === "*")
    );
    if (priority !== -1 && priority < min_priority) {
      accepted = mimetype;
      min_priority = priority;
    }
  }
  return accepted;
}
function is_content_type(request, ...types) {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
  return types.includes(type.toLowerCase());
}
function is_form_content_type(request) {
  return is_content_type(
    request,
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain"
  );
}
function coalesce_to_error(err) {
  return err instanceof Error || err && /** @type {any} */
  err.name && /** @type {any} */
  err.message ? (
    /** @type {Error} */
    err
  ) : new Error(JSON.stringify(err));
}
function normalize_error(error2) {
  return (
    /** @type {import('../exports/internal/index.js').Redirect | HttpError | SvelteKitError | Error} */
    error2
  );
}
function get_status(error2) {
  return error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : 500;
}
function get_message(error2) {
  return error2 instanceof SvelteKitError ? error2.text : "Internal Error";
}
let public_env = {};
let fix_stack_trace = (error2) => error2?.stack;
function set_private_env(environment) {
}
function set_public_env(environment) {
  public_env = environment;
}
const escape_html_attr_dict = {
  "&": "&amp;",
  '"': "&quot;"
  // Svelte also escapes < because the escape function could be called inside a `noscript` there
  // https://github.com/sveltejs/svelte/security/advisories/GHSA-8266-84wp-wv5c
  // However, that doesn't apply in SvelteKit
};
const escape_html_dict = {
  "&": "&amp;",
  "<": "&lt;"
};
const surrogates = (
  // high surrogate without paired low surrogate
  "[\\ud800-\\udbff](?![\\udc00-\\udfff])|[\\ud800-\\udbff][\\udc00-\\udfff]|[\\udc00-\\udfff]"
);
const escape_html_attr_regex = new RegExp(
  `[${Object.keys(escape_html_attr_dict).join("")}]|` + surrogates,
  "g"
);
const escape_html_regex = new RegExp(
  `[${Object.keys(escape_html_dict).join("")}]|` + surrogates,
  "g"
);
function escape_html$1(str, is_attr) {
  const dict = is_attr ? escape_html_attr_dict : escape_html_dict;
  const escaped_str = str.replace(is_attr ? escape_html_attr_regex : escape_html_regex, (match) => {
    if (match.length === 2) {
      return match;
    }
    return dict[match] ?? `&#${match.charCodeAt(0)};`;
  });
  return escaped_str;
}
function method_not_allowed(mod, method) {
  return text(`${method} method not allowed`, {
    status: 405,
    headers: {
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: allowed_methods(mod).join(", ")
    }
  });
}
function allowed_methods(mod) {
  const allowed = ENDPOINT_METHODS.filter((method) => method in mod);
  if ("GET" in mod || "HEAD" in mod) allowed.push("HEAD");
  return allowed;
}
function static_error_page(options2, status, message) {
  let page2 = options2.templates.error({ status, message: escape_html$1(message) });
  {
    page2 = page2.replace("</head>", '<script type="module" src="/@vite/client"><\/script></head>');
  }
  return text(page2, {
    headers: { "content-type": "text/html; charset=utf-8" },
    status
  });
}
async function handle_fatal_error(event, state2, options2, error2) {
  error2 = error2 instanceof HttpError ? error2 : coalesce_to_error(error2);
  const status = get_status(error2);
  const body2 = await handle_error_and_jsonify(event, state2, options2, error2);
  const type = negotiate(event.request.headers.get("accept") || "text/html", [
    "application/json",
    "text/html"
  ]);
  if (event.isDataRequest || type === "application/json") {
    return json(body2, {
      status
    });
  }
  return static_error_page(options2, status, body2.message);
}
async function handle_error_and_jsonify(event, state2, options2, error2) {
  if (error2 instanceof HttpError) {
    return { message: "Unknown Error", ...error2.body };
  }
  if (typeof error2 == "object") {
    fix_stack_trace(error2);
  }
  const status = get_status(error2);
  const message = get_message(error2);
  return await with_request_store(
    { event, state: state2 },
    () => options2.hooks.handleError({ error: error2, event, status, message })
  ) ?? { message };
}
function redirect_response(status, location2) {
  const response = new Response(void 0, {
    status,
    headers: { location: location2 }
  });
  return response;
}
function clarify_devalue_error(event, error2) {
  if (error2.path) {
    return `Data returned from \`load\` while rendering ${event.route.id} is not serializable: ${error2.message} (${error2.path}). If you need to serialize/deserialize custom types, use transport hooks: https://svelte.dev/docs/kit/hooks#Universal-hooks-transport.`;
  }
  if (error2.path === "") {
    return `Data returned from \`load\` while rendering ${event.route.id} is not a plain object`;
  }
  return error2.message;
}
function serialize_uses(node) {
  const uses = {};
  if (node.uses && node.uses.dependencies.size > 0) {
    uses.dependencies = Array.from(node.uses.dependencies);
  }
  if (node.uses && node.uses.search_params.size > 0) {
    uses.search_params = Array.from(node.uses.search_params);
  }
  if (node.uses && node.uses.params.size > 0) {
    uses.params = Array.from(node.uses.params);
  }
  if (node.uses?.parent) uses.parent = 1;
  if (node.uses?.route) uses.route = 1;
  if (node.uses?.url) uses.url = 1;
  return uses;
}
function has_prerendered_path(manifest, pathname) {
  return manifest._.prerendered_routes.has(pathname) || pathname.at(-1) === "/" && manifest._.prerendered_routes.has(pathname.slice(0, -1));
}
function format_server_error(status, error2, event) {
  const formatted_text = `
\x1B[1;31m[${status}] ${event.request.method} ${event.url.pathname}\x1B[0m`;
  if (status === 404) {
    return formatted_text;
  }
  return `${formatted_text}
${clean_up_stack_trace(error2)}`;
}
let relative = (file) => file;
{
  try {
    const path2 = await import("node:path");
    const process = await import("node:process");
    relative = (file) => path2.relative(process.cwd(), file);
  } catch {
  }
}
function clean_up_stack_trace(error2) {
  const stack_trace = (error2.stack?.split("\n") ?? []).map((line2) => {
    return line2.replace(/\((.+)(:\d+:\d+)\)$/, (_, file, loc) => `(${relative(file)}${loc})`);
  });
  const last_line_from_src_code = stack_trace.findLastIndex((line2) => /\(src[\\/]/.test(line2));
  if (last_line_from_src_code === -1) {
    return error2.stack;
  }
  return stack_trace.slice(0, last_line_from_src_code + 1).join("\n");
}
function get_node_type(node_id) {
  const parts = node_id?.split("/");
  const filename = parts?.at(-1);
  if (!filename) return "unknown";
  const dot_parts = filename.split(".");
  return dot_parts.slice(0, -1).join(".");
}
async function render_endpoint(event, event_state, mod, state2) {
  const method = (
    /** @type {import('types').HttpMethod} */
    event.request.method
  );
  let handler = mod[method] || mod.fallback;
  if (method === "HEAD" && !mod.HEAD && mod.GET) {
    handler = mod.GET;
  }
  if (!handler) {
    return method_not_allowed(mod, method);
  }
  const prerender2 = mod.prerender ?? state2.prerender_default;
  if (prerender2 && (mod.POST || mod.PATCH || mod.PUT || mod.DELETE)) {
    throw new Error("Cannot prerender endpoints that have mutative methods");
  }
  if (state2.prerendering && !state2.prerendering.inside_reroute && !prerender2) {
    if (state2.depth > 0) {
      throw new Error(`${event.route.id} is not prerenderable`);
    } else {
      return new Response(void 0, { status: 204 });
    }
  }
  try {
    const response = await with_request_store(
      { event, state: event_state },
      () => handler(
        /** @type {import('@sveltejs/kit').RequestEvent<Record<string, any>>} */
        event
      )
    );
    if (!(response instanceof Response)) {
      throw new Error(
        `Invalid response from route ${event.url.pathname}: handler should return a Response object`
      );
    }
    if (state2.prerendering && (!state2.prerendering.inside_reroute || prerender2)) {
      const cloned = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      });
      cloned.headers.set("x-sveltekit-prerender", String(prerender2));
      if (state2.prerendering.inside_reroute && prerender2) {
        cloned.headers.set(
          "x-sveltekit-routeid",
          encodeURI(
            /** @type {string} */
            event.route.id
          )
        );
        state2.prerendering.dependencies.set(event.url.pathname, { response: cloned, body: null });
      } else {
        return cloned;
      }
    }
    return response;
  } catch (e) {
    if (e instanceof Redirect) {
      return new Response(void 0, {
        status: e.status,
        headers: { location: e.location }
      });
    }
    throw e;
  }
}
function is_endpoint_request(event) {
  const { method, headers: headers2 } = event.request;
  if (ENDPOINT_METHODS.includes(method) && !PAGE_METHODS.includes(method)) {
    return true;
  }
  if (method === "POST" && headers2.get("x-sveltekit-action") === "true") return false;
  const accept = event.request.headers.get("accept") ?? "*/*";
  return negotiate(accept, ["*", "text/html"]) !== "text/html";
}
function compact(arr) {
  return arr.filter(
    /** @returns {val is NonNullable<T>} */
    (val) => val != null
  );
}
const DATA_SUFFIX = "/__data.json";
const HTML_DATA_SUFFIX = ".html__data.json";
function has_data_suffix(pathname) {
  return pathname.endsWith(DATA_SUFFIX) || pathname.endsWith(HTML_DATA_SUFFIX);
}
function add_data_suffix(pathname) {
  if (pathname.endsWith(".html")) return pathname.replace(/\.html$/, HTML_DATA_SUFFIX);
  return pathname.replace(/\/$/, "") + DATA_SUFFIX;
}
function strip_data_suffix(pathname) {
  if (pathname.endsWith(HTML_DATA_SUFFIX)) {
    return pathname.slice(0, -HTML_DATA_SUFFIX.length) + ".html";
  }
  return pathname.slice(0, -DATA_SUFFIX.length);
}
const ROUTE_SUFFIX = "/__route.js";
function has_resolution_suffix(pathname) {
  return pathname.endsWith(ROUTE_SUFFIX);
}
function add_resolution_suffix(pathname) {
  return pathname.replace(/\/$/, "") + ROUTE_SUFFIX;
}
function strip_resolution_suffix(pathname) {
  return pathname.slice(0, -ROUTE_SUFFIX.length);
}
const noop_span = {
  spanContext() {
    return noop_span_context;
  },
  setAttribute() {
    return this;
  },
  setAttributes() {
    return this;
  },
  addEvent() {
    return this;
  },
  setStatus() {
    return this;
  },
  updateName() {
    return this;
  },
  end() {
    return this;
  },
  isRecording() {
    return false;
  },
  recordException() {
    return this;
  },
  addLink() {
    return this;
  },
  addLinks() {
    return this;
  }
};
const noop_span_context = {
  traceId: "",
  spanId: "",
  traceFlags: 0
};
async function record_span({ name, attributes, fn }) {
  {
    return fn(noop_span);
  }
}
function is_action_json_request(event) {
  const accept = negotiate(event.request.headers.get("accept") ?? "*/*", [
    "application/json",
    "text/html"
  ]);
  return accept === "application/json" && event.request.method === "POST";
}
async function handle_action_json_request(event, event_state, options2, server) {
  const actions = server?.actions;
  if (!actions) {
    const no_actions_error = new SvelteKitError(
      405,
      "Method Not Allowed",
      `POST method not allowed. No form actions exist for ${`the page at ${event.route.id}`}`
    );
    return action_json(
      {
        type: "error",
        error: await handle_error_and_jsonify(event, event_state, options2, no_actions_error)
      },
      {
        status: no_actions_error.status,
        headers: {
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
          // "The server must generate an Allow header field in a 405 status code response"
          allow: "GET"
        }
      }
    );
  }
  check_named_default_separate(actions);
  try {
    const data = await call_action(event, event_state, actions);
    if (DEV) {
      validate_action_return(data);
    }
    if (data instanceof ActionFailure) {
      return action_json({
        type: "failure",
        status: data.status,
        // @ts-expect-error we assign a string to what is supposed to be an object. That's ok
        // because we don't use the object outside, and this way we have better code navigation
        // through knowing where the related interface is used.
        data: stringify_action_response(
          data.data,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        )
      });
    } else {
      return action_json({
        type: "success",
        status: data ? 200 : 204,
        // @ts-expect-error see comment above
        data: stringify_action_response(
          data,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        )
      });
    }
  } catch (e) {
    const err = normalize_error(e);
    if (err instanceof Redirect) {
      return action_json_redirect(err);
    }
    return action_json(
      {
        type: "error",
        error: await handle_error_and_jsonify(
          event,
          event_state,
          options2,
          check_incorrect_fail_use(err)
        )
      },
      {
        status: get_status(err)
      }
    );
  }
}
function check_incorrect_fail_use(error2) {
  return error2 instanceof ActionFailure ? new Error('Cannot "throw fail()". Use "return fail()"') : error2;
}
function action_json_redirect(redirect) {
  return action_json({
    type: "redirect",
    status: redirect.status,
    location: redirect.location
  });
}
function action_json(data, init2) {
  return json(data, init2);
}
function is_action_request(event) {
  return event.request.method === "POST";
}
async function handle_action_request(event, event_state, server) {
  const actions = server?.actions;
  if (!actions) {
    event.setHeaders({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: "GET"
    });
    return {
      type: "error",
      error: new SvelteKitError(
        405,
        "Method Not Allowed",
        `POST method not allowed. No form actions exist for ${`the page at ${event.route.id}`}`
      )
    };
  }
  check_named_default_separate(actions);
  try {
    const data = await call_action(event, event_state, actions);
    if (DEV) {
      validate_action_return(data);
    }
    if (data instanceof ActionFailure) {
      return {
        type: "failure",
        status: data.status,
        data: data.data
      };
    } else {
      return {
        type: "success",
        status: 200,
        // @ts-expect-error this will be removed upon serialization, so `undefined` is the same as omission
        data
      };
    }
  } catch (e) {
    const err = normalize_error(e);
    if (err instanceof Redirect) {
      return {
        type: "redirect",
        status: err.status,
        location: err.location
      };
    }
    return {
      type: "error",
      error: check_incorrect_fail_use(err)
    };
  }
}
function check_named_default_separate(actions) {
  if (actions.default && Object.keys(actions).length > 1) {
    throw new Error(
      "When using named actions, the default action cannot be used. See the docs for more info: https://svelte.dev/docs/kit/form-actions#named-actions"
    );
  }
}
async function call_action(event, event_state, actions) {
  const url = new URL(event.request.url);
  let name = "default";
  for (const param of url.searchParams) {
    if (param[0].startsWith("/")) {
      name = param[0].slice(1);
      if (name === "default") {
        throw new Error('Cannot use reserved action name "default"');
      }
      break;
    }
  }
  const action = actions[name];
  if (!action) {
    throw new SvelteKitError(404, "Not Found", `No action with name '${name}' found`);
  }
  if (!is_form_content_type(event.request)) {
    throw new SvelteKitError(
      415,
      "Unsupported Media Type",
      `Form actions expect form-encoded data — received ${event.request.headers.get(
        "content-type"
      )}`
    );
  }
  return record_span({
    name: "sveltekit.form_action",
    attributes: {
      "http.route": event.route.id || "unknown"
    },
    fn: async (current) => {
      const traced_event = merge_tracing(event, current);
      const result = await with_request_store(
        { event: traced_event, state: event_state },
        () => action(traced_event)
      );
      if (result instanceof ActionFailure) {
        current.setAttributes({
          "sveltekit.form_action.result.type": "failure",
          "sveltekit.form_action.result.status": result.status
        });
      }
      return result;
    }
  });
}
function validate_action_return(data) {
  if (data instanceof Redirect) {
    throw new Error("Cannot `return redirect(...)` — use `redirect(...)` instead");
  }
  if (data instanceof HttpError) {
    throw new Error("Cannot `return error(...)` — use `error(...)` or `return fail(...)` instead");
  }
}
function uneval_action_response(data, route_id, transport) {
  const replacer = (thing) => {
    for (const key2 in transport) {
      const encoded = transport[key2].encode(thing);
      if (encoded) {
        return `app.decode('${key2}', ${devalue.uneval(encoded, replacer)})`;
      }
    }
  };
  return try_serialize(data, (value) => devalue.uneval(value, replacer), route_id);
}
function stringify_action_response(data, route_id, transport) {
  const encoders = Object.fromEntries(
    Object.entries(transport).map(([key2, value]) => [key2, value.encode])
  );
  return try_serialize(data, (value) => devalue.stringify(value, encoders), route_id);
}
function try_serialize(data, fn, route_id) {
  try {
    return fn(data);
  } catch (e) {
    const error2 = (
      /** @type {any} */
      e
    );
    if (data instanceof Response) {
      throw new Error(
        `Data returned from action inside ${route_id} is not serializable. Form actions need to return plain objects or fail(). E.g. return { success: true } or return fail(400, { message: "invalid" });`
      );
    }
    if ("path" in error2) {
      let message = `Data returned from action inside ${route_id} is not serializable: ${error2.message}`;
      if (error2.path !== "") message += ` (data.${error2.path})`;
      throw new Error(message);
    }
    throw error2;
  }
}
const SCHEME = /^[a-z][a-z\d+\-.]+:/i;
const internal = new URL("sveltekit-internal://");
function resolve(base2, path2) {
  if (path2[0] === "/" && path2[1] === "/") return path2;
  let url = new URL(base2, internal);
  url = new URL(path2, url);
  return url.protocol === internal.protocol ? url.pathname + url.search + url.hash : url.href;
}
function normalize_path(path2, trailing_slash) {
  if (path2 === "/" || trailing_slash === "ignore") return path2;
  if (trailing_slash === "never") {
    return path2.endsWith("/") ? path2.slice(0, -1) : path2;
  } else if (trailing_slash === "always" && !path2.endsWith("/")) {
    return path2 + "/";
  }
  return path2;
}
function decode_pathname(pathname) {
  return pathname.split("%25").map(decodeURI).join("%25");
}
function decode_params(params) {
  for (const key2 in params) {
    params[key2] = decodeURIComponent(params[key2]);
  }
  return params;
}
function make_trackable(url, callback, search_params_callback, allow_hash = false) {
  const tracked = new URL(url);
  Object.defineProperty(tracked, "searchParams", {
    value: new Proxy(tracked.searchParams, {
      get(obj, key2) {
        if (key2 === "get" || key2 === "getAll" || key2 === "has") {
          return (param) => {
            search_params_callback(param);
            return obj[key2](param);
          };
        }
        callback();
        const value = Reflect.get(obj, key2);
        return typeof value === "function" ? value.bind(obj) : value;
      }
    }),
    enumerable: true,
    configurable: true
  });
  const tracked_url_properties = ["href", "pathname", "search", "toString", "toJSON"];
  if (allow_hash) tracked_url_properties.push("hash");
  for (const property of tracked_url_properties) {
    Object.defineProperty(tracked, property, {
      get() {
        callback();
        return url[property];
      },
      enumerable: true,
      configurable: true
    });
  }
  {
    tracked[Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect2) => {
      return inspect2(url, opts);
    };
    tracked.searchParams[Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect2) => {
      return inspect2(url.searchParams, opts);
    };
  }
  if (!allow_hash) {
    disable_hash(tracked);
  }
  return tracked;
}
function disable_hash(url) {
  allow_nodejs_console_log(url);
  Object.defineProperty(url, "hash", {
    get() {
      throw new Error(
        "Cannot access event.url.hash. Consider using `page.url.hash` inside a component instead"
      );
    }
  });
}
function disable_search(url) {
  allow_nodejs_console_log(url);
  for (const property of ["search", "searchParams"]) {
    Object.defineProperty(url, property, {
      get() {
        throw new Error(`Cannot access url.${property} on a page with prerendering enabled`);
      }
    });
  }
}
function allow_nodejs_console_log(url) {
  {
    url[Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect2) => {
      return inspect2(new URL(url), opts);
    };
  }
}
const text_encoder = new TextEncoder();
const text_decoder = new TextDecoder();
function get_relative_path(from, to) {
  const from_parts = from.split(/[/\\]/);
  const to_parts = to.split(/[/\\]/);
  from_parts.pop();
  while (from_parts[0] === to_parts[0]) {
    from_parts.shift();
    to_parts.shift();
  }
  let i = from_parts.length;
  while (i--) from_parts[i] = "..";
  return from_parts.concat(to_parts).join("/");
}
function base64_encode(bytes) {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64_decode(encoded) {
  if (globalThis.Buffer) {
    const buffer = globalThis.Buffer.from(encoded, "base64");
    return new Uint8Array(buffer);
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
function validate_depends(route_id, dep) {
  const match = /^(moz-icon|view-source|jar):/.exec(dep);
  if (match) {
    console.warn(
      `${route_id}: Calling \`depends('${dep}')\` will throw an error in Firefox because \`${match[1]}\` is a special URI scheme`
    );
  }
}
const INVALIDATED_PARAM = "x-sveltekit-invalidated";
const TRAILING_SLASH_PARAM = "x-sveltekit-trailing-slash";
function validate_load_response(data, location_description) {
  if (data != null && Object.getPrototypeOf(data) !== Object.prototype) {
    throw new Error(
      `a load function ${location_description} returned ${typeof data !== "object" ? `a ${typeof data}` : data instanceof Response ? "a Response object" : Array.isArray(data) ? "an array" : "a non-plain object"}, but must return a plain object at the top level (i.e. \`return {...}\`)`
    );
  }
}
function stringify$1(data, transport) {
  const encoders = Object.fromEntries(Object.entries(transport).map(([k2, v]) => [k2, v.encode]));
  return devalue.stringify(data, encoders);
}
function stringify_remote_arg(value, transport) {
  if (value === void 0) return "";
  const json_string = stringify$1(value, transport);
  const bytes = new TextEncoder().encode(json_string);
  return base64_encode(bytes).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}
function parse_remote_arg(string, transport) {
  if (!string) return void 0;
  const json_string = text_decoder.decode(
    // no need to add back `=` characters, atob can handle it
    base64_decode(string.replaceAll("-", "+").replaceAll("_", "/"))
  );
  const decoders = Object.fromEntries(Object.entries(transport).map(([k2, v]) => [k2, v.decode]));
  return devalue.parse(json_string, decoders);
}
function create_remote_cache_key(id, payload) {
  return id + "/" + payload;
}
const NULL_BODY_STATUS = [101, 103, 204, 205, 304];
async function load_server_data({ event, event_state, state: state2, node, parent: parent2 }) {
  if (!node?.server) return null;
  let is_tracking = true;
  const uses = {
    dependencies: /* @__PURE__ */ new Set(),
    params: /* @__PURE__ */ new Set(),
    parent: false,
    route: false,
    url: false,
    search_params: /* @__PURE__ */ new Set()
  };
  const load = node.server.load;
  const slash = node.server.trailingSlash;
  if (!load) {
    return { type: "data", data: null, uses, slash };
  }
  const url = make_trackable(
    event.url,
    () => {
      if (done && !uses.url) {
        console.warn(
          `${node.server_id}: Accessing URL properties in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the URL changes`
        );
      }
      if (is_tracking) {
        uses.url = true;
      }
    },
    (param) => {
      if (done && !uses.search_params.has(param)) {
        console.warn(
          `${node.server_id}: Accessing URL properties in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the URL changes`
        );
      }
      if (is_tracking) {
        uses.search_params.add(param);
      }
    }
  );
  if (state2.prerendering) {
    disable_search(url);
  }
  let done = false;
  const result = await record_span({
    name: "sveltekit.load",
    attributes: {
      "sveltekit.load.node_id": node.server_id || "unknown",
      "sveltekit.load.node_type": get_node_type(node.server_id),
      "http.route": event.route.id || "unknown"
    },
    fn: async (current) => {
      const traced_event = merge_tracing(event, current);
      const result2 = await with_request_store(
        { event: traced_event, state: event_state },
        () => load.call(null, {
          ...traced_event,
          fetch: (info, init2) => {
            const url2 = new URL(info instanceof Request ? info.url : info, event.url);
            if (done && !uses.dependencies.has(url2.href)) {
              console.warn(
                `${node.server_id}: Calling \`event.fetch(...)\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the dependency is invalidated`
              );
            }
            return event.fetch(info, init2);
          },
          /** @param {string[]} deps */
          depends: (...deps) => {
            for (const dep of deps) {
              const { href } = new URL(dep, event.url);
              {
                validate_depends(node.server_id || "missing route ID", dep);
                if (done && !uses.dependencies.has(href)) {
                  console.warn(
                    `${node.server_id}: Calling \`depends(...)\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the dependency is invalidated`
                  );
                }
              }
              uses.dependencies.add(href);
            }
          },
          params: new Proxy(event.params, {
            get: (target, key2) => {
              if (done && typeof key2 === "string" && !uses.params.has(key2)) {
                console.warn(
                  `${node.server_id}: Accessing \`params.${String(
                    key2
                  )}\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the param changes`
                );
              }
              if (is_tracking) {
                uses.params.add(key2);
              }
              return target[
                /** @type {string} */
                key2
              ];
            }
          }),
          parent: async () => {
            if (done && !uses.parent) {
              console.warn(
                `${node.server_id}: Calling \`parent(...)\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when parent data changes`
              );
            }
            if (is_tracking) {
              uses.parent = true;
            }
            return parent2();
          },
          route: new Proxy(event.route, {
            get: (target, key2) => {
              if (done && typeof key2 === "string" && !uses.route) {
                console.warn(
                  `${node.server_id}: Accessing \`route.${String(
                    key2
                  )}\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the route changes`
                );
              }
              if (is_tracking) {
                uses.route = true;
              }
              return target[
                /** @type {'id'} */
                key2
              ];
            }
          }),
          url,
          untrack(fn) {
            is_tracking = false;
            try {
              return fn();
            } finally {
              is_tracking = true;
            }
          }
        })
      );
      return result2;
    }
  });
  {
    validate_load_response(result, `in ${node.server_id}`);
  }
  done = true;
  return {
    type: "data",
    data: result ?? null,
    uses,
    slash
  };
}
async function load_data({
  event,
  event_state,
  fetched,
  node,
  parent: parent2,
  server_data_promise,
  state: state2,
  resolve_opts,
  csr
}) {
  const server_data_node = await server_data_promise;
  const load = node?.universal?.load;
  if (!load) {
    return server_data_node?.data ?? null;
  }
  const result = await record_span({
    name: "sveltekit.load",
    attributes: {
      "sveltekit.load.node_id": node.universal_id || "unknown",
      "sveltekit.load.node_type": get_node_type(node.universal_id),
      "http.route": event.route.id || "unknown"
    },
    fn: async (current) => {
      const traced_event = merge_tracing(event, current);
      return await with_request_store({ event: traced_event, state: event_state }, () => {
        let data = null;
        return load.call(null, {
          url: event.url,
          params: event.params,
          get data() {
            if (data === null && server_data_node?.data != null) {
              const reducers = {};
              const revivers = {};
              for (const key2 in event_state.transport) {
                reducers[key2] = event_state.transport[key2].encode;
                revivers[key2] = event_state.transport[key2].decode;
              }
              try {
                data = devalue.parse(devalue.stringify(server_data_node.data, reducers), revivers);
              } catch (e) {
                e.path = e.path.slice(1);
                throw new Error(clarify_devalue_error(
                  event,
                  /** @type {any} */
                  e
                ));
              }
            }
            return data;
          },
          route: event.route,
          fetch: create_universal_fetch(event, state2, fetched, csr, resolve_opts),
          setHeaders: event.setHeaders,
          depends: () => {
          },
          parent: parent2,
          untrack: (fn) => fn(),
          tracing: traced_event.tracing
        });
      });
    }
  });
  {
    validate_load_response(result, `in ${node.universal_id}`);
  }
  return result ?? null;
}
function create_universal_fetch(event, state2, fetched, csr, resolve_opts) {
  const universal_fetch = async (input, init2) => {
    const cloned_body = input instanceof Request && input.body ? input.clone().body : null;
    const cloned_headers = input instanceof Request && [...input.headers].length ? new Headers(input.headers) : init2?.headers;
    let response = await event.fetch(input, init2);
    const url = new URL(input instanceof Request ? input.url : input, event.url);
    const same_origin = url.origin === event.url.origin;
    let dependency;
    if (same_origin) {
      if (state2.prerendering) {
        dependency = { response, body: null };
        state2.prerendering.dependencies.set(url.pathname, dependency);
      }
    } else if (url.protocol === "https:" || url.protocol === "http:") {
      const mode = input instanceof Request ? input.mode : init2?.mode ?? "cors";
      if (mode === "no-cors") {
        response = new Response("", {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } else {
        const acao = response.headers.get("access-control-allow-origin");
        if (!acao || acao !== event.url.origin && acao !== "*") {
          throw new Error(
            `CORS error: ${acao ? "Incorrect" : "No"} 'Access-Control-Allow-Origin' header is present on the requested resource`
          );
        }
      }
    }
    let teed_body;
    const proxy2 = new Proxy(response, {
      get(response2, key2, _receiver) {
        async function push_fetched(body2, is_b64) {
          const status_number = Number(response2.status);
          if (isNaN(status_number)) {
            throw new Error(
              `response.status is not a number. value: "${response2.status}" type: ${typeof response2.status}`
            );
          }
          fetched.push({
            url: same_origin ? url.href.slice(event.url.origin.length) : url.href,
            method: event.request.method,
            request_body: (
              /** @type {string | ArrayBufferView | undefined} */
              input instanceof Request && cloned_body ? await stream_to_string(cloned_body) : init2?.body
            ),
            request_headers: cloned_headers,
            response_body: body2,
            response: response2,
            is_b64
          });
        }
        if (key2 === "body") {
          if (response2.body === null) {
            return null;
          }
          if (teed_body) {
            return teed_body;
          }
          const [a, b] = response2.body.tee();
          void (async () => {
            let result = new Uint8Array();
            for await (const chunk2 of a) {
              const combined = new Uint8Array(result.length + chunk2.length);
              combined.set(result, 0);
              combined.set(chunk2, result.length);
              result = combined;
            }
            if (dependency) {
              dependency.body = new Uint8Array(result);
            }
            void push_fetched(base64_encode(result), true);
          })();
          return teed_body = b;
        }
        if (key2 === "arrayBuffer") {
          return async () => {
            const buffer = await response2.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            if (dependency) {
              dependency.body = bytes;
            }
            if (buffer instanceof ArrayBuffer) {
              await push_fetched(base64_encode(bytes), true);
            }
            return buffer;
          };
        }
        async function text2() {
          const body2 = await response2.text();
          if (body2 === "" && NULL_BODY_STATUS.includes(response2.status)) {
            await push_fetched(void 0, false);
            return void 0;
          }
          if (!body2 || typeof body2 === "string") {
            await push_fetched(body2, false);
          }
          if (dependency) {
            dependency.body = body2;
          }
          return body2;
        }
        if (key2 === "text") {
          return text2;
        }
        if (key2 === "json") {
          return async () => {
            const body2 = await text2();
            return body2 ? JSON.parse(body2) : void 0;
          };
        }
        return Reflect.get(response2, key2, response2);
      }
    });
    if (csr) {
      const get2 = response.headers.get;
      response.headers.get = (key2) => {
        const lower = key2.toLowerCase();
        const value = get2.call(response.headers, lower);
        if (value && !lower.startsWith("x-sveltekit-")) {
          const included = resolve_opts.filterSerializedResponseHeaders(lower, value);
          if (!included) {
            throw new Error(
              `Failed to get response header "${lower}" — it must be included by the \`filterSerializedResponseHeaders\` option: https://svelte.dev/docs/kit/hooks#Server-hooks-handle (at ${event.route.id})`
            );
          }
        }
        return value;
      };
    }
    return proxy2;
  };
  return (input, init2) => {
    const response = universal_fetch(input, init2);
    response.catch(() => {
    });
    return response;
  };
}
async function stream_to_string(stream) {
  let result = "";
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += text_decoder.decode(value);
  }
  return result;
}
var is_array = Array.isArray;
var index_of = Array.prototype.indexOf;
var array_from = Array.from;
var define_property = Object.defineProperty;
var get_descriptor = Object.getOwnPropertyDescriptor;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var get_prototype_of = Object.getPrototypeOf;
var is_extensible = Object.isExtensible;
const noop$1 = () => {
};
function run(fn) {
  return fn();
}
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i]();
  }
}
function deferred() {
  var resolve2;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve2 = res;
    reject = rej;
  });
  return { promise, resolve: resolve2, reject };
}
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}
const DERIVED = 1 << 1;
const EFFECT = 1 << 2;
const RENDER_EFFECT = 1 << 3;
const BLOCK_EFFECT = 1 << 4;
const BRANCH_EFFECT = 1 << 5;
const ROOT_EFFECT = 1 << 6;
const BOUNDARY_EFFECT = 1 << 7;
const UNOWNED = 1 << 8;
const DISCONNECTED = 1 << 9;
const CLEAN = 1 << 10;
const DIRTY = 1 << 11;
const MAYBE_DIRTY = 1 << 12;
const INERT = 1 << 13;
const DESTROYED = 1 << 14;
const EFFECT_RAN = 1 << 15;
const EFFECT_TRANSPARENT = 1 << 16;
const INSPECT_EFFECT = 1 << 17;
const HEAD_EFFECT = 1 << 18;
const EFFECT_PRESERVED = 1 << 19;
const USER_EFFECT = 1 << 20;
const REACTION_IS_UPDATING = 1 << 21;
const ASYNC = 1 << 22;
const ERROR_VALUE = 1 << 23;
const STATE_SYMBOL = Symbol("$state");
const LEGACY_PROPS = Symbol("legacy props");
const PROXY_PATH_SYMBOL = Symbol("proxy path");
const STALE_REACTION = new class StaleReactionError extends Error {
  name = "StaleReactionError";
  message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}();
const COMMENT_NODE = 8;
function invalid_snippet_arguments() {
  {
    const error2 = new Error(`invalid_snippet_arguments
A snippet function was passed invalid arguments. Snippets should only be instantiated via \`{@render ...}\`
https://svelte.dev/e/invalid_snippet_arguments`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function lifecycle_outside_component(name) {
  {
    const error2 = new Error(`lifecycle_outside_component
\`${name}(...)\` can only be used during component initialisation
https://svelte.dev/e/lifecycle_outside_component`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function snippet_without_render_tag() {
  {
    const error2 = new Error(`snippet_without_render_tag
Attempted to render a snippet without a \`{@render}\` block. This would cause the snippet code to be stringified instead of its content being rendered to the DOM. To fix this, change \`{snippet}\` to \`{@render snippet()}\`.
https://svelte.dev/e/snippet_without_render_tag`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function store_invalid_shape(name) {
  {
    const error2 = new Error(`store_invalid_shape
\`${name}\` is not a store with a \`subscribe\` method
https://svelte.dev/e/store_invalid_shape`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function svelte_element_invalid_this_value() {
  {
    const error2 = new Error(`svelte_element_invalid_this_value
The \`this\` prop on \`<svelte:element>\` must be a string, if defined
https://svelte.dev/e/svelte_element_invalid_this_value`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function derived_references_self() {
  {
    const error2 = new Error(`derived_references_self
A derived value cannot reference itself recursively
https://svelte.dev/e/derived_references_self`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function effect_update_depth_exceeded() {
  {
    const error2 = new Error(`effect_update_depth_exceeded
Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
https://svelte.dev/e/effect_update_depth_exceeded`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function hydration_failed() {
  {
    const error2 = new Error(`hydration_failed
Failed to hydrate the application
https://svelte.dev/e/hydration_failed`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function rune_outside_svelte(rune) {
  {
    const error2 = new Error(`rune_outside_svelte
The \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files
https://svelte.dev/e/rune_outside_svelte`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function state_descriptors_fixed() {
  {
    const error2 = new Error(`state_descriptors_fixed
Property descriptors defined on \`$state\` objects must contain \`value\` and always be \`enumerable\`, \`configurable\` and \`writable\`.
https://svelte.dev/e/state_descriptors_fixed`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function state_prototype_fixed() {
  {
    const error2 = new Error(`state_prototype_fixed
Cannot set prototype of \`$state\` object
https://svelte.dev/e/state_prototype_fixed`);
    error2.name = "Svelte error";
    throw error2;
  }
}
function state_unsafe_mutation() {
  {
    const error2 = new Error(`state_unsafe_mutation
Updating state inside \`$derived(...)\`, \`$inspect(...)\` or a template expression is forbidden. If the value should not be reactive, declare it without \`$state\`
https://svelte.dev/e/state_unsafe_mutation`);
    error2.name = "Svelte error";
    throw error2;
  }
}
const HYDRATION_START = "[";
const HYDRATION_END = "]";
const HYDRATION_ERROR = {};
const ELEMENT_IS_NAMESPACED = 1;
const ELEMENT_PRESERVE_ATTRIBUTE_CASE = 1 << 1;
const UNINITIALIZED = Symbol();
const FILENAME = Symbol("filename");
const ATTACHMENT_KEY = "@attach";
var bold$1 = "font-weight: bold";
var normal$1 = "font-weight: normal";
function hydration_mismatch(location2) {
  {
    console.warn(
      `%c[svelte] hydration_mismatch
%c${"Hydration failed because the initial UI does not match what was rendered on the server"}
https://svelte.dev/e/hydration_mismatch`,
      bold$1,
      normal$1
    );
  }
}
function lifecycle_double_unmount() {
  {
    console.warn(`%c[svelte] lifecycle_double_unmount
%cTried to unmount a component that was not mounted
https://svelte.dev/e/lifecycle_double_unmount`, bold$1, normal$1);
  }
}
function state_proxy_equality_mismatch(operator) {
  {
    console.warn(`%c[svelte] state_proxy_equality_mismatch
%cReactive \`$state(...)\` proxies and the values they proxy have different identities. Because of this, comparisons with \`${operator}\` will produce unexpected results
https://svelte.dev/e/state_proxy_equality_mismatch`, bold$1, normal$1);
  }
}
let hydrating = false;
function set_hydrating(value) {
  hydrating = value;
}
let hydrate_node;
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return hydrate_node = node;
}
function hydrate_next() {
  return set_hydrate_node(
    /** @type {TemplateNode} */
    /* @__PURE__ */ get_next_sibling(hydrate_node)
  );
}
let tracing_mode_flag = false;
var bold = "font-weight: bold";
var normal = "font-weight: normal";
function dynamic_void_element_content(tag2) {
  {
    console.warn(`%c[svelte] dynamic_void_element_content
%c\`<svelte:element this="${tag2}">\` is a void element — it cannot have content
https://svelte.dev/e/dynamic_void_element_content`, bold, normal);
  }
}
function state_snapshot_uncloneable(properties) {
  {
    console.warn(
      `%c[svelte] state_snapshot_uncloneable
%c${properties ? `The following properties cannot be cloned with \`$state.snapshot\` — the return value contains the originals:

${properties}` : "Value cannot be cloned with `$state.snapshot` — the original value was returned"}
https://svelte.dev/e/state_snapshot_uncloneable`,
      bold,
      normal
    );
  }
}
const empty = [];
function snapshot(value, skip_warning = false, no_tojson = false) {
  if (!skip_warning) {
    const paths = [];
    const copy = clone$1(value, /* @__PURE__ */ new Map(), "", paths, null, no_tojson);
    if (paths.length === 1 && paths[0] === "") {
      state_snapshot_uncloneable();
    } else if (paths.length > 0) {
      const slice = paths.length > 10 ? paths.slice(0, 7) : paths.slice(0, 10);
      const excess = paths.length - slice.length;
      let uncloned = slice.map((path2) => `- <value>${path2}`).join("\n");
      if (excess > 0) uncloned += `
- ...and ${excess} more`;
      state_snapshot_uncloneable(uncloned);
    }
    return copy;
  }
  return clone$1(value, /* @__PURE__ */ new Map(), "", empty, null, no_tojson);
}
function clone$1(value, cloned, path2, paths, original = null, no_tojson = false) {
  if (typeof value === "object" && value !== null) {
    var unwrapped = cloned.get(value);
    if (unwrapped !== void 0) return unwrapped;
    if (value instanceof Map) return (
      /** @type {Snapshot<T>} */
      new Map(value)
    );
    if (value instanceof Set) return (
      /** @type {Snapshot<T>} */
      new Set(value)
    );
    if (is_array(value)) {
      var copy = (
        /** @type {Snapshot<any>} */
        Array(value.length)
      );
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var i = 0; i < value.length; i += 1) {
        var element2 = value[i];
        if (i in value) {
          copy[i] = clone$1(element2, cloned, `${path2}[${i}]`, paths, null, no_tojson);
        }
      }
      return copy;
    }
    if (get_prototype_of(value) === object_prototype) {
      copy = {};
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var key2 in value) {
        copy[key2] = clone$1(
          // @ts-expect-error
          value[key2],
          cloned,
          `${path2}.${key2}`,
          paths,
          null,
          no_tojson
        );
      }
      return copy;
    }
    if (value instanceof Date) {
      return (
        /** @type {Snapshot<T>} */
        structuredClone(value)
      );
    }
    if (typeof /** @type {T & { toJSON?: any } } */
    value.toJSON === "function" && !no_tojson) {
      return clone$1(
        /** @type {T & { toJSON(): any } } */
        value.toJSON(),
        cloned,
        `${path2}.toJSON()`,
        paths,
        // Associate the instance with the toJSON clone
        value
      );
    }
  }
  if (value instanceof EventTarget) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
  try {
    return (
      /** @type {Snapshot<T>} */
      structuredClone(value)
    );
  } catch (e) {
    {
      paths.push(path2);
    }
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
}
function get_stack(label) {
  let error2 = Error();
  const stack2 = error2.stack;
  if (!stack2) return null;
  const lines = stack2.split("\n");
  const new_lines = ["\n"];
  for (let i = 0; i < lines.length; i++) {
    const line2 = lines[i];
    if (line2 === "Error") {
      continue;
    }
    if (line2.includes("validate_each_keys")) {
      return null;
    }
    if (line2.includes("svelte/src/internal")) {
      continue;
    }
    new_lines.push(line2);
  }
  if (new_lines.length === 1) {
    return null;
  }
  define_property(error2, "stack", {
    value: new_lines.join("\n")
  });
  define_property(error2, "name", {
    // 'Error' suffix is required for stack traces to be rendered properly
    value: `${label}Error`
  });
  return (
    /** @type {Error & { stack: string }} */
    error2
  );
}
function tag(source2, label) {
  source2.label = label;
  tag_proxy(source2.v, label);
  return source2;
}
function tag_proxy(value, label) {
  value?.[PROXY_PATH_SYMBOL]?.(label);
  return value;
}
let component_context = null;
function set_component_context(context2) {
  component_context = context2;
}
let dev_stack = null;
function set_dev_stack(stack2) {
  dev_stack = stack2;
}
let dev_current_component_function = null;
function set_dev_current_component_function(fn) {
  dev_current_component_function = fn;
}
function push$1(props, runes = false, fn) {
  component_context = {
    p: component_context,
    c: null,
    e: null,
    s: props,
    x: null,
    l: null
  };
  {
    component_context.function = fn;
    dev_current_component_function = fn;
  }
}
function pop$1(component) {
  var context2 = (
    /** @type {ComponentContext} */
    component_context
  );
  var effects = context2.e;
  if (effects !== null) {
    context2.e = null;
    for (var fn of effects) {
      create_user_effect(fn);
    }
  }
  component_context = context2.p;
  {
    dev_current_component_function = component_context?.function ?? null;
  }
  return (
    /** @type {T} */
    {}
  );
}
function is_runes() {
  return true;
}
const adjustments = /* @__PURE__ */ new WeakMap();
function handle_error(error2) {
  var effect = active_effect;
  if (effect === null) {
    active_reaction.f |= ERROR_VALUE;
    return error2;
  }
  if (error2 instanceof Error && !adjustments.has(error2)) {
    adjustments.set(error2, get_adjustments(error2, effect));
  }
  if ((effect.f & EFFECT_RAN) === 0) {
    if ((effect.f & BOUNDARY_EFFECT) === 0) {
      if (!effect.parent && error2 instanceof Error) {
        apply_adjustments(error2);
      }
      throw error2;
    }
    effect.b.error(error2);
  } else {
    invoke_error_boundary(error2, effect);
  }
}
function invoke_error_boundary(error2, effect) {
  while (effect !== null) {
    if ((effect.f & BOUNDARY_EFFECT) !== 0) {
      try {
        effect.b.error(error2);
        return;
      } catch (e) {
        error2 = e;
      }
    }
    effect = effect.parent;
  }
  if (error2 instanceof Error) {
    apply_adjustments(error2);
  }
  throw error2;
}
function get_adjustments(error2, effect) {
  const message_descriptor = get_descriptor(error2, "message");
  if (message_descriptor && !message_descriptor.configurable) return;
  var indent2 = is_firefox ? "  " : "	";
  var component_stack = `
${indent2}in ${effect.fn?.name || "<unknown>"}`;
  var context2 = effect.ctx;
  while (context2 !== null) {
    component_stack += `
${indent2}in ${context2.function?.[FILENAME].split("/").pop()}`;
    context2 = context2.p;
  }
  return {
    message: error2.message + `
${component_stack}
`,
    stack: error2.stack?.split("\n").filter((line2) => !line2.includes("svelte/src/internal")).join("\n")
  };
}
function apply_adjustments(error2) {
  const adjusted = adjustments.get(error2);
  if (adjusted) {
    define_property(error2, "message", {
      value: adjusted.message
    });
    define_property(error2, "stack", {
      value: adjusted.stack
    });
  }
}
let micro_tasks = [];
let idle_tasks = [];
function run_micro_tasks() {
  var tasks2 = micro_tasks;
  micro_tasks = [];
  run_all(tasks2);
}
function run_idle_tasks() {
  var tasks2 = idle_tasks;
  idle_tasks = [];
  run_all(tasks2);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0) {
    queueMicrotask(run_micro_tasks);
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  if (micro_tasks.length > 0) {
    run_micro_tasks();
  }
  if (idle_tasks.length > 0) {
    run_idle_tasks();
  }
}
const recent_async_deriveds = /* @__PURE__ */ new Set();
function destroy_derived_effects(derived2) {
  var effects = derived2.effects;
  if (effects !== null) {
    derived2.effects = null;
    for (var i = 0; i < effects.length; i += 1) {
      destroy_effect(
        /** @type {Effect} */
        effects[i]
      );
    }
  }
}
let stack = [];
function get_derived_parent_effect(derived2) {
  var parent2 = derived2.parent;
  while (parent2 !== null) {
    if ((parent2.f & DERIVED) === 0) {
      return (
        /** @type {Effect} */
        parent2
      );
    }
    parent2 = parent2.parent;
  }
  return null;
}
function execute_derived(derived2) {
  var value;
  var prev_active_effect = active_effect;
  set_active_effect(get_derived_parent_effect(derived2));
  {
    let prev_inspect_effects = inspect_effects;
    set_inspect_effects(/* @__PURE__ */ new Set());
    try {
      if (stack.includes(derived2)) {
        derived_references_self();
      }
      stack.push(derived2);
      destroy_derived_effects(derived2);
      value = update_reaction(derived2);
    } finally {
      set_active_effect(prev_active_effect);
      set_inspect_effects(prev_inspect_effects);
      stack.pop();
    }
  }
  return value;
}
function update_derived(derived2) {
  var value = execute_derived(derived2);
  if (!derived2.equals(value)) {
    derived2.v = value;
    derived2.wv = increment_write_version();
  }
  if (is_destroying_effect) {
    return;
  }
  if (batch_deriveds !== null) {
    batch_deriveds.set(derived2, derived2.v);
  } else {
    var status = (skip_reaction || (derived2.f & UNOWNED) !== 0) && derived2.deps !== null ? MAYBE_DIRTY : CLEAN;
    set_signal_status(derived2, status);
  }
}
const batches = /* @__PURE__ */ new Set();
let current_batch = null;
let batch_deriveds = null;
let effect_pending_updates = /* @__PURE__ */ new Set();
let tasks = [];
function dequeue() {
  const task = (
    /** @type {() => void} */
    tasks.shift()
  );
  if (tasks.length > 0) {
    queueMicrotask(dequeue);
  }
  task();
}
let queued_root_effects = [];
let last_scheduled_effect = null;
let is_flushing = false;
let is_flushing_sync = false;
class Batch {
  /**
   * The current values of any sources that are updated in this batch
   * They keys of this map are identical to `this.#previous`
   * @type {Map<Source, any>}
   */
  current = /* @__PURE__ */ new Map();
  /**
   * The values of any sources that are updated in this batch _before_ those updates took place.
   * They keys of this map are identical to `this.#current`
   * @type {Map<Source, any>}
   */
  #previous = /* @__PURE__ */ new Map();
  /**
   * When the batch is committed (and the DOM is updated), we need to remove old branches
   * and append new ones by calling the functions added inside (if/each/key/etc) blocks
   * @type {Set<() => void>}
   */
  #callbacks = /* @__PURE__ */ new Set();
  /**
   * The number of async effects that are currently in flight
   */
  #pending = 0;
  /**
   * A deferred that resolves when the batch is committed, used with `settled()`
   * TODO replace with Promise.withResolvers once supported widely enough
   * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
   */
  #deferred = null;
  /**
   * True if an async effect inside this batch resolved and
   * its parent branch was already deleted
   */
  #neutered = false;
  /**
   * Async effects (created inside `async_derived`) encountered during processing.
   * These run after the rest of the batch has updated, since they should
   * always have the latest values
   * @type {Effect[]}
   */
  #async_effects = [];
  /**
   * The same as `#async_effects`, but for effects inside a newly-created
   * `<svelte:boundary>` — these do not prevent the batch from committing
   * @type {Effect[]}
   */
  #boundary_async_effects = [];
  /**
   * Template effects and `$effect.pre` effects, which run when
   * a batch is committed
   * @type {Effect[]}
   */
  #render_effects = [];
  /**
   * The same as `#render_effects`, but for `$effect` (which runs after)
   * @type {Effect[]}
   */
  #effects = [];
  /**
   * Block effects, which may need to re-run on subsequent flushes
   * in order to update internal sources (e.g. each block items)
   * @type {Effect[]}
   */
  #block_effects = [];
  /**
   * Deferred effects (which run after async work has completed) that are DIRTY
   * @type {Effect[]}
   */
  #dirty_effects = [];
  /**
   * Deferred effects that are MAYBE_DIRTY
   * @type {Effect[]}
   */
  #maybe_dirty_effects = [];
  /**
   * A set of branches that still exist, but will be destroyed when this batch
   * is committed — we skip over these during `process`
   * @type {Set<Effect>}
   */
  skipped_effects = /* @__PURE__ */ new Set();
  /**
   *
   * @param {Effect[]} root_effects
   */
  process(root_effects) {
    queued_root_effects = [];
    var current_values = null;
    if (batches.size > 1) {
      current_values = /* @__PURE__ */ new Map();
      batch_deriveds = /* @__PURE__ */ new Map();
      for (const [source2, current] of this.current) {
        current_values.set(source2, { v: source2.v, wv: source2.wv });
        source2.v = current;
      }
      for (const batch of batches) {
        if (batch === this) continue;
        for (const [source2, previous] of batch.#previous) {
          if (!current_values.has(source2)) {
            current_values.set(source2, { v: source2.v, wv: source2.wv });
            source2.v = previous;
          }
        }
      }
    }
    for (const root2 of root_effects) {
      this.#traverse_effect_tree(root2);
    }
    if (this.#async_effects.length === 0 && this.#pending === 0) {
      this.#commit();
      var render_effects = this.#render_effects;
      var effects = this.#effects;
      this.#render_effects = [];
      this.#effects = [];
      this.#block_effects = [];
      current_batch = null;
      flush_queued_effects(render_effects);
      flush_queued_effects(effects);
      if (current_batch === null) {
        current_batch = this;
      } else {
        batches.delete(this);
      }
      this.#deferred?.resolve();
    } else {
      this.#defer_effects(this.#render_effects);
      this.#defer_effects(this.#effects);
      this.#defer_effects(this.#block_effects);
    }
    if (current_values) {
      for (const [source2, { v, wv }] of current_values) {
        if (source2.wv <= wv) {
          source2.v = v;
        }
      }
      batch_deriveds = null;
    }
    for (const effect of this.#async_effects) {
      update_effect(effect);
    }
    for (const effect of this.#boundary_async_effects) {
      update_effect(effect);
    }
    this.#async_effects = [];
    this.#boundary_async_effects = [];
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   */
  #traverse_effect_tree(root2) {
    root2.f ^= CLEAN;
    var effect = root2.first;
    while (effect !== null) {
      var flags = effect.f;
      var is_branch = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
      var is_skippable_branch = is_branch && (flags & CLEAN) !== 0;
      var skip = is_skippable_branch || (flags & INERT) !== 0 || this.skipped_effects.has(effect);
      if (!skip && effect.fn !== null) {
        if (is_branch) {
          effect.f ^= CLEAN;
        } else if ((flags & EFFECT) !== 0) {
          this.#effects.push(effect);
        } else if ((flags & CLEAN) === 0) {
          if ((flags & ASYNC) !== 0) {
            var effects = effect.b?.pending ? this.#boundary_async_effects : this.#async_effects;
            effects.push(effect);
          } else if (is_dirty(effect)) {
            if ((effect.f & BLOCK_EFFECT) !== 0) this.#block_effects.push(effect);
            update_effect(effect);
          }
        }
        var child = effect.first;
        if (child !== null) {
          effect = child;
          continue;
        }
      }
      var parent2 = effect.parent;
      effect = effect.next;
      while (effect === null && parent2 !== null) {
        effect = parent2.next;
        parent2 = parent2.parent;
      }
    }
  }
  /**
   * @param {Effect[]} effects
   */
  #defer_effects(effects) {
    for (const e of effects) {
      const target = (e.f & DIRTY) !== 0 ? this.#dirty_effects : this.#maybe_dirty_effects;
      target.push(e);
      set_signal_status(e, CLEAN);
    }
    effects.length = 0;
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Source} source
   * @param {any} value
   */
  capture(source2, value) {
    if (!this.#previous.has(source2)) {
      this.#previous.set(source2, value);
    }
    this.current.set(source2, source2.v);
  }
  activate() {
    current_batch = this;
  }
  deactivate() {
    current_batch = null;
    for (const update of effect_pending_updates) {
      effect_pending_updates.delete(update);
      update();
      if (current_batch !== null) {
        break;
      }
    }
  }
  neuter() {
    this.#neutered = true;
  }
  flush() {
    if (queued_root_effects.length > 0) {
      flush_effects();
    } else {
      this.#commit();
    }
    if (current_batch !== this) {
      return;
    }
    if (this.#pending === 0) {
      batches.delete(this);
    }
    this.deactivate();
  }
  /**
   * Append and remove branches to/from the DOM
   */
  #commit() {
    if (!this.#neutered) {
      for (const fn of this.#callbacks) {
        fn();
      }
    }
    this.#callbacks.clear();
  }
  increment() {
    this.#pending += 1;
  }
  decrement() {
    this.#pending -= 1;
    if (this.#pending === 0) {
      for (const e of this.#dirty_effects) {
        set_signal_status(e, DIRTY);
        schedule_effect(e);
      }
      for (const e of this.#maybe_dirty_effects) {
        set_signal_status(e, MAYBE_DIRTY);
        schedule_effect(e);
      }
      this.#render_effects = [];
      this.#effects = [];
      this.flush();
    } else {
      this.deactivate();
    }
  }
  /** @param {() => void} fn */
  add_callback(fn) {
    this.#callbacks.add(fn);
  }
  settled() {
    return (this.#deferred ??= deferred()).promise;
  }
  static ensure() {
    if (current_batch === null) {
      const batch = current_batch = new Batch();
      batches.add(current_batch);
      if (!is_flushing_sync) {
        Batch.enqueue(() => {
          if (current_batch !== batch) {
            return;
          }
          batch.flush();
        });
      }
    }
    return current_batch;
  }
  /** @param {() => void} task */
  static enqueue(task) {
    if (tasks.length === 0) {
      queueMicrotask(dequeue);
    }
    tasks.unshift(task);
  }
}
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) ;
    while (true) {
      flush_tasks();
      if (queued_root_effects.length === 0) {
        current_batch?.flush();
        if (queued_root_effects.length === 0) {
          last_scheduled_effect = null;
          return (
            /** @type {T} */
            result
          );
        }
      }
      flush_effects();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
  }
}
function flush_effects() {
  var was_updating_effect = is_updating_effect;
  is_flushing = true;
  try {
    var flush_count = 0;
    set_is_updating_effect(true);
    while (queued_root_effects.length > 0) {
      var batch = Batch.ensure();
      if (flush_count++ > 1e3) {
        if (DEV) {
          var updates = /* @__PURE__ */ new Map();
          for (const source2 of batch.current.keys()) {
            for (const [stack2, update] of source2.updated ?? []) {
              var entry = updates.get(stack2);
              if (!entry) {
                entry = { error: update.error, count: 0 };
                updates.set(stack2, entry);
              }
              entry.count += update.count;
            }
          }
          for (const update of updates.values()) {
            console.error(update.error);
          }
        }
        infinite_loop_guard();
      }
      batch.process(queued_root_effects);
      old_values.clear();
    }
  } finally {
    is_flushing = false;
    set_is_updating_effect(was_updating_effect);
    last_scheduled_effect = null;
  }
}
function infinite_loop_guard() {
  try {
    effect_update_depth_exceeded();
  } catch (error2) {
    {
      define_property(error2, "stack", { value: "" });
    }
    invoke_error_boundary(error2, last_scheduled_effect);
  }
}
let eager_block_effects = null;
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect = effects[i++];
    if ((effect.f & (DESTROYED | INERT)) === 0 && is_dirty(effect)) {
      eager_block_effects = [];
      update_effect(effect);
      if (effect.deps === null && effect.first === null && effect.nodes_start === null) {
        if (effect.teardown === null && effect.ac === null) {
          unlink_effect(effect);
        } else {
          effect.fn = null;
        }
      }
      if (eager_block_effects.length > 0) {
        old_values.clear();
        for (const e of eager_block_effects) {
          update_effect(e);
        }
        eager_block_effects = [];
      }
    }
  }
  eager_block_effects = null;
}
function schedule_effect(signal) {
  var effect = last_scheduled_effect = signal;
  while (effect.parent !== null) {
    effect = effect.parent;
    var flags = effect.f;
    if (is_flushing && effect === active_effect && (flags & BLOCK_EFFECT) !== 0) {
      return;
    }
    if ((flags & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
      if ((flags & CLEAN) === 0) return;
      effect.f ^= CLEAN;
    }
  }
  queued_root_effects.push(effect);
}
let inspect_effects = /* @__PURE__ */ new Set();
const old_values = /* @__PURE__ */ new Map();
function set_inspect_effects(v) {
  inspect_effects = v;
}
let inspect_effects_deferred = false;
function set_inspect_effects_deferred() {
  inspect_effects_deferred = true;
}
function source(v, stack2) {
  var signal = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0
  };
  return signal;
}
// @__NO_SIDE_EFFECTS__
function state(v, stack2) {
  const s2 = source(v);
  push_reaction_value(s2);
  return s2;
}
// @__NO_SIDE_EFFECTS__
function mutable_source(initial_value, immutable = false, trackable = true) {
  const s2 = source(initial_value);
  if (!immutable) {
    s2.equals = safe_equals;
  }
  return s2;
}
function set(source2, value, should_proxy = false) {
  if (active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!untracking || (active_reaction.f & INSPECT_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | INSPECT_EFFECT)) !== 0 && !current_sources?.includes(source2)) {
    state_unsafe_mutation();
  }
  let new_value = should_proxy ? proxy(value) : value;
  {
    tag_proxy(
      new_value,
      /** @type {string} */
      source2.label
    );
  }
  return internal_set(source2, new_value);
}
function internal_set(source2, value) {
  if (!source2.equals(value)) {
    var old_value = source2.v;
    if (is_destroying_effect) {
      old_values.set(source2, value);
    } else {
      old_values.set(source2, old_value);
    }
    source2.v = value;
    var batch = Batch.ensure();
    batch.capture(source2, old_value);
    {
      if (active_effect !== null) {
        const error2 = get_stack("UpdatedAt");
        if (error2 !== null) {
          source2.updated ??= /* @__PURE__ */ new Map();
          let entry = source2.updated.get(error2.stack);
          if (!entry) {
            entry = { error: error2, count: 0 };
            source2.updated.set(error2.stack, entry);
          }
          entry.count++;
        }
      }
      if (active_effect !== null) {
        source2.set_during_effect = true;
      }
    }
    if ((source2.f & DERIVED) !== 0) {
      if ((source2.f & DIRTY) !== 0) {
        execute_derived(
          /** @type {Derived} */
          source2
        );
      }
      set_signal_status(source2, (source2.f & UNOWNED) === 0 ? CLEAN : MAYBE_DIRTY);
    }
    source2.wv = increment_write_version();
    mark_reactions(source2, DIRTY);
    if (active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
      if (untracked_writes === null) {
        set_untracked_writes([source2]);
      } else {
        untracked_writes.push(source2);
      }
    }
    if (inspect_effects.size > 0 && !inspect_effects_deferred) {
      flush_inspect_effects();
    }
  }
  return value;
}
function flush_inspect_effects() {
  inspect_effects_deferred = false;
  const inspects = Array.from(inspect_effects);
  for (const effect of inspects) {
    if ((effect.f & CLEAN) !== 0) {
      set_signal_status(effect, MAYBE_DIRTY);
    }
    if (is_dirty(effect)) {
      update_effect(effect);
    }
  }
  inspect_effects.clear();
}
function increment(source2) {
  set(source2, source2.v + 1);
}
function mark_reactions(signal, status) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var length = reactions.length;
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags = reaction.f;
    if ((flags & INSPECT_EFFECT) !== 0) {
      inspect_effects.add(reaction);
      continue;
    }
    var not_dirty = (flags & DIRTY) === 0;
    if (not_dirty) {
      set_signal_status(reaction, status);
    }
    if ((flags & DERIVED) !== 0) {
      mark_reactions(
        /** @type {Derived} */
        reaction,
        MAYBE_DIRTY
      );
    } else if (not_dirty) {
      if ((flags & BLOCK_EFFECT) !== 0) {
        if (eager_block_effects !== null) {
          eager_block_effects.push(
            /** @type {Effect} */
            reaction
          );
        }
      }
      schedule_effect(
        /** @type {Effect} */
        reaction
      );
    }
  }
}
const regex_is_valid_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function proxy(value) {
  if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
    return value;
  }
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) {
    return value;
  }
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = /* @__PURE__ */ state(0);
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) {
      return fn();
    }
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) {
    sources.set("length", /* @__PURE__ */ state(
      /** @type {any[]} */
      value.length
    ));
    {
      value = /** @type {any} */
      inspectable_array(
        /** @type {any[]} */
        value
      );
    }
  }
  var path2 = "";
  let updating = false;
  function update_path(new_path) {
    if (updating) return;
    updating = true;
    path2 = new_path;
    tag(version, `${path2} version`);
    for (const [prop, source2] of sources) {
      tag(source2, get_label(path2, prop));
    }
    updating = false;
  }
  return new Proxy(
    /** @type {any} */
    value,
    {
      defineProperty(_, prop, descriptor) {
        if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
          state_descriptors_fixed();
        }
        var s2 = sources.get(prop);
        if (s2 === void 0) {
          s2 = with_parent(() => {
            var s3 = /* @__PURE__ */ state(descriptor.value);
            sources.set(prop, s3);
            if (typeof prop === "string") {
              tag(s3, get_label(path2, prop));
            }
            return s3;
          });
        } else {
          set(s2, descriptor.value, true);
        }
        return true;
      },
      deleteProperty(target, prop) {
        var s2 = sources.get(prop);
        if (s2 === void 0) {
          if (prop in target) {
            const s3 = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
            sources.set(prop, s3);
            increment(version);
            {
              tag(s3, get_label(path2, prop));
            }
          }
        } else {
          set(s2, UNINITIALIZED);
          increment(version);
        }
        return true;
      },
      get(target, prop, receiver) {
        if (prop === STATE_SYMBOL) {
          return value;
        }
        if (prop === PROXY_PATH_SYMBOL) {
          return update_path;
        }
        var s2 = sources.get(prop);
        var exists = prop in target;
        if (s2 === void 0 && (!exists || get_descriptor(target, prop)?.writable)) {
          s2 = with_parent(() => {
            var p2 = proxy(exists ? target[prop] : UNINITIALIZED);
            var s3 = /* @__PURE__ */ state(p2);
            {
              tag(s3, get_label(path2, prop));
            }
            return s3;
          });
          sources.set(prop, s2);
        }
        if (s2 !== void 0) {
          var v = get$3(s2);
          return v === UNINITIALIZED ? void 0 : v;
        }
        return Reflect.get(target, prop, receiver);
      },
      getOwnPropertyDescriptor(target, prop) {
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
        if (descriptor && "value" in descriptor) {
          var s2 = sources.get(prop);
          if (s2) descriptor.value = get$3(s2);
        } else if (descriptor === void 0) {
          var source2 = sources.get(prop);
          var value2 = source2?.v;
          if (source2 !== void 0 && value2 !== UNINITIALIZED) {
            return {
              enumerable: true,
              configurable: true,
              value: value2,
              writable: true
            };
          }
        }
        return descriptor;
      },
      has(target, prop) {
        if (prop === STATE_SYMBOL) {
          return true;
        }
        var s2 = sources.get(prop);
        var has = s2 !== void 0 && s2.v !== UNINITIALIZED || Reflect.has(target, prop);
        if (s2 !== void 0 || active_effect !== null && (!has || get_descriptor(target, prop)?.writable)) {
          if (s2 === void 0) {
            s2 = with_parent(() => {
              var p2 = has ? proxy(target[prop]) : UNINITIALIZED;
              var s3 = /* @__PURE__ */ state(p2);
              {
                tag(s3, get_label(path2, prop));
              }
              return s3;
            });
            sources.set(prop, s2);
          }
          var value2 = get$3(s2);
          if (value2 === UNINITIALIZED) {
            return false;
          }
        }
        return has;
      },
      set(target, prop, value2, receiver) {
        var s2 = sources.get(prop);
        var has = prop in target;
        if (is_proxied_array && prop === "length") {
          for (var i = value2; i < /** @type {Source<number>} */
          s2.v; i += 1) {
            var other_s = sources.get(i + "");
            if (other_s !== void 0) {
              set(other_s, UNINITIALIZED);
            } else if (i in target) {
              other_s = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
              sources.set(i + "", other_s);
              {
                tag(other_s, get_label(path2, i));
              }
            }
          }
        }
        if (s2 === void 0) {
          if (!has || get_descriptor(target, prop)?.writable) {
            s2 = with_parent(() => /* @__PURE__ */ state(void 0));
            {
              tag(s2, get_label(path2, prop));
            }
            set(s2, proxy(value2));
            sources.set(prop, s2);
          }
        } else {
          has = s2.v !== UNINITIALIZED;
          var p2 = with_parent(() => proxy(value2));
          set(s2, p2);
        }
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
        if (descriptor?.set) {
          descriptor.set.call(receiver, value2);
        }
        if (!has) {
          if (is_proxied_array && typeof prop === "string") {
            var ls = (
              /** @type {Source<number>} */
              sources.get("length")
            );
            var n2 = Number(prop);
            if (Number.isInteger(n2) && n2 >= ls.v) {
              set(ls, n2 + 1);
            }
          }
          increment(version);
        }
        return true;
      },
      ownKeys(target) {
        get$3(version);
        var own_keys = Reflect.ownKeys(target).filter((key3) => {
          var source3 = sources.get(key3);
          return source3 === void 0 || source3.v !== UNINITIALIZED;
        });
        for (var [key2, source2] of sources) {
          if (source2.v !== UNINITIALIZED && !(key2 in target)) {
            own_keys.push(key2);
          }
        }
        return own_keys;
      },
      setPrototypeOf() {
        state_prototype_fixed();
      }
    }
  );
}
function get_label(path2, prop) {
  if (typeof prop === "symbol") return `${path2}[Symbol(${prop.description ?? ""})]`;
  if (regex_is_valid_identifier.test(prop)) return `${path2}.${prop}`;
  return /^\d+$/.test(prop) ? `${path2}[${prop}]` : `${path2}['${prop}']`;
}
function get_proxied_value(value) {
  try {
    if (value !== null && typeof value === "object" && STATE_SYMBOL in value) {
      return value[STATE_SYMBOL];
    }
  } catch {
  }
  return value;
}
const ARRAY_MUTATING_METHODS = /* @__PURE__ */ new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift"
]);
function inspectable_array(array2) {
  return new Proxy(array2, {
    get(target, prop, receiver) {
      var value = Reflect.get(target, prop, receiver);
      if (!ARRAY_MUTATING_METHODS.has(
        /** @type {string} */
        prop
      )) {
        return value;
      }
      return function(...args) {
        set_inspect_effects_deferred();
        var result = value.apply(this, args);
        flush_inspect_effects();
        return result;
      };
    }
  });
}
function init_array_prototype_warnings() {
  const array_prototype2 = Array.prototype;
  const cleanup = Array.__svelte_cleanup;
  if (cleanup) {
    cleanup();
  }
  const { indexOf, lastIndexOf, includes } = array_prototype2;
  array_prototype2.indexOf = function(item, from_index) {
    const index2 = indexOf.call(this, item, from_index);
    if (index2 === -1) {
      for (let i = from_index ?? 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.indexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.lastIndexOf = function(item, from_index) {
    const index2 = lastIndexOf.call(this, item, from_index ?? this.length - 1);
    if (index2 === -1) {
      for (let i = 0; i <= (from_index ?? this.length - 1); i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.lastIndexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.includes = function(item, from_index) {
    const has = includes.call(this, item, from_index);
    if (!has) {
      for (let i = 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.includes(...)");
          break;
        }
      }
    }
    return has;
  };
  Array.__svelte_cleanup = () => {
    array_prototype2.indexOf = indexOf;
    array_prototype2.lastIndexOf = lastIndexOf;
    array_prototype2.includes = includes;
  };
}
var $window;
var is_firefox;
var first_child_getter;
var next_sibling_getter;
function init_operations() {
  if ($window !== void 0) {
    return;
  }
  $window = window;
  is_firefox = /Firefox/.test(navigator.userAgent);
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype.__click = void 0;
    element_prototype.__className = void 0;
    element_prototype.__attributes = null;
    element_prototype.__style = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) {
    text_prototype.__t = void 0;
  }
  {
    element_prototype.__svelte_meta = null;
    init_array_prototype_warnings();
  }
}
function create_text(value = "") {
  return document.createTextNode(value);
}
// @__NO_SIDE_EFFECTS__
function get_first_child(node) {
  return first_child_getter.call(node);
}
// @__NO_SIDE_EFFECTS__
function get_next_sibling(node) {
  return next_sibling_getter.call(node);
}
function clear_text_content(node) {
  node.textContent = "";
}
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function push_effect(effect, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) {
    parent_effect.last = parent_effect.first = effect;
  } else {
    parent_last.next = effect;
    effect.prev = parent_last;
    parent_effect.last = effect;
  }
}
function create_effect(type, fn, sync, push2 = true) {
  var parent2 = active_effect;
  {
    while (parent2 !== null && (parent2.f & INSPECT_EFFECT) !== 0) {
      parent2 = parent2.parent;
    }
  }
  if (parent2 !== null && (parent2.f & INERT) !== 0) {
    type |= INERT;
  }
  var effect = {
    ctx: component_context,
    deps: null,
    nodes_start: null,
    nodes_end: null,
    f: type | DIRTY,
    first: null,
    fn,
    last: null,
    next: null,
    parent: parent2,
    b: parent2 && parent2.b,
    prev: null,
    teardown: null,
    transitions: null,
    wv: 0,
    ac: null
  };
  {
    effect.component_function = dev_current_component_function;
  }
  if (sync) {
    try {
      update_effect(effect);
      effect.f |= EFFECT_RAN;
    } catch (e2) {
      destroy_effect(effect);
      throw e2;
    }
  } else if (fn !== null) {
    schedule_effect(effect);
  }
  if (push2) {
    var e = effect;
    if (sync && e.deps === null && e.teardown === null && e.nodes_start === null && e.first === e.last && // either `null`, or a singular child
    (e.f & EFFECT_PRESERVED) === 0) {
      e = e.first;
    }
    if (e !== null) {
      e.parent = parent2;
      if (parent2 !== null) {
        push_effect(e, parent2);
      }
      if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type & ROOT_EFFECT) === 0) {
        var derived2 = (
          /** @type {Derived} */
          active_reaction
        );
        (derived2.effects ??= []).push(e);
      }
    }
  }
  return effect;
}
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn, false);
}
function component_root(fn) {
  Batch.ensure();
  const effect = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn, true);
  return (options2 = {}) => {
    return new Promise((fulfil) => {
      if (options2.outro) {
        pause_effect(effect, () => {
          destroy_effect(effect);
          fulfil(void 0);
        });
      } else {
        destroy_effect(effect);
        fulfil(void 0);
      }
    });
  };
}
function render_effect(fn, flags = 0) {
  return create_effect(RENDER_EFFECT | flags, fn, true);
}
function branch(fn, push2 = true) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn, true, push2);
}
function execute_effect_teardown(effect) {
  var teardown = effect.teardown;
  if (teardown !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown.call(null);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect = signal.first;
  signal.first = signal.last = null;
  while (effect !== null) {
    const controller2 = effect.ac;
    if (controller2 !== null) {
      without_reactive_context(() => {
        controller2.abort(STALE_REACTION);
      });
    }
    var next2 = effect.next;
    if ((effect.f & ROOT_EFFECT) !== 0) {
      effect.parent = null;
    } else {
      destroy_effect(effect, remove_dom);
    }
    effect = next2;
  }
}
function destroy_block_effect_children(signal) {
  var effect = signal.first;
  while (effect !== null) {
    var next2 = effect.next;
    if ((effect.f & BRANCH_EFFECT) === 0) {
      destroy_effect(effect);
    }
    effect = next2;
  }
}
function destroy_effect(effect, remove_dom = true) {
  var removed = false;
  if ((remove_dom || (effect.f & HEAD_EFFECT) !== 0) && effect.nodes_start !== null && effect.nodes_end !== null) {
    remove_effect_dom(
      effect.nodes_start,
      /** @type {TemplateNode} */
      effect.nodes_end
    );
    removed = true;
  }
  destroy_effect_children(effect, remove_dom && !removed);
  remove_reactions(effect, 0);
  set_signal_status(effect, DESTROYED);
  var transitions = effect.transitions;
  if (transitions !== null) {
    for (const transition of transitions) {
      transition.stop();
    }
  }
  execute_effect_teardown(effect);
  var parent2 = effect.parent;
  if (parent2 !== null && parent2.first !== null) {
    unlink_effect(effect);
  }
  {
    effect.component_function = null;
  }
  effect.next = effect.prev = effect.teardown = effect.ctx = effect.deps = effect.fn = effect.nodes_start = effect.nodes_end = effect.ac = null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next2 = node === end ? null : (
      /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(node)
    );
    node.remove();
    node = next2;
  }
}
function unlink_effect(effect) {
  var parent2 = effect.parent;
  var prev2 = effect.prev;
  var next2 = effect.next;
  if (prev2 !== null) prev2.next = next2;
  if (next2 !== null) next2.prev = prev2;
  if (parent2 !== null) {
    if (parent2.first === effect) parent2.first = next2;
    if (parent2.last === effect) parent2.last = prev2;
  }
}
function pause_effect(effect, callback) {
  var transitions = [];
  pause_children(effect, transitions, true);
  run_out_transitions(transitions, () => {
    destroy_effect(effect);
    if (callback) callback();
  });
}
function run_out_transitions(transitions, fn) {
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition of transitions) {
      transition.out(check);
    }
  } else {
    fn();
  }
}
function pause_children(effect, transitions, local) {
  if ((effect.f & INERT) !== 0) return;
  effect.f ^= INERT;
  if (effect.transitions !== null) {
    for (const transition of effect.transitions) {
      if (transition.is_global || local) {
        transitions.push(transition);
      }
    }
  }
  var child = effect.first;
  while (child !== null) {
    var sibling = child.next;
    var transparent = (child.f & EFFECT_TRANSPARENT) !== 0 || (child.f & BRANCH_EFFECT) !== 0;
    pause_children(child, transitions, transparent ? local : false);
    child = sibling;
  }
}
let is_updating_effect = false;
function set_is_updating_effect(value) {
  is_updating_effect = value;
}
let is_destroying_effect = false;
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
let active_reaction = null;
let untracking = false;
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
let active_effect = null;
function set_active_effect(effect) {
  active_effect = effect;
}
let current_sources = null;
function push_reaction_value(value) {
  if (active_reaction !== null && true) {
    if (current_sources === null) {
      current_sources = [value];
    } else {
      current_sources.push(value);
    }
  }
}
let new_deps = null;
let skipped_deps = 0;
let untracked_writes = null;
function set_untracked_writes(value) {
  untracked_writes = value;
}
let write_version = 1;
let read_version = 0;
let update_version = read_version;
function set_update_version(value) {
  update_version = value;
}
let skip_reaction = false;
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags = reaction.f;
  if ((flags & DIRTY) !== 0) {
    return true;
  }
  if ((flags & MAYBE_DIRTY) !== 0) {
    var dependencies = reaction.deps;
    var is_unowned = (flags & UNOWNED) !== 0;
    if (dependencies !== null) {
      var i;
      var dependency;
      var is_disconnected = (flags & DISCONNECTED) !== 0;
      var is_unowned_connected = is_unowned && active_effect !== null && !skip_reaction;
      var length = dependencies.length;
      if ((is_disconnected || is_unowned_connected) && (active_effect === null || (active_effect.f & DESTROYED) === 0)) {
        var derived2 = (
          /** @type {Derived} */
          reaction
        );
        var parent2 = derived2.parent;
        for (i = 0; i < length; i++) {
          dependency = dependencies[i];
          if (is_disconnected || !dependency?.reactions?.includes(derived2)) {
            (dependency.reactions ??= []).push(derived2);
          }
        }
        if (is_disconnected) {
          derived2.f ^= DISCONNECTED;
        }
        if (is_unowned_connected && parent2 !== null && (parent2.f & UNOWNED) === 0) {
          derived2.f ^= UNOWNED;
        }
      }
      for (i = 0; i < length; i++) {
        dependency = dependencies[i];
        if (is_dirty(
          /** @type {Derived} */
          dependency
        )) {
          update_derived(
            /** @type {Derived} */
            dependency
          );
        }
        if (dependency.wv > reaction.wv) {
          return true;
        }
      }
    }
    if (!is_unowned || active_effect !== null && !skip_reaction) {
      set_signal_status(reaction, CLEAN);
    }
  }
  return false;
}
function schedule_possible_effect_self_invalidation(signal, effect, root2 = true) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (current_sources?.includes(signal)) {
    return;
  }
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & DERIVED) !== 0) {
      schedule_possible_effect_self_invalidation(
        /** @type {Derived} */
        reaction,
        effect,
        false
      );
    } else if (effect === reaction) {
      if (root2) {
        set_signal_status(reaction, DIRTY);
      } else if ((reaction.f & CLEAN) !== 0) {
        set_signal_status(reaction, MAYBE_DIRTY);
      }
      schedule_effect(
        /** @type {Effect} */
        reaction
      );
    }
  }
}
function update_reaction(reaction) {
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_skip_reaction = skip_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags = reaction.f;
  new_deps = /** @type {null | Value[]} */
  null;
  skipped_deps = 0;
  untracked_writes = null;
  skip_reaction = (flags & UNOWNED) !== 0 && (untracking || !is_updating_effect || active_reaction === null);
  active_reaction = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn = (
      /** @type {Function} */
      reaction.fn
    );
    var result = fn();
    var deps = reaction.deps;
    if (new_deps !== null) {
      var i;
      remove_reactions(reaction, skipped_deps);
      if (deps !== null && skipped_deps > 0) {
        deps.length = skipped_deps + new_deps.length;
        for (i = 0; i < new_deps.length; i++) {
          deps[skipped_deps + i] = new_deps[i];
        }
      } else {
        reaction.deps = deps = new_deps;
      }
      if (!skip_reaction || // Deriveds that already have reactions can cleanup, so we still add them as reactions
      (flags & DERIVED) !== 0 && /** @type {import('#client').Derived} */
      reaction.reactions !== null) {
        for (i = skipped_deps; i < deps.length; i++) {
          (deps[i].reactions ??= []).push(reaction);
        }
      }
    } else if (deps !== null && skipped_deps < deps.length) {
      remove_reactions(reaction, skipped_deps);
      deps.length = skipped_deps;
    }
    if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0) {
      for (i = 0; i < /** @type {Source[]} */
      untracked_writes.length; i++) {
        schedule_possible_effect_self_invalidation(
          untracked_writes[i],
          /** @type {Effect} */
          reaction
        );
      }
    }
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (untracked_writes !== null) {
        if (previous_untracked_writes === null) {
          previous_untracked_writes = untracked_writes;
        } else {
          previous_untracked_writes.push(.../** @type {Source[]} */
          untracked_writes);
        }
      }
    }
    if ((reaction.f & ERROR_VALUE) !== 0) {
      reaction.f ^= ERROR_VALUE;
    }
    return result;
  } catch (error2) {
    return handle_error(error2);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    skip_reaction = previous_skip_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index2 = index_of.call(reactions, signal);
    if (index2 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) {
        reactions = dependency.reactions = null;
      } else {
        reactions[index2] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (reactions === null && (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (new_deps === null || !new_deps.includes(dependency))) {
    set_signal_status(dependency, MAYBE_DIRTY);
    if ((dependency.f & (UNOWNED | DISCONNECTED)) === 0) {
      dependency.f ^= DISCONNECTED;
    }
    destroy_derived_effects(
      /** @type {Derived} **/
      dependency
    );
    remove_reactions(
      /** @type {Derived} **/
      dependency,
      0
    );
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) {
    remove_reaction(signal, dependencies[i]);
  }
}
function update_effect(effect) {
  var flags = effect.f;
  if ((flags & DESTROYED) !== 0) {
    return;
  }
  set_signal_status(effect, CLEAN);
  var previous_effect = active_effect;
  var was_updating_effect = is_updating_effect;
  active_effect = effect;
  is_updating_effect = true;
  {
    var previous_component_fn = dev_current_component_function;
    set_dev_current_component_function(effect.component_function);
    var previous_stack = (
      /** @type {any} */
      dev_stack
    );
    set_dev_stack(effect.dev_stack ?? dev_stack);
  }
  try {
    if ((flags & BLOCK_EFFECT) !== 0) {
      destroy_block_effect_children(effect);
    } else {
      destroy_effect_children(effect);
    }
    execute_effect_teardown(effect);
    var teardown = update_reaction(effect);
    effect.teardown = typeof teardown === "function" ? teardown : null;
    effect.wv = write_version;
    var dep;
    if (DEV && tracing_mode_flag && (effect.f & DIRTY) !== 0 && effect.deps !== null) ;
  } finally {
    is_updating_effect = was_updating_effect;
    active_effect = previous_effect;
    {
      set_dev_current_component_function(previous_component_fn);
      set_dev_stack(previous_stack);
    }
  }
}
function get$3(signal) {
  var flags = signal.f;
  var is_derived = (flags & DERIVED) !== 0;
  if (active_reaction !== null && !untracking) {
    var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
    if (!destroyed && !current_sources?.includes(signal)) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
            skipped_deps++;
          } else if (new_deps === null) {
            new_deps = [signal];
          } else if (!skip_reaction || !new_deps.includes(signal)) {
            new_deps.push(signal);
          }
        }
      } else {
        (active_reaction.deps ??= []).push(signal);
        var reactions = signal.reactions;
        if (reactions === null) {
          signal.reactions = [active_reaction];
        } else if (!reactions.includes(active_reaction)) {
          reactions.push(active_reaction);
        }
      }
    }
  } else if (is_derived && /** @type {Derived} */
  signal.deps === null && /** @type {Derived} */
  signal.effects === null) {
    var derived2 = (
      /** @type {Derived} */
      signal
    );
    var parent2 = derived2.parent;
    if (parent2 !== null && (parent2.f & UNOWNED) === 0) {
      derived2.f ^= UNOWNED;
    }
  }
  {
    recent_async_deriveds.delete(signal);
  }
  if (is_destroying_effect) {
    if (old_values.has(signal)) {
      return old_values.get(signal);
    }
    if (is_derived) {
      derived2 = /** @type {Derived} */
      signal;
      var value = derived2.v;
      if ((derived2.f & CLEAN) === 0 && derived2.reactions !== null || depends_on_old_values(derived2)) {
        value = execute_derived(derived2);
      }
      old_values.set(derived2, value);
      return value;
    }
  } else if (is_derived) {
    derived2 = /** @type {Derived} */
    signal;
    if (batch_deriveds?.has(derived2)) {
      return batch_deriveds.get(derived2);
    }
    if (is_dirty(derived2)) {
      update_derived(derived2);
    }
  }
  if ((signal.f & ERROR_VALUE) !== 0) {
    throw signal.v;
  }
  return signal.v;
}
function depends_on_old_values(derived2) {
  if (derived2.v === UNINITIALIZED) return true;
  if (derived2.deps === null) return false;
  for (const dep of derived2.deps) {
    if (old_values.has(dep)) {
      return true;
    }
    if ((dep.f & DERIVED) !== 0 && depends_on_old_values(
      /** @type {Derived} */
      dep
    )) {
      return true;
    }
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
const STATUS_MASK = -7169;
function set_signal_status(signal, status) {
  signal.f = signal.f & STATUS_MASK | status;
}
function createAttachmentKey() {
  return Symbol(ATTACHMENT_KEY);
}
const regex_return_characters = /\r/g;
function hash$1(str) {
  str = str.replace(regex_return_characters, "");
  let hash2 = 5381;
  let i = str.length;
  while (i--) hash2 = (hash2 << 5) - hash2 ^ str.charCodeAt(i);
  return (hash2 >>> 0).toString(36);
}
const VOID_ELEMENT_NAMES = [
  "area",
  "base",
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
];
function is_void(name) {
  return VOID_ELEMENT_NAMES.includes(name) || name.toLowerCase() === "!doctype";
}
const DOM_BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "hidden",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "webkitdirectory",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback"
];
function is_boolean_attribute(name) {
  return DOM_BOOLEAN_ATTRIBUTES.includes(name);
}
const PASSIVE_EVENTS = ["touchstart", "touchmove"];
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
const RAW_TEXT_ELEMENTS = (
  /** @type {const} */
  ["textarea", "script", "style", "title"]
);
function is_raw_text_element(name) {
  return RAW_TEXT_ELEMENTS.includes(
    /** @type {typeof RAW_TEXT_ELEMENTS[number]} */
    name
  );
}
const all_registered_events = /* @__PURE__ */ new Set();
const root_event_handles = /* @__PURE__ */ new Set();
function create_event(event_name, dom, handler, options2 = {}) {
  function target_handler(event) {
    if (!options2.capture) {
      handle_event_propagation.call(dom, event);
    }
    if (!event.cancelBubble) {
      return without_reactive_context(() => {
        return handler?.call(this, event);
      });
    }
  }
  if (event_name.startsWith("pointer") || event_name.startsWith("touch") || event_name === "wheel") {
    queue_micro_task(() => {
      dom.addEventListener(event_name, target_handler, options2);
    });
  } else {
    dom.addEventListener(event_name, target_handler, options2);
  }
  return target_handler;
}
function on(element2, type, handler, options2 = {}) {
  var target_handler = create_event(type, element2, handler, options2);
  return () => {
    element2.removeEventListener(type, target_handler, options2);
  };
}
let last_propagated_event = null;
function handle_event_propagation(event) {
  var handler_element = this;
  var owner_document = (
    /** @type {Node} */
    handler_element.ownerDocument
  );
  var event_name = event.type;
  var path2 = event.composedPath?.() || [];
  var current_target = (
    /** @type {null | Element} */
    path2[0] || event.target
  );
  last_propagated_event = event;
  var path_idx = 0;
  var handled_at = last_propagated_event === event && event.__root;
  if (handled_at) {
    var at_idx = path2.indexOf(handled_at);
    if (at_idx !== -1 && (handler_element === document || handler_element === /** @type {any} */
    window)) {
      event.__root = handler_element;
      return;
    }
    var handler_idx = path2.indexOf(handler_element);
    if (handler_idx === -1) {
      return;
    }
    if (at_idx <= handler_idx) {
      path_idx = at_idx;
    }
  }
  current_target = /** @type {Element} */
  path2[path_idx] || event.target;
  if (current_target === handler_element) return;
  define_property(event, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    }
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      var parent_element = current_target.assignedSlot || current_target.parentNode || /** @type {any} */
      current_target.host || null;
      try {
        var delegated = current_target["__" + event_name];
        if (delegated != null && (!/** @type {any} */
        current_target.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
        // -> the target could not have been disabled because it emits the event in the first place
        event.target === current_target)) {
          if (is_array(delegated)) {
            var [fn, ...data] = delegated;
            fn.apply(current_target, [event, ...data]);
          } else {
            delegated.call(current_target, event);
          }
        }
      } catch (error2) {
        if (throw_error) {
          other_errors.push(error2);
        } else {
          throw_error = error2;
        }
      }
      if (event.cancelBubble || parent_element === handler_element || parent_element === null) {
        break;
      }
      current_target = parent_element;
    }
    if (throw_error) {
      for (let error2 of other_errors) {
        queueMicrotask(() => {
          throw error2;
        });
      }
      throw throw_error;
    }
  } finally {
    event.__root = handler_element;
    delete event.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function assign_nodes(start, end) {
  var effect = (
    /** @type {Effect} */
    active_effect
  );
  if (effect.nodes_start === null) {
    effect.nodes_start = start;
    effect.nodes_end = end;
  }
}
function mount$1(component, options2) {
  return _mount(component, options2);
}
function hydrate(component, options2) {
  init_operations();
  options2.intro = options2.intro ?? false;
  const target = options2.target;
  const was_hydrating = hydrating;
  const previous_hydrate_node = hydrate_node;
  try {
    var anchor = (
      /** @type {TemplateNode} */
      /* @__PURE__ */ get_first_child(target)
    );
    while (anchor && (anchor.nodeType !== COMMENT_NODE || /** @type {Comment} */
    anchor.data !== HYDRATION_START)) {
      anchor = /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(anchor);
    }
    if (!anchor) {
      throw HYDRATION_ERROR;
    }
    set_hydrating(true);
    set_hydrate_node(
      /** @type {Comment} */
      anchor
    );
    hydrate_next();
    const instance = _mount(component, { ...options2, anchor });
    if (hydrate_node === null || hydrate_node.nodeType !== COMMENT_NODE || /** @type {Comment} */
    hydrate_node.data !== HYDRATION_END) {
      hydration_mismatch();
      throw HYDRATION_ERROR;
    }
    set_hydrating(false);
    return (
      /**  @type {Exports} */
      instance
    );
  } catch (error2) {
    if (error2 instanceof Error && error2.message.split("\n").some((line2) => line2.startsWith("https://svelte.dev/e/"))) {
      throw error2;
    }
    if (error2 !== HYDRATION_ERROR) {
      console.warn("Failed to hydrate: ", error2);
    }
    if (options2.recover === false) {
      hydration_failed();
    }
    init_operations();
    clear_text_content(target);
    set_hydrating(false);
    return mount$1(component, options2);
  } finally {
    set_hydrating(was_hydrating);
    set_hydrate_node(previous_hydrate_node);
  }
}
const document_listeners = /* @__PURE__ */ new Map();
function _mount(Component, { target, anchor, props = {}, events, context: context2, intro = true }) {
  init_operations();
  var registered_events = /* @__PURE__ */ new Set();
  var event_handle = (events2) => {
    for (var i = 0; i < events2.length; i++) {
      var event_name = events2[i];
      if (registered_events.has(event_name)) continue;
      registered_events.add(event_name);
      var passive = is_passive_event(event_name);
      target.addEventListener(event_name, handle_event_propagation, { passive });
      var n2 = document_listeners.get(event_name);
      if (n2 === void 0) {
        document.addEventListener(event_name, handle_event_propagation, { passive });
        document_listeners.set(event_name, 1);
      } else {
        document_listeners.set(event_name, n2 + 1);
      }
    }
  };
  event_handle(array_from(all_registered_events));
  root_event_handles.add(event_handle);
  var component = void 0;
  var unmount2 = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text());
    branch(() => {
      if (context2) {
        push$1({});
        var ctx = (
          /** @type {ComponentContext} */
          component_context
        );
        ctx.c = context2;
      }
      if (events) {
        props.$$events = events;
      }
      if (hydrating) {
        assign_nodes(
          /** @type {TemplateNode} */
          anchor_node,
          null
        );
      }
      component = Component(anchor_node, props) || {};
      if (hydrating) {
        active_effect.nodes_end = hydrate_node;
      }
      if (context2) {
        pop$1();
      }
    });
    return () => {
      for (var event_name of registered_events) {
        target.removeEventListener(event_name, handle_event_propagation);
        var n2 = (
          /** @type {number} */
          document_listeners.get(event_name)
        );
        if (--n2 === 0) {
          document.removeEventListener(event_name, handle_event_propagation);
          document_listeners.delete(event_name);
        } else {
          document_listeners.set(event_name, n2);
        }
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) {
        anchor_node.parentNode?.removeChild(anchor_node);
      }
    };
  });
  mounted_components.set(component, unmount2);
  return component;
}
let mounted_components = /* @__PURE__ */ new WeakMap();
function unmount$1(component, options2) {
  const fn = mounted_components.get(component);
  if (fn) {
    mounted_components.delete(component);
    return fn(options2);
  }
  {
    lifecycle_double_unmount();
  }
  return Promise.resolve();
}
function validate_void_dynamic_element(tag_fn) {
  const tag2 = tag_fn();
  if (tag2 && is_void(tag2)) {
    dynamic_void_element_content(tag2);
  }
}
function validate_dynamic_element_tag(tag_fn) {
  const tag2 = tag_fn();
  const is_string = typeof tag2 === "string";
  if (tag2 && !is_string) {
    svelte_element_invalid_this_value();
  }
}
function validate_store(store, name) {
  if (store != null && typeof store.subscribe !== "function") {
    store_invalid_shape(name);
  }
}
function prevent_snippet_stringification(fn) {
  fn.toString = () => {
    snippet_without_render_tag();
    return "";
  };
  return fn;
}
const ATTR_REGEX = /[&"<]/g;
const CONTENT_REGEX = /[&<]/g;
function escape_html(value, is_attr) {
  const str = String(value ?? "");
  const pattern2 = is_attr ? ATTR_REGEX : CONTENT_REGEX;
  pattern2.lastIndex = 0;
  let escaped = "";
  let last = 0;
  while (pattern2.test(str)) {
    const i = pattern2.lastIndex - 1;
    const ch = str[i];
    escaped += str.substring(last, i) + (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;");
    last = i + 1;
  }
  return escaped + str.substring(last);
}
const replacements$1 = {
  translate: /* @__PURE__ */ new Map([
    [true, "yes"],
    [false, "no"]
  ])
};
function attr(name, value, is_boolean = false) {
  if (value == null || !value && is_boolean) return "";
  const normalized = name in replacements$1 && replacements$1[name].get(value) || value;
  const assignment = is_boolean ? "" : `="${escape_html(normalized, true)}"`;
  return ` ${name}${assignment}`;
}
function clsx(value) {
  if (typeof value === "object") {
    return clsx$1(value);
  } else {
    return value ?? "";
  }
}
const whitespace = [..." 	\n\r\f \v\uFEFF"];
function to_class(value, hash2, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash2) {
    classname = classname ? classname + " " + hash2 : hash2;
  }
  if (directives) {
    for (var key2 in directives) {
      if (directives[key2]) {
        classname = classname ? classname + " " + key2 : key2;
      } else if (classname.length) {
        var len = key2.length;
        var a = 0;
        while ((a = classname.indexOf(key2, a)) >= 0) {
          var b = a + len;
          if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) {
            classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
          } else {
            a = b;
          }
        }
      }
    }
  }
  return classname === "" ? null : classname;
}
function append_styles(styles, important = false) {
  var separator = important ? " !important;" : ";";
  var css = "";
  for (var key2 in styles) {
    var value = styles[key2];
    if (value != null && value !== "") {
      css += " " + key2 + ": " + value + separator;
    }
  }
  return css;
}
function to_css_name(name) {
  if (name[0] !== "-" || name[1] !== "-") {
    return name.toLowerCase();
  }
  return name;
}
function to_style(value, styles) {
  if (styles) {
    var new_style = "";
    var normal_styles;
    var important_styles;
    if (Array.isArray(styles)) {
      normal_styles = styles[0];
      important_styles = styles[1];
    } else {
      normal_styles = styles;
    }
    if (value) {
      value = String(value).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
      var in_str = false;
      var in_apo = 0;
      var in_comment = false;
      var reserved_names = [];
      if (normal_styles) {
        reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
      }
      if (important_styles) {
        reserved_names.push(...Object.keys(important_styles).map(to_css_name));
      }
      var start_index = 0;
      var name_index = -1;
      const len = value.length;
      for (var i = 0; i < len; i++) {
        var c = value[i];
        if (in_comment) {
          if (c === "/" && value[i - 1] === "*") {
            in_comment = false;
          }
        } else if (in_str) {
          if (in_str === c) {
            in_str = false;
          }
        } else if (c === "/" && value[i + 1] === "*") {
          in_comment = true;
        } else if (c === '"' || c === "'") {
          in_str = c;
        } else if (c === "(") {
          in_apo++;
        } else if (c === ")") {
          in_apo--;
        }
        if (!in_comment && in_str === false && in_apo === 0) {
          if (c === ":" && name_index === -1) {
            name_index = i;
          } else if (c === ";" || i === len - 1) {
            if (name_index !== -1) {
              var name = to_css_name(value.substring(start_index, name_index).trim());
              if (!reserved_names.includes(name)) {
                if (c !== ";") {
                  i++;
                }
                var property = value.substring(start_index, i).trim();
                new_style += " " + property + ";";
              }
            }
            start_index = i + 1;
            name_index = -1;
          }
        }
      }
    }
    if (normal_styles) {
      new_style += append_styles(normal_styles);
    }
    if (important_styles) {
      new_style += append_styles(important_styles, true);
    }
    new_style = new_style.trim();
    return new_style === "" ? null : new_style;
  }
  return value == null ? null : String(value);
}
const now = () => Date.now();
const raf = {
  // don't access requestAnimationFrame eagerly outside method
  // this allows basic testing of user code without JSDOM
  // bunder will eval and remove ternary when the user's app is built
  tick: (
    /** @param {any} _ */
    (_) => noop$1()
  ),
  now: () => now(),
  tasks: /* @__PURE__ */ new Set()
};
function loop(callback) {
  let task;
  if (raf.tasks.size === 0) ;
  return {
    promise: new Promise((fulfill) => {
      raf.tasks.add(task = { c: callback, f: fulfill });
    }),
    abort() {
      raf.tasks.delete(task);
    }
  };
}
function asClassComponent$1(component) {
  return class extends Svelte4Component {
    /** @param {any} options */
    constructor(options2) {
      super({
        component,
        ...options2
      });
    }
  };
}
class Svelte4Component {
  /** @type {any} */
  #events;
  /** @type {Record<string, any>} */
  #instance;
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(options2) {
    var sources = /* @__PURE__ */ new Map();
    var add_source = (key2, value) => {
      var s2 = /* @__PURE__ */ mutable_source(value, false, false);
      sources.set(key2, s2);
      return s2;
    };
    const props = new Proxy(
      { ...options2.props || {}, $$events: {} },
      {
        get(target, prop) {
          return get$3(sources.get(prop) ?? add_source(prop, Reflect.get(target, prop)));
        },
        has(target, prop) {
          if (prop === LEGACY_PROPS) return true;
          get$3(sources.get(prop) ?? add_source(prop, Reflect.get(target, prop)));
          return Reflect.has(target, prop);
        },
        set(target, prop, value) {
          set(sources.get(prop) ?? add_source(prop, value), value);
          return Reflect.set(target, prop, value);
        }
      }
    );
    this.#instance = (options2.hydrate ? hydrate : mount$1)(options2.component, {
      target: options2.target,
      anchor: options2.anchor,
      props,
      context: options2.context,
      intro: options2.intro ?? false,
      recover: options2.recover
    });
    if (!options2?.props?.$$host || options2.sync === false) {
      flushSync();
    }
    this.#events = props.$$events;
    for (const key2 of Object.keys(this.#instance)) {
      if (key2 === "$set" || key2 === "$destroy" || key2 === "$on") continue;
      define_property(this, key2, {
        get() {
          return this.#instance[key2];
        },
        /** @param {any} value */
        set(value) {
          this.#instance[key2] = value;
        },
        enumerable: true
      });
    }
    this.#instance.$set = /** @param {Record<string, any>} next */
    (next2) => {
      Object.assign(props, next2);
    };
    this.#instance.$destroy = () => {
      unmount$1(this.#instance);
    };
  }
  /** @param {Record<string, any>} props */
  $set(props) {
    this.#instance.$set(props);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(event, callback) {
    this.#events[event] = this.#events[event] || [];
    const cb = (...args) => callback.call(this, ...args);
    this.#events[event].push(cb);
    return () => {
      this.#events[event] = this.#events[event].filter(
        /** @param {any} fn */
        (fn) => fn !== cb
      );
    };
  }
  $destroy() {
    this.#instance.$destroy();
  }
}
{
  let throw_rune_error = function(rune) {
    if (!(rune in globalThis)) {
      let value;
      Object.defineProperty(globalThis, rune, {
        configurable: true,
        // eslint-disable-next-line getter-return
        get: () => {
          if (value !== void 0) {
            return value;
          }
          rune_outside_svelte(rune);
        },
        set: (v) => {
          value = v;
        }
      });
    }
  };
  throw_rune_error("$state");
  throw_rune_error("$effect");
  throw_rune_error("$derived");
  throw_rune_error("$inspect");
  throw_rune_error("$props");
  throw_rune_error("$bindable");
}
function subscribe_to_store(store, run2, invalidate) {
  if (store == null) {
    run2(void 0);
    if (invalidate) invalidate(void 0);
    return noop$1;
  }
  const unsub = untrack(
    () => store.subscribe(
      run2,
      // @ts-expect-error
      invalidate
    )
  );
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
const subscriber_queue = [];
function readable(value, start) {
  return {
    subscribe: writable(value, start).subscribe
  };
}
function writable(value, start = noop$1) {
  let stop = null;
  const subscribers = /* @__PURE__ */ new Set();
  function set2(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set2(fn(
      /** @type {T} */
      value
    ));
  }
  function subscribe(run2, invalidate = noop$1) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set2, update) || noop$1;
    }
    run2(
      /** @type {T} */
      value
    );
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set: set2, update, subscribe };
}
function derived$1(stores2, fn, initial_value) {
  const single = !Array.isArray(stores2);
  const stores_array = single ? [stores2] : stores2;
  if (!stores_array.every(Boolean)) {
    throw new Error("derived() expects stores as input, got a falsy value");
  }
  const auto = fn.length < 2;
  return readable(initial_value, (set2, update) => {
    let started = false;
    const values = [];
    let pending = 0;
    let cleanup = noop$1;
    const sync = () => {
      if (pending) {
        return;
      }
      cleanup();
      const result = fn(single ? values[0] : values, set2, update);
      if (auto) {
        set2(result);
      } else {
        cleanup = typeof result === "function" ? result : noop$1;
      }
    };
    const unsubscribers = stores_array.map(
      (store, i) => subscribe_to_store(
        store,
        (value) => {
          values[i] = value;
          pending &= ~(1 << i);
          if (started) {
            sync();
          }
        },
        () => {
          pending |= 1 << i;
        }
      )
    );
    started = true;
    sync();
    return function stop() {
      run_all(unsubscribers);
      cleanup();
      started = false;
    };
  });
}
function readonly(store) {
  return {
    // @ts-expect-error TODO i suspect the bind is unnecessary
    subscribe: store.subscribe.bind(store)
  };
}
function get$2(store) {
  let value;
  subscribe_to_store(store, (_) => value = _)();
  return value;
}
function fromStore(store) {
  if ("set" in store) {
    return {
      get current() {
        return get$2(store);
      },
      set current(v) {
        store.set(v);
      }
    };
  }
  return {
    get current() {
      return get$2(store);
    }
  };
}
function hash(...values) {
  let hash2 = 5381;
  for (const value of values) {
    if (typeof value === "string") {
      let i = value.length;
      while (i) hash2 = hash2 * 33 ^ value.charCodeAt(--i);
    } else if (ArrayBuffer.isView(value)) {
      const buffer = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      let i = buffer.length;
      while (i) hash2 = hash2 * 33 ^ buffer[--i];
    } else {
      throw new TypeError("value must be a string or TypedArray");
    }
  }
  return (hash2 >>> 0).toString(36);
}
const replacements = {
  "<": "\\u003C",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
const pattern = new RegExp(`[${Object.keys(replacements).join("")}]`, "g");
function serialize_data(fetched, filter, prerendering2 = false) {
  const headers2 = {};
  let cache_control = null;
  let age = null;
  let varyAny = false;
  for (const [key2, value] of fetched.response.headers) {
    if (filter(key2, value)) {
      headers2[key2] = value;
    }
    if (key2 === "cache-control") cache_control = value;
    else if (key2 === "age") age = value;
    else if (key2 === "vary" && value.trim() === "*") varyAny = true;
  }
  const payload = {
    status: fetched.response.status,
    statusText: fetched.response.statusText,
    headers: headers2,
    body: fetched.response_body
  };
  const safe_payload = JSON.stringify(payload).replace(pattern, (match) => replacements[match]);
  const attrs = [
    'type="application/json"',
    "data-sveltekit-fetched",
    `data-url="${escape_html$1(fetched.url, true)}"`
  ];
  if (fetched.is_b64) {
    attrs.push("data-b64");
  }
  if (fetched.request_headers || fetched.request_body) {
    const values = [];
    if (fetched.request_headers) {
      values.push([...new Headers(fetched.request_headers)].join(","));
    }
    if (fetched.request_body) {
      values.push(fetched.request_body);
    }
    attrs.push(`data-hash="${hash(...values)}"`);
  }
  if (!prerendering2 && fetched.method === "GET" && cache_control && !varyAny) {
    const match = /s-maxage=(\d+)/g.exec(cache_control) ?? /max-age=(\d+)/g.exec(cache_control);
    if (match) {
      const ttl = +match[1] - +(age ?? "0");
      attrs.push(`data-ttl="${ttl}"`);
    }
  }
  return `<script ${attrs.join(" ")}>${safe_payload}<\/script>`;
}
const s = JSON.stringify;
function sha256(data) {
  if (!key[0]) precompute();
  const out = init.slice(0);
  const array2 = encode(data);
  for (let i = 0; i < array2.length; i += 16) {
    const w = array2.subarray(i, i + 16);
    let tmp;
    let a;
    let b;
    let out0 = out[0];
    let out1 = out[1];
    let out2 = out[2];
    let out3 = out[3];
    let out4 = out[4];
    let out5 = out[5];
    let out6 = out[6];
    let out7 = out[7];
    for (let i2 = 0; i2 < 64; i2++) {
      if (i2 < 16) {
        tmp = w[i2];
      } else {
        a = w[i2 + 1 & 15];
        b = w[i2 + 14 & 15];
        tmp = w[i2 & 15] = (a >>> 7 ^ a >>> 18 ^ a >>> 3 ^ a << 25 ^ a << 14) + (b >>> 17 ^ b >>> 19 ^ b >>> 10 ^ b << 15 ^ b << 13) + w[i2 & 15] + w[i2 + 9 & 15] | 0;
      }
      tmp = tmp + out7 + (out4 >>> 6 ^ out4 >>> 11 ^ out4 >>> 25 ^ out4 << 26 ^ out4 << 21 ^ out4 << 7) + (out6 ^ out4 & (out5 ^ out6)) + key[i2];
      out7 = out6;
      out6 = out5;
      out5 = out4;
      out4 = out3 + tmp | 0;
      out3 = out2;
      out2 = out1;
      out1 = out0;
      out0 = tmp + (out1 & out2 ^ out3 & (out1 ^ out2)) + (out1 >>> 2 ^ out1 >>> 13 ^ out1 >>> 22 ^ out1 << 30 ^ out1 << 19 ^ out1 << 10) | 0;
    }
    out[0] = out[0] + out0 | 0;
    out[1] = out[1] + out1 | 0;
    out[2] = out[2] + out2 | 0;
    out[3] = out[3] + out3 | 0;
    out[4] = out[4] + out4 | 0;
    out[5] = out[5] + out5 | 0;
    out[6] = out[6] + out6 | 0;
    out[7] = out[7] + out7 | 0;
  }
  const bytes = new Uint8Array(out.buffer);
  reverse_endianness(bytes);
  return btoa(String.fromCharCode(...bytes));
}
const init = new Uint32Array(8);
const key = new Uint32Array(64);
function precompute() {
  function frac(x) {
    return (x - Math.floor(x)) * 4294967296;
  }
  let prime = 2;
  for (let i = 0; i < 64; prime++) {
    let is_prime = true;
    for (let factor = 2; factor * factor <= prime; factor++) {
      if (prime % factor === 0) {
        is_prime = false;
        break;
      }
    }
    if (is_prime) {
      if (i < 8) {
        init[i] = frac(prime ** (1 / 2));
      }
      key[i] = frac(prime ** (1 / 3));
      i++;
    }
  }
}
function reverse_endianness(bytes) {
  for (let i = 0; i < bytes.length; i += 4) {
    const a = bytes[i + 0];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const d = bytes[i + 3];
    bytes[i + 0] = d;
    bytes[i + 1] = c;
    bytes[i + 2] = b;
    bytes[i + 3] = a;
  }
}
function encode(str) {
  const encoded = text_encoder.encode(str);
  const length = encoded.length * 8;
  const size2 = 512 * Math.ceil((length + 65) / 512);
  const bytes = new Uint8Array(size2 / 8);
  bytes.set(encoded);
  bytes[encoded.length] = 128;
  reverse_endianness(bytes);
  const words = new Uint32Array(bytes.buffer);
  words[words.length - 2] = Math.floor(length / 4294967296);
  words[words.length - 1] = length;
  return words;
}
const array = new Uint8Array(16);
function generate_nonce() {
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
const quoted = /* @__PURE__ */ new Set([
  "self",
  "unsafe-eval",
  "unsafe-hashes",
  "unsafe-inline",
  "none",
  "strict-dynamic",
  "report-sample",
  "wasm-unsafe-eval",
  "script"
]);
const crypto_pattern = /^(nonce|sha\d\d\d)-/;
class BaseProvider {
  /** @type {boolean} */
  #use_hashes;
  /** @type {boolean} */
  #script_needs_csp;
  /** @type {boolean} */
  #script_src_needs_csp;
  /** @type {boolean} */
  #script_src_elem_needs_csp;
  /** @type {boolean} */
  #style_needs_csp;
  /** @type {boolean} */
  #style_src_needs_csp;
  /** @type {boolean} */
  #style_src_attr_needs_csp;
  /** @type {boolean} */
  #style_src_elem_needs_csp;
  /** @type {import('types').CspDirectives} */
  #directives;
  /** @type {import('types').Csp.Source[]} */
  #script_src;
  /** @type {import('types').Csp.Source[]} */
  #script_src_elem;
  /** @type {import('types').Csp.Source[]} */
  #style_src;
  /** @type {import('types').Csp.Source[]} */
  #style_src_attr;
  /** @type {import('types').Csp.Source[]} */
  #style_src_elem;
  /** @type {string} */
  #nonce;
  /**
   * @param {boolean} use_hashes
   * @param {import('types').CspDirectives} directives
   * @param {string} nonce
   */
  constructor(use_hashes, directives, nonce) {
    this.#use_hashes = use_hashes;
    this.#directives = { ...directives };
    const d = this.#directives;
    this.#script_src = [];
    this.#script_src_elem = [];
    this.#style_src = [];
    this.#style_src_attr = [];
    this.#style_src_elem = [];
    const effective_script_src = d["script-src"] || d["default-src"];
    const script_src_elem = d["script-src-elem"];
    const effective_style_src = d["style-src"] || d["default-src"];
    const style_src_attr = d["style-src-attr"];
    const style_src_elem = d["style-src-elem"];
    {
      if (effective_style_src && !effective_style_src.includes("unsafe-inline")) {
        d["style-src"] = [
          ...effective_style_src.filter(
            (value) => !(value.startsWith("sha256-") || value.startsWith("nonce-"))
          ),
          "unsafe-inline"
        ];
      }
      if (style_src_attr && !style_src_attr.includes("unsafe-inline")) {
        d["style-src-attr"] = [
          ...style_src_attr.filter(
            (value) => !(value.startsWith("sha256-") || value.startsWith("nonce-"))
          ),
          "unsafe-inline"
        ];
      }
      if (style_src_elem && !style_src_elem.includes("unsafe-inline")) {
        d["style-src-elem"] = [
          ...style_src_elem.filter(
            (value) => !(value.startsWith("sha256-") || value.startsWith("nonce-"))
          ),
          "unsafe-inline"
        ];
      }
    }
    const needs_csp = (directive) => !!directive && !directive.some((value) => value === "unsafe-inline");
    this.#script_src_needs_csp = needs_csp(effective_script_src);
    this.#script_src_elem_needs_csp = needs_csp(script_src_elem);
    this.#style_src_needs_csp = needs_csp(effective_style_src);
    this.#style_src_attr_needs_csp = needs_csp(style_src_attr);
    this.#style_src_elem_needs_csp = needs_csp(style_src_elem);
    this.#script_needs_csp = this.#script_src_needs_csp || this.#script_src_elem_needs_csp;
    this.#style_needs_csp = !DEV;
    this.script_needs_nonce = this.#script_needs_csp && !this.#use_hashes;
    this.style_needs_nonce = this.#style_needs_csp && !this.#use_hashes;
    this.#nonce = nonce;
  }
  /** @param {string} content */
  add_script(content) {
    if (!this.#script_needs_csp) return;
    const source2 = this.#use_hashes ? `sha256-${sha256(content)}` : `nonce-${this.#nonce}`;
    if (this.#script_src_needs_csp) {
      this.#script_src.push(source2);
    }
    if (this.#script_src_elem_needs_csp) {
      this.#script_src_elem.push(source2);
    }
  }
  /** @param {string} content */
  add_style(content) {
    if (!this.#style_needs_csp) return;
    const source2 = this.#use_hashes ? `sha256-${sha256(content)}` : `nonce-${this.#nonce}`;
    if (this.#style_src_needs_csp) {
      this.#style_src.push(source2);
    }
    if (this.#style_src_attr_needs_csp) {
      this.#style_src_attr.push(source2);
    }
    if (this.#style_src_elem_needs_csp) {
      const sha256_empty_comment_hash = "sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=";
      const d = this.#directives;
      if (d["style-src-elem"] && !d["style-src-elem"].includes(sha256_empty_comment_hash) && !this.#style_src_elem.includes(sha256_empty_comment_hash)) {
        this.#style_src_elem.push(sha256_empty_comment_hash);
      }
      if (source2 !== sha256_empty_comment_hash) {
        this.#style_src_elem.push(source2);
      }
    }
  }
  /**
   * @param {boolean} [is_meta]
   */
  get_header(is_meta = false) {
    const header = [];
    const directives = { ...this.#directives };
    if (this.#style_src.length > 0) {
      directives["style-src"] = [
        ...directives["style-src"] || directives["default-src"] || [],
        ...this.#style_src
      ];
    }
    if (this.#style_src_attr.length > 0) {
      directives["style-src-attr"] = [
        ...directives["style-src-attr"] || [],
        ...this.#style_src_attr
      ];
    }
    if (this.#style_src_elem.length > 0) {
      directives["style-src-elem"] = [
        ...directives["style-src-elem"] || [],
        ...this.#style_src_elem
      ];
    }
    if (this.#script_src.length > 0) {
      directives["script-src"] = [
        ...directives["script-src"] || directives["default-src"] || [],
        ...this.#script_src
      ];
    }
    if (this.#script_src_elem.length > 0) {
      directives["script-src-elem"] = [
        ...directives["script-src-elem"] || [],
        ...this.#script_src_elem
      ];
    }
    for (const key2 in directives) {
      if (is_meta && (key2 === "frame-ancestors" || key2 === "report-uri" || key2 === "sandbox")) {
        continue;
      }
      const value = (
        /** @type {string[] | true} */
        directives[key2]
      );
      if (!value) continue;
      const directive = [key2];
      if (Array.isArray(value)) {
        value.forEach((value2) => {
          if (quoted.has(value2) || crypto_pattern.test(value2)) {
            directive.push(`'${value2}'`);
          } else {
            directive.push(value2);
          }
        });
      }
      header.push(directive.join(" "));
    }
    return header.join("; ");
  }
}
class CspProvider extends BaseProvider {
  get_meta() {
    const content = this.get_header(true);
    if (!content) {
      return;
    }
    return `<meta http-equiv="content-security-policy" content="${escape_html$1(content, true)}">`;
  }
}
class CspReportOnlyProvider extends BaseProvider {
  /**
   * @param {boolean} use_hashes
   * @param {import('types').CspDirectives} directives
   * @param {string} nonce
   */
  constructor(use_hashes, directives, nonce) {
    super(use_hashes, directives, nonce);
    if (Object.values(directives).filter((v) => !!v).length > 0) {
      const has_report_to = directives["report-to"]?.length ?? 0 > 0;
      const has_report_uri = directives["report-uri"]?.length ?? 0 > 0;
      if (!has_report_to && !has_report_uri) {
        throw Error(
          "`content-security-policy-report-only` must be specified with either the `report-to` or `report-uri` directives, or both"
        );
      }
    }
  }
}
class Csp {
  /** @readonly */
  nonce = generate_nonce();
  /** @type {CspProvider} */
  csp_provider;
  /** @type {CspReportOnlyProvider} */
  report_only_provider;
  /**
   * @param {import('./types.js').CspConfig} config
   * @param {import('./types.js').CspOpts} opts
   */
  constructor({ mode, directives, reportOnly }, { prerender: prerender2 }) {
    const use_hashes = mode === "hash" || mode === "auto" && prerender2;
    this.csp_provider = new CspProvider(use_hashes, directives, this.nonce);
    this.report_only_provider = new CspReportOnlyProvider(use_hashes, reportOnly, this.nonce);
  }
  get script_needs_nonce() {
    return this.csp_provider.script_needs_nonce || this.report_only_provider.script_needs_nonce;
  }
  get style_needs_nonce() {
    return this.csp_provider.style_needs_nonce || this.report_only_provider.style_needs_nonce;
  }
  /** @param {string} content */
  add_script(content) {
    this.csp_provider.add_script(content);
    this.report_only_provider.add_script(content);
  }
  /** @param {string} content */
  add_style(content) {
    this.csp_provider.add_style(content);
    this.report_only_provider.add_style(content);
  }
}
function defer() {
  let fulfil;
  let reject;
  const promise = new Promise((f2, r) => {
    fulfil = f2;
    reject = r;
  });
  return { promise, fulfil, reject };
}
function create_async_iterator() {
  const deferred2 = [defer()];
  return {
    iterator: {
      [Symbol.asyncIterator]() {
        return {
          next: async () => {
            const next2 = await deferred2[0].promise;
            if (!next2.done) deferred2.shift();
            return next2;
          }
        };
      }
    },
    push: (value) => {
      deferred2[deferred2.length - 1].fulfil({
        value,
        done: false
      });
      deferred2.push(defer());
    },
    done: () => {
      deferred2[deferred2.length - 1].fulfil({ done: true });
    }
  };
}
function exec(match, params, matchers) {
  const result = {};
  const values = match.slice(1);
  const values_needing_match = values.filter((value) => value !== void 0);
  let buffered = 0;
  for (let i = 0; i < params.length; i += 1) {
    const param = params[i];
    let value = values[i - buffered];
    if (param.chained && param.rest && buffered) {
      value = values.slice(i - buffered, i + 1).filter((s2) => s2).join("/");
      buffered = 0;
    }
    if (value === void 0) {
      if (param.rest) result[param.name] = "";
      continue;
    }
    if (!param.matcher || matchers[param.matcher](value)) {
      result[param.name] = value;
      const next_param = params[i + 1];
      const next_value = values[i + 1];
      if (next_param && !next_param.rest && next_param.optional && next_value && param.chained) {
        buffered = 0;
      }
      if (!next_param && !next_value && Object.keys(result).length === values_needing_match.length) {
        buffered = 0;
      }
      continue;
    }
    if (param.optional && param.chained) {
      buffered++;
      continue;
    }
    return;
  }
  if (buffered) return;
  return result;
}
function generate_route_object(route, url, manifest) {
  const { errors, layouts, leaf } = route;
  const nodes = [...errors, ...layouts.map((l2) => l2?.[1]), leaf[1]].filter((n2) => typeof n2 === "number").map((n2) => `'${n2}': () => ${create_client_import(manifest._.client.nodes?.[n2], url)}`).join(",\n		");
  return [
    `{
	id: ${s(route.id)}`,
    `errors: ${s(route.errors)}`,
    `layouts: ${s(route.layouts)}`,
    `leaf: ${s(route.leaf)}`,
    `nodes: {
		${nodes}
	}
}`
  ].join(",\n	");
}
function create_client_import(import_path, url) {
  if (!import_path) return "Promise.resolve({})";
  if (import_path[0] === "/") {
    return `import('${import_path}')`;
  }
  if (assets !== "") {
    return `import('${assets}/${import_path}')`;
  }
  let path2 = get_relative_path(url.pathname, `${base}/${import_path}`);
  if (path2[0] !== ".") path2 = `./${path2}`;
  return `import('${path2}')`;
}
async function resolve_route(resolved_path, url, manifest) {
  if (!manifest._.client.routes) {
    return text("Server-side route resolution disabled", { status: 400 });
  }
  let route = null;
  let params = {};
  const matchers = await manifest._.matchers();
  for (const candidate of manifest._.client.routes) {
    const match = candidate.pattern.exec(resolved_path);
    if (!match) continue;
    const matched = exec(match, candidate.params, matchers);
    if (matched) {
      route = candidate;
      params = decode_params(matched);
      break;
    }
  }
  return create_server_routing_response(route, params, url, manifest).response;
}
function create_server_routing_response(route, params, url, manifest) {
  const headers2 = new Headers({
    "content-type": "application/javascript; charset=utf-8"
  });
  if (route) {
    const csr_route = generate_route_object(route, url, manifest);
    const body2 = `${create_css_import(route, url, manifest)}
export const route = ${csr_route}; export const params = ${JSON.stringify(params)};`;
    return { response: text(body2, { headers: headers2 }), body: body2 };
  } else {
    return { response: text("", { headers: headers2 }), body: "" };
  }
}
function create_css_import(route, url, manifest) {
  const { errors, layouts, leaf } = route;
  let css = "";
  for (const node of [...errors, ...layouts.map((l2) => l2?.[1]), leaf[1]]) {
    if (typeof node !== "number") continue;
    const node_css = manifest._.client.css?.[node];
    for (const css_path of node_css ?? []) {
      css += `'${assets || base}/${css_path}',`;
    }
  }
  if (!css) return "";
  return `${create_client_import(
    /** @type {string} */
    manifest._.client.start,
    url
  )}.then(x => x.load_css([${css}]));`;
}
const updated = {
  ...readable(false),
  check: () => false
};
async function render_response({
  branch: branch2,
  fetched,
  options: options2,
  manifest,
  state: state2,
  page_config,
  status,
  error: error2 = null,
  event,
  event_state,
  resolve_opts,
  action_result
}) {
  if (state2.prerendering) {
    if (options2.csp.mode === "nonce") {
      throw new Error('Cannot use prerendering if config.kit.csp.mode === "nonce"');
    }
    if (options2.app_template_contains_nonce) {
      throw new Error("Cannot use prerendering if page template contains %sveltekit.nonce%");
    }
  }
  const { client } = manifest._;
  const modulepreloads = new Set(client.imports);
  const stylesheets = new Set(client.stylesheets);
  const fonts = new Set(client.fonts);
  const link_headers = /* @__PURE__ */ new Set();
  const link_tags = /* @__PURE__ */ new Set();
  const inline_styles = /* @__PURE__ */ new Map();
  let rendered;
  const form_value = action_result?.type === "success" || action_result?.type === "failure" ? action_result.data ?? null : null;
  let base$1 = base;
  let assets$1 = assets;
  let base_expression = s(base);
  {
    if (!state2.prerendering?.fallback) {
      const segments = event.url.pathname.slice(base.length).split("/").slice(2);
      base$1 = segments.map(() => "..").join("/") || ".";
      base_expression = `new URL(${s(base$1)}, location).pathname.slice(0, -1)`;
      if (!assets || assets[0] === "/" && assets !== SVELTE_KIT_ASSETS) {
        assets$1 = base$1;
      }
    } else if (options2.hash_routing) {
      base_expression = "new URL('.', location).pathname.slice(0, -1)";
    }
  }
  if (page_config.ssr) {
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        updated
      },
      constructors: await Promise.all(
        branch2.map(({ node }) => {
          if (!node.component) {
            throw new Error(`Missing +page.svelte component for route ${event.route.id}`);
          }
          return node.component();
        })
      ),
      form: form_value
    };
    let data2 = {};
    for (let i = 0; i < branch2.length; i += 1) {
      data2 = { ...data2, ...branch2[i].data };
      props[`data_${i}`] = data2;
    }
    props.page = {
      error: error2,
      params: (
        /** @type {Record<string, any>} */
        event.params
      ),
      route: event.route,
      status,
      url: event.url,
      data: data2,
      form: form_value,
      state: {}
    };
    override({ base: base$1, assets: assets$1 });
    const render_opts = {
      context: /* @__PURE__ */ new Map([
        [
          "__request__",
          {
            page: props.page
          }
        ]
      ])
    };
    {
      const fetch2 = globalThis.fetch;
      let warned = false;
      globalThis.fetch = (info, init2) => {
        if (typeof info === "string" && !SCHEME.test(info)) {
          throw new Error(
            `Cannot call \`fetch\` eagerly during server-side rendering with relative URL (${info}) — put your \`fetch\` calls inside \`onMount\` or a \`load\` function instead`
          );
        } else if (!warned) {
          console.warn(
            "Avoid calling `fetch` eagerly during server-side rendering — put your `fetch` calls inside `onMount` or a `load` function instead"
          );
          warned = true;
        }
        return fetch2(info, init2);
      };
      try {
        rendered = with_request_store(
          { event, state: event_state },
          () => options2.root.render(props, render_opts)
        );
      } finally {
        globalThis.fetch = fetch2;
        reset();
      }
    }
    for (const { node } of branch2) {
      for (const url of node.imports) modulepreloads.add(url);
      for (const url of node.stylesheets) stylesheets.add(url);
      for (const url of node.fonts) fonts.add(url);
      if (node.inline_styles && !client.inline) {
        Object.entries(await node.inline_styles()).forEach(([k2, v]) => inline_styles.set(k2, v));
      }
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  let head = "";
  let body2 = rendered.html;
  const csp = new Csp(options2.csp, {
    prerender: !!state2.prerendering
  });
  const prefixed = (path2) => {
    if (path2.startsWith("/")) {
      return base + path2;
    }
    return `${assets$1}/${path2}`;
  };
  const style = client.inline ? client.inline?.style : Array.from(inline_styles.values()).join("\n");
  if (style) {
    const attributes = [" data-sveltekit"];
    if (csp.style_needs_nonce) attributes.push(` nonce="${csp.nonce}"`);
    csp.add_style(style);
    head += `
	<style${attributes.join("")}>${style}</style>`;
  }
  for (const dep of stylesheets) {
    const path2 = prefixed(dep);
    const attributes = ['rel="stylesheet"'];
    if (inline_styles.has(dep)) {
      attributes.push("disabled", 'media="(max-width: 0)"');
    } else {
      if (resolve_opts.preload({ type: "css", path: path2 })) {
        link_headers.add(`<${encodeURI(path2)}>; rel="preload"; as="style"; nopush`);
      }
    }
    head += `
		<link href="${path2}" ${attributes.join(" ")}>`;
  }
  for (const dep of fonts) {
    const path2 = prefixed(dep);
    if (resolve_opts.preload({ type: "font", path: path2 })) {
      const ext = dep.slice(dep.lastIndexOf(".") + 1);
      link_tags.add(`<link rel="preload" as="font" type="font/${ext}" href="${path2}" crossorigin>`);
      link_headers.add(
        `<${encodeURI(path2)}>; rel="preload"; as="font"; type="font/${ext}"; crossorigin; nopush`
      );
    }
  }
  const global = "__sveltekit_dev";
  const { data, chunks } = get_data(
    event,
    event_state,
    options2,
    branch2.map((b) => b.server_data),
    csp,
    global
  );
  if (page_config.ssr && page_config.csr) {
    body2 += `
			${fetched.map(
      (item) => serialize_data(item, resolve_opts.filterSerializedResponseHeaders, !!state2.prerendering)
    ).join("\n			")}`;
  }
  if (page_config.csr) {
    const route = manifest._.client.routes?.find((r) => r.id === event.route.id) ?? null;
    if (client.uses_env_dynamic_public && state2.prerendering) {
      modulepreloads.add(`${app_dir}/env.js`);
    }
    if (!client.inline) {
      const included_modulepreloads = Array.from(modulepreloads, (dep) => prefixed(dep)).filter(
        (path2) => resolve_opts.preload({ type: "js", path: path2 })
      );
      for (const path2 of included_modulepreloads) {
        link_headers.add(`<${encodeURI(path2)}>; rel="modulepreload"; nopush`);
        if (options2.preload_strategy !== "modulepreload") {
          head += `
		<link rel="preload" as="script" crossorigin="anonymous" href="${path2}">`;
        } else {
          link_tags.add(`<link rel="modulepreload" href="${path2}">`);
        }
      }
    }
    if (state2.prerendering && link_tags.size > 0) {
      head += Array.from(link_tags).map((tag2) => `
		${tag2}`).join("");
    }
    if (manifest._.client.routes && state2.prerendering && !state2.prerendering.fallback) {
      const pathname = add_resolution_suffix(event.url.pathname);
      state2.prerendering.dependencies.set(
        pathname,
        create_server_routing_response(route, event.params, new URL(pathname, event.url), manifest)
      );
    }
    const blocks = [];
    const load_env_eagerly = client.uses_env_dynamic_public && state2.prerendering;
    const properties = [`base: ${base_expression}`];
    if (assets) {
      properties.push(`assets: ${s(assets)}`);
    }
    if (client.uses_env_dynamic_public) {
      properties.push(`env: ${load_env_eagerly ? "null" : s(public_env)}`);
    }
    if (chunks) {
      blocks.push("const deferred = new Map();");
      properties.push(`defer: (id) => new Promise((fulfil, reject) => {
							deferred.set(id, { fulfil, reject });
						})`);
      let app_declaration = "";
      if (Object.keys(options2.hooks.transport).length > 0) {
        if (client.inline) {
          app_declaration = `const app = __sveltekit_${options2.version_hash}.app.app;`;
        } else if (client.app) {
          app_declaration = `const app = await import(${s(prefixed(client.app))});`;
        } else {
          app_declaration = `const { app } = await import(${s(prefixed(client.start))});`;
        }
      }
      const prelude = app_declaration ? `${app_declaration}
							const [data, error] = fn(app);` : `const [data, error] = fn();`;
      properties.push(`resolve: async (id, fn) => {
							${prelude}

							const try_to_resolve = () => {
								if (!deferred.has(id)) {
									setTimeout(try_to_resolve, 0);
									return;
								}
								const { fulfil, reject } = deferred.get(id);
								deferred.delete(id);
								if (error) reject(error);
								else fulfil(data);
							}
							try_to_resolve();
						}`);
    }
    const { remote_data } = event_state;
    if (remote_data) {
      const remote = {};
      for (const key2 in remote_data) {
        remote[key2] = await remote_data[key2];
      }
      const replacer = (thing) => {
        for (const key2 in options2.hooks.transport) {
          const encoded = options2.hooks.transport[key2].encode(thing);
          if (encoded) {
            return `app.decode('${key2}', ${devalue.uneval(encoded, replacer)})`;
          }
        }
      };
      properties.push(`data: ${devalue.uneval(remote, replacer)}`);
    }
    blocks.push(`${global} = {
						${properties.join(",\n						")}
					};`);
    const args = ["element"];
    blocks.push("const element = document.currentScript.parentElement;");
    if (page_config.ssr) {
      const serialized = { form: "null", error: "null" };
      if (form_value) {
        serialized.form = uneval_action_response(
          form_value,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        );
      }
      if (error2) {
        serialized.error = devalue.uneval(error2);
      }
      const hydrate2 = [
        `node_ids: [${branch2.map(({ node }) => node.index).join(", ")}]`,
        `data: ${data}`,
        `form: ${serialized.form}`,
        `error: ${serialized.error}`
      ];
      if (status !== 200) {
        hydrate2.push(`status: ${status}`);
      }
      if (manifest._.client.routes) {
        if (route) {
          const stringified = generate_route_object(route, event.url, manifest).replaceAll(
            "\n",
            "\n							"
          );
          hydrate2.push(`params: ${devalue.uneval(event.params)}`, `server_route: ${stringified}`);
        }
      } else if (options2.embedded) {
        hydrate2.push(`params: ${devalue.uneval(event.params)}`, `route: ${s(event.route)}`);
      }
      const indent2 = "	".repeat(load_env_eagerly ? 7 : 6);
      args.push(`{
${indent2}	${hydrate2.join(`,
${indent2}	`)}
${indent2}}`);
    }
    const boot = client.inline ? `${client.inline.script}

					__sveltekit_${options2.version_hash}.app.start(${args.join(", ")});` : client.app ? `Promise.all([
						import(${s(prefixed(client.start))}),
						import(${s(prefixed(client.app))})
					]).then(([kit, app]) => {
						kit.start(app, ${args.join(", ")});
					});` : `import(${s(prefixed(client.start))}).then((app) => {
						app.start(${args.join(", ")})
					});`;
    if (load_env_eagerly) {
      blocks.push(`import(${s(`${base$1}/${app_dir}/env.js`)}).then(({ env }) => {
						${global}.env = env;

						${boot.replace(/\n/g, "\n	")}
					});`);
    } else {
      blocks.push(boot);
    }
    if (options2.service_worker) {
      let opts = ", { type: 'module' }";
      if (options2.service_worker_options != null) {
        const service_worker_options = { ...options2.service_worker_options };
        {
          service_worker_options.type = "module";
        }
        opts = `, ${s(service_worker_options)}`;
      }
      blocks.push(`if ('serviceWorker' in navigator) {
						addEventListener('load', function () {
							navigator.serviceWorker.register('${prefixed("service-worker.js")}'${opts});
						});
					}`);
    }
    const init_app = `
				{
					${blocks.join("\n\n					")}
				}
			`;
    csp.add_script(init_app);
    body2 += `
			<script${csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ""}>${init_app}<\/script>
		`;
  }
  const headers2 = new Headers({
    "x-sveltekit-page": "true",
    "content-type": "text/html"
  });
  if (state2.prerendering) {
    const http_equiv = [];
    const csp_headers = csp.csp_provider.get_meta();
    if (csp_headers) {
      http_equiv.push(csp_headers);
    }
    if (state2.prerendering.cache) {
      http_equiv.push(`<meta http-equiv="cache-control" content="${state2.prerendering.cache}">`);
    }
    if (http_equiv.length > 0) {
      head = http_equiv.join("\n") + head;
    }
  } else {
    const csp_header = csp.csp_provider.get_header();
    if (csp_header) {
      headers2.set("content-security-policy", csp_header);
    }
    const report_only_header = csp.report_only_provider.get_header();
    if (report_only_header) {
      headers2.set("content-security-policy-report-only", report_only_header);
    }
    if (link_headers.size) {
      headers2.set("link", Array.from(link_headers).join(", "));
    }
  }
  head += rendered.head;
  const html2 = options2.templates.app({
    head,
    body: body2,
    assets: assets$1,
    nonce: (
      /** @type {string} */
      csp.nonce
    ),
    env: public_env
  });
  const transformed = await resolve_opts.transformPageChunk({
    html: html2,
    done: true
  }) || "";
  if (!chunks) {
    headers2.set("etag", `"${hash(transformed)}"`);
  }
  {
    if (page_config.csr) {
      if (transformed.split("<!--").length < html2.split("<!--").length) {
        console.warn(
          "\x1B[1m\x1B[31mRemoving comments in transformPageChunk can break Svelte's hydration\x1B[39m\x1B[22m"
        );
      }
    } else {
      if (chunks) {
        console.warn(
          "\x1B[1m\x1B[31mReturning promises from server `load` functions will only work if `csr === true`\x1B[39m\x1B[22m"
        );
      }
    }
  }
  return !chunks ? text(transformed, {
    status,
    headers: headers2
  }) : new Response(
    new ReadableStream({
      async start(controller2) {
        controller2.enqueue(text_encoder.encode(transformed + "\n"));
        for await (const chunk2 of chunks) {
          controller2.enqueue(text_encoder.encode(chunk2));
        }
        controller2.close();
      },
      type: "bytes"
    }),
    {
      headers: headers2
    }
  );
}
function get_data(event, event_state, options2, nodes, csp, global) {
  let promise_id = 1;
  let count2 = 0;
  const { iterator, push: push2, done } = create_async_iterator();
  function replacer(thing) {
    if (typeof thing?.then === "function") {
      const id = promise_id++;
      count2 += 1;
      thing.then(
        /** @param {any} data */
        (data) => ({ data })
      ).catch(
        /** @param {any} error */
        async (error2) => ({
          error: await handle_error_and_jsonify(event, event_state, options2, error2)
        })
      ).then(
        /**
         * @param {{data: any; error: any}} result
         */
        async ({ data, error: error2 }) => {
          count2 -= 1;
          let str;
          try {
            str = devalue.uneval(error2 ? [, error2] : [data], replacer);
          } catch {
            error2 = await handle_error_and_jsonify(
              event,
              event_state,
              options2,
              new Error(`Failed to serialize promise while rendering ${event.route.id}`)
            );
            data = void 0;
            str = devalue.uneval([, error2], replacer);
          }
          const nonce = csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : "";
          push2(
            `<script${nonce}>${global}.resolve(${id}, ${str.includes("app.decode") ? `(app) => ${str}` : `() => ${str}`})<\/script>
`
          );
          if (count2 === 0) done();
        }
      );
      return `${global}.defer(${id})`;
    } else {
      for (const key2 in options2.hooks.transport) {
        const encoded = options2.hooks.transport[key2].encode(thing);
        if (encoded) {
          return `app.decode('${key2}', ${devalue.uneval(encoded, replacer)})`;
        }
      }
    }
  }
  try {
    const strings = nodes.map((node) => {
      if (!node) return "null";
      const payload = { type: "data", data: node.data, uses: serialize_uses(node) };
      if (node.slash) payload.slash = node.slash;
      return devalue.uneval(payload, replacer);
    });
    return {
      data: `[${strings.join(",")}]`,
      chunks: count2 > 0 ? iterator : null
    };
  } catch (e) {
    e.path = e.path.slice(1);
    throw new Error(clarify_devalue_error(
      event,
      /** @type {any} */
      e
    ));
  }
}
function validator(expected) {
  function validate(module, file) {
    if (!module) return;
    for (const key2 in module) {
      if (key2[0] === "_" || expected.has(key2)) continue;
      const values = [...expected.values()];
      const hint = hint_for_supported_files(key2, file?.slice(file.lastIndexOf("."))) ?? `valid exports are ${values.join(", ")}, or anything with a '_' prefix`;
      throw new Error(`Invalid export '${key2}'${file ? ` in ${file}` : ""} (${hint})`);
    }
  }
  return validate;
}
function hint_for_supported_files(key2, ext = ".js") {
  const supported_files = [];
  if (valid_layout_exports.has(key2)) {
    supported_files.push(`+layout${ext}`);
  }
  if (valid_page_exports.has(key2)) {
    supported_files.push(`+page${ext}`);
  }
  if (valid_layout_server_exports.has(key2)) {
    supported_files.push(`+layout.server${ext}`);
  }
  if (valid_page_server_exports.has(key2)) {
    supported_files.push(`+page.server${ext}`);
  }
  if (valid_server_exports.has(key2)) {
    supported_files.push(`+server${ext}`);
  }
  if (supported_files.length > 0) {
    return `'${key2}' is a valid export in ${supported_files.slice(0, -1).join(", ")}${supported_files.length > 1 ? " or " : ""}${supported_files.at(-1)}`;
  }
}
const valid_layout_exports = /* @__PURE__ */ new Set([
  "load",
  "prerender",
  "csr",
  "ssr",
  "trailingSlash",
  "config"
]);
const valid_page_exports = /* @__PURE__ */ new Set([...valid_layout_exports, "entries"]);
const valid_layout_server_exports = /* @__PURE__ */ new Set([...valid_layout_exports]);
const valid_page_server_exports = /* @__PURE__ */ new Set([...valid_layout_server_exports, "actions", "entries"]);
const valid_server_exports = /* @__PURE__ */ new Set([
  "GET",
  "POST",
  "PATCH",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "fallback",
  "prerender",
  "trailingSlash",
  "config",
  "entries"
]);
const validate_layout_exports = validator(valid_layout_exports);
const validate_page_exports = validator(valid_page_exports);
const validate_layout_server_exports = validator(valid_layout_server_exports);
const validate_page_server_exports = validator(valid_page_server_exports);
const validate_server_exports = validator(valid_server_exports);
class PageNodes {
  data;
  /**
   * @param {Array<import('types').SSRNode | undefined>} nodes
   */
  constructor(nodes) {
    this.data = nodes;
  }
  layouts() {
    return this.data.slice(0, -1);
  }
  page() {
    return this.data.at(-1);
  }
  validate() {
    for (const layout of this.layouts()) {
      if (layout) {
        validate_layout_server_exports(
          layout.server,
          /** @type {string} */
          layout.server_id
        );
        validate_layout_exports(
          layout.universal,
          /** @type {string} */
          layout.universal_id
        );
      }
    }
    const page2 = this.page();
    if (page2) {
      validate_page_server_exports(
        page2.server,
        /** @type {string} */
        page2.server_id
      );
      validate_page_exports(
        page2.universal,
        /** @type {string} */
        page2.universal_id
      );
    }
  }
  /**
   * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash'} Option
   * @param {Option} option
   * @returns {Value | undefined}
   */
  #get_option(option) {
    return this.data.reduce(
      (value, node) => {
        return node?.universal?.[option] ?? node?.server?.[option] ?? value;
      },
      /** @type {Value | undefined} */
      void 0
    );
  }
  csr() {
    return this.#get_option("csr") ?? true;
  }
  ssr() {
    return this.#get_option("ssr") ?? true;
  }
  prerender() {
    return this.#get_option("prerender") ?? false;
  }
  trailing_slash() {
    return this.#get_option("trailingSlash") ?? "never";
  }
  get_config() {
    let current = {};
    for (const node of this.data) {
      if (!node?.universal?.config && !node?.server?.config) continue;
      current = {
        ...current,
        // TODO: should we override the server config value with the universal value similar to other page options?
        ...node?.universal?.config,
        ...node?.server?.config
      };
    }
    return Object.keys(current).length ? current : void 0;
  }
  should_prerender_data() {
    return this.data.some(
      // prerender in case of trailingSlash because the client retrieves that value from the server
      (node) => node?.server?.load || node?.server?.trailingSlash !== void 0
    );
  }
}
async function respond_with_error({
  event,
  event_state,
  options: options2,
  manifest,
  state: state2,
  status,
  error: error2,
  resolve_opts
}) {
  if (event.request.headers.get("x-sveltekit-error")) {
    return static_error_page(
      options2,
      status,
      /** @type {Error} */
      error2.message
    );
  }
  const fetched = [];
  try {
    const branch2 = [];
    const default_layout = await manifest._.nodes[0]();
    const nodes = new PageNodes([default_layout]);
    const ssr = nodes.ssr();
    const csr = nodes.csr();
    if (ssr) {
      state2.error = true;
      const server_data_promise = load_server_data({
        event,
        event_state,
        state: state2,
        node: default_layout,
        // eslint-disable-next-line @typescript-eslint/require-await
        parent: async () => ({})
      });
      const server_data = await server_data_promise;
      const data = await load_data({
        event,
        event_state,
        fetched,
        node: default_layout,
        // eslint-disable-next-line @typescript-eslint/require-await
        parent: async () => ({}),
        resolve_opts,
        server_data_promise,
        state: state2,
        csr
      });
      branch2.push(
        {
          node: default_layout,
          server_data,
          data
        },
        {
          node: await manifest._.nodes[1](),
          // 1 is always the root error
          data: null,
          server_data: null
        }
      );
    }
    return await render_response({
      options: options2,
      manifest,
      state: state2,
      page_config: {
        ssr,
        csr
      },
      status,
      error: await handle_error_and_jsonify(event, event_state, options2, error2),
      branch: branch2,
      fetched,
      event,
      event_state,
      resolve_opts
    });
  } catch (e) {
    if (e instanceof Redirect) {
      return redirect_response(e.status, e.location);
    }
    return static_error_page(
      options2,
      get_status(e),
      (await handle_error_and_jsonify(event, event_state, options2, e)).message
    );
  }
}
function once$1(fn) {
  let done = false;
  let result;
  return () => {
    if (done) return result;
    done = true;
    return result = fn();
  };
}
async function render_data(event, event_state, route, options2, manifest, state2, invalidated_data_nodes, trailing_slash) {
  if (!route.page) {
    return new Response(void 0, {
      status: 404
    });
  }
  try {
    const node_ids = [...route.page.layouts, route.page.leaf];
    const invalidated = invalidated_data_nodes ?? node_ids.map(() => true);
    let aborted = false;
    const url = new URL(event.url);
    url.pathname = normalize_path(url.pathname, trailing_slash);
    const new_event = { ...event, url };
    const functions = node_ids.map((n2, i) => {
      return once$1(async () => {
        try {
          if (aborted) {
            return (
              /** @type {import('types').ServerDataSkippedNode} */
              {
                type: "skip"
              }
            );
          }
          const node = n2 == void 0 ? n2 : await manifest._.nodes[n2]();
          return load_server_data({
            event: new_event,
            event_state,
            state: state2,
            node,
            parent: async () => {
              const data2 = {};
              for (let j2 = 0; j2 < i; j2 += 1) {
                const parent2 = (
                  /** @type {import('types').ServerDataNode | null} */
                  await functions[j2]()
                );
                if (parent2) {
                  Object.assign(data2, parent2.data);
                }
              }
              return data2;
            }
          });
        } catch (e) {
          aborted = true;
          throw e;
        }
      });
    });
    const promises = functions.map(async (fn, i) => {
      if (!invalidated[i]) {
        return (
          /** @type {import('types').ServerDataSkippedNode} */
          {
            type: "skip"
          }
        );
      }
      return fn();
    });
    let length = promises.length;
    const nodes = await Promise.all(
      promises.map(
        (p2, i) => p2.catch(async (error2) => {
          if (error2 instanceof Redirect) {
            throw error2;
          }
          length = Math.min(length, i + 1);
          return (
            /** @type {import('types').ServerErrorNode} */
            {
              type: "error",
              error: await handle_error_and_jsonify(event, event_state, options2, error2),
              status: error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : void 0
            }
          );
        })
      )
    );
    const { data, chunks } = get_data_json(event, event_state, options2, nodes);
    if (!chunks) {
      return json_response(data);
    }
    return new Response(
      new ReadableStream({
        async start(controller2) {
          controller2.enqueue(text_encoder.encode(data));
          for await (const chunk2 of chunks) {
            controller2.enqueue(text_encoder.encode(chunk2));
          }
          controller2.close();
        },
        type: "bytes"
      }),
      {
        headers: {
          // we use a proprietary content type to prevent buffering.
          // the `text` prefix makes it inspectable
          "content-type": "text/sveltekit-data",
          "cache-control": "private, no-store"
        }
      }
    );
  } catch (e) {
    const error2 = normalize_error(e);
    if (error2 instanceof Redirect) {
      return redirect_json_response(error2);
    } else {
      return json_response(await handle_error_and_jsonify(event, event_state, options2, error2), 500);
    }
  }
}
function json_response(json2, status = 200) {
  return text(typeof json2 === "string" ? json2 : JSON.stringify(json2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "private, no-store"
    }
  });
}
function redirect_json_response(redirect) {
  return json_response(
    /** @type {import('types').ServerRedirectNode} */
    {
      type: "redirect",
      location: redirect.location
    }
  );
}
function get_data_json(event, event_state, options2, nodes) {
  let promise_id = 1;
  let count2 = 0;
  const { iterator, push: push2, done } = create_async_iterator();
  const reducers = {
    ...Object.fromEntries(
      Object.entries(options2.hooks.transport).map(([key2, value]) => [key2, value.encode])
    ),
    /** @param {any} thing */
    Promise: (thing) => {
      if (typeof thing?.then === "function") {
        const id = promise_id++;
        count2 += 1;
        let key2 = "data";
        thing.catch(
          /** @param {any} e */
          async (e) => {
            key2 = "error";
            return handle_error_and_jsonify(
              event,
              event_state,
              options2,
              /** @type {any} */
              e
            );
          }
        ).then(
          /** @param {any} value */
          async (value) => {
            let str;
            try {
              str = devalue.stringify(value, reducers);
            } catch {
              const error2 = await handle_error_and_jsonify(
                event,
                event_state,
                options2,
                new Error(`Failed to serialize promise while rendering ${event.route.id}`)
              );
              key2 = "error";
              str = devalue.stringify(error2, reducers);
            }
            count2 -= 1;
            push2(`{"type":"chunk","id":${id},"${key2}":${str}}
`);
            if (count2 === 0) done();
          }
        );
        return id;
      }
    }
  };
  try {
    const strings = nodes.map((node) => {
      if (!node) return "null";
      if (node.type === "error" || node.type === "skip") {
        return JSON.stringify(node);
      }
      return `{"type":"data","data":${devalue.stringify(node.data, reducers)},"uses":${JSON.stringify(
        serialize_uses(node)
      )}${node.slash ? `,"slash":${JSON.stringify(node.slash)}` : ""}}`;
    });
    return {
      data: `{"type":"data","nodes":[${strings.join(",")}]}
`,
      chunks: count2 > 0 ? iterator : null
    };
  } catch (e) {
    e.path = "data" + e.path;
    throw new Error(clarify_devalue_error(
      event,
      /** @type {any} */
      e
    ));
  }
}
async function handle_remote_call(event, state2, options2, manifest, id) {
  return record_span({
    name: "sveltekit.remote.call",
    attributes: {},
    fn: (current) => {
      const traced_event = merge_tracing(event, current);
      return with_request_store(
        { event: traced_event, state: state2 },
        () => handle_remote_call_internal(traced_event, state2, options2, manifest, id)
      );
    }
  });
}
async function handle_remote_call_internal(event, state2, options2, manifest, id) {
  const [hash2, name, prerender_args] = id.split("/");
  const remotes = manifest._.remotes;
  if (!remotes[hash2]) error(404);
  const module = await remotes[hash2]();
  const fn = module[name];
  if (!fn) error(404);
  const info = fn.__;
  const transport = options2.hooks.transport;
  event.tracing.current.setAttributes({
    "sveltekit.remote.call.type": info.type,
    "sveltekit.remote.call.name": info.name
  });
  let form_client_refreshes;
  try {
    if (info.type === "form") {
      if (!is_form_content_type(event.request)) {
        throw new SvelteKitError(
          415,
          "Unsupported Media Type",
          `Form actions expect form-encoded data — received ${event.request.headers.get(
            "content-type"
          )}`
        );
      }
      const form_data = await event.request.formData();
      form_client_refreshes = JSON.parse(
        /** @type {string} */
        form_data.get("sveltekit:remote_refreshes") ?? "[]"
      );
      form_data.delete("sveltekit:remote_refreshes");
      const fn2 = info.fn;
      const data2 = await with_request_store({ event, state: state2 }, () => fn2(form_data));
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "result",
          result: stringify$1(data2, transport),
          refreshes: await serialize_refreshes(
            /** @type {string[]} */
            form_client_refreshes
          )
        }
      );
    }
    if (info.type === "command") {
      const { payload: payload2, refreshes } = await event.request.json();
      const arg = parse_remote_arg(payload2, transport);
      const data2 = await with_request_store({ event, state: state2 }, () => fn(arg));
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "result",
          result: stringify$1(data2, transport),
          refreshes: await serialize_refreshes(refreshes)
        }
      );
    }
    const payload = info.type === "prerender" ? prerender_args : (
      /** @type {string} */
      // new URL(...) necessary because we're hiding the URL from the user in the event object
      new URL(event.request.url).searchParams.get("payload")
    );
    const data = await with_request_store(
      { event, state: state2 },
      () => fn(parse_remote_arg(payload, transport))
    );
    return json(
      /** @type {RemoteFunctionResponse} */
      {
        type: "result",
        result: stringify$1(data, transport)
      }
    );
  } catch (error2) {
    if (error2 instanceof Redirect) {
      return json({
        type: "redirect",
        location: error2.location,
        refreshes: await serialize_refreshes(form_client_refreshes ?? [])
      });
    }
    return json(
      /** @type {RemoteFunctionResponse} */
      {
        type: "error",
        error: await handle_error_and_jsonify(event, state2, options2, error2),
        status: error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : 500
      },
      {
        headers: {
          "cache-control": "private, no-store"
        }
      }
    );
  }
  async function serialize_refreshes(client_refreshes) {
    const refreshes = {
      ...state2.refreshes,
      ...Object.fromEntries(
        await Promise.all(
          client_refreshes.map(async (key2) => {
            const [hash3, name2, payload] = key2.split("/");
            const loader = manifest._.remotes[hash3];
            if (!loader) error(400, "Bad Request");
            const module2 = await loader();
            const fn2 = module2[name2];
            if (!fn2) error(400, "Bad Request");
            return [
              key2,
              await with_request_store(
                { event, state: state2 },
                () => fn2(parse_remote_arg(payload, transport))
              )
            ];
          })
        )
      )
    };
    return Object.keys(refreshes).length > 0 ? stringify$1(refreshes, transport) : void 0;
  }
}
async function handle_remote_form_post(event, state2, manifest, id) {
  return record_span({
    name: "sveltekit.remote.form.post",
    attributes: {},
    fn: (current) => {
      const traced_event = merge_tracing(event, current);
      return with_request_store(
        { event: traced_event, state: state2 },
        () => handle_remote_form_post_internal(traced_event, state2, manifest, id)
      );
    }
  });
}
async function handle_remote_form_post_internal(event, state2, manifest, id) {
  const [hash2, name, action_id] = id.split("/");
  const remotes = manifest._.remotes;
  const module = await remotes[hash2]?.();
  let form2 = (
    /** @type {RemoteForm<any>} */
    module?.[name]
  );
  if (!form2) {
    event.setHeaders({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: "GET"
    });
    return {
      type: "error",
      error: new SvelteKitError(
        405,
        "Method Not Allowed",
        `POST method not allowed. No form actions exist for ${`the page at ${event.route.id}`}`
      )
    };
  }
  if (action_id) {
    form2 = with_request_store({ event, state: state2 }, () => form2.for(JSON.parse(action_id)));
  }
  try {
    const form_data = await event.request.formData();
    const fn = (
      /** @type {RemoteInfo & { type: 'form' }} */
      /** @type {any} */
      form2.__.fn
    );
    await with_request_store({ event, state: state2 }, () => fn(form_data));
    return {
      type: "success",
      status: 200
    };
  } catch (e) {
    const err = normalize_error(e);
    if (err instanceof Redirect) {
      return {
        type: "redirect",
        status: err.status,
        location: err.location
      };
    }
    return {
      type: "error",
      error: check_incorrect_fail_use(err)
    };
  }
}
function get_remote_id(url) {
  return url.pathname.startsWith(`${base}/${app_dir}/remote/`) && url.pathname.replace(`${base}/${app_dir}/remote/`, "");
}
function get_remote_action(url) {
  return url.searchParams.get("/remote");
}
const MAX_DEPTH = 10;
async function render_page(event, event_state, page2, options2, manifest, state2, nodes, resolve_opts) {
  if (state2.depth > MAX_DEPTH) {
    return text(`Not found: ${event.url.pathname}`, {
      status: 404
      // TODO in some cases this should be 500. not sure how to differentiate
    });
  }
  if (is_action_json_request(event)) {
    const node = await manifest._.nodes[page2.leaf]();
    return handle_action_json_request(event, event_state, options2, node?.server);
  }
  try {
    const leaf_node = (
      /** @type {import('types').SSRNode} */
      nodes.page()
    );
    let status = 200;
    let action_result = void 0;
    if (is_action_request(event)) {
      const remote_id = get_remote_action(event.url);
      if (remote_id) {
        action_result = await handle_remote_form_post(event, event_state, manifest, remote_id);
      } else {
        action_result = await handle_action_request(event, event_state, leaf_node.server);
      }
      if (action_result?.type === "redirect") {
        return redirect_response(action_result.status, action_result.location);
      }
      if (action_result?.type === "error") {
        status = get_status(action_result.error);
      }
      if (action_result?.type === "failure") {
        status = action_result.status;
      }
    }
    const should_prerender = nodes.prerender();
    if (should_prerender) {
      const mod = leaf_node.server;
      if (mod?.actions) {
        throw new Error("Cannot prerender pages with actions");
      }
    } else if (state2.prerendering) {
      return new Response(void 0, {
        status: 204
      });
    }
    state2.prerender_default = should_prerender;
    const should_prerender_data = nodes.should_prerender_data();
    const data_pathname = add_data_suffix(event.url.pathname);
    const fetched = [];
    const ssr = nodes.ssr();
    const csr = nodes.csr();
    if (ssr === false && !(state2.prerendering && should_prerender_data)) {
      if (DEV && action_result && !event.request.headers.has("x-sveltekit-action")) {
        if (action_result.type === "error") {
          console.warn(
            "The form action returned an error, but +error.svelte wasn't rendered because SSR is off. To get the error page with CSR, enhance your form with `use:enhance`. See https://svelte.dev/docs/kit/form-actions#progressive-enhancement-use-enhance"
          );
        } else if (action_result.data) {
          console.warn(
            "The form action returned a value, but it isn't available in `page.form`, because SSR is off. To handle the returned value in CSR, enhance your form with `use:enhance`. See https://svelte.dev/docs/kit/form-actions#progressive-enhancement-use-enhance"
          );
        }
      }
      return await render_response({
        branch: [],
        fetched,
        page_config: {
          ssr: false,
          csr
        },
        status,
        error: null,
        event,
        event_state,
        options: options2,
        manifest,
        state: state2,
        resolve_opts
      });
    }
    const branch2 = [];
    let load_error = null;
    const server_promises = nodes.data.map((node, i) => {
      if (load_error) {
        throw load_error;
      }
      return Promise.resolve().then(async () => {
        try {
          if (node === leaf_node && action_result?.type === "error") {
            throw action_result.error;
          }
          return await load_server_data({
            event,
            event_state,
            state: state2,
            node,
            parent: async () => {
              const data = {};
              for (let j2 = 0; j2 < i; j2 += 1) {
                const parent2 = await server_promises[j2];
                if (parent2) Object.assign(data, parent2.data);
              }
              return data;
            }
          });
        } catch (e) {
          load_error = /** @type {Error} */
          e;
          throw load_error;
        }
      });
    });
    const load_promises = nodes.data.map((node, i) => {
      if (load_error) throw load_error;
      return Promise.resolve().then(async () => {
        try {
          return await load_data({
            event,
            event_state,
            fetched,
            node,
            parent: async () => {
              const data = {};
              for (let j2 = 0; j2 < i; j2 += 1) {
                Object.assign(data, await load_promises[j2]);
              }
              return data;
            },
            resolve_opts,
            server_data_promise: server_promises[i],
            state: state2,
            csr
          });
        } catch (e) {
          load_error = /** @type {Error} */
          e;
          throw load_error;
        }
      });
    });
    for (const p2 of server_promises) p2.catch(() => {
    });
    for (const p2 of load_promises) p2.catch(() => {
    });
    for (let i = 0; i < nodes.data.length; i += 1) {
      const node = nodes.data[i];
      if (node) {
        try {
          const server_data = await server_promises[i];
          const data = await load_promises[i];
          branch2.push({ node, server_data, data });
        } catch (e) {
          const err = normalize_error(e);
          if (err instanceof Redirect) {
            if (state2.prerendering && should_prerender_data) {
              const body2 = JSON.stringify({
                type: "redirect",
                location: err.location
              });
              state2.prerendering.dependencies.set(data_pathname, {
                response: text(body2),
                body: body2
              });
            }
            return redirect_response(err.status, err.location);
          }
          const status2 = get_status(err);
          const error2 = await handle_error_and_jsonify(event, event_state, options2, err);
          while (i--) {
            if (page2.errors[i]) {
              const index2 = (
                /** @type {number} */
                page2.errors[i]
              );
              const node2 = await manifest._.nodes[index2]();
              let j2 = i;
              while (!branch2[j2]) j2 -= 1;
              const layouts = compact(branch2.slice(0, j2 + 1));
              const nodes2 = new PageNodes(layouts.map((layout) => layout.node));
              return await render_response({
                event,
                event_state,
                options: options2,
                manifest,
                state: state2,
                resolve_opts,
                page_config: {
                  ssr: nodes2.ssr(),
                  csr: nodes2.csr()
                },
                status: status2,
                error: error2,
                branch: layouts.concat({
                  node: node2,
                  data: null,
                  server_data: null
                }),
                fetched
              });
            }
          }
          return static_error_page(options2, status2, error2.message);
        }
      } else {
        branch2.push(null);
      }
    }
    if (state2.prerendering && should_prerender_data) {
      let { data, chunks } = get_data_json(
        event,
        event_state,
        options2,
        branch2.map((node) => node?.server_data)
      );
      if (chunks) {
        for await (const chunk2 of chunks) {
          data += chunk2;
        }
      }
      state2.prerendering.dependencies.set(data_pathname, {
        response: text(data),
        body: data
      });
    }
    return await render_response({
      event,
      event_state,
      options: options2,
      manifest,
      state: state2,
      resolve_opts,
      page_config: {
        csr,
        ssr
      },
      status,
      error: null,
      branch: ssr === false ? [] : compact(branch2),
      action_result,
      fetched
    });
  } catch (e) {
    return await respond_with_error({
      event,
      event_state,
      options: options2,
      manifest,
      state: state2,
      status: 500,
      error: e,
      resolve_opts
    });
  }
}
const INVALID_COOKIE_CHARACTER_REGEX = /[\x00-\x1F\x7F()<>@,;:"/[\]?={} \t]/;
const cookie_paths = {};
const MAX_COOKIE_SIZE = 4129;
function validate_options(options2) {
  if (options2?.path === void 0) {
    throw new Error("You must specify a `path` when setting, deleting or serializing cookies");
  }
}
function generate_cookie_key(domain, path2, name) {
  return `${domain || ""}${path2}?${encodeURIComponent(name)}`;
}
function get_cookies(request, url) {
  const header = request.headers.get("cookie") ?? "";
  const initial_cookies = parse(header, { decode: (value) => value });
  let normalized_url;
  const new_cookies = /* @__PURE__ */ new Map();
  const defaults = {
    httpOnly: true,
    sameSite: "lax",
    secure: url.hostname === "localhost" && url.protocol === "http:" ? false : true
  };
  const cookies = {
    // The JSDoc param annotations appearing below for get, set and delete
    // are necessary to expose the `cookie` library types to
    // typescript users. `@type {import('@sveltejs/kit').Cookies}` above is not
    // sufficient to do so.
    /**
     * @param {string} name
     * @param {import('cookie').CookieParseOptions} [opts]
     */
    get(name, opts) {
      const best_match = Array.from(new_cookies.values()).filter((c) => {
        return c.name === name && domain_matches(url.hostname, c.options.domain) && path_matches(url.pathname, c.options.path);
      }).sort((a, b) => b.options.path.length - a.options.path.length)[0];
      if (best_match) {
        return best_match.options.maxAge === 0 ? void 0 : best_match.value;
      }
      const req_cookies = parse(header, { decode: opts?.decode });
      const cookie = req_cookies[name];
      if (!cookie) {
        const paths = Array.from(cookie_paths[name] ?? []).filter((path2) => {
          return path_matches(path2, url.pathname) && path2 !== url.pathname;
        });
        if (paths.length > 0) {
          console.warn(
            // prettier-ignore
            `'${name}' cookie does not exist for ${url.pathname}, but was previously set at ${conjoin([...paths])}. Did you mean to set its 'path' to '/' instead?`
          );
        }
      }
      return cookie;
    },
    /**
     * @param {import('cookie').CookieParseOptions} [opts]
     */
    getAll(opts) {
      const cookies2 = parse(header, { decode: opts?.decode });
      const lookup = /* @__PURE__ */ new Map();
      for (const c of new_cookies.values()) {
        if (domain_matches(url.hostname, c.options.domain) && path_matches(url.pathname, c.options.path)) {
          const existing = lookup.get(c.name);
          if (!existing || c.options.path.length > existing.options.path.length) {
            lookup.set(c.name, c);
          }
        }
      }
      for (const c of lookup.values()) {
        cookies2[c.name] = c.value;
      }
      return Object.entries(cookies2).map(([name, value]) => ({ name, value }));
    },
    /**
     * @param {string} name
     * @param {string} value
     * @param {import('./page/types.js').Cookie['options']} options
     */
    set(name, value, options2) {
      const illegal_characters = name.match(INVALID_COOKIE_CHARACTER_REGEX);
      if (illegal_characters) {
        console.warn(
          `The cookie name "${name}" will be invalid in SvelteKit 3.0 as it contains ${illegal_characters.join(
            " and "
          )}. See RFC 2616 for more details https://datatracker.ietf.org/doc/html/rfc2616#section-2.2`
        );
      }
      validate_options(options2);
      set_internal(name, value, { ...defaults, ...options2 });
    },
    /**
     * @param {string} name
     *  @param {import('./page/types.js').Cookie['options']} options
     */
    delete(name, options2) {
      validate_options(options2);
      cookies.set(name, "", { ...options2, maxAge: 0 });
    },
    /**
     * @param {string} name
     * @param {string} value
     *  @param {import('./page/types.js').Cookie['options']} options
     */
    serialize(name, value, options2) {
      validate_options(options2);
      let path2 = options2.path;
      if (!options2.domain || options2.domain === url.hostname) {
        if (!normalized_url) {
          throw new Error("Cannot serialize cookies until after the route is determined");
        }
        path2 = resolve(normalized_url, path2);
      }
      return serialize(name, value, { ...defaults, ...options2, path: path2 });
    }
  };
  function get_cookie_header(destination, header2) {
    const combined_cookies = {
      // cookies sent by the user agent have lowest precedence
      ...initial_cookies
    };
    for (const cookie of new_cookies.values()) {
      if (!domain_matches(destination.hostname, cookie.options.domain)) continue;
      if (!path_matches(destination.pathname, cookie.options.path)) continue;
      const encoder = cookie.options.encode || encodeURIComponent;
      combined_cookies[cookie.name] = encoder(cookie.value);
    }
    if (header2) {
      const parsed = parse(header2, { decode: (value) => value });
      for (const name in parsed) {
        combined_cookies[name] = parsed[name];
      }
    }
    return Object.entries(combined_cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  const internal_queue = [];
  function set_internal(name, value, options2) {
    if (!normalized_url) {
      internal_queue.push(() => set_internal(name, value, options2));
      return;
    }
    let path2 = options2.path;
    if (!options2.domain || options2.domain === url.hostname) {
      path2 = resolve(normalized_url, path2);
    }
    const cookie_key = generate_cookie_key(options2.domain, path2, name);
    const cookie = { name, value, options: { ...options2, path: path2 } };
    new_cookies.set(cookie_key, cookie);
    {
      const serialized = serialize(name, value, cookie.options);
      if (text_encoder.encode(serialized).byteLength > MAX_COOKIE_SIZE) {
        throw new Error(`Cookie "${name}" is too large, and will be discarded by the browser`);
      }
      cookie_paths[name] ??= /* @__PURE__ */ new Set();
      if (!value) {
        cookie_paths[name].delete(path2);
      } else {
        cookie_paths[name].add(path2);
      }
    }
  }
  function set_trailing_slash(trailing_slash) {
    normalized_url = normalize_path(url.pathname, trailing_slash);
    internal_queue.forEach((fn) => fn());
  }
  return { cookies, new_cookies, get_cookie_header, set_internal, set_trailing_slash };
}
function domain_matches(hostname, constraint) {
  if (!constraint) return true;
  const normalized = constraint[0] === "." ? constraint.slice(1) : constraint;
  if (hostname === normalized) return true;
  return hostname.endsWith("." + normalized);
}
function path_matches(path2, constraint) {
  if (!constraint) return true;
  const normalized = constraint.endsWith("/") ? constraint.slice(0, -1) : constraint;
  if (path2 === normalized) return true;
  return path2.startsWith(normalized + "/");
}
function add_cookies_to_headers(headers2, cookies) {
  for (const new_cookie of cookies) {
    const { name, value, options: options2 } = new_cookie;
    headers2.append("set-cookie", serialize(name, value, options2));
    if (options2.path.endsWith(".html")) {
      const path2 = add_data_suffix(options2.path);
      headers2.append("set-cookie", serialize(name, value, { ...options2, path: path2 }));
    }
  }
}
function conjoin(array2) {
  if (array2.length <= 2) return array2.join(" and ");
  return `${array2.slice(0, -1).join(", ")} and ${array2.at(-1)}`;
}
let read_implementation = null;
function set_read_implementation(fn) {
  read_implementation = fn;
}
function set_manifest(_) {
}
function create_fetch({ event, options: options2, manifest, state: state2, get_cookie_header, set_internal }) {
  const server_fetch = async (info, init2) => {
    const original_request = normalize_fetch_input(info, init2, event.url);
    let mode = (info instanceof Request ? info.mode : init2?.mode) ?? "cors";
    let credentials = (info instanceof Request ? info.credentials : init2?.credentials) ?? "same-origin";
    return options2.hooks.handleFetch({
      event,
      request: original_request,
      fetch: async (info2, init3) => {
        const request = normalize_fetch_input(info2, init3, event.url);
        const url = new URL(request.url);
        if (!request.headers.has("origin")) {
          request.headers.set("origin", event.url.origin);
        }
        if (info2 !== original_request) {
          mode = (info2 instanceof Request ? info2.mode : init3?.mode) ?? "cors";
          credentials = (info2 instanceof Request ? info2.credentials : init3?.credentials) ?? "same-origin";
        }
        if ((request.method === "GET" || request.method === "HEAD") && (mode === "no-cors" && url.origin !== event.url.origin || url.origin === event.url.origin)) {
          request.headers.delete("origin");
        }
        if (url.origin !== event.url.origin) {
          if (`.${url.hostname}`.endsWith(`.${event.url.hostname}`) && credentials !== "omit") {
            const cookie = get_cookie_header(url, request.headers.get("cookie"));
            if (cookie) request.headers.set("cookie", cookie);
          }
          return fetch(request);
        }
        const prefix = assets || base;
        const decoded = decodeURIComponent(url.pathname);
        const filename = (decoded.startsWith(prefix) ? decoded.slice(prefix.length) : decoded).slice(1);
        const filename_html = `${filename}/index.html`;
        const is_asset = manifest.assets.has(filename) || filename in manifest._.server_assets;
        const is_asset_html = manifest.assets.has(filename_html) || filename_html in manifest._.server_assets;
        if (is_asset || is_asset_html) {
          const file = is_asset ? filename : filename_html;
          if (state2.read) {
            const type = is_asset ? manifest.mimeTypes[filename.slice(filename.lastIndexOf("."))] : "text/html";
            return new Response(state2.read(file), {
              headers: type ? { "content-type": type } : {}
            });
          } else if (read_implementation && file in manifest._.server_assets) {
            const length = manifest._.server_assets[file];
            const type = manifest.mimeTypes[file.slice(file.lastIndexOf("."))];
            return new Response(read_implementation(file), {
              headers: {
                "Content-Length": "" + length,
                "Content-Type": type
              }
            });
          }
          return await fetch(request);
        }
        if (has_prerendered_path(manifest, base + decoded)) {
          return await fetch(request);
        }
        if (credentials !== "omit") {
          const cookie = get_cookie_header(url, request.headers.get("cookie"));
          if (cookie) {
            request.headers.set("cookie", cookie);
          }
          const authorization = event.request.headers.get("authorization");
          if (authorization && !request.headers.has("authorization")) {
            request.headers.set("authorization", authorization);
          }
        }
        if (!request.headers.has("accept")) {
          request.headers.set("accept", "*/*");
        }
        if (!request.headers.has("accept-language")) {
          request.headers.set(
            "accept-language",
            /** @type {string} */
            event.request.headers.get("accept-language")
          );
        }
        const response = await internal_fetch(request, options2, manifest, state2);
        const set_cookie = response.headers.get("set-cookie");
        if (set_cookie) {
          for (const str of set_cookie_parser.splitCookiesString(set_cookie)) {
            const { name, value, ...options3 } = set_cookie_parser.parseString(str, {
              decodeValues: false
            });
            const path2 = options3.path ?? (url.pathname.split("/").slice(0, -1).join("/") || "/");
            set_internal(name, value, {
              path: path2,
              encode: (value2) => value2,
              .../** @type {import('cookie').CookieSerializeOptions} */
              options3
            });
          }
        }
        return response;
      }
    });
  };
  return (input, init2) => {
    const response = server_fetch(input, init2);
    response.catch(() => {
    });
    return response;
  };
}
function normalize_fetch_input(info, init2, url) {
  if (info instanceof Request) {
    return info;
  }
  return new Request(typeof info === "string" ? new URL(info, url) : info, init2);
}
async function internal_fetch(request, options2, manifest, state2) {
  if (request.signal) {
    if (request.signal.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    let remove_abort_listener = () => {
    };
    const abort_promise = new Promise((_, reject) => {
      const on_abort = () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      };
      request.signal.addEventListener("abort", on_abort, { once: true });
      remove_abort_listener = () => request.signal.removeEventListener("abort", on_abort);
    });
    const result = await Promise.race([
      respond(request, options2, manifest, {
        ...state2,
        depth: state2.depth + 1
      }),
      abort_promise
    ]);
    remove_abort_listener();
    return result;
  } else {
    return await respond(request, options2, manifest, {
      ...state2,
      depth: state2.depth + 1
    });
  }
}
let body;
let etag;
let headers;
function get_public_env(request) {
  body ??= `export const env=${JSON.stringify(public_env)}`;
  etag ??= `W/${Date.now()}`;
  headers ??= new Headers({
    "content-type": "application/javascript; charset=utf-8",
    etag
  });
  if (request.headers.get("if-none-match") === etag) {
    return new Response(void 0, { status: 304, headers });
  }
  return new Response(body, { headers });
}
const VALID_CACHE_CONTROL_DIRECTIVES = /* @__PURE__ */ new Set([
  "max-age",
  "public",
  "private",
  "no-cache",
  "no-store",
  "must-revalidate",
  "proxy-revalidate",
  "s-maxage",
  "immutable",
  "stale-while-revalidate",
  "stale-if-error",
  "no-transform",
  "only-if-cached",
  "max-stale",
  "min-fresh"
]);
const CONTENT_TYPE_PATTERN = /^(application|audio|example|font|haptics|image|message|model|multipart|text|video|x-[a-z]+)\/[-+.\w]+$/i;
const HEADER_VALIDATORS = {
  "cache-control": (value) => {
    const error_suffix = `(While parsing "${value}".)`;
    const parts = value.split(",").map((part) => part.trim());
    if (parts.some((part) => !part)) {
      throw new Error(`\`cache-control\` header contains empty directives. ${error_suffix}`);
    }
    const directives = parts.map((part) => part.split("=")[0].toLowerCase());
    const invalid = directives.find((directive) => !VALID_CACHE_CONTROL_DIRECTIVES.has(directive));
    if (invalid) {
      throw new Error(
        `Invalid cache-control directive "${invalid}". Did you mean one of: ${[...VALID_CACHE_CONTROL_DIRECTIVES].join(", ")}? ${error_suffix}`
      );
    }
  },
  "content-type": (value) => {
    const type = value.split(";")[0].trim();
    const error_suffix = `(While parsing "${value}".)`;
    if (!CONTENT_TYPE_PATTERN.test(type)) {
      throw new Error(`Invalid content-type value "${type}". ${error_suffix}`);
    }
  }
};
function validateHeaders(headers2) {
  for (const [key2, value] of Object.entries(headers2)) {
    const validator2 = HEADER_VALIDATORS[key2.toLowerCase()];
    try {
      validator2?.(value);
    } catch (error2) {
      if (error2 instanceof Error) {
        console.warn(`[SvelteKit] ${error2.message}`);
      }
    }
  }
}
const default_transform = ({ html: html2 }) => html2;
const default_filter = () => false;
const default_preload = ({ type }) => type === "js" || type === "css";
const page_methods = /* @__PURE__ */ new Set(["GET", "HEAD", "POST"]);
const allowed_page_methods = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
let warned_on_devtools_json_request = false;
const respond = propagate_context(internal_respond);
async function internal_respond(request, options2, manifest, state2) {
  const url = new URL(request.url);
  const is_route_resolution_request = has_resolution_suffix(url.pathname);
  const is_data_request = has_data_suffix(url.pathname);
  const remote_id = get_remote_id(url);
  const request_origin = request.headers.get("origin");
  if (remote_id) {
    if (request.method !== "GET" && request_origin !== url.origin) {
      const message = "Cross-site remote requests are forbidden";
      return json({ message }, { status: 403 });
    }
  } else if (options2.csrf_check_origin) {
    const forbidden = is_form_content_type(request) && (request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE") && request_origin !== url.origin && (!request_origin || !options2.csrf_trusted_origins.includes(request_origin));
    if (forbidden) {
      const message = `Cross-site ${request.method} form submissions are forbidden`;
      const opts = { status: 403 };
      if (request.headers.get("accept") === "application/json") {
        return json({ message }, opts);
      }
      return text(message, opts);
    }
  }
  if (options2.hash_routing && url.pathname !== base + "/" && url.pathname !== "/[fallback]") {
    return text("Not found", { status: 404 });
  }
  let invalidated_data_nodes;
  if (is_route_resolution_request) {
    url.pathname = strip_resolution_suffix(url.pathname);
  } else if (is_data_request) {
    url.pathname = strip_data_suffix(url.pathname) + (url.searchParams.get(TRAILING_SLASH_PARAM) === "1" ? "/" : "") || "/";
    url.searchParams.delete(TRAILING_SLASH_PARAM);
    invalidated_data_nodes = url.searchParams.get(INVALIDATED_PARAM)?.split("").map((node) => node === "1");
    url.searchParams.delete(INVALIDATED_PARAM);
  } else if (remote_id) {
    url.pathname = base;
    url.search = "";
  }
  const headers2 = {};
  const { cookies, new_cookies, get_cookie_header, set_internal, set_trailing_slash } = get_cookies(
    request,
    url
  );
  const event_state = {
    prerendering: state2.prerendering,
    transport: options2.hooks.transport,
    handleValidationError: options2.hooks.handleValidationError,
    tracing: {
      record_span
    }
  };
  const event = {
    cookies,
    // @ts-expect-error `fetch` needs to be created after the `event` itself
    fetch: null,
    getClientAddress: state2.getClientAddress || (() => {
      throw new Error(
        `${"svelte-adapter-bun"} does not specify getClientAddress. Please raise an issue`
      );
    }),
    locals: {},
    params: {},
    platform: state2.platform,
    request,
    route: { id: null },
    setHeaders: (new_headers) => {
      {
        validateHeaders(new_headers);
      }
      for (const key2 in new_headers) {
        const lower = key2.toLowerCase();
        const value = new_headers[key2];
        if (lower === "set-cookie") {
          throw new Error(
            "Use `event.cookies.set(name, value, options)` instead of `event.setHeaders` to set cookies"
          );
        } else if (lower in headers2) {
          throw new Error(`"${key2}" header is already set`);
        } else {
          headers2[lower] = value;
          if (state2.prerendering && lower === "cache-control") {
            state2.prerendering.cache = /** @type {string} */
            value;
          }
        }
      }
    },
    url,
    isDataRequest: is_data_request,
    isSubRequest: state2.depth > 0,
    isRemoteRequest: !!remote_id
  };
  event.fetch = create_fetch({
    event,
    options: options2,
    manifest,
    state: state2,
    get_cookie_header,
    set_internal
  });
  if (state2.emulator?.platform) {
    event.platform = await state2.emulator.platform({
      config: {},
      prerender: !!state2.prerendering?.fallback
    });
  }
  let resolved_path = url.pathname;
  if (!remote_id) {
    const prerendering_reroute_state = state2.prerendering?.inside_reroute;
    try {
      if (state2.prerendering) state2.prerendering.inside_reroute = true;
      resolved_path = await options2.hooks.reroute({ url: new URL(url), fetch: event.fetch }) ?? url.pathname;
    } catch {
      return text("Internal Server Error", {
        status: 500
      });
    } finally {
      if (state2.prerendering) state2.prerendering.inside_reroute = prerendering_reroute_state;
    }
  }
  try {
    resolved_path = decode_pathname(resolved_path);
  } catch {
    return text("Malformed URI", { status: 400 });
  }
  if (resolved_path !== url.pathname && !state2.prerendering?.fallback && has_prerendered_path(manifest, resolved_path)) {
    const url2 = new URL(request.url);
    url2.pathname = is_data_request ? add_data_suffix(resolved_path) : is_route_resolution_request ? add_resolution_suffix(resolved_path) : resolved_path;
    const response = await fetch(url2, request);
    const headers22 = new Headers(response.headers);
    if (headers22.has("content-encoding")) {
      headers22.delete("content-encoding");
      headers22.delete("content-length");
    }
    return new Response(response.body, {
      headers: headers22,
      status: response.status,
      statusText: response.statusText
    });
  }
  let route = null;
  if (base && !state2.prerendering?.fallback) {
    if (!resolved_path.startsWith(base)) {
      return text("Not found", { status: 404 });
    }
    resolved_path = resolved_path.slice(base.length) || "/";
  }
  if (is_route_resolution_request) {
    return resolve_route(resolved_path, new URL(request.url), manifest);
  }
  if (resolved_path === `/${app_dir}/env.js`) {
    return get_public_env(request);
  }
  if (!remote_id && resolved_path.startsWith(`/${app_dir}`)) {
    const headers22 = new Headers();
    headers22.set("cache-control", "public, max-age=0, must-revalidate");
    return text("Not found", { status: 404, headers: headers22 });
  }
  if (!state2.prerendering?.fallback && !remote_id) {
    const matchers = await manifest._.matchers();
    for (const candidate of manifest._.routes) {
      const match = candidate.pattern.exec(resolved_path);
      if (!match) continue;
      const matched = exec(match, candidate.params, matchers);
      if (matched) {
        route = candidate;
        event.route = { id: route.id };
        event.params = decode_params(matched);
        break;
      }
    }
  }
  let resolve_opts = {
    transformPageChunk: default_transform,
    filterSerializedResponseHeaders: default_filter,
    preload: default_preload
  };
  let trailing_slash = "never";
  try {
    const page_nodes = route?.page ? new PageNodes(await load_page_nodes(route.page, manifest)) : void 0;
    if (route) {
      if (url.pathname === base || url.pathname === base + "/") {
        trailing_slash = "always";
      } else if (page_nodes) {
        if (DEV) {
          page_nodes.validate();
        }
        trailing_slash = page_nodes.trailing_slash();
      } else if (route.endpoint) {
        const node = await route.endpoint();
        trailing_slash = node.trailingSlash ?? "never";
        if (DEV) {
          validate_server_exports(
            node,
            /** @type {string} */
            route.endpoint_id
          );
        }
      }
      if (!is_data_request) {
        const normalized = normalize_path(url.pathname, trailing_slash);
        if (normalized !== url.pathname && !state2.prerendering?.fallback) {
          return new Response(void 0, {
            status: 308,
            headers: {
              "x-sveltekit-normalize": "1",
              location: (
                // ensure paths starting with '//' are not treated as protocol-relative
                (normalized.startsWith("//") ? url.origin + normalized : normalized) + (url.search === "?" ? "" : url.search)
              )
            }
          });
        }
      }
      if (state2.before_handle || state2.emulator?.platform) {
        let config = {};
        let prerender2 = false;
        if (route.endpoint) {
          const node = await route.endpoint();
          config = node.config ?? config;
          prerender2 = node.prerender ?? prerender2;
        } else if (page_nodes) {
          config = page_nodes.get_config() ?? config;
          prerender2 = page_nodes.prerender();
        }
        if (state2.before_handle) {
          state2.before_handle(event, config, prerender2);
        }
        if (state2.emulator?.platform) {
          event.platform = await state2.emulator.platform({ config, prerender: prerender2 });
        }
      }
    }
    set_trailing_slash(trailing_slash);
    if (state2.prerendering && !state2.prerendering.fallback && !state2.prerendering.inside_reroute) {
      disable_search(url);
    }
    const response = await record_span({
      name: "sveltekit.handle.root",
      attributes: {
        "http.route": event.route.id || "unknown",
        "http.method": event.request.method,
        "http.url": event.url.href,
        "sveltekit.is_data_request": is_data_request,
        "sveltekit.is_sub_request": event.isSubRequest
      },
      fn: async (root_span) => {
        const traced_event = {
          ...event,
          tracing: {
            enabled: false,
            root: root_span,
            current: root_span
          }
        };
        return await with_request_store(
          { event: traced_event, state: event_state },
          () => options2.hooks.handle({
            event: traced_event,
            resolve: (event2, opts) => {
              return record_span({
                name: "sveltekit.resolve",
                attributes: {
                  "http.route": event2.route.id || "unknown"
                },
                fn: (resolve_span) => {
                  return with_request_store(
                    null,
                    () => resolve2(merge_tracing(event2, resolve_span), page_nodes, opts).then(
                      (response2) => {
                        for (const key2 in headers2) {
                          const value = headers2[key2];
                          response2.headers.set(
                            key2,
                            /** @type {string} */
                            value
                          );
                        }
                        add_cookies_to_headers(response2.headers, new_cookies.values());
                        if (state2.prerendering && event2.route.id !== null) {
                          response2.headers.set("x-sveltekit-routeid", encodeURI(event2.route.id));
                        }
                        resolve_span.setAttributes({
                          "http.response.status_code": response2.status,
                          "http.response.body.size": response2.headers.get("content-length") || "unknown"
                        });
                        return response2;
                      }
                    )
                  );
                }
              });
            }
          })
        );
      }
    });
    if (response.status === 200 && response.headers.has("etag")) {
      let if_none_match_value = request.headers.get("if-none-match");
      if (if_none_match_value?.startsWith('W/"')) {
        if_none_match_value = if_none_match_value.substring(2);
      }
      const etag2 = (
        /** @type {string} */
        response.headers.get("etag")
      );
      if (if_none_match_value === etag2) {
        const headers22 = new Headers({ etag: etag2 });
        for (const key2 of [
          "cache-control",
          "content-location",
          "date",
          "expires",
          "vary",
          "set-cookie"
        ]) {
          const value = response.headers.get(key2);
          if (value) headers22.set(key2, value);
        }
        return new Response(void 0, {
          status: 304,
          headers: headers22
        });
      }
    }
    if (is_data_request && response.status >= 300 && response.status <= 308) {
      const location2 = response.headers.get("location");
      if (location2) {
        return redirect_json_response(new Redirect(
          /** @type {any} */
          response.status,
          location2
        ));
      }
    }
    return response;
  } catch (e) {
    if (e instanceof Redirect) {
      const response = is_data_request ? redirect_json_response(e) : route?.page && is_action_json_request(event) ? action_json_redirect(e) : redirect_response(e.status, e.location);
      add_cookies_to_headers(response.headers, new_cookies.values());
      return response;
    }
    return await handle_fatal_error(event, event_state, options2, e);
  }
  async function resolve2(event2, page_nodes, opts) {
    try {
      if (opts) {
        resolve_opts = {
          transformPageChunk: opts.transformPageChunk || default_transform,
          filterSerializedResponseHeaders: opts.filterSerializedResponseHeaders || default_filter,
          preload: opts.preload || default_preload
        };
      }
      if (options2.hash_routing || state2.prerendering?.fallback) {
        return await render_response({
          event: event2,
          event_state,
          options: options2,
          manifest,
          state: state2,
          page_config: { ssr: false, csr: true },
          status: 200,
          error: null,
          branch: [],
          fetched: [],
          resolve_opts
        });
      }
      if (remote_id) {
        return await handle_remote_call(event2, event_state, options2, manifest, remote_id);
      }
      if (route) {
        const method = (
          /** @type {import('types').HttpMethod} */
          event2.request.method
        );
        let response2;
        if (is_data_request) {
          response2 = await render_data(
            event2,
            event_state,
            route,
            options2,
            manifest,
            state2,
            invalidated_data_nodes,
            trailing_slash
          );
        } else if (route.endpoint && (!route.page || is_endpoint_request(event2))) {
          response2 = await render_endpoint(event2, event_state, await route.endpoint(), state2);
        } else if (route.page) {
          if (!page_nodes) {
            throw new Error("page_nodes not found. This should never happen");
          } else if (page_methods.has(method)) {
            response2 = await render_page(
              event2,
              event_state,
              route.page,
              options2,
              manifest,
              state2,
              page_nodes,
              resolve_opts
            );
          } else {
            const allowed_methods2 = new Set(allowed_page_methods);
            const node = await manifest._.nodes[route.page.leaf]();
            if (node?.server?.actions) {
              allowed_methods2.add("POST");
            }
            if (method === "OPTIONS") {
              response2 = new Response(null, {
                status: 204,
                headers: {
                  allow: Array.from(allowed_methods2.values()).join(", ")
                }
              });
            } else {
              const mod = [...allowed_methods2].reduce(
                (acc, curr) => {
                  acc[curr] = true;
                  return acc;
                },
                /** @type {Record<string, any>} */
                {}
              );
              response2 = method_not_allowed(mod, method);
            }
          }
        } else {
          throw new Error("Route is neither page nor endpoint. This should never happen");
        }
        if (request.method === "GET" && route.page && route.endpoint) {
          const vary = response2.headers.get("vary")?.split(",")?.map((v) => v.trim().toLowerCase());
          if (!(vary?.includes("accept") || vary?.includes("*"))) {
            response2 = new Response(response2.body, {
              status: response2.status,
              statusText: response2.statusText,
              headers: new Headers(response2.headers)
            });
            response2.headers.append("Vary", "Accept");
          }
        }
        return response2;
      }
      if (state2.error && event2.isSubRequest) {
        const headers22 = new Headers(request.headers);
        headers22.set("x-sveltekit-error", "true");
        return await fetch(request, { headers: headers22 });
      }
      if (state2.error) {
        return text("Internal Server Error", {
          status: 500
        });
      }
      if (state2.depth === 0) {
        if (DEV && event2.url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
          if (!warned_on_devtools_json_request) {
            console.log(
              `
Google Chrome is requesting ${event2.url.pathname} to automatically configure devtools project settings. To learn why, and how to prevent this message, see https://svelte.dev/docs/cli/devtools-json
`
            );
            warned_on_devtools_json_request = true;
          }
          return new Response(void 0, { status: 404 });
        }
        return await respond_with_error({
          event: event2,
          event_state,
          options: options2,
          manifest,
          state: state2,
          status: 404,
          error: new SvelteKitError(404, "Not Found", `Not found: ${event2.url.pathname}`),
          resolve_opts
        });
      }
      if (state2.prerendering) {
        return text("not found", { status: 404 });
      }
      const response = await fetch(request);
      return new Response(response.body, response);
    } catch (e) {
      return await handle_fatal_error(event2, event_state, options2, e);
    } finally {
      event2.cookies.set = () => {
        throw new Error("Cannot use `cookies.set(...)` after the response has been generated");
      };
      event2.setHeaders = () => {
        throw new Error("Cannot use `setHeaders(...)` after the response has been generated");
      };
    }
  }
}
function load_page_nodes(page2, manifest) {
  return Promise.all([
    // we use == here rather than === because [undefined] serializes as "[null]"
    ...page2.layouts.map((n2) => n2 == void 0 ? n2 : manifest._.nodes[n2]()),
    manifest._.nodes[page2.leaf]()
  ]);
}
function propagate_context(fn) {
  return async (req, ...rest) => {
    {
      return fn(req, ...rest);
    }
  };
}
function lifecycle_function_unavailable(name) {
  const error2 = new Error(`lifecycle_function_unavailable
\`${name}(...)\` is not available on the server
https://svelte.dev/e/lifecycle_function_unavailable`);
  error2.name = "Svelte error";
  throw error2;
}
var current_component = null;
function getContext(key2) {
  const context_map = get_or_init_context_map("getContext");
  const result = (
    /** @type {T} */
    context_map.get(key2)
  );
  return result;
}
function setContext(key2, context2) {
  get_or_init_context_map("setContext").set(key2, context2);
  return context2;
}
function hasContext(key2) {
  return get_or_init_context_map("hasContext").has(key2);
}
function getAllContexts() {
  return get_or_init_context_map("getAllContexts");
}
function get_or_init_context_map(name) {
  if (current_component === null) {
    lifecycle_outside_component(name);
  }
  return current_component.c ??= new Map(get_parent_context(current_component) || void 0);
}
function push(fn) {
  current_component = { p: current_component, c: null, d: null };
  {
    current_component.function = fn;
  }
}
function pop() {
  var component = (
    /** @type {Component} */
    current_component
  );
  var ondestroy = component.d;
  if (ondestroy) {
    on_destroy.push(...ondestroy);
  }
  current_component = component.p;
}
function get_parent_context(component_context2) {
  let parent2 = component_context2.p;
  while (parent2 !== null) {
    const context_map = parent2.c;
    if (context_map !== null) {
      return context_map;
    }
    parent2 = parent2.p;
  }
  return null;
}
const BLOCK_OPEN = `<!--${HYDRATION_START}-->`;
const BLOCK_CLOSE = `<!--${HYDRATION_END}-->`;
const EMPTY_COMMENT = `<!---->`;
const autoclosing_children = {
  // based on http://developers.whatwg.org/syntax.html#syntax-tag-omission
  li: { direct: ["li"] },
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt#technical_summary
  dt: { descendant: ["dt", "dd"], reset_by: ["dl"] },
  dd: { descendant: ["dt", "dd"], reset_by: ["dl"] },
  p: {
    descendant: [
      "address",
      "article",
      "aside",
      "blockquote",
      "div",
      "dl",
      "fieldset",
      "footer",
      "form",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "hgroup",
      "hr",
      "main",
      "menu",
      "nav",
      "ol",
      "p",
      "pre",
      "section",
      "table",
      "ul"
    ]
  },
  rt: { descendant: ["rt", "rp"] },
  rp: { descendant: ["rt", "rp"] },
  optgroup: { descendant: ["optgroup"] },
  option: { descendant: ["option", "optgroup"] },
  thead: { direct: ["tbody", "tfoot"] },
  tbody: { direct: ["tbody", "tfoot"] },
  tfoot: { direct: ["tbody"] },
  tr: { direct: ["tr", "tbody"] },
  td: { direct: ["td", "th", "tr"] },
  th: { direct: ["td", "th", "tr"] }
};
const disallowed_children = {
  ...autoclosing_children,
  optgroup: { only: ["option", "#text"] },
  // Strictly speaking, seeing an <option> doesn't mean we're in a <select>, but we assume it here
  option: { only: ["#text"] },
  form: { descendant: ["form"] },
  a: { descendant: ["a"] },
  button: { descendant: ["button"] },
  h1: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h2: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h3: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h4: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h5: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h6: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
  select: { only: ["option", "optgroup", "#text", "hr", "script", "template"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
  // No special behavior since these rules fall back to "in body" mode for
  // all except special table nodes which cause bad parsing behavior anyway.
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
  tr: { only: ["th", "td", "style", "script", "template"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
  tbody: { only: ["tr", "style", "script", "template"] },
  thead: { only: ["tr", "style", "script", "template"] },
  tfoot: { only: ["tr", "style", "script", "template"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
  colgroup: { only: ["col", "template"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
  table: {
    only: ["caption", "colgroup", "tbody", "thead", "tfoot", "style", "script", "template"]
  },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
  head: {
    only: [
      "base",
      "basefont",
      "bgsound",
      "link",
      "meta",
      "title",
      "noscript",
      "noframes",
      "style",
      "script",
      "template"
    ]
  },
  // https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
  html: { only: ["head", "body", "frameset"] },
  frameset: { only: ["frame"] },
  "#document": { only: ["html"] }
};
function is_tag_valid_with_ancestor(child_tag, ancestors, child_loc, ancestor_loc) {
  if (child_tag.includes("-")) return null;
  const ancestor_tag = ancestors[ancestors.length - 1];
  const disallowed = disallowed_children[ancestor_tag];
  if (!disallowed) return null;
  if ("reset_by" in disallowed && disallowed.reset_by) {
    for (let i = ancestors.length - 2; i >= 0; i--) {
      const ancestor = ancestors[i];
      if (ancestor.includes("-")) return null;
      if (disallowed.reset_by.includes(ancestors[i])) {
        return null;
      }
    }
  }
  if ("descendant" in disallowed && disallowed.descendant.includes(child_tag)) {
    const child = child_loc ? `\`<${child_tag}>\` (${child_loc})` : `\`<${child_tag}>\``;
    const ancestor = ancestor_loc ? `\`<${ancestor_tag}>\` (${ancestor_loc})` : `\`<${ancestor_tag}>\``;
    return `${child} cannot be a descendant of ${ancestor}`;
  }
  return null;
}
function is_tag_valid_with_parent(child_tag, parent_tag, child_loc, parent_loc) {
  if (child_tag.includes("-") || parent_tag?.includes("-")) return null;
  if (parent_tag === "template") return null;
  const disallowed = disallowed_children[parent_tag];
  const child = child_loc ? `\`<${child_tag}>\` (${child_loc})` : `\`<${child_tag}>\``;
  const parent2 = parent_loc ? `\`<${parent_tag}>\` (${parent_loc})` : `\`<${parent_tag}>\``;
  if (disallowed) {
    if ("direct" in disallowed && disallowed.direct.includes(child_tag)) {
      return `${child} cannot be a direct child of ${parent2}`;
    }
    if ("descendant" in disallowed && disallowed.descendant.includes(child_tag)) {
      return `${child} cannot be a child of ${parent2}`;
    }
    if ("only" in disallowed && disallowed.only) {
      if (disallowed.only.includes(child_tag)) {
        return null;
      } else {
        return `${child} cannot be a child of ${parent2}. \`<${parent_tag}>\` only allows these children: ${disallowed.only.map((d) => `\`<${d}>\``).join(", ")}`;
      }
    }
  }
  switch (child_tag) {
    case "body":
    case "caption":
    case "col":
    case "colgroup":
    case "frameset":
    case "frame":
    case "head":
    case "html":
      return `${child} cannot be a child of ${parent2}`;
    case "thead":
    case "tbody":
    case "tfoot":
      return `${child} must be the child of a \`<table>\`, not a ${parent2}`;
    case "td":
    case "th":
      return `${child} must be the child of a \`<tr>\`, not a ${parent2}`;
    case "tr":
      return `\`<tr>\` must be the child of a \`<thead>\`, \`<tbody>\`, or \`<tfoot>\`, not a ${parent2}`;
  }
  return null;
}
class HeadPayload {
  /** @type {Set<{ hash: string; code: string }>} */
  css = /* @__PURE__ */ new Set();
  /** @type {string[]} */
  out = [];
  uid = () => "";
  title = "";
  constructor(css = /* @__PURE__ */ new Set(), out = [], title = "", uid = () => "") {
    this.css = css;
    this.out = out;
    this.title = title;
    this.uid = uid;
  }
}
class Payload {
  /** @type {Set<{ hash: string; code: string }>} */
  css = /* @__PURE__ */ new Set();
  /** @type {string[]} */
  out = [];
  uid = () => "";
  select_value = void 0;
  head = new HeadPayload();
  constructor(id_prefix = "") {
    this.uid = props_id_generator(id_prefix);
    this.head.uid = this.uid;
  }
}
function copy_payload({ out, css, head, uid }) {
  const payload = new Payload();
  payload.out = [...out];
  payload.css = new Set(css);
  payload.uid = uid;
  payload.head = new HeadPayload();
  payload.head.out = [...head.out];
  payload.head.css = new Set(head.css);
  payload.head.title = head.title;
  payload.head.uid = head.uid;
  return payload;
}
function assign_payload(p1, p2) {
  p1.out = [...p2.out];
  p1.css = p2.css;
  p1.head = p2.head;
  p1.uid = p2.uid;
}
function props_id_generator(prefix) {
  let uid = 1;
  return () => `${prefix}s${uid++}`;
}
let parent = null;
let seen;
function print_error(payload, message) {
  message = `node_invalid_placement_ssr: ${message}

This can cause content to shift around as the browser repairs the HTML, and will likely result in a \`hydration_mismatch\` warning.`;
  if ((seen ??= /* @__PURE__ */ new Set()).has(message)) return;
  seen.add(message);
  console.error(message);
  payload.head.out.push(`<script>console.error(${JSON.stringify(message)})<\/script>`);
}
function reset_elements() {
  let old_parent = parent;
  parent = null;
  return () => {
    parent = old_parent;
  };
}
function push_element(payload, tag2, line2, column) {
  var filename = (
    /** @type {Component} */
    current_component.function[FILENAME]
  );
  var child = { tag: tag2, parent, filename, line: line2, column };
  if (parent !== null) {
    var ancestor = parent.parent;
    var ancestors = [parent.tag];
    const child_loc = filename ? `${filename}:${line2}:${column}` : void 0;
    const parent_loc = parent.filename ? `${parent.filename}:${parent.line}:${parent.column}` : void 0;
    const message = is_tag_valid_with_parent(tag2, parent.tag, child_loc, parent_loc);
    if (message) print_error(payload, message);
    while (ancestor != null) {
      ancestors.push(ancestor.tag);
      const ancestor_loc = ancestor.filename ? `${ancestor.filename}:${ancestor.line}:${ancestor.column}` : void 0;
      const message2 = is_tag_valid_with_ancestor(tag2, ancestors, child_loc, ancestor_loc);
      if (message2) print_error(payload, message2);
      ancestor = ancestor.parent;
    }
  }
  parent = child;
}
function pop_element() {
  parent = /** @type {Element} */
  parent.parent;
}
function validate_snippet_args(payload) {
  if (typeof payload !== "object" || // for some reason typescript consider the type of payload as never after the first instanceof
  !(payload instanceof Payload || /** @type {any} */
  payload instanceof HeadPayload)) {
    invalid_snippet_arguments();
  }
}
let controller = null;
function abort() {
  controller?.abort(STALE_REACTION);
  controller = null;
}
function html(value) {
  var html2 = String(value ?? "");
  var open = `<!--${hash$1(html2)}-->`;
  return open + html2 + "<!---->";
}
const INVALID_ATTR_NAME_CHAR_REGEX = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
function element(payload, tag2, attributes_fn = noop$1, children_fn = noop$1) {
  payload.out.push("<!---->");
  if (tag2) {
    payload.out.push(`<${tag2}`);
    attributes_fn();
    payload.out.push(`>`);
    if (!is_void(tag2)) {
      children_fn();
      if (!is_raw_text_element(tag2)) {
        payload.out.push(EMPTY_COMMENT);
      }
      payload.out.push(`</${tag2}>`);
    }
  }
  payload.out.push("<!---->");
}
let on_destroy = [];
function render$1(component, options2 = {}) {
  try {
    const payload = new Payload(options2.idPrefix ? options2.idPrefix + "-" : "");
    const prev_on_destroy = on_destroy;
    on_destroy = [];
    payload.out.push(BLOCK_OPEN);
    let reset_reset_element;
    if (DEV) {
      reset_reset_element = reset_elements();
    }
    if (options2.context) {
      push();
      current_component.c = options2.context;
    }
    component(payload, options2.props ?? {}, {}, {});
    if (options2.context) {
      pop();
    }
    if (reset_reset_element) {
      reset_reset_element();
    }
    payload.out.push(BLOCK_CLOSE);
    for (const cleanup of on_destroy) cleanup();
    on_destroy = prev_on_destroy;
    let head = payload.head.out.join("") + payload.head.title;
    for (const { hash: hash2, code } of payload.css) {
      head += `<style id="${hash2}">${code}</style>`;
    }
    const body2 = payload.out.join("");
    return {
      head,
      html: body2,
      body: body2
    };
  } finally {
    abort();
  }
}
function spread_attributes(attrs, css_hash, classes, styles, flags = 0) {
  if (styles) {
    attrs.style = to_style(attrs.style, styles);
  }
  if (attrs.class) {
    attrs.class = clsx(attrs.class);
  }
  if (css_hash || classes) {
    attrs.class = to_class(attrs.class, css_hash, classes);
  }
  let attr_str = "";
  let name;
  const is_html = (flags & ELEMENT_IS_NAMESPACED) === 0;
  const lowercase = (flags & ELEMENT_PRESERVE_ATTRIBUTE_CASE) === 0;
  for (name in attrs) {
    if (typeof attrs[name] === "function") continue;
    if (name[0] === "$" && name[1] === "$") continue;
    if (INVALID_ATTR_NAME_CHAR_REGEX.test(name)) continue;
    var value = attrs[name];
    if (lowercase) {
      name = name.toLowerCase();
    }
    attr_str += attr(name, value, is_html && is_boolean_attribute(name));
  }
  return attr_str;
}
function spread_props(props) {
  const merged_props = {};
  let key2;
  for (let i = 0; i < props.length; i++) {
    const obj = props[i];
    for (key2 in obj) {
      const desc = Object.getOwnPropertyDescriptor(obj, key2);
      if (desc) {
        Object.defineProperty(merged_props, key2, desc);
      } else {
        merged_props[key2] = obj[key2];
      }
    }
  }
  return merged_props;
}
function stringify(value) {
  return typeof value === "string" ? value : value == null ? "" : value + "";
}
function attr_class(value, hash2, directives) {
  var result = to_class(value, hash2, directives);
  return result ? ` class="${escape_html(result, true)}"` : "";
}
function attr_style(value, directives) {
  var result = to_style(value, directives);
  return result ? ` style="${escape_html(result, true)}"` : "";
}
function store_get(store_values, store_name, store) {
  {
    validate_store(store, store_name.slice(1));
  }
  if (store_name in store_values && store_values[store_name][0] === store) {
    return store_values[store_name][2];
  }
  store_values[store_name]?.[1]();
  store_values[store_name] = [store, null, void 0];
  const unsub = subscribe_to_store(
    store,
    /** @param {any} v */
    (v) => store_values[store_name][2] = v
  );
  store_values[store_name][1] = unsub;
  return store_values[store_name][2];
}
function store_set(store, value) {
  store.set(value);
  return value;
}
function store_mutate(store_values, store_name, store, expression) {
  store_set(store, store_get(store_values, store_name, store));
  return expression;
}
function unsubscribe_stores(store_values) {
  for (const store_name in store_values) {
    store_values[store_name][1]();
  }
}
function bind_props(props_parent, props_now) {
  for (const key2 in props_now) {
    const initial_value = props_parent[key2];
    const value = props_now[key2];
    if (initial_value === void 0 && value !== void 0 && Object.getOwnPropertyDescriptor(props_parent, key2)?.set) {
      props_parent[key2] = value;
    }
  }
}
function ensure_array_like(array_like_or_iterator) {
  if (array_like_or_iterator) {
    return array_like_or_iterator.length !== void 0 ? array_like_or_iterator : Array.from(array_like_or_iterator);
  }
  return [];
}
function inspect(args, inspect2 = console.log) {
  inspect2("init", ...args);
}
function once(get_value) {
  let value = (
    /** @type {V} */
    UNINITIALIZED
  );
  return () => {
    if (value === UNINITIALIZED) {
      value = get_value();
    }
    return value;
  };
}
function props_id(payload) {
  const uid = payload.uid();
  payload.out.push("<!--#" + uid + "-->");
  return uid;
}
function derived(fn) {
  const get_value = once(fn);
  let updated_value;
  return function(new_value) {
    if (arguments.length === 0) {
      return updated_value ?? get_value();
    }
    updated_value = new_value;
    return updated_value;
  };
}
function maybe_selected(payload, value) {
  return value === payload.select_value ? " selected" : "";
}
function asClassComponent(component) {
  const component_constructor = asClassComponent$1(component);
  const _render = (props, { context: context2 } = {}) => {
    const result = render$1(component, { props, context: context2 });
    return {
      css: { code: "", map: null },
      head: result.head,
      html: result.body
    };
  };
  component_constructor.render = _render;
  return component_constructor;
}
function onDestroy(fn) {
  var context2 = (
    /** @type {Component} */
    current_component
  );
  (context2.d ??= []).push(fn);
}
function mount() {
  lifecycle_function_unavailable("mount");
}
function unmount() {
  lifecycle_function_unavailable("unmount");
}
async function tick() {
}
let prerendering = false;
function set_building() {
}
function set_prerendering() {
  prerendering = true;
}
const browser = BROWSER;
Root[FILENAME] = ".svelte-kit/generated/root.svelte";
function Root($$payload, $$props) {
  push(Root);
  let {
    stores: stores2,
    page: page2,
    constructors,
    components = [],
    form: form2,
    data_0 = null,
    data_1 = null
  } = $$props;
  {
    setContext("__svelte__", stores2);
  }
  {
    stores2.page.set(page2);
  }
  const Pyramid_1 = constructors[1];
  if (constructors[1]) {
    $$payload.out.push("<!--[-->");
    const Pyramid_0 = constructors[0];
    $$payload.out.push(`<!---->`);
    Pyramid_0($$payload, {
      data: data_0,
      form: form2,
      params: page2.params,
      children: prevent_snippet_stringification(($$payload2) => {
        $$payload2.out.push(`<!---->`);
        Pyramid_1($$payload2, { data: data_1, form: form2, params: page2.params });
        $$payload2.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    const Pyramid_0 = constructors[0];
    $$payload.out.push(`<!---->`);
    Pyramid_0($$payload, { data: data_0, form: form2, params: page2.params });
    $$payload.out.push(`<!---->`);
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Root.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const root = asClassComponent(Root);
const options = {
  app_template_contains_nonce: false,
  csp: { "mode": "auto", "directives": { "upgrade-insecure-requests": false, "block-all-mixed-content": false }, "reportOnly": { "upgrade-insecure-requests": false, "block-all-mixed-content": false } },
  csrf_check_origin: true,
  csrf_trusted_origins: [],
  embedded: false,
  env_public_prefix: "PUBLIC_",
  env_private_prefix: "",
  hash_routing: false,
  hooks: null,
  // added lazily, via `get_hooks`
  preload_strategy: "modulepreload",
  root,
  service_worker: false,
  service_worker_options: void 0,
  templates: {
    app: ({ head, body: body2, assets: assets2, nonce, env }) => '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <link rel="icon" href="' + assets2 + '/favicon.png" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    ' + head + '\n  </head>\n  <body data-sveltekit-preload-data="hover">\n    <div style="display: contents">' + body2 + "</div>\n  </body>\n</html>\n",
    error: ({ status, message }) => '<!doctype html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<title>' + message + `</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">` + status + '</span>\n			<div class="message">\n				<h1>' + message + "</h1>\n			</div>\n		</div>\n	</body>\n</html>\n"
  },
  version_hash: "y4z79b"
};
async function get_hooks() {
  let handle;
  let handleFetch;
  let handleError;
  let handleValidationError;
  let init2;
  ({ handle, handleFetch, handleError, handleValidationError, init: init2 } = await import("./hooks.server.js"));
  let reroute;
  let transport;
  return {
    handle,
    handleFetch,
    handleError,
    handleValidationError,
    init: init2,
    reroute,
    transport
  };
}
function filter_env(env, allowed, disallowed) {
  return Object.fromEntries(
    Object.entries(env).filter(
      ([k2]) => k2.startsWith(allowed) && (disallowed === "" || !k2.startsWith(disallowed))
    )
  );
}
let app;
function set_app(value) {
  app = value;
}
let init_promise;
class Server {
  /** @type {import('types').SSROptions} */
  #options;
  /** @type {import('@sveltejs/kit').SSRManifest} */
  #manifest;
  /** @param {import('@sveltejs/kit').SSRManifest} manifest */
  constructor(manifest) {
    this.#options = options;
    this.#manifest = manifest;
  }
  /**
   * @param {import('@sveltejs/kit').ServerInitOptions} opts
   */
  async init({ env, read }) {
    const { env_public_prefix, env_private_prefix } = this.#options;
    set_private_env(filter_env(env, env_private_prefix, env_public_prefix));
    set_public_env(filter_env(env, env_public_prefix, env_private_prefix));
    if (read) {
      const wrapped_read = (file) => {
        const result = read(file);
        if (result instanceof ReadableStream) {
          return result;
        } else {
          return new ReadableStream({
            async start(controller2) {
              try {
                const stream = await Promise.resolve(result);
                if (!stream) {
                  controller2.close();
                  return;
                }
                const reader = stream.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller2.enqueue(value);
                }
                controller2.close();
              } catch (error2) {
                controller2.error(error2);
              }
            }
          });
        }
      };
      set_read_implementation(wrapped_read);
    }
    await (init_promise ??= (async () => {
      try {
        const module = await get_hooks();
        this.#options.hooks = {
          handle: module.handle || (({ event, resolve: resolve2 }) => resolve2(event)),
          handleError: module.handleError || (({ status, error: error2, event }) => {
            const error_message = format_server_error(
              status,
              /** @type {Error} */
              error2,
              event
            );
            console.error(error_message);
          }),
          handleFetch: module.handleFetch || (({ request, fetch: fetch2 }) => fetch2(request)),
          handleValidationError: module.handleValidationError || (({ issues }) => {
            console.error("Remote function schema validation failed:", issues);
            return { message: "Bad Request" };
          }),
          reroute: module.reroute || (() => {
          }),
          transport: module.transport || {}
        };
        set_app({
          decoders: module.transport ? Object.fromEntries(Object.entries(module.transport).map(([k2, v]) => [k2, v.decode])) : {}
        });
        if (module.init) {
          await module.init();
        }
      } catch (e) {
        {
          this.#options.hooks = {
            handle: () => {
              throw e;
            },
            handleError: ({ error: error2 }) => console.error(error2),
            handleFetch: ({ request, fetch: fetch2 }) => fetch2(request),
            handleValidationError: () => {
              return { message: "Bad Request" };
            },
            reroute: () => {
            },
            transport: {}
          };
          set_app({
            decoders: {}
          });
        }
      }
    })());
  }
  /**
   * @param {Request} request
   * @param {import('types').RequestOptions} options
   */
  async respond(request, options2) {
    return respond(request, this.#options, this.#manifest, {
      ...options2,
      error: false,
      depth: 0
    });
  }
}
function create_validator(validate_or_fn, maybe_fn) {
  if (!maybe_fn) {
    return (arg) => {
      if (arg !== void 0) {
        error(400, "Bad Request");
      }
    };
  }
  if (validate_or_fn === "unchecked") {
    return (arg) => arg;
  }
  if ("~standard" in validate_or_fn) {
    return async (arg) => {
      const { event, state: state2 } = get_request_store();
      const validate = validate_or_fn["~standard"].validate;
      const result = await validate(arg);
      if (result.issues) {
        error(
          400,
          await state2.handleValidationError({
            issues: result.issues,
            event
          })
        );
      }
      return result.value;
    };
  }
  throw new Error(
    'Invalid validator passed to remote function. Expected "unchecked" or a Standard Schema (https://standardschema.dev)'
  );
}
function get_response(id, arg, state2, get_result) {
  const cache_key = create_remote_cache_key(id, stringify_remote_arg(arg, state2.transport));
  return (state2.remote_data ??= {})[cache_key] ??= get_result();
}
async function run_remote_function(event, state2, allow_cookies, arg, validate, fn) {
  const cleansed = {
    ...event,
    setHeaders: () => {
      throw new Error("setHeaders is not allowed in remote functions");
    },
    cookies: {
      ...event.cookies,
      set: (name, value, opts) => {
        if (!allow_cookies) {
          throw new Error("Cannot set cookies in `query` or `prerender` functions");
        }
        if (opts.path && !opts.path.startsWith("/")) {
          throw new Error("Cookies set in remote functions must have an absolute path");
        }
        return event.cookies.set(name, value, opts);
      },
      delete: (name, opts) => {
        if (!allow_cookies) {
          throw new Error("Cannot delete cookies in `query` or `prerender` functions");
        }
        if (opts.path && !opts.path.startsWith("/")) {
          throw new Error("Cookies deleted in remote functions must have an absolute path");
        }
        return event.cookies.delete(name, opts);
      }
    },
    route: { id: null },
    url: new URL(event.url.origin)
  };
  const validated = await with_request_store({ event: cleansed, state: state2 }, () => validate(arg));
  return with_request_store({ event: cleansed, state: state2 }, () => fn(validated));
}
// @__NO_SIDE_EFFECTS__
function command(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = { type: "command", id: "", name: "" };
  const wrapper = (arg) => {
    const { event, state: state2 } = get_request_store();
    if (!event.isRemoteRequest) {
      throw new Error(
        `Cannot call a command (\`${__.name}(${maybe_fn ? "..." : ""})\`) during server-side rendering`
      );
    }
    state2.refreshes ??= {};
    const promise = Promise.resolve(run_remote_function(event, state2, true, arg, validate, fn));
    promise.updates = () => {
      throw new Error(`Cannot call '${__.name}(...).updates(...)' on the server`);
    };
    return (
      /** @type {ReturnType<RemoteCommand<Input, Output>>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  Object.defineProperty(wrapper, "pending", {
    get: () => 0
  });
  return wrapper;
}
// @__NO_SIDE_EFFECTS__
function form(fn) {
  function create_instance(key2) {
    const instance = {};
    instance.method = "POST";
    instance.onsubmit = () => {
    };
    Object.defineProperty(instance, "enhance", {
      value: () => {
        return { action: instance.action, method: instance.method, onsubmit: instance.onsubmit };
      }
    });
    const button_props = {
      type: "submit",
      onclick: () => {
      }
    };
    Object.defineProperty(button_props, "enhance", {
      value: () => {
        return { type: "submit", formaction: instance.buttonProps.formaction, onclick: () => {
        } };
      }
    });
    Object.defineProperty(instance, "buttonProps", {
      value: button_props
    });
    const __ = {
      type: "form",
      name: "",
      id: "",
      /** @param {FormData} form_data */
      fn: async (form_data) => {
        const { event, state: state2 } = get_request_store();
        state2.refreshes ??= {};
        const result = await run_remote_function(event, state2, true, form_data, (d) => d, fn);
        if (!event.isRemoteRequest) {
          (state2.remote_data ??= {})[__.id] = result;
        }
        return result;
      }
    };
    Object.defineProperty(instance, "__", { value: __ });
    Object.defineProperty(instance, "action", {
      get: () => `?/remote=${__.id}`,
      enumerable: true
    });
    Object.defineProperty(button_props, "formaction", {
      get: () => `?/remote=${__.id}`,
      enumerable: true
    });
    Object.defineProperty(instance, "result", {
      get() {
        try {
          const { remote_data } = get_request_store().state;
          return remote_data?.[__.id];
        } catch {
          return void 0;
        }
      }
    });
    Object.defineProperty(instance, "pending", {
      get: () => 0
    });
    Object.defineProperty(button_props, "pending", {
      get: () => 0
    });
    if (key2 == void 0) {
      Object.defineProperty(instance, "for", {
        /** @type {RemoteForm<any>['for']} */
        value: (key3) => {
          const { state: state2 } = get_request_store();
          let instance2 = (state2.form_instances ??= /* @__PURE__ */ new Map()).get(key3);
          if (!instance2) {
            instance2 = create_instance(key3);
            instance2.__.id = `${__.id}/${encodeURIComponent(JSON.stringify(key3))}`;
            instance2.__.name = __.name;
            state2.form_instances.set(key3, instance2);
          }
          return instance2;
        }
      });
    }
    return instance;
  }
  return create_instance();
}
// @__NO_SIDE_EFFECTS__
function prerender(validate_or_fn, fn_or_options, maybe_options) {
  const maybe_fn = typeof fn_or_options === "function" ? fn_or_options : void 0;
  const options2 = maybe_options ?? (maybe_fn ? void 0 : fn_or_options);
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = {
    type: "prerender",
    id: "",
    name: "",
    has_arg: !!maybe_fn,
    inputs: options2?.inputs,
    dynamic: options2?.dynamic
  };
  const wrapper = (arg) => {
    const promise = (async () => {
      const { event, state: state2 } = get_request_store();
      const payload = stringify_remote_arg(arg, state2.transport);
      const id = __.id;
      const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ""}`;
      if (!state2.prerendering && !DEV) ;
      if (state2.prerendering?.remote_responses.has(url)) {
        return (
          /** @type {Promise<any>} */
          state2.prerendering.remote_responses.get(url)
        );
      }
      const promise2 = get_response(
        id,
        arg,
        state2,
        () => run_remote_function(event, state2, false, arg, validate, fn)
      );
      if (state2.prerendering) {
        state2.prerendering.remote_responses.set(url, promise2);
      }
      const result = await promise2;
      if (state2.prerendering) {
        const body2 = { type: "result", result: stringify$1(result, state2.transport) };
        state2.prerendering.dependencies.set(url, {
          body: JSON.stringify(body2),
          response: json(body2)
        });
      }
      return result;
    })();
    promise.catch(() => {
    });
    return (
      /** @type {RemoteResource<Output>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
// @__NO_SIDE_EFFECTS__
function query(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = { type: "query", id: "", name: "" };
  const wrapper = (arg) => {
    if (prerendering) {
      throw new Error(
        `Cannot call query '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
      );
    }
    const { event, state: state2 } = get_request_store();
    const promise = get_response(
      __.id,
      arg,
      state2,
      () => run_remote_function(event, state2, false, arg, validate, fn)
    );
    promise.catch(() => {
    });
    promise.refresh = async () => {
      const { state: state3 } = get_request_store();
      const refreshes = state3.refreshes;
      if (!refreshes) {
        throw new Error(
          `Cannot call refresh on query '${__.name}' because it is not executed in the context of a command/form remote function`
        );
      }
      const cache_key = create_remote_cache_key(__.id, stringify_remote_arg(arg, state3.transport));
      refreshes[cache_key] = await /** @type {Promise<any>} */
      promise;
    };
    promise.withOverride = () => {
      throw new Error(`Cannot call '${__.name}.withOverride()' on the server`);
    };
    return (
      /** @type {RemoteQuery<Output>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
const SvelteSet = globalThis.Set;
const SvelteMap = globalThis.Map;
class MediaQuery {
  current;
  /**
   * @param {string} query
   * @param {boolean} [matches]
   */
  constructor(query2, matches = false) {
    this.current = matches;
  }
}
function createSubscriber(_) {
  return () => {
  };
}
function isFunction$2(value) {
  return typeof value === "function";
}
function isObject$1(value) {
  return value !== null && typeof value === "object";
}
const CLASS_VALUE_PRIMITIVE_TYPES$1 = ["string", "number", "bigint", "boolean"];
function isClassValue$1(value) {
  if (value === null || value === void 0)
    return true;
  if (CLASS_VALUE_PRIMITIVE_TYPES$1.includes(typeof value))
    return true;
  if (Array.isArray(value))
    return value.every((item) => isClassValue$1(item));
  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype)
      return false;
    return true;
  }
  return false;
}
const BoxSymbol$1 = Symbol("box");
const isWritableSymbol$1 = Symbol("is-writable");
function isBox$1(value) {
  return isObject$1(value) && BoxSymbol$1 in value;
}
function isWritableBox$1(value) {
  return box$1.isBox(value) && isWritableSymbol$1 in value;
}
function box$1(initialValue) {
  let current = initialValue;
  return {
    [BoxSymbol$1]: true,
    [isWritableSymbol$1]: true,
    get current() {
      return current;
    },
    set current(v) {
      current = v;
    }
  };
}
function boxWith$1(getter, setter) {
  const derived2 = getter();
  if (setter) {
    return {
      [BoxSymbol$1]: true,
      [isWritableSymbol$1]: true,
      get current() {
        return derived2;
      },
      set current(v) {
        setter(v);
      }
    };
  }
  return {
    [BoxSymbol$1]: true,
    get current() {
      return getter();
    }
  };
}
function boxFrom$1(value) {
  if (box$1.isBox(value)) return value;
  if (isFunction$2(value)) return box$1.with(value);
  return box$1(value);
}
function boxFlatten$1(boxes) {
  return Object.entries(boxes).reduce(
    (acc, [key2, b]) => {
      if (!box$1.isBox(b)) {
        return Object.assign(acc, { [key2]: b });
      }
      if (box$1.isWritableBox(b)) {
        Object.defineProperty(acc, key2, {
          get() {
            return b.current;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          set(v) {
            b.current = v;
          }
        });
      } else {
        Object.defineProperty(acc, key2, {
          get() {
            return b.current;
          }
        });
      }
      return acc;
    },
    {}
  );
}
function toReadonlyBox$1(b) {
  if (!box$1.isWritableBox(b)) return b;
  return {
    [BoxSymbol$1]: true,
    get current() {
      return b.current;
    }
  };
}
box$1.from = boxFrom$1;
box$1.with = boxWith$1;
box$1.flatten = boxFlatten$1;
box$1.readonly = toReadonlyBox$1;
box$1.isBox = isBox$1;
box$1.isWritableBox = isWritableBox$1;
function composeHandlers$1(...handlers) {
  return function(e) {
    for (const handler of handlers) {
      if (!handler)
        continue;
      if (e.defaultPrevented)
        return;
      if (typeof handler === "function") {
        handler.call(this, e);
      } else {
        handler.current?.call(this, e);
      }
    }
  };
}
const NUMBER_CHAR_RE$1 = /\d/;
const STR_SPLITTERS$1 = ["-", "_", "/", "."];
function isUppercase$1(char = "") {
  if (NUMBER_CHAR_RE$1.test(char))
    return void 0;
  return char !== char.toLowerCase();
}
function splitByCase$1(str) {
  const parts = [];
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = STR_SPLITTERS$1.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase$1(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function pascalCase$1(str) {
  if (!str)
    return "";
  return splitByCase$1(str).map((p2) => upperFirst$1(p2)).join("");
}
function camelCase$1(str) {
  return lowerFirst$1(pascalCase$1(str || ""));
}
function upperFirst$1(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function lowerFirst$1(str) {
  return str ? str[0].toLowerCase() + str.slice(1) : "";
}
function cssToStyleObj$1(css) {
  if (!css)
    return {};
  const styleObj = {};
  function iterator(name, value) {
    if (name.startsWith("-moz-") || name.startsWith("-webkit-") || name.startsWith("-ms-") || name.startsWith("-o-")) {
      styleObj[pascalCase$1(name)] = value;
      return;
    }
    if (name.startsWith("--")) {
      styleObj[name] = value;
      return;
    }
    styleObj[camelCase$1(name)] = value;
  }
  parse$1(css, iterator);
  return styleObj;
}
function executeCallbacks$1(...callbacks) {
  return (...args) => {
    for (const callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}
function createParser$1(matcher, replacer) {
  const regex = RegExp(matcher, "g");
  return (str) => {
    if (typeof str !== "string") {
      throw new TypeError(`expected an argument of type string, but got ${typeof str}`);
    }
    if (!str.match(regex))
      return str;
    return str.replace(regex, replacer);
  };
}
const camelToKebab$1 = createParser$1(/[A-Z]/, (match) => `-${match.toLowerCase()}`);
function styleToCSS$1(styleObj) {
  if (!styleObj || typeof styleObj !== "object" || Array.isArray(styleObj)) {
    throw new TypeError(`expected an argument of type object, but got ${typeof styleObj}`);
  }
  return Object.keys(styleObj).map((property) => `${camelToKebab$1(property)}: ${styleObj[property]};`).join("\n");
}
function styleToString$1(style = {}) {
  return styleToCSS$1(style).replace("\n", " ");
}
const srOnlyStyles$1 = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: "0",
  transform: "translateX(-100%)"
};
const srOnlyStylesString = styleToString$1(srOnlyStyles$1);
const EVENT_LIST = [
  "onabort",
  "onanimationcancel",
  "onanimationend",
  "onanimationiteration",
  "onanimationstart",
  "onauxclick",
  "onbeforeinput",
  "onbeforetoggle",
  "onblur",
  "oncancel",
  "oncanplay",
  "oncanplaythrough",
  "onchange",
  "onclick",
  "onclose",
  "oncompositionend",
  "oncompositionstart",
  "oncompositionupdate",
  "oncontextlost",
  "oncontextmenu",
  "oncontextrestored",
  "oncopy",
  "oncuechange",
  "oncut",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onended",
  "onerror",
  "onfocus",
  "onfocusin",
  "onfocusout",
  "onformdata",
  "ongotpointercapture",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onlostpointercapture",
  "onmousedown",
  "onmouseenter",
  "onmouseleave",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onpaste",
  "onpause",
  "onplay",
  "onplaying",
  "onpointercancel",
  "onpointerdown",
  "onpointerenter",
  "onpointerleave",
  "onpointermove",
  "onpointerout",
  "onpointerover",
  "onpointerup",
  "onprogress",
  "onratechange",
  "onreset",
  "onresize",
  "onscroll",
  "onscrollend",
  "onsecuritypolicyviolation",
  "onseeked",
  "onseeking",
  "onselect",
  "onselectionchange",
  "onselectstart",
  "onslotchange",
  "onstalled",
  "onsubmit",
  "onsuspend",
  "ontimeupdate",
  "ontoggle",
  "ontouchcancel",
  "ontouchend",
  "ontouchmove",
  "ontouchstart",
  "ontransitioncancel",
  "ontransitionend",
  "ontransitionrun",
  "ontransitionstart",
  "onvolumechange",
  "onwaiting",
  "onwebkitanimationend",
  "onwebkitanimationiteration",
  "onwebkitanimationstart",
  "onwebkittransitionend",
  "onwheel"
];
const EVENT_LIST_SET = new Set(EVENT_LIST);
function isEventHandler$1(key2) {
  return EVENT_LIST_SET.has(key2);
}
function mergeProps$1(...args) {
  const result = { ...args[0] };
  for (let i = 1; i < args.length; i++) {
    const props = args[i];
    if (!props)
      continue;
    for (const key2 of Object.keys(props)) {
      const a = result[key2];
      const b = props[key2];
      const aIsFunction = typeof a === "function";
      const bIsFunction = typeof b === "function";
      if (aIsFunction && typeof bIsFunction && isEventHandler$1(key2)) {
        const aHandler = a;
        const bHandler = b;
        result[key2] = composeHandlers$1(aHandler, bHandler);
      } else if (aIsFunction && bIsFunction) {
        result[key2] = executeCallbacks$1(a, b);
      } else if (key2 === "class") {
        const aIsClassValue = isClassValue$1(a);
        const bIsClassValue = isClassValue$1(b);
        if (aIsClassValue && bIsClassValue) {
          result[key2] = clsx$1(a, b);
        } else if (aIsClassValue) {
          result[key2] = clsx$1(a);
        } else if (bIsClassValue) {
          result[key2] = clsx$1(b);
        }
      } else if (key2 === "style") {
        const aIsObject = typeof a === "object";
        const bIsObject = typeof b === "object";
        const aIsString = typeof a === "string";
        const bIsString = typeof b === "string";
        if (aIsObject && bIsObject) {
          result[key2] = { ...a, ...b };
        } else if (aIsObject && bIsString) {
          const parsedStyle = cssToStyleObj$1(b);
          result[key2] = { ...a, ...parsedStyle };
        } else if (aIsString && bIsObject) {
          const parsedStyle = cssToStyleObj$1(a);
          result[key2] = { ...parsedStyle, ...b };
        } else if (aIsString && bIsString) {
          const parsedStyleA = cssToStyleObj$1(a);
          const parsedStyleB = cssToStyleObj$1(b);
          result[key2] = { ...parsedStyleA, ...parsedStyleB };
        } else if (aIsObject) {
          result[key2] = a;
        } else if (bIsObject) {
          result[key2] = b;
        } else if (aIsString) {
          result[key2] = a;
        } else if (bIsString) {
          result[key2] = b;
        }
      } else {
        result[key2] = b !== void 0 ? b : a;
      }
    }
    for (const key2 of Object.getOwnPropertySymbols(props)) {
      const a = result[key2];
      const b = props[key2];
      result[key2] = b !== void 0 ? b : a;
    }
  }
  if (typeof result.style === "object") {
    result.style = styleToString$1(result.style).replaceAll("\n", " ");
  }
  if (result.hidden !== true) {
    result.hidden = void 0;
    delete result.hidden;
  }
  if (result.disabled !== true) {
    result.disabled = void 0;
    delete result.disabled;
  }
  return result;
}
const defaultWindow$3 = void 0;
function getActiveElement$4(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
let ActiveElement$3 = class ActiveElement {
  #document;
  #subscribe;
  constructor(options2 = {}) {
    const { window: window2 = defaultWindow$3, document: document2 = window2?.document } = options2;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement$4(this.#document);
  }
};
new ActiveElement$3();
function onDestroyEffect(fn) {
}
function afterSleep(ms, cb) {
  return setTimeout(cb, ms);
}
function afterTick(fn) {
  tick().then(fn);
}
const ELEMENT_NODE = 1;
const DOCUMENT_NODE = 9;
const DOCUMENT_FRAGMENT_NODE = 11;
function isHTMLElement$1(node) {
  return isObject$1(node) && node.nodeType === ELEMENT_NODE && typeof node.nodeName === "string";
}
function isDocument(node) {
  return isObject$1(node) && node.nodeType === DOCUMENT_NODE;
}
function isWindow(node) {
  return isObject$1(node) && node.constructor?.name === "VisualViewport";
}
function isNode(node) {
  return isObject$1(node) && node.nodeType !== void 0;
}
function isShadowRoot(node) {
  return isNode(node) && node.nodeType === DOCUMENT_FRAGMENT_NODE && "host" in node;
}
function contains(parent2, child) {
  if (!parent2 || !child)
    return false;
  if (!isHTMLElement$1(parent2) || !isHTMLElement$1(child))
    return false;
  const rootNode = child.getRootNode?.();
  if (parent2 === child)
    return true;
  if (parent2.contains(child))
    return true;
  if (rootNode && isShadowRoot(rootNode)) {
    let next2 = child;
    while (next2) {
      if (parent2 === next2)
        return true;
      next2 = next2.parentNode || next2.host;
    }
  }
  return false;
}
function getDocument(node) {
  if (isDocument(node))
    return node;
  if (isWindow(node))
    return node.document;
  return node?.ownerDocument ?? document;
}
function getWindow(node) {
  if (isShadowRoot(node))
    return getWindow(node.host);
  if (isDocument(node))
    return node.defaultView ?? window;
  if (isHTMLElement$1(node))
    return node.ownerDocument?.defaultView ?? window;
  return window;
}
function getActiveElement$3(rootNode) {
  let activeElement = rootNode.activeElement;
  while (activeElement?.shadowRoot) {
    const el = activeElement.shadowRoot.activeElement;
    if (el === activeElement)
      break;
    else
      activeElement = el;
  }
  return activeElement;
}
class DOMContext {
  element;
  #root = derived(() => {
    if (!this.element.current) return document;
    const rootNode = this.element.current.getRootNode() ?? document;
    return rootNode;
  });
  get root() {
    return this.#root();
  }
  set root($$value) {
    return this.#root($$value);
  }
  constructor(element2) {
    if (typeof element2 === "function") {
      this.element = box$1.with(element2);
    } else {
      this.element = element2;
    }
  }
  getDocument = () => {
    return getDocument(this.root);
  };
  getWindow = () => {
    return this.getDocument().defaultView ?? window;
  };
  getActiveElement = () => {
    return getActiveElement$3(this.root);
  };
  isActiveElement = (node) => {
    return node === this.getActiveElement();
  };
  getElementById(id) {
    return this.root.getElementById(id);
  }
  querySelector = (selector) => {
    if (!this.root) return null;
    return this.root.querySelector(selector);
  };
  querySelectorAll = (selector) => {
    if (!this.root) return [];
    return this.root.querySelectorAll(selector);
  };
  setTimeout = (callback, delay) => {
    return this.getWindow().setTimeout(callback, delay);
  };
  clearTimeout = (timeoutId) => {
    return this.getWindow().clearTimeout(timeoutId);
  };
}
function attachRef(ref, onChange) {
  return {
    [createAttachmentKey()]: (node) => {
      if (box$1.isBox(ref)) {
        ref.current = node;
        run(() => onChange?.(node));
        return () => {
          if ("isConnected" in node && node.isConnected)
            return;
          ref.current = null;
          onChange?.(null);
        };
      }
      ref(node);
      run(() => onChange?.(node));
      return () => {
        if ("isConnected" in node && node.isConnected)
          return;
        ref(null);
        onChange?.(null);
      };
    }
  };
}
const defaultWindow$2 = void 0;
function getActiveElement$2(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
let ActiveElement$2 = class ActiveElement2 {
  #document;
  #subscribe;
  constructor(options2 = {}) {
    const { window: window2 = defaultWindow$2, document: document2 = window2?.document } = options2;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement$2(this.#document);
  }
};
new ActiveElement$2();
function isFunction$1(value) {
  return typeof value === "function";
}
let Context$2 = class Context {
  #name;
  #key;
  /**
   * @param name The name of the context.
   * This is used for generating the context key and error messages.
   */
  constructor(name) {
    this.#name = name;
    this.#key = Symbol(name);
  }
  /**
   * The key used to get and set the context.
   *
   * It is not recommended to use this value directly.
   * Instead, use the methods provided by this class.
   */
  get key() {
    return this.#key;
  }
  /**
   * Checks whether this has been set in the context of a parent component.
   *
   * Must be called during component initialisation.
   */
  exists() {
    return hasContext(this.#key);
  }
  /**
   * Retrieves the context that belongs to the closest parent component.
   *
   * Must be called during component initialisation.
   *
   * @throws An error if the context does not exist.
   */
  get() {
    const context2 = getContext(this.#key);
    if (context2 === void 0) {
      throw new Error(`Context "${this.#name}" not found`);
    }
    return context2;
  }
  /**
   * Retrieves the context that belongs to the closest parent component,
   * or the given fallback value if the context does not exist.
   *
   * Must be called during component initialisation.
   */
  getOr(fallback) {
    const context2 = getContext(this.#key);
    if (context2 === void 0) {
      return fallback;
    }
    return context2;
  }
  /**
   * Associates the given value with the current component and returns it.
   *
   * Must be called during component initialisation.
   */
  set(context2) {
    return setContext(this.#key, context2);
  }
};
function runWatcher$1(sources, flush, effect, options2 = {}) {
  const { lazy = false } = options2;
}
function watch$1(sources, effect, options2) {
  runWatcher$1(sources, "post", effect, options2);
}
function watchPre$1(sources, effect, options2) {
  runWatcher$1(sources, "pre", effect, options2);
}
watch$1.pre = watchPre$1;
function get$1(value) {
  if (isFunction$1(value)) {
    return value();
  }
  return value;
}
class ElementSize {
  // no need to use `$state` here since we are using createSubscriber
  #size = { width: 0, height: 0 };
  #observed = false;
  #options;
  #node;
  #window;
  // we use a derived here to extract the width so that if the width doesn't change we don't get a state update
  // which we would get if we would just use a getter since the version of the subscriber will be changing
  #width = derived(() => {
    this.#subscribe()?.();
    return this.getSize().width;
  });
  // we use a derived here to extract the height so that if the height doesn't change we don't get a state update
  // which we would get if we would just use a getter since the version of the subscriber will be changing
  #height = derived(() => {
    this.#subscribe()?.();
    return this.getSize().height;
  });
  // we need to use a derived here because the class will be created before the node is bound to the ref
  #subscribe = derived(() => {
    const node$ = get$1(this.#node);
    if (!node$) return;
    return createSubscriber();
  });
  constructor(node, options2 = { box: "border-box" }) {
    this.#window = options2.window ?? defaultWindow$2;
    this.#options = options2;
    this.#node = node;
    this.#size = { width: 0, height: 0 };
  }
  calculateSize() {
    const element2 = get$1(this.#node);
    if (!element2 || !this.#window) {
      return;
    }
    const offsetWidth = element2.offsetWidth;
    const offsetHeight = element2.offsetHeight;
    if (this.#options.box === "border-box") {
      return { width: offsetWidth, height: offsetHeight };
    }
    const style = this.#window.getComputedStyle(element2);
    const paddingWidth = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingHeight = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const borderWidth = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const borderHeight = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const contentWidth = offsetWidth - paddingWidth - borderWidth;
    const contentHeight = offsetHeight - paddingHeight - borderHeight;
    return { width: contentWidth, height: contentHeight };
  }
  getSize() {
    return this.#observed ? this.#size : this.calculateSize() ?? this.#size;
  }
  get current() {
    this.#subscribe()?.();
    return this.getSize();
  }
  get width() {
    return this.#width();
  }
  get height() {
    return this.#height();
  }
}
class Previous {
  #previous = void 0;
  constructor(getter, initialValue) {
    if (initialValue !== void 0) this.#previous = initialValue;
    watch$1(() => getter(), (_, v) => {
      this.#previous = v;
    });
  }
  get current() {
    return this.#previous;
  }
}
function getDataOpenClosed(condition) {
  return condition ? "open" : "closed";
}
function getDataChecked(condition) {
  return condition ? "checked" : "unchecked";
}
function getAriaDisabled(condition) {
  return condition ? "true" : "false";
}
function getAriaReadonly(condition) {
  return condition ? "true" : "false";
}
function getAriaExpanded(condition) {
  return condition ? "true" : "false";
}
function getDataDisabled(condition) {
  return condition ? "" : void 0;
}
function getAriaRequired$1(condition) {
  return condition ? "true" : "false";
}
function getAriaSelected(condition) {
  return condition ? "true" : "false";
}
function getAriaChecked(checked, indeterminate) {
  if (indeterminate) {
    return "mixed";
  }
  return checked ? "true" : "false";
}
function getAriaOrientation(orientation) {
  return orientation;
}
function getAriaHidden(condition) {
  return condition ? "true" : void 0;
}
function getDataOrientation(orientation) {
  return orientation;
}
function getDataInvalid(condition) {
  return condition ? "" : void 0;
}
function getDataRequired(condition) {
  return condition ? "" : void 0;
}
function getDataReadonly(condition) {
  return condition ? "" : void 0;
}
function getDataSelected(condition) {
  return condition ? "" : void 0;
}
function getDataUnavailable(condition) {
  return condition ? "" : void 0;
}
function getHidden(condition) {
  return condition ? true : void 0;
}
function getDisabled(condition) {
  return condition ? true : void 0;
}
function getAriaPressed(condition) {
  return condition ? "true" : "false";
}
function getRequired(condition) {
  return condition ? true : void 0;
}
class BitsAttrs {
  #variant;
  #prefix;
  attrs;
  constructor(config) {
    this.#variant = config.getVariant ? config.getVariant() : null;
    this.#prefix = this.#variant ? `data-${this.#variant}-` : `data-${config.component}-`;
    this.getAttr = this.getAttr.bind(this);
    this.selector = this.selector.bind(this);
    this.attrs = Object.fromEntries(config.parts.map((part) => [part, this.getAttr(part)]));
  }
  getAttr(part, variantOverride) {
    if (variantOverride)
      return `data-${variantOverride}-${part}`;
    return `${this.#prefix}${part}`;
  }
  selector(part, variantOverride) {
    return `[${this.getAttr(part, variantOverride)}]`;
  }
}
function createBitsAttrs(config) {
  const bitsAttrs = new BitsAttrs(config);
  return {
    ...bitsAttrs.attrs,
    selector: bitsAttrs.selector,
    getAttr: bitsAttrs.getAttr
  };
}
const ARROW_DOWN = "ArrowDown";
const ARROW_LEFT = "ArrowLeft";
const ARROW_RIGHT = "ArrowRight";
const ARROW_UP = "ArrowUp";
const END = "End";
const ENTER = "Enter";
const ESCAPE = "Escape";
const HOME = "Home";
const PAGE_DOWN = "PageDown";
const PAGE_UP = "PageUp";
const SPACE = " ";
const TAB = "Tab";
const p = "p";
const n = "n";
const j = "j";
const k = "k";
const h = "h";
const l = "l";
function getElemDirection(elem) {
  const style = window.getComputedStyle(elem);
  const direction = style.getPropertyValue("direction");
  return direction;
}
function getNextKey(dir = "ltr", orientation = "horizontal") {
  return {
    horizontal: dir === "rtl" ? ARROW_LEFT : ARROW_RIGHT,
    vertical: ARROW_DOWN
  }[orientation];
}
function getPrevKey(dir = "ltr", orientation = "horizontal") {
  return {
    horizontal: dir === "rtl" ? ARROW_RIGHT : ARROW_LEFT,
    vertical: ARROW_UP
  }[orientation];
}
function getDirectionalKeys(dir = "ltr", orientation = "horizontal") {
  if (!["ltr", "rtl"].includes(dir))
    dir = "ltr";
  if (!["horizontal", "vertical"].includes(orientation))
    orientation = "horizontal";
  return {
    nextKey: getNextKey(dir, orientation),
    prevKey: getPrevKey(dir, orientation)
  };
}
class RovingFocusGroup {
  #opts;
  #currentTabStopId = box$1(null);
  constructor(opts) {
    this.#opts = opts;
  }
  getCandidateNodes() {
    return [];
  }
  focusFirstCandidate() {
    const items = this.getCandidateNodes();
    if (!items.length)
      return;
    items[0]?.focus();
  }
  handleKeydown(node, e, both = false) {
    const rootNode = this.#opts.rootNode.current;
    if (!rootNode || !node)
      return;
    const items = this.getCandidateNodes();
    if (!items.length)
      return;
    const currentIndex = items.indexOf(node);
    const dir = getElemDirection(rootNode);
    const { nextKey, prevKey } = getDirectionalKeys(dir, this.#opts.orientation.current);
    const loop2 = this.#opts.loop.current;
    const keyToIndex = {
      [nextKey]: currentIndex + 1,
      [prevKey]: currentIndex - 1,
      [HOME]: 0,
      [END]: items.length - 1
    };
    if (both) {
      const altNextKey = nextKey === ARROW_DOWN ? ARROW_RIGHT : ARROW_DOWN;
      const altPrevKey = prevKey === ARROW_UP ? ARROW_LEFT : ARROW_UP;
      keyToIndex[altNextKey] = currentIndex + 1;
      keyToIndex[altPrevKey] = currentIndex - 1;
    }
    let itemIndex = keyToIndex[e.key];
    if (itemIndex === void 0)
      return;
    e.preventDefault();
    if (itemIndex < 0 && loop2) {
      itemIndex = items.length - 1;
    } else if (itemIndex === items.length && loop2) {
      itemIndex = 0;
    }
    const itemToFocus = items[itemIndex];
    if (!itemToFocus)
      return;
    itemToFocus.focus();
    this.#currentTabStopId.current = itemToFocus.id;
    this.#opts.onCandidateFocus?.(itemToFocus);
    return itemToFocus;
  }
  getTabIndex(node) {
    const items = this.getCandidateNodes();
    const anyActive = this.#currentTabStopId.current !== null;
    if (node && !anyActive && items[0] === node) {
      this.#currentTabStopId.current = node.id;
      return 0;
    } else if (node?.id === this.#currentTabStopId.current) {
      return 0;
    }
    return -1;
  }
  setCurrentTabStopId(id) {
    this.#currentTabStopId.current = id;
  }
}
function noop() {
}
function createId$1(prefixOrUid, uid) {
  return `bits-${prefixOrUid}`;
}
class StateMachine {
  state;
  #machine;
  constructor(initialState, machine) {
    this.state = box$1(initialState);
    this.#machine = machine;
    this.dispatch = this.dispatch.bind(this);
  }
  #reducer(event) {
    const nextState = this.#machine[this.state.current][event];
    return nextState ?? this.state.current;
  }
  dispatch(event) {
    this.state.current = this.#reducer(event);
  }
}
const presenceMachine = {
  mounted: { UNMOUNT: "unmounted", ANIMATION_OUT: "unmountSuspended" },
  unmountSuspended: { MOUNT: "mounted", ANIMATION_END: "unmounted" },
  unmounted: { MOUNT: "mounted" }
};
class Presence {
  opts;
  prevAnimationNameState = "none";
  styles = {};
  initialStatus;
  previousPresent;
  machine;
  present;
  constructor(opts) {
    this.opts = opts;
    this.present = this.opts.open;
    this.initialStatus = opts.open.current ? "mounted" : "unmounted";
    this.previousPresent = new Previous(() => this.present.current);
    this.machine = new StateMachine(this.initialStatus, presenceMachine);
    this.handleAnimationEnd = this.handleAnimationEnd.bind(this);
    this.handleAnimationStart = this.handleAnimationStart.bind(this);
    watchPresenceChange(this);
    watchStatusChange(this);
    watchRefChange(this);
  }
  /**
   * Triggering an ANIMATION_OUT during an ANIMATION_IN will fire an `animationcancel`
   * event for ANIMATION_IN after we have entered `unmountSuspended` state. So, we
   * make sure we only trigger ANIMATION_END for the currently active animation.
   */
  handleAnimationEnd(event) {
    if (!this.opts.ref.current) return;
    const currAnimationName = getAnimationName(this.opts.ref.current);
    const isCurrentAnimation = currAnimationName.includes(event.animationName) || currAnimationName === "none";
    if (event.target === this.opts.ref.current && isCurrentAnimation) {
      this.machine.dispatch("ANIMATION_END");
    }
  }
  handleAnimationStart(event) {
    if (!this.opts.ref.current) return;
    if (event.target === this.opts.ref.current) {
      this.prevAnimationNameState = getAnimationName(this.opts.ref.current);
    }
  }
  #isPresent = derived(() => {
    return ["mounted", "unmountSuspended"].includes(this.machine.state.current);
  });
  get isPresent() {
    return this.#isPresent();
  }
  set isPresent($$value) {
    return this.#isPresent($$value);
  }
}
function watchPresenceChange(state2) {
  watch$1(() => state2.present.current, () => {
    if (!state2.opts.ref.current) return;
    const hasPresentChanged = state2.present.current !== state2.previousPresent.current;
    if (!hasPresentChanged) return;
    const prevAnimationName = state2.prevAnimationNameState;
    const currAnimationName = getAnimationName(state2.opts.ref.current);
    if (state2.present.current) {
      state2.machine.dispatch("MOUNT");
    } else if (currAnimationName === "none" || state2.styles.display === "none") {
      state2.machine.dispatch("UNMOUNT");
    } else {
      const isAnimating = prevAnimationName !== currAnimationName;
      if (state2.previousPresent.current && isAnimating) {
        state2.machine.dispatch("ANIMATION_OUT");
      } else {
        state2.machine.dispatch("UNMOUNT");
      }
    }
  });
}
function watchStatusChange(state2) {
  watch$1(() => state2.machine.state.current, () => {
    if (!state2.opts.ref.current) return;
    const currAnimationName = getAnimationName(state2.opts.ref.current);
    state2.prevAnimationNameState = state2.machine.state.current === "mounted" ? currAnimationName : "none";
  });
}
function watchRefChange(state2) {
  watch$1(() => state2.opts.ref.current, () => {
    if (!state2.opts.ref.current) return;
    state2.styles = getComputedStyle(state2.opts.ref.current);
    return executeCallbacks$1(on(state2.opts.ref.current, "animationstart", state2.handleAnimationStart), on(state2.opts.ref.current, "animationcancel", state2.handleAnimationEnd), on(state2.opts.ref.current, "animationend", state2.handleAnimationEnd));
  });
}
function getAnimationName(node) {
  return node ? getComputedStyle(node).animationName || "none" : "none";
}
Presence_layer[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/presence-layer/presence-layer.svelte";
function Presence_layer($$payload, $$props) {
  push(Presence_layer);
  let { open, forceMount, presence, ref } = $$props;
  const presenceState = new Presence({ open: box$1.with(() => open), ref });
  if (forceMount || open || presenceState.isPresent) {
    $$payload.out.push("<!--[-->");
    presence?.($$payload, { present: presenceState.isPresent });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Presence_layer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
class AnimationsComplete {
  #opts;
  #currentFrame = void 0;
  #isRunning = false;
  constructor(opts) {
    this.#opts = opts;
  }
  #cleanup() {
    if (this.#currentFrame) {
      window.cancelAnimationFrame(this.#currentFrame);
      this.#currentFrame = void 0;
    }
    this.#isRunning = false;
  }
  run(fn) {
    if (this.#isRunning)
      return;
    this.#cleanup();
    this.#isRunning = true;
    const node = this.#opts.ref.current;
    if (!node) {
      this.#isRunning = false;
      return;
    }
    if (typeof node.getAnimations !== "function") {
      this.#executeCallback(fn);
      return;
    }
    this.#currentFrame = window.requestAnimationFrame(() => {
      const animations = node.getAnimations();
      if (animations.length === 0) {
        this.#executeCallback(fn);
        return;
      }
      Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        this.#executeCallback(fn);
      });
    });
  }
  #executeCallback(fn) {
    const execute = () => {
      fn();
      this.#isRunning = false;
    };
    if (this.#opts.afterTick) {
      afterTick(execute);
    } else {
      execute();
    }
  }
}
class OpenChangeComplete {
  #opts;
  #enabled;
  #afterAnimations;
  constructor(opts) {
    this.#opts = opts;
    this.#enabled = opts.enabled ?? true;
    this.#afterAnimations = new AnimationsComplete({
      ref: this.#opts.ref,
      afterTick: this.#opts.open
    });
    watch$1([() => this.#opts.open.current], ([open]) => {
      if (!this.#enabled)
        return;
      this.#afterAnimations.run(() => {
        if (open === this.#opts.open.current) {
          this.#opts.onComplete();
        }
      });
    });
  }
}
const dialogAttrs = createBitsAttrs({
  component: "dialog",
  parts: [
    "content",
    "trigger",
    "overlay",
    "title",
    "description",
    "close",
    "cancel",
    "action"
  ]
});
const DialogRootContext = new Context$2("Dialog.Root | AlertDialog.Root");
class DialogRootState {
  static create(opts) {
    return DialogRootContext.set(new DialogRootState(opts));
  }
  opts;
  triggerNode = null;
  contentNode = null;
  descriptionNode = null;
  contentId = void 0;
  titleId = void 0;
  triggerId = void 0;
  descriptionId = void 0;
  cancelNode = null;
  constructor(opts) {
    this.opts = opts;
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    new OpenChangeComplete({
      ref: box$1.with(() => this.contentNode),
      open: this.opts.open,
      enabled: true,
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
  }
  handleOpen() {
    if (this.opts.open.current) return;
    this.opts.open.current = true;
  }
  handleClose() {
    if (!this.opts.open.current) return;
    this.opts.open.current = false;
  }
  getBitsAttr = (part) => {
    return dialogAttrs.getAttr(part, this.opts.variant.current);
  };
  #sharedProps = derived(() => ({ "data-state": getDataOpenClosed(this.opts.open.current) }));
  get sharedProps() {
    return this.#sharedProps();
  }
  set sharedProps($$value) {
    return this.#sharedProps($$value);
  }
}
class DialogCloseState {
  static create(opts) {
    return new DialogCloseState(opts, DialogRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  onclick(e) {
    if (this.opts.disabled.current) return;
    if (e.button > 0) return;
    this.root.handleClose();
  }
  onkeydown(e) {
    if (this.opts.disabled.current) return;
    if (e.key === SPACE || e.key === ENTER) {
      e.preventDefault();
      this.root.handleClose();
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [this.root.getBitsAttr(this.opts.variant.current)]: "",
    onclick: this.onclick,
    onkeydown: this.onkeydown,
    disabled: this.opts.disabled.current ? true : void 0,
    tabindex: 0,
    ...this.root.sharedProps,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class DialogActionState {
  static create(opts) {
    return new DialogActionState(opts, DialogRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [this.root.getBitsAttr("action")]: "",
    ...this.root.sharedProps,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class DialogTitleState {
  static create(opts) {
    return new DialogTitleState(opts, DialogRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.root.titleId = this.opts.id.current;
    this.attachment = attachRef(this.opts.ref);
    watch$1.pre(() => this.opts.id.current, (id) => {
      this.root.titleId = id;
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "heading",
    "aria-level": this.opts.level.current,
    [this.root.getBitsAttr("title")]: "",
    ...this.root.sharedProps,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class DialogDescriptionState {
  static create(opts) {
    return new DialogDescriptionState(opts, DialogRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.root.descriptionId = this.opts.id.current;
    this.attachment = attachRef(this.opts.ref, (v) => {
      this.root.descriptionNode = v;
    });
    watch$1.pre(() => this.opts.id.current, (id) => {
      this.root.descriptionId = id;
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [this.root.getBitsAttr("description")]: "",
    ...this.root.sharedProps,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class DialogContentState {
  static create(opts) {
    return new DialogContentState(opts, DialogRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref, (v) => {
      this.root.contentNode = v;
      this.root.contentId = v?.id;
    });
  }
  #snippetProps = derived(() => ({ open: this.root.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: this.root.opts.variant.current === "alert-dialog" ? "alertdialog" : "dialog",
    "aria-modal": "true",
    "aria-describedby": this.root.descriptionId,
    "aria-labelledby": this.root.titleId,
    [this.root.getBitsAttr("content")]: "",
    style: {
      pointerEvents: "auto",
      outline: this.root.opts.variant.current === "alert-dialog" ? "none" : void 0
    },
    tabindex: this.root.opts.variant.current === "alert-dialog" ? -1 : void 0,
    ...this.root.sharedProps,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class DialogOverlayState {
  static create(opts) {
    return new DialogOverlayState(opts, DialogRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #snippetProps = derived(() => ({ open: this.root.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [this.root.getBitsAttr("overlay")]: "",
    style: { pointerEvents: "auto" },
    ...this.root.sharedProps,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class AlertDialogCancelState {
  static create(opts) {
    return new AlertDialogCancelState(opts, DialogRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref, (v) => this.root.cancelNode = v);
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  onclick(e) {
    if (this.opts.disabled.current) return;
    if (e.button > 0) return;
    this.root.handleClose();
  }
  onkeydown(e) {
    if (this.opts.disabled.current) return;
    if (e.key === SPACE || e.key === ENTER) {
      e.preventDefault();
      this.root.handleClose();
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [this.root.getBitsAttr("cancel")]: "",
    onclick: this.onclick,
    onkeydown: this.onkeydown,
    tabindex: 0,
    ...this.root.sharedProps,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
Alert_dialog[FILENAME] = "node_modules/bits-ui/dist/bits/alert-dialog/components/alert-dialog.svelte";
function Alert_dialog($$payload, $$props) {
  push(Alert_dialog);
  let {
    open = false,
    onOpenChange = noop,
    onOpenChangeComplete = noop,
    children
  } = $$props;
  DialogRootState.create({
    variant: box$1.with(() => "alert-dialog"),
    open: box$1.with(() => open, (v) => {
      open = v;
      onOpenChange(v);
    }),
    onOpenChangeComplete: box$1.with(() => onOpenChangeComplete)
  });
  children?.($$payload);
  $$payload.out.push(`<!---->`);
  bind_props($$props, { open });
  pop();
}
Alert_dialog.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_title[FILENAME] = "node_modules/bits-ui/dist/bits/dialog/components/dialog-title.svelte";
function Dialog_title($$payload, $$props) {
  push(Dialog_title);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    child,
    children,
    level = 2,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const titleState = DialogTitleState.create({
    id: box$1.with(() => id),
    level: box$1.with(() => level),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, titleState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 33, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Dialog_title.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_action[FILENAME] = "node_modules/bits-ui/dist/bits/alert-dialog/components/alert-dialog-action.svelte";
function Alert_dialog_action($$payload, $$props) {
  push(Alert_dialog_action);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const actionState = DialogActionState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, actionState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_action.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_cancel[FILENAME] = "node_modules/bits-ui/dist/bits/alert-dialog/components/alert-dialog-cancel.svelte";
function Alert_dialog_cancel($$payload, $$props) {
  push(Alert_dialog_cancel);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    children,
    child,
    disabled = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const cancelState = AlertDialogCancelState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    disabled: box$1.with(() => Boolean(disabled))
  });
  const mergedProps = mergeProps$1(restProps, cancelState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 33, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_cancel.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const isBrowser = typeof document !== "undefined";
const isIOS = getIsIOS();
function getIsIOS() {
  return isBrowser && window?.navigator?.userAgent && (/iP(ad|hone|od)/.test(window.navigator.userAgent) || // The new iPad Pro Gen3 does not identify itself as iPad, but as Macintosh.
  window?.navigator?.maxTouchPoints > 2 && /iPad|Macintosh/.test(window?.navigator.userAgent));
}
function isHTMLElement(element2) {
  return element2 instanceof HTMLElement;
}
function isElement(element2) {
  return element2 instanceof Element;
}
function isElementOrSVGElement(element2) {
  return element2 instanceof Element || element2 instanceof SVGElement;
}
function isFocusVisible(element2) {
  return element2.matches(":focus-visible");
}
function isNotNull(value) {
  return value !== null;
}
function isSelectableInput(element2) {
  return element2 instanceof HTMLInputElement && "select" in element2;
}
const BitsConfigContext = new Context$2("BitsConfig");
function getBitsConfig() {
  const fallback = new BitsConfigState(null, {});
  return BitsConfigContext.getOr(fallback).opts;
}
class BitsConfigState {
  opts;
  constructor(parent2, opts) {
    const resolveConfigOption = createConfigResolver(parent2, opts);
    this.opts = {
      defaultPortalTo: resolveConfigOption((config) => config.defaultPortalTo),
      defaultLocale: resolveConfigOption((config) => config.defaultLocale)
    };
  }
}
function createConfigResolver(parent2, currentOpts) {
  return (getter) => {
    const configOption = box$1.with(() => {
      const value = getter(currentOpts)?.current;
      if (value !== void 0)
        return value;
      if (parent2 === null)
        return void 0;
      return getter(parent2.opts)?.current;
    });
    return configOption;
  };
}
function createPropResolver(configOption, fallback) {
  return (getProp) => {
    const config = getBitsConfig();
    return box$1.with(() => {
      const propValue = getProp();
      if (propValue !== void 0)
        return propValue;
      const option = configOption(config).current;
      if (option !== void 0)
        return option;
      return fallback;
    });
  };
}
const resolveLocaleProp = createPropResolver((config) => config.defaultLocale, "en");
const resolvePortalToProp = createPropResolver((config) => config.defaultPortalTo, "body");
Portal[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/portal/portal.svelte";
function Portal($$payload, $$props) {
  push(Portal);
  let { to: toProp, children, disabled } = $$props;
  const to = resolvePortalToProp(() => toProp);
  getAllContexts();
  let target = getTarget();
  function getTarget() {
    if (!isBrowser || disabled) return null;
    let localTarget = null;
    if (typeof to.current === "string") {
      const target2 = document.querySelector(to.current);
      if (target2 === null) {
        throw new Error(`Target element "${to.current}" not found.`);
      }
      localTarget = target2;
    } else {
      localTarget = to.current;
    }
    if (!(localTarget instanceof Element)) {
      const type = localTarget === null ? "null" : typeof localTarget;
      throw new TypeError(`Unknown portal target type: ${type}. Allowed types: string (query selector) or Element.`);
    }
    return localTarget;
  }
  let instance;
  function unmountInstance() {
    if (instance) {
      unmount();
      instance = null;
    }
  }
  watch$1([() => target, () => disabled], ([target2, disabled2]) => {
    if (!target2 || disabled2) {
      unmountInstance();
      return;
    }
    instance = mount();
    return () => {
      unmountInstance();
    };
  });
  if (disabled) {
    $$payload.out.push("<!--[-->");
    children?.($$payload);
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Portal.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function addEventListener(target, event, handler, options2) {
  const events = Array.isArray(event) ? event : [event];
  events.forEach((_event) => target.addEventListener(_event, handler, options2));
  return () => {
    events.forEach((_event) => target.removeEventListener(_event, handler, options2));
  };
}
class CustomEventDispatcher {
  eventName;
  options;
  constructor(eventName, options2 = { bubbles: true, cancelable: true }) {
    this.eventName = eventName;
    this.options = options2;
  }
  createEvent(detail) {
    return new CustomEvent(this.eventName, {
      ...this.options,
      detail
    });
  }
  dispatch(element2, detail) {
    const event = this.createEvent(detail);
    element2.dispatchEvent(event);
    return event;
  }
  listen(element2, callback, options2) {
    const handler = (event) => {
      callback(event);
    };
    return on(element2, this.eventName, handler, options2);
  }
}
function debounce(fn, wait = 500) {
  let timeout = null;
  const debounced = (...args) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      fn(...args);
    }, wait);
  };
  debounced.destroy = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced;
}
function isOrContainsTarget(node, target) {
  return node === target || node.contains(target);
}
function getOwnerDocument(el) {
  return el?.ownerDocument ?? document;
}
function getFirstNonCommentChild(element2) {
  if (!element2)
    return null;
  for (const child of element2.childNodes) {
    if (child.nodeType !== Node.COMMENT_NODE) {
      return child;
    }
  }
  return null;
}
function isClickTrulyOutside(event, contentNode) {
  const { clientX, clientY } = event;
  const rect = contentNode.getBoundingClientRect();
  return clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom;
}
globalThis.bitsDismissableLayers ??= /* @__PURE__ */ new Map();
class DismissibleLayerState {
  static create(opts) {
    return new DismissibleLayerState(opts);
  }
  opts;
  #interactOutsideProp;
  #behaviorType;
  #interceptedEvents = { pointerdown: false };
  #isResponsibleLayer = false;
  #isFocusInsideDOMTree = false;
  #documentObj = void 0;
  #onFocusOutside;
  #unsubClickListener = noop;
  constructor(opts) {
    this.opts = opts;
    this.#behaviorType = opts.interactOutsideBehavior;
    this.#interactOutsideProp = opts.onInteractOutside;
    this.#onFocusOutside = opts.onFocusOutside;
    let unsubEvents = noop;
    const cleanup = () => {
      this.#resetState();
      globalThis.bitsDismissableLayers.delete(this);
      this.#handleInteractOutside.destroy();
      unsubEvents();
    };
    watch$1([() => this.opts.enabled.current, () => this.opts.ref.current], () => {
      if (!this.opts.enabled.current || !this.opts.ref.current) return;
      afterSleep(1, () => {
        if (!this.opts.ref.current) return;
        globalThis.bitsDismissableLayers.set(this, this.#behaviorType);
        unsubEvents();
        unsubEvents = this.#addEventListeners();
      });
      return cleanup;
    });
  }
  #handleFocus = (event) => {
    if (event.defaultPrevented) return;
    if (!this.opts.ref.current) return;
    afterTick(() => {
      if (!this.opts.ref.current || this.#isTargetWithinLayer(event.target)) return;
      if (event.target && !this.#isFocusInsideDOMTree) {
        this.#onFocusOutside.current?.(event);
      }
    });
  };
  #addEventListeners() {
    return executeCallbacks$1(
      /**
       * CAPTURE INTERACTION START
       * mark interaction-start event as intercepted.
       * mark responsible layer during interaction start
       * to avoid checking if is responsible layer during interaction end
       * when a new floating element may have been opened.
       */
      on(this.#documentObj, "pointerdown", executeCallbacks$1(this.#markInterceptedEvent, this.#markResponsibleLayer), { capture: true }),
      /**
       * BUBBLE INTERACTION START
       * Mark interaction-start event as non-intercepted. Debounce `onInteractOutsideStart`
       * to avoid prematurely checking if other events were intercepted.
       */
      on(this.#documentObj, "pointerdown", executeCallbacks$1(this.#markNonInterceptedEvent, this.#handleInteractOutside)),
      /**
       * HANDLE FOCUS OUTSIDE
       */
      on(this.#documentObj, "focusin", this.#handleFocus)
    );
  }
  #handleDismiss = (e) => {
    let event = e;
    if (event.defaultPrevented) {
      event = createWrappedEvent(e);
    }
    this.#interactOutsideProp.current(e);
  };
  #handleInteractOutside = debounce(
    (e) => {
      if (!this.opts.ref.current) {
        this.#unsubClickListener();
        return;
      }
      const isEventValid = this.opts.isValidEvent.current(e, this.opts.ref.current) || isValidEvent(e, this.opts.ref.current);
      if (!this.#isResponsibleLayer || this.#isAnyEventIntercepted() || !isEventValid) {
        this.#unsubClickListener();
        return;
      }
      let event = e;
      if (event.defaultPrevented) {
        event = createWrappedEvent(event);
      }
      if (this.#behaviorType.current !== "close" && this.#behaviorType.current !== "defer-otherwise-close") {
        this.#unsubClickListener();
        return;
      }
      if (e.pointerType === "touch") {
        this.#unsubClickListener();
        this.#unsubClickListener = addEventListener(this.#documentObj, "click", this.#handleDismiss, { once: true });
      } else {
        this.#interactOutsideProp.current(event);
      }
    },
    10
  );
  #markInterceptedEvent = (e) => {
    this.#interceptedEvents[e.type] = true;
  };
  #markNonInterceptedEvent = (e) => {
    this.#interceptedEvents[e.type] = false;
  };
  #markResponsibleLayer = () => {
    if (!this.opts.ref.current) return;
    this.#isResponsibleLayer = isResponsibleLayer(this.opts.ref.current);
  };
  #isTargetWithinLayer = (target) => {
    if (!this.opts.ref.current) return false;
    return isOrContainsTarget(this.opts.ref.current, target);
  };
  #resetState = debounce(
    () => {
      for (const eventType in this.#interceptedEvents) {
        this.#interceptedEvents[eventType] = false;
      }
      this.#isResponsibleLayer = false;
    },
    20
  );
  #isAnyEventIntercepted() {
    const i = Object.values(this.#interceptedEvents).some(Boolean);
    return i;
  }
  #onfocuscapture = () => {
    this.#isFocusInsideDOMTree = true;
  };
  #onblurcapture = () => {
    this.#isFocusInsideDOMTree = false;
  };
  props = {
    onfocuscapture: this.#onfocuscapture,
    onblurcapture: this.#onblurcapture
  };
}
function getTopMostLayer(layersArr) {
  return layersArr.findLast(([_, { current: behaviorType }]) => behaviorType === "close" || behaviorType === "ignore");
}
function isResponsibleLayer(node) {
  const layersArr = [...globalThis.bitsDismissableLayers];
  const topMostLayer = getTopMostLayer(layersArr);
  if (topMostLayer) return topMostLayer[0].opts.ref.current === node;
  const [firstLayerNode] = layersArr[0];
  return firstLayerNode.opts.ref.current === node;
}
function isValidEvent(e, node) {
  if ("button" in e && e.button > 0) return false;
  const target = e.target;
  if (!isElement(target)) return false;
  const ownerDocument = getOwnerDocument(target);
  const isValid = ownerDocument.documentElement.contains(target) && !isOrContainsTarget(node, target) && isClickTrulyOutside(e, node);
  return isValid;
}
function createWrappedEvent(e) {
  const capturedCurrentTarget = e.currentTarget;
  const capturedTarget = e.target;
  let newEvent;
  if (e instanceof PointerEvent) {
    newEvent = new PointerEvent(e.type, e);
  } else {
    newEvent = new PointerEvent("pointerdown", e);
  }
  let isPrevented = false;
  const wrappedEvent = new Proxy(newEvent, {
    get: (target, prop) => {
      if (prop === "currentTarget") {
        return capturedCurrentTarget;
      }
      if (prop === "target") {
        return capturedTarget;
      }
      if (prop === "preventDefault") {
        return () => {
          isPrevented = true;
          if (typeof target.preventDefault === "function") {
            target.preventDefault();
          }
        };
      }
      if (prop === "defaultPrevented") {
        return isPrevented;
      }
      if (prop in target) {
        return target[prop];
      }
      return e[prop];
    }
  });
  return wrappedEvent;
}
Dismissible_layer[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/dismissible-layer/dismissible-layer.svelte";
function Dismissible_layer($$payload, $$props) {
  push(Dismissible_layer);
  let {
    interactOutsideBehavior = "close",
    onInteractOutside = noop,
    onFocusOutside = noop,
    id,
    children,
    enabled,
    isValidEvent: isValidEvent2 = () => false,
    ref
  } = $$props;
  const dismissibleLayerState = DismissibleLayerState.create({
    id: box$1.with(() => id),
    interactOutsideBehavior: box$1.with(() => interactOutsideBehavior),
    onInteractOutside: box$1.with(() => onInteractOutside),
    enabled: box$1.with(() => enabled),
    onFocusOutside: box$1.with(() => onFocusOutside),
    isValidEvent: box$1.with(() => isValidEvent2),
    ref
  });
  children?.($$payload, { props: dismissibleLayerState.props });
  $$payload.out.push(`<!---->`);
  pop();
}
Dismissible_layer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
globalThis.bitsEscapeLayers ??= /* @__PURE__ */ new Map();
class EscapeLayerState {
  static create(opts) {
    return new EscapeLayerState(opts);
  }
  opts;
  domContext;
  constructor(opts) {
    this.opts = opts;
    this.domContext = new DOMContext(this.opts.ref);
    let unsubEvents = noop;
    watch$1(() => opts.enabled.current, (enabled) => {
      if (enabled) {
        globalThis.bitsEscapeLayers.set(this, opts.escapeKeydownBehavior);
        unsubEvents = this.#addEventListener();
      }
      return () => {
        unsubEvents();
        globalThis.bitsEscapeLayers.delete(this);
      };
    });
  }
  #addEventListener = () => {
    return on(this.domContext.getDocument(), "keydown", this.#onkeydown, { passive: false });
  };
  #onkeydown = (e) => {
    if (e.key !== ESCAPE || !isResponsibleEscapeLayer(this)) return;
    const clonedEvent = new KeyboardEvent(e.type, e);
    e.preventDefault();
    const behaviorType = this.opts.escapeKeydownBehavior.current;
    if (behaviorType !== "close" && behaviorType !== "defer-otherwise-close") return;
    this.opts.onEscapeKeydown.current(clonedEvent);
  };
}
function isResponsibleEscapeLayer(instance) {
  const layersArr = [...globalThis.bitsEscapeLayers];
  const topMostLayer = layersArr.findLast(([_, { current: behaviorType }]) => behaviorType === "close" || behaviorType === "ignore");
  if (topMostLayer) return topMostLayer[0] === instance;
  const [firstLayerNode] = layersArr[0];
  return firstLayerNode === instance;
}
Escape_layer[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/escape-layer/escape-layer.svelte";
function Escape_layer($$payload, $$props) {
  push(Escape_layer);
  let {
    escapeKeydownBehavior = "close",
    onEscapeKeydown = noop,
    children,
    enabled,
    ref
  } = $$props;
  EscapeLayerState.create({
    escapeKeydownBehavior: box$1.with(() => escapeKeydownBehavior),
    onEscapeKeydown: box$1.with(() => onEscapeKeydown),
    enabled: box$1.with(() => enabled),
    ref
  });
  children?.($$payload);
  $$payload.out.push(`<!---->`);
  pop();
}
Escape_layer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
class FocusScopeManager {
  static instance;
  #scopeStack = box$1([]);
  #focusHistory = /* @__PURE__ */ new WeakMap();
  static getInstance() {
    if (!this.instance) {
      this.instance = new FocusScopeManager();
    }
    return this.instance;
  }
  register(scope) {
    const current = this.getActive();
    if (current && current !== scope) {
      current.pause();
    }
    this.#scopeStack.current = this.#scopeStack.current.filter((s2) => s2 !== scope);
    this.#scopeStack.current.unshift(scope);
  }
  unregister(scope) {
    this.#scopeStack.current = this.#scopeStack.current.filter((s2) => s2 !== scope);
    const next2 = this.getActive();
    if (next2) {
      next2.resume();
    }
  }
  getActive() {
    return this.#scopeStack.current[0];
  }
  setFocusMemory(scope, element2) {
    this.#focusHistory.set(scope, element2);
  }
  getFocusMemory(scope) {
    return this.#focusHistory.get(scope);
  }
  isActiveScope(scope) {
    return this.getActive() === scope;
  }
}
class FocusScope {
  #paused = false;
  #container = null;
  #manager = FocusScopeManager.getInstance();
  #cleanupFns = [];
  #opts;
  constructor(opts) {
    this.#opts = opts;
  }
  get paused() {
    return this.#paused;
  }
  pause() {
    this.#paused = true;
  }
  resume() {
    this.#paused = false;
  }
  #cleanup() {
    for (const fn of this.#cleanupFns) {
      fn();
    }
    this.#cleanupFns = [];
  }
  mount(container) {
    if (this.#container) {
      this.unmount();
    }
    this.#container = container;
    this.#manager.register(this);
    this.#setupEventListeners();
    this.#handleOpenAutoFocus();
  }
  unmount() {
    if (!this.#container) return;
    this.#cleanup();
    this.#handleCloseAutoFocus();
    this.#manager.unregister(this);
    this.#container = null;
  }
  #handleOpenAutoFocus() {
    if (!this.#container) return;
    const event = new CustomEvent("focusScope.onOpenAutoFocus", { bubbles: false, cancelable: true });
    this.#opts.onOpenAutoFocus.current(event);
    if (!event.defaultPrevented) {
      requestAnimationFrame(() => {
        if (!this.#container) return;
        const firstTabbable = this.#getFirstTabbable();
        if (firstTabbable) {
          firstTabbable.focus();
          this.#manager.setFocusMemory(this, firstTabbable);
        } else {
          this.#container.focus();
        }
      });
    }
  }
  #handleCloseAutoFocus() {
    const event = new CustomEvent("focusScope.onCloseAutoFocus", { bubbles: false, cancelable: true });
    this.#opts.onCloseAutoFocus.current?.(event);
    if (!event.defaultPrevented) {
      const prevFocused = document.activeElement;
      if (prevFocused && prevFocused !== document.body) {
        prevFocused.focus();
      }
    }
  }
  #setupEventListeners() {
    if (!this.#container || !this.#opts.trap.current) return;
    const container = this.#container;
    const doc = container.ownerDocument;
    const handleFocus = (e) => {
      if (this.#paused || !this.#manager.isActiveScope(this)) return;
      const target = e.target;
      if (!target) return;
      const isInside = container.contains(target);
      if (isInside) {
        this.#manager.setFocusMemory(this, target);
      } else {
        const lastFocused = this.#manager.getFocusMemory(this);
        if (lastFocused && container.contains(lastFocused) && isFocusable(lastFocused)) {
          e.preventDefault();
          lastFocused.focus();
        } else {
          const firstTabbable = this.#getFirstTabbable();
          const firstFocusable = this.#getAllFocusables()[0];
          (firstTabbable || firstFocusable || container).focus();
        }
      }
    };
    const handleKeydown = (e) => {
      if (!this.#opts.loop || this.#paused || e.key !== "Tab") return;
      if (!this.#manager.isActiveScope(this)) return;
      const tabbables = this.#getTabbables();
      if (tabbables.length < 2) return;
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      if (!e.shiftKey && doc.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && doc.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };
    this.#cleanupFns.push(on(doc, "focusin", handleFocus, { capture: true }), on(container, "keydown", handleKeydown));
    const observer = new MutationObserver(() => {
      const lastFocused = this.#manager.getFocusMemory(this);
      if (lastFocused && !container.contains(lastFocused)) {
        const firstTabbable = this.#getFirstTabbable();
        const firstFocusable = this.#getAllFocusables()[0];
        const elementToFocus = firstTabbable || firstFocusable;
        if (elementToFocus) {
          elementToFocus.focus();
          this.#manager.setFocusMemory(this, elementToFocus);
        } else {
          container.focus();
        }
      }
    });
    observer.observe(container, { childList: true, subtree: true });
    this.#cleanupFns.push(() => observer.disconnect());
  }
  #getTabbables() {
    if (!this.#container) return [];
    return tabbable(this.#container, { includeContainer: false, getShadowRoot: true });
  }
  #getFirstTabbable() {
    const tabbables = this.#getTabbables();
    return tabbables[0] || null;
  }
  #getAllFocusables() {
    if (!this.#container) return [];
    return focusable(this.#container, { includeContainer: false, getShadowRoot: true });
  }
  static use(opts) {
    let scope = null;
    watch$1([() => opts.ref.current, () => opts.enabled.current], ([ref, enabled]) => {
      if (ref && enabled) {
        if (!scope) {
          scope = new FocusScope(opts);
        }
        scope.mount(ref);
      } else if (scope) {
        scope.unmount();
        scope = null;
      }
    });
    return {
      get props() {
        return { tabindex: -1 };
      }
    };
  }
}
Focus_scope[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte";
function Focus_scope($$payload, $$props) {
  push(Focus_scope);
  let {
    enabled = false,
    trapFocus = false,
    loop: loop2 = false,
    onCloseAutoFocus = noop,
    onOpenAutoFocus = noop,
    focusScope,
    ref
  } = $$props;
  const focusScopeState = FocusScope.use({
    enabled: box$1.with(() => enabled),
    trap: box$1.with(() => trapFocus),
    loop: loop2,
    onCloseAutoFocus: box$1.with(() => onCloseAutoFocus),
    onOpenAutoFocus: box$1.with(() => onOpenAutoFocus),
    ref
  });
  focusScope?.($$payload, { props: focusScopeState.props });
  $$payload.out.push(`<!---->`);
  pop();
}
Focus_scope.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
globalThis.bitsTextSelectionLayers ??= /* @__PURE__ */ new Map();
class TextSelectionLayerState {
  static create(opts) {
    return new TextSelectionLayerState(opts);
  }
  opts;
  domContext;
  #unsubSelectionLock = noop;
  constructor(opts) {
    this.opts = opts;
    this.domContext = new DOMContext(opts.ref);
    let unsubEvents = noop;
    watch$1(() => this.opts.enabled.current, (isEnabled) => {
      if (isEnabled) {
        globalThis.bitsTextSelectionLayers.set(this, this.opts.enabled);
        unsubEvents();
        unsubEvents = this.#addEventListeners();
      }
      return () => {
        unsubEvents();
        this.#resetSelectionLock();
        globalThis.bitsTextSelectionLayers.delete(this);
      };
    });
  }
  #addEventListeners() {
    return executeCallbacks$1(on(this.domContext.getDocument(), "pointerdown", this.#pointerdown), on(this.domContext.getDocument(), "pointerup", composeHandlers$1(this.#resetSelectionLock, this.opts.onPointerUp.current)));
  }
  #pointerdown = (e) => {
    const node = this.opts.ref.current;
    const target = e.target;
    if (!isHTMLElement(node) || !isHTMLElement(target) || !this.opts.enabled.current) return;
    if (!isHighestLayer(this) || !contains(node, target)) return;
    this.opts.onPointerDown.current(e);
    if (e.defaultPrevented) return;
    this.#unsubSelectionLock = preventTextSelectionOverflow(node, this.domContext.getDocument().body);
  };
  #resetSelectionLock = () => {
    this.#unsubSelectionLock();
    this.#unsubSelectionLock = noop;
  };
}
const getUserSelect = (node) => node.style.userSelect || node.style.webkitUserSelect;
function preventTextSelectionOverflow(node, body2) {
  const originalBodyUserSelect = getUserSelect(body2);
  const originalNodeUserSelect = getUserSelect(node);
  setUserSelect(body2, "none");
  setUserSelect(node, "text");
  return () => {
    setUserSelect(body2, originalBodyUserSelect);
    setUserSelect(node, originalNodeUserSelect);
  };
}
function setUserSelect(node, value) {
  node.style.userSelect = value;
  node.style.webkitUserSelect = value;
}
function isHighestLayer(instance) {
  const layersArr = [...globalThis.bitsTextSelectionLayers];
  if (!layersArr.length) return false;
  const highestLayer = layersArr.at(-1);
  if (!highestLayer) return false;
  return highestLayer[0] === instance;
}
Text_selection_layer[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/text-selection-layer/text-selection-layer.svelte";
function Text_selection_layer($$payload, $$props) {
  push(Text_selection_layer);
  let {
    preventOverflowTextSelection = true,
    onPointerDown = noop,
    onPointerUp = noop,
    id,
    children,
    enabled,
    ref
  } = $$props;
  TextSelectionLayerState.create({
    id: box$1.with(() => id),
    onPointerDown: box$1.with(() => onPointerDown),
    onPointerUp: box$1.with(() => onPointerUp),
    enabled: box$1.with(() => enabled && preventOverflowTextSelection),
    ref
  });
  children?.($$payload);
  $$payload.out.push(`<!---->`);
  pop();
}
Text_selection_layer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
globalThis.bitsIdCounter ??= { current: 0 };
function useId$1(prefix = "bits") {
  globalThis.bitsIdCounter.current++;
  return `${prefix}-${globalThis.bitsIdCounter.current}`;
}
class SharedState {
  #factory;
  #subscribers = 0;
  #state;
  #scope;
  constructor(factory) {
    this.#factory = factory;
  }
  #dispose() {
    this.#subscribers -= 1;
    if (this.#scope && this.#subscribers <= 0) {
      this.#scope();
      this.#state = void 0;
      this.#scope = void 0;
    }
  }
  get(...args) {
    this.#subscribers += 1;
    if (this.#state === void 0) {
      this.#scope = () => {
      };
    }
    return this.#state;
  }
}
const lockMap = new SvelteMap();
let initialBodyStyle = null;
let cleanupTimeoutId = null;
const anyLocked = box$1.with(() => {
  for (const value of lockMap.values()) {
    if (value) return true;
  }
  return false;
});
let cleanupScheduledAt = null;
const bodyLockStackCount = new SharedState(() => {
  function resetBodyStyle() {
    return;
  }
  function cancelPendingCleanup() {
    if (cleanupTimeoutId === null) return;
    window.clearTimeout(cleanupTimeoutId);
    cleanupTimeoutId = null;
  }
  function scheduleCleanupIfNoNewLocks(delay, callback) {
    cancelPendingCleanup();
    cleanupScheduledAt = Date.now();
    const currentCleanupId = cleanupScheduledAt;
    const cleanupFn = () => {
      cleanupTimeoutId = null;
      if (cleanupScheduledAt !== currentCleanupId) return;
      if (!isAnyLocked(lockMap)) {
        callback();
      }
    };
    if (delay === null) {
      cleanupTimeoutId = window.setTimeout(cleanupFn, 16);
    } else {
      cleanupTimeoutId = window.setTimeout(cleanupFn, delay);
    }
  }
  let hasEverBeenLocked = false;
  function ensureInitialStyleCaptured() {
    if (!hasEverBeenLocked && initialBodyStyle === null) {
      initialBodyStyle = document.body.getAttribute("style");
      hasEverBeenLocked = true;
    }
  }
  watch$1(() => anyLocked.current, () => {
    if (!anyLocked.current) return;
    ensureInitialStyleCaptured();
    const bodyStyle = getComputedStyle(document.body);
    const verticalScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const paddingRight = Number.parseInt(bodyStyle.paddingRight ?? "0", 10);
    const config = {
      padding: paddingRight + verticalScrollbarWidth,
      margin: Number.parseInt(bodyStyle.marginRight ?? "0", 10)
    };
    if (verticalScrollbarWidth > 0) {
      document.body.style.paddingRight = `${config.padding}px`;
      document.body.style.marginRight = `${config.margin}px`;
      document.body.style.setProperty("--scrollbar-width", `${verticalScrollbarWidth}px`);
      document.body.style.overflow = "hidden";
    }
    if (isIOS) {
      addEventListener(
        document,
        "touchmove",
        (e) => {
          if (e.target !== document.documentElement) return;
          if (e.touches.length > 1) return;
          e.preventDefault();
        },
        { passive: false }
      );
    }
    afterTick(() => {
      document.body.style.pointerEvents = "none";
      document.body.style.overflow = "hidden";
    });
  });
  return {
    get lockMap() {
      return lockMap;
    },
    resetBodyStyle,
    scheduleCleanupIfNoNewLocks,
    cancelPendingCleanup,
    ensureInitialStyleCaptured
  };
});
class BodyScrollLock {
  #id = useId$1();
  #initialState;
  #restoreScrollDelay = () => null;
  #countState;
  locked;
  constructor(initialState, restoreScrollDelay = () => null) {
    this.#initialState = initialState;
    this.#restoreScrollDelay = restoreScrollDelay;
    this.#countState = bodyLockStackCount.get();
    if (!this.#countState) return;
    this.#countState.cancelPendingCleanup();
    this.#countState.ensureInitialStyleCaptured();
    this.#countState.lockMap.set(this.#id, this.#initialState ?? false);
    this.locked = box$1.with(() => this.#countState.lockMap.get(this.#id) ?? false, (v) => this.#countState.lockMap.set(this.#id, v));
  }
}
function isAnyLocked(map) {
  for (const [_, value] of map) {
    if (value) return true;
  }
  return false;
}
Scroll_lock[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/scroll-lock/scroll-lock.svelte";
function Scroll_lock($$payload, $$props) {
  push(Scroll_lock);
  let { preventScroll = true, restoreScrollDelay = null } = $$props;
  if (preventScroll) {
    new BodyScrollLock(preventScroll, () => restoreScrollDelay);
  }
  pop();
}
Scroll_lock.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function shouldEnableFocusTrap({ forceMount, present, open }) {
  if (forceMount)
    return open;
  return present && open;
}
Alert_dialog_content[FILENAME] = "node_modules/bits-ui/dist/bits/alert-dialog/components/alert-dialog-content.svelte";
function Alert_dialog_content($$payload, $$props) {
  push(Alert_dialog_content);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    children,
    child,
    ref = null,
    forceMount = false,
    interactOutsideBehavior = "ignore",
    onCloseAutoFocus = noop,
    onEscapeKeydown = noop,
    onOpenAutoFocus = noop,
    onInteractOutside = noop,
    preventScroll = true,
    trapFocus = true,
    restoreScrollDelay = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = DialogContentState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, contentState.props);
  {
    let presence = function($$payload2) {
      validate_snippet_args($$payload2);
      {
        let focusScope = function($$payload3, { props: focusScopeProps }) {
          validate_snippet_args($$payload3);
          Escape_layer($$payload3, spread_props([
            mergedProps,
            {
              enabled: contentState.root.opts.open.current,
              ref: contentState.opts.ref,
              onEscapeKeydown: (e) => {
                onEscapeKeydown(e);
                if (e.defaultPrevented) return;
                contentState.root.handleClose();
              },
              children: prevent_snippet_stringification(($$payload4) => {
                Dismissible_layer($$payload4, spread_props([
                  mergedProps,
                  {
                    ref: contentState.opts.ref,
                    enabled: contentState.root.opts.open.current,
                    interactOutsideBehavior,
                    onInteractOutside: (e) => {
                      onInteractOutside(e);
                      if (e.defaultPrevented) return;
                      contentState.root.handleClose();
                    },
                    children: prevent_snippet_stringification(($$payload5) => {
                      Text_selection_layer($$payload5, spread_props([
                        mergedProps,
                        {
                          ref: contentState.opts.ref,
                          enabled: contentState.root.opts.open.current,
                          children: prevent_snippet_stringification(($$payload6) => {
                            if (child) {
                              $$payload6.out.push("<!--[-->");
                              if (contentState.root.opts.open.current) {
                                $$payload6.out.push("<!--[-->");
                                Scroll_lock($$payload6, { preventScroll, restoreScrollDelay });
                              } else {
                                $$payload6.out.push("<!--[!-->");
                              }
                              $$payload6.out.push(`<!--]--> `);
                              child($$payload6, {
                                props: mergeProps$1(mergedProps, focusScopeProps),
                                ...contentState.snippetProps
                              });
                              $$payload6.out.push(`<!---->`);
                            } else {
                              $$payload6.out.push("<!--[!-->");
                              Scroll_lock($$payload6, { preventScroll });
                              $$payload6.out.push(`<!----> <div${spread_attributes({ ...mergeProps$1(mergedProps, focusScopeProps) }, null)}>`);
                              push_element($$payload6, "div", 109, 8);
                              children?.($$payload6);
                              $$payload6.out.push(`<!----></div>`);
                              pop_element();
                            }
                            $$payload6.out.push(`<!--]-->`);
                          }),
                          $$slots: { default: true }
                        }
                      ]));
                    }),
                    $$slots: { default: true }
                  }
                ]));
              }),
              $$slots: { default: true }
            }
          ]));
        };
        prevent_snippet_stringification(focusScope);
        Focus_scope($$payload2, {
          ref: contentState.opts.ref,
          loop: true,
          trapFocus,
          enabled: shouldEnableFocusTrap({
            forceMount,
            present: contentState.root.opts.open.current,
            open: contentState.root.opts.open.current
          }),
          onCloseAutoFocus: (e) => {
            onCloseAutoFocus(e);
            if (e.defaultPrevented) return;
            afterSleep(0, () => contentState.root.triggerNode?.focus());
          },
          onOpenAutoFocus: (e) => {
            onOpenAutoFocus(e);
            if (e.defaultPrevented) return;
            e.preventDefault();
            afterSleep(0, () => contentState.opts.ref.current?.focus());
          },
          focusScope
        });
      }
    };
    prevent_snippet_stringification(presence);
    Presence_layer($$payload, {
      forceMount,
      open: contentState.root.opts.open.current || forceMount,
      ref: contentState.opts.ref,
      presence
    });
  }
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_overlay[FILENAME] = "node_modules/bits-ui/dist/bits/dialog/components/dialog-overlay.svelte";
function Dialog_overlay($$payload, $$props) {
  push(Dialog_overlay);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    forceMount = false,
    child,
    children,
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const overlayState = DialogOverlayState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, overlayState.props);
  {
    let presence = function($$payload2) {
      validate_snippet_args($$payload2);
      if (child) {
        $$payload2.out.push("<!--[-->");
        child($$payload2, { props: mergeProps$1(mergedProps), ...overlayState.snippetProps });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div${spread_attributes({ ...mergeProps$1(mergedProps) }, null)}>`);
        push_element($$payload2, "div", 35, 3);
        children?.($$payload2, overlayState.snippetProps);
        $$payload2.out.push(`<!----></div>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    };
    prevent_snippet_stringification(presence);
    Presence_layer($$payload, {
      open: overlayState.root.opts.open.current || forceMount,
      ref: overlayState.opts.ref,
      presence
    });
  }
  bind_props($$props, { ref });
  pop();
}
Dialog_overlay.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_description[FILENAME] = "node_modules/bits-ui/dist/bits/dialog/components/dialog-description.svelte";
function Dialog_description($$payload, $$props) {
  push(Dialog_description);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    children,
    child,
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const descriptionState = DialogDescriptionState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, descriptionState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Dialog_description.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function getAnnouncer(doc) {
  function announce(value, kind = "assertive", timeout = 7500) {
    return;
  }
  return {
    announce
  };
}
const defaultDateDefaults = {
  defaultValue: void 0,
  granularity: "day"
};
function getDefaultDate(opts) {
  const withDefaults = { ...defaultDateDefaults, ...opts };
  const { defaultValue, granularity } = withDefaults;
  if (Array.isArray(defaultValue) && defaultValue.length) {
    return defaultValue[defaultValue.length - 1];
  }
  if (defaultValue && !Array.isArray(defaultValue)) {
    return defaultValue;
  } else {
    const date = /* @__PURE__ */ new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const calendarDateTimeGranularities = ["hour", "minute", "second"];
    if (calendarDateTimeGranularities.includes(granularity ?? "day")) {
      return new $35ea8db9cb2ccb90$export$ca871e8dbb80966f(year, month, day, 0, 0, 0);
    }
    return new $35ea8db9cb2ccb90$export$99faa760c7908e4f(year, month, day);
  }
}
function parseStringToDateValue(dateStr, referenceVal) {
  let dateValue;
  if (referenceVal instanceof $35ea8db9cb2ccb90$export$d3b7288e7994edea) {
    dateValue = $fae977aafc393c5c$export$fd7893f06e92a6a4(dateStr);
  } else if (referenceVal instanceof $35ea8db9cb2ccb90$export$ca871e8dbb80966f) {
    dateValue = $fae977aafc393c5c$export$588937bcd60ade55(dateStr);
  } else {
    dateValue = $fae977aafc393c5c$export$6b862160d295c8e(dateStr);
  }
  return dateValue.calendar !== referenceVal.calendar ? $11d87f3f76e88657$export$b4a036af3fc0b032(dateValue, referenceVal.calendar) : dateValue;
}
function toDate(dateValue, tz = $14e0f24ef4ac5c92$export$aa8b41735afcabd2()) {
  if (dateValue instanceof $35ea8db9cb2ccb90$export$d3b7288e7994edea) {
    return dateValue.toDate();
  } else {
    return dateValue.toDate(tz);
  }
}
function getDateValueType(date) {
  if (date instanceof $35ea8db9cb2ccb90$export$99faa760c7908e4f)
    return "date";
  if (date instanceof $35ea8db9cb2ccb90$export$ca871e8dbb80966f)
    return "datetime";
  if (date instanceof $35ea8db9cb2ccb90$export$d3b7288e7994edea)
    return "zoneddatetime";
  throw new Error("Unknown date type");
}
function parseAnyDateValue(value, type) {
  switch (type) {
    case "date":
      return $fae977aafc393c5c$export$6b862160d295c8e(value);
    case "datetime":
      return $fae977aafc393c5c$export$588937bcd60ade55(value);
    case "zoneddatetime":
      return $fae977aafc393c5c$export$fd7893f06e92a6a4(value);
    default:
      throw new Error(`Unknown date type: ${type}`);
  }
}
function isCalendarDateTime(dateValue) {
  return dateValue instanceof $35ea8db9cb2ccb90$export$ca871e8dbb80966f;
}
function isZonedDateTime(dateValue) {
  return dateValue instanceof $35ea8db9cb2ccb90$export$d3b7288e7994edea;
}
function hasTime(dateValue) {
  return isCalendarDateTime(dateValue) || isZonedDateTime(dateValue);
}
function getDaysInMonth(date) {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return new Date(year, month, 0).getDate();
  } else {
    return date.set({ day: 100 }).day;
  }
}
function isBefore(dateToCompare, referenceDate) {
  return dateToCompare.compare(referenceDate) < 0;
}
function isAfter(dateToCompare, referenceDate) {
  return dateToCompare.compare(referenceDate) > 0;
}
function getLastFirstDayOfWeek(date, firstDayOfWeek, locale) {
  const day = $14e0f24ef4ac5c92$export$2061056d06d7cdf7(date, locale);
  if (firstDayOfWeek > day) {
    return date.subtract({ days: day + 7 - firstDayOfWeek });
  }
  if (firstDayOfWeek === day) {
    return date;
  }
  return date.subtract({ days: day - firstDayOfWeek });
}
function getNextLastDayOfWeek(date, firstDayOfWeek, locale) {
  const day = $14e0f24ef4ac5c92$export$2061056d06d7cdf7(date, locale);
  const lastDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  if (day === lastDayOfWeek) {
    return date;
  }
  if (day > lastDayOfWeek) {
    return date.add({ days: 7 - day + lastDayOfWeek });
  }
  return date.add({ days: lastDayOfWeek - day });
}
const defaultPartOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric"
};
function createFormatter(opts) {
  let locale = opts.initialLocale;
  function setLocale(newLocale) {
    locale = newLocale;
  }
  function getLocale() {
    return locale;
  }
  function custom(date, options2) {
    return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, options2).format(date);
  }
  function selectedDate(date, includeTime = true) {
    if (hasTime(date) && includeTime) {
      return custom(toDate(date), {
        dateStyle: "long",
        timeStyle: "long"
      });
    } else {
      return custom(toDate(date), {
        dateStyle: "long"
      });
    }
  }
  function fullMonthAndYear(date) {
    if (typeof opts.monthFormat.current !== "function" && typeof opts.yearFormat.current !== "function") {
      return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, {
        month: opts.monthFormat.current,
        year: opts.yearFormat.current
      }).format(date);
    }
    const formattedMonth = typeof opts.monthFormat.current === "function" ? opts.monthFormat.current(date.getMonth() + 1) : new $fb18d541ea1ad717$export$ad991b66133851cf(locale, { month: opts.monthFormat.current }).format(date);
    const formattedYear = typeof opts.yearFormat.current === "function" ? opts.yearFormat.current(date.getFullYear()) : new $fb18d541ea1ad717$export$ad991b66133851cf(locale, { year: opts.yearFormat.current }).format(date);
    return `${formattedMonth} ${formattedYear}`;
  }
  function fullMonth(date) {
    return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, { month: "long" }).format(date);
  }
  function fullYear(date) {
    return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, { year: "numeric" }).format(date);
  }
  function toParts(date, options2) {
    if (isZonedDateTime(date)) {
      return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, {
        ...options2,
        timeZone: date.timeZone
      }).formatToParts(toDate(date));
    } else {
      return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, options2).formatToParts(toDate(date));
    }
  }
  function dayOfWeek(date, length = "narrow") {
    return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, { weekday: length }).format(date);
  }
  function dayPeriod(date, hourCycle = void 0) {
    const parts = new $fb18d541ea1ad717$export$ad991b66133851cf(locale, {
      hour: "numeric",
      minute: "numeric",
      hourCycle: hourCycle === 24 ? "h23" : void 0
    }).formatToParts(date);
    const value = parts.find((p2) => p2.type === "dayPeriod")?.value;
    if (value === "PM") {
      return "PM";
    }
    return "AM";
  }
  function part(dateObj, type, options2 = {}) {
    const opts2 = { ...defaultPartOptions, ...options2 };
    const parts = toParts(dateObj, opts2);
    const part2 = parts.find((p2) => p2.type === type);
    return part2 ? part2.value : "";
  }
  return {
    setLocale,
    getLocale,
    fullMonth,
    fullYear,
    fullMonthAndYear,
    toParts,
    custom,
    part,
    dayPeriod,
    selectedDate,
    dayOfWeek
  };
}
function chunk(arr, size2) {
  const result = [];
  for (let i = 0; i < arr.length; i += size2) {
    result.push(arr.slice(i, i + size2));
  }
  return result;
}
function isValidIndex(index2, arr) {
  return index2 >= 0 && index2 < arr.length;
}
function next(array2, index2, loop2 = true) {
  if (array2.length === 0 || index2 < 0 || index2 >= array2.length)
    return;
  if (array2.length === 1 && index2 === 0)
    return array2[0];
  if (index2 === array2.length - 1)
    return loop2 ? array2[0] : void 0;
  return array2[index2 + 1];
}
function prev(array2, index2, loop2 = true) {
  if (array2.length === 0 || index2 < 0 || index2 >= array2.length)
    return;
  if (array2.length === 1 && index2 === 0)
    return array2[0];
  if (index2 === 0)
    return loop2 ? array2[array2.length - 1] : void 0;
  return array2[index2 - 1];
}
function forward(array2, index2, increment2, loop2 = true) {
  if (array2.length === 0 || index2 < 0 || index2 >= array2.length)
    return;
  let targetIndex = index2 + increment2;
  if (loop2) {
    targetIndex = (targetIndex % array2.length + array2.length) % array2.length;
  } else {
    targetIndex = Math.max(0, Math.min(targetIndex, array2.length - 1));
  }
  return array2[targetIndex];
}
function backward(array2, index2, decrement, loop2 = true) {
  if (array2.length === 0 || index2 < 0 || index2 >= array2.length)
    return;
  let targetIndex = index2 - decrement;
  if (loop2) {
    targetIndex = (targetIndex % array2.length + array2.length) % array2.length;
  } else {
    targetIndex = Math.max(0, Math.min(targetIndex, array2.length - 1));
  }
  return array2[targetIndex];
}
function getNextMatch(values, search, currentMatch) {
  const lowerSearch = search.toLowerCase();
  if (lowerSearch.endsWith(" ")) {
    const searchWithoutSpace = lowerSearch.slice(0, -1);
    const matchesWithoutSpace = values.filter((value) => value.toLowerCase().startsWith(searchWithoutSpace));
    if (matchesWithoutSpace.length <= 1) {
      return getNextMatch(values, searchWithoutSpace, currentMatch);
    }
    const currentMatchLowercase = currentMatch?.toLowerCase();
    if (currentMatchLowercase && currentMatchLowercase.startsWith(searchWithoutSpace) && currentMatchLowercase.charAt(searchWithoutSpace.length) === " " && search.trim() === searchWithoutSpace) {
      return currentMatch;
    }
    const spacedMatches = values.filter((value) => value.toLowerCase().startsWith(lowerSearch));
    if (spacedMatches.length > 0) {
      const currentMatchIndex2 = currentMatch ? values.indexOf(currentMatch) : -1;
      let wrappedMatches = wrapArray(spacedMatches, Math.max(currentMatchIndex2, 0));
      const nextMatch2 = wrappedMatches.find((match) => match !== currentMatch);
      return nextMatch2 || currentMatch;
    }
  }
  const isRepeated = search.length > 1 && Array.from(search).every((char) => char === search[0]);
  const normalizedSearch = isRepeated ? search[0] : search;
  const normalizedLowerSearch = normalizedSearch.toLowerCase();
  const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1;
  let wrappedValues = wrapArray(values, Math.max(currentMatchIndex, 0));
  const excludeCurrentMatch = normalizedSearch.length === 1;
  if (excludeCurrentMatch)
    wrappedValues = wrappedValues.filter((v) => v !== currentMatch);
  const nextMatch = wrappedValues.find((value) => value?.toLowerCase().startsWith(normalizedLowerSearch));
  return nextMatch !== currentMatch ? nextMatch : void 0;
}
function wrapArray(array2, startIndex) {
  return array2.map((_, index2) => array2[(startIndex + index2) % array2.length]);
}
function isCalendarDayNode(node) {
  if (!isHTMLElement(node)) return false;
  if (!node.hasAttribute("data-bits-day")) return false;
  return true;
}
function getDaysBetween(start, end) {
  const days = [];
  let dCurrent = start.add({ days: 1 });
  const dEnd = end;
  while (dCurrent.compare(dEnd) < 0) {
    days.push(dCurrent);
    dCurrent = dCurrent.add({ days: 1 });
  }
  return days;
}
function createMonth(props) {
  const { dateObj, weekStartsOn, fixedWeeks, locale } = props;
  const daysInMonth = getDaysInMonth(dateObj);
  const datesArray = Array.from({ length: daysInMonth }, (_, i) => dateObj.set({ day: i + 1 }));
  const firstDayOfMonth = $14e0f24ef4ac5c92$export$a5a3b454ada2268e(dateObj);
  const lastDayOfMonth = $14e0f24ef4ac5c92$export$a2258d9c4118825c(dateObj);
  const lastSunday = weekStartsOn !== void 0 ? getLastFirstDayOfWeek(firstDayOfMonth, weekStartsOn, "en-US") : getLastFirstDayOfWeek(firstDayOfMonth, 0, locale);
  const nextSaturday = weekStartsOn !== void 0 ? getNextLastDayOfWeek(lastDayOfMonth, weekStartsOn, "en-US") : getNextLastDayOfWeek(lastDayOfMonth, 0, locale);
  const lastMonthDays = getDaysBetween(lastSunday.subtract({ days: 1 }), firstDayOfMonth);
  const nextMonthDays = getDaysBetween(lastDayOfMonth, nextSaturday.add({ days: 1 }));
  const totalDays = lastMonthDays.length + datesArray.length + nextMonthDays.length;
  if (fixedWeeks && totalDays < 42) {
    const extraDays = 42 - totalDays;
    let startFrom = nextMonthDays[nextMonthDays.length - 1];
    if (!startFrom) {
      startFrom = dateObj.add({ months: 1 }).set({ day: 1 });
    }
    let length = extraDays;
    if (nextMonthDays.length === 0) {
      length = extraDays - 1;
      nextMonthDays.push(startFrom);
    }
    const extraDaysArray = Array.from({ length }, (_, i) => {
      const incr = i + 1;
      return startFrom.add({ days: incr });
    });
    nextMonthDays.push(...extraDaysArray);
  }
  const allDays = lastMonthDays.concat(datesArray, nextMonthDays);
  const weeks = chunk(allDays, 7);
  return { value: dateObj, dates: allDays, weeks };
}
function createMonths(props) {
  const { numberOfMonths, dateObj, ...monthProps } = props;
  const months = [];
  if (!numberOfMonths || numberOfMonths === 1) {
    months.push(createMonth({ ...monthProps, dateObj }));
    return months;
  }
  months.push(createMonth({ ...monthProps, dateObj }));
  for (let i = 1; i < numberOfMonths; i++) {
    const nextMonth = dateObj.add({ months: i });
    months.push(createMonth({ ...monthProps, dateObj: nextMonth }));
  }
  return months;
}
function getSelectableCells(calendarNode) {
  if (!calendarNode) return [];
  const selectableSelector = `[data-bits-day]:not([data-disabled]):not([data-outside-visible-months])`;
  return Array.from(calendarNode.querySelectorAll(selectableSelector)).filter((el) => isHTMLElement(el));
}
function setPlaceholderToNodeValue(node, placeholder) {
  const cellValue = node.getAttribute("data-value");
  if (!cellValue) return;
  placeholder.current = parseStringToDateValue(cellValue, placeholder.current);
}
function shiftCalendarFocus({
  node,
  add,
  placeholder,
  calendarNode,
  isPrevButtonDisabled,
  isNextButtonDisabled,
  months,
  numberOfMonths
}) {
  const candidateCells = getSelectableCells(calendarNode);
  if (!candidateCells.length) return;
  const index2 = candidateCells.indexOf(node);
  const nextIndex = index2 + add;
  if (isValidIndex(nextIndex, candidateCells)) {
    const nextCell = candidateCells[nextIndex];
    setPlaceholderToNodeValue(nextCell, placeholder);
    return nextCell.focus();
  }
  if (nextIndex < 0) {
    if (isPrevButtonDisabled) return;
    const firstMonth = months[0]?.value;
    if (!firstMonth) return;
    placeholder.current = firstMonth.subtract({ months: numberOfMonths });
    afterTick(() => {
      const newCandidateCells = getSelectableCells(calendarNode);
      if (!newCandidateCells.length) return;
      const newIndex = newCandidateCells.length - Math.abs(nextIndex);
      if (isValidIndex(newIndex, newCandidateCells)) {
        const newCell = newCandidateCells[newIndex];
        setPlaceholderToNodeValue(newCell, placeholder);
        return newCell.focus();
      }
    });
  }
  if (nextIndex >= candidateCells.length) {
    if (isNextButtonDisabled) return;
    const firstMonth = months[0]?.value;
    if (!firstMonth) return;
    placeholder.current = firstMonth.add({ months: numberOfMonths });
    afterTick(() => {
      const newCandidateCells = getSelectableCells(calendarNode);
      if (!newCandidateCells.length) return;
      const newIndex = nextIndex - candidateCells.length;
      if (isValidIndex(newIndex, newCandidateCells)) {
        const nextCell = newCandidateCells[newIndex];
        return nextCell.focus();
      }
    });
  }
}
const ARROW_KEYS = [
  ARROW_DOWN,
  ARROW_UP,
  ARROW_LEFT,
  ARROW_RIGHT
];
const SELECT_KEYS = [ENTER, SPACE];
function handleCalendarKeydown({ event, handleCellClick, shiftFocus, placeholderValue }) {
  const currentCell = event.target;
  if (!isCalendarDayNode(currentCell)) return;
  if (!ARROW_KEYS.includes(event.key) && !SELECT_KEYS.includes(event.key)) return;
  event.preventDefault();
  const kbdFocusMap = {
    [ARROW_DOWN]: 7,
    [ARROW_UP]: -7,
    [ARROW_LEFT]: -1,
    [ARROW_RIGHT]: 1
  };
  if (ARROW_KEYS.includes(event.key)) {
    const add = kbdFocusMap[event.key];
    if (add !== void 0) {
      shiftFocus(currentCell, add);
    }
  }
  if (SELECT_KEYS.includes(event.key)) {
    const cellValue = currentCell.getAttribute("data-value");
    if (!cellValue) return;
    handleCellClick(event, parseStringToDateValue(cellValue, placeholderValue));
  }
}
function handleCalendarNextPage({
  months,
  setMonths,
  numberOfMonths,
  pagedNavigation,
  weekStartsOn,
  locale,
  fixedWeeks,
  setPlaceholder
}) {
  const firstMonth = months[0]?.value;
  if (!firstMonth) return;
  if (pagedNavigation) {
    setPlaceholder(firstMonth.add({ months: numberOfMonths }));
  } else {
    const targetDate = firstMonth.add({ months: 1 });
    const newMonths = createMonths({
      dateObj: targetDate,
      weekStartsOn,
      locale,
      fixedWeeks,
      numberOfMonths
    });
    setPlaceholder(targetDate);
    setMonths(newMonths);
  }
}
function handleCalendarPrevPage({
  months,
  setMonths,
  numberOfMonths,
  pagedNavigation,
  weekStartsOn,
  locale,
  fixedWeeks,
  setPlaceholder
}) {
  const firstMonth = months[0]?.value;
  if (!firstMonth) return;
  if (pagedNavigation) {
    setPlaceholder(firstMonth.subtract({ months: numberOfMonths }));
  } else {
    const targetDate = firstMonth.subtract({ months: 1 });
    const newMonths = createMonths({
      dateObj: targetDate,
      weekStartsOn,
      locale,
      fixedWeeks,
      numberOfMonths
    });
    setPlaceholder(targetDate);
    setMonths(newMonths);
  }
}
function getWeekdays({ months, formatter, weekdayFormat }) {
  if (!months.length) return [];
  const firstMonth = months[0];
  const firstWeek = firstMonth.weeks[0];
  if (!firstWeek) return [];
  return firstWeek.map((date) => formatter.dayOfWeek(toDate(date), weekdayFormat));
}
function useMonthViewOptionsSync(props) {
}
function useMonthViewPlaceholderSync({
  placeholder,
  getVisibleMonths,
  weekStartsOn,
  locale,
  fixedWeeks,
  numberOfMonths,
  setMonths
}) {
}
function getIsNextButtonDisabled({ maxValue, months, disabled }) {
  if (!maxValue || !months.length) return false;
  if (disabled) return true;
  const lastMonthInView = months[months.length - 1]?.value;
  if (!lastMonthInView) return false;
  const firstMonthOfNextPage = lastMonthInView.add({ months: 1 }).set({ day: 1 });
  return isAfter(firstMonthOfNextPage, maxValue);
}
function getIsPrevButtonDisabled({ minValue, months, disabled }) {
  if (!minValue || !months.length) return false;
  if (disabled) return true;
  const firstMonthInView = months[0]?.value;
  if (!firstMonthInView) return false;
  const lastMonthOfPrevPage = firstMonthInView.subtract({ months: 1 }).set({ day: 35 });
  return isBefore(lastMonthOfPrevPage, minValue);
}
function getCalendarHeadingValue({ months, locale, formatter }) {
  if (!months.length) return "";
  if (locale !== formatter.getLocale()) {
    formatter.setLocale(locale);
  }
  if (months.length === 1) {
    const month = toDate(months[0].value);
    return `${formatter.fullMonthAndYear(month)}`;
  }
  const startMonth = toDate(months[0].value);
  const endMonth = toDate(months[months.length - 1].value);
  const startMonthName = formatter.fullMonth(startMonth);
  const endMonthName = formatter.fullMonth(endMonth);
  const startMonthYear = formatter.fullYear(startMonth);
  const endMonthYear = formatter.fullYear(endMonth);
  const content = startMonthYear === endMonthYear ? `${startMonthName} - ${endMonthName} ${endMonthYear}` : `${startMonthName} ${startMonthYear} - ${endMonthName} ${endMonthYear}`;
  return content;
}
function getCalendarElementProps({ fullCalendarLabel, id, isInvalid, disabled, readonly: readonly2 }) {
  return {
    id,
    role: "application",
    "aria-label": fullCalendarLabel,
    "data-invalid": getDataInvalid(isInvalid),
    "data-disabled": getDataDisabled(disabled),
    "data-readonly": getDataReadonly(readonly2)
  };
}
function getFirstNonDisabledDateInView(calendarRef) {
  if (!isBrowser) return;
  const daysInView = Array.from(calendarRef.querySelectorAll("[data-bits-day]:not([aria-disabled=true])"));
  if (daysInView.length === 0) return;
  const element2 = daysInView[0];
  const value = element2?.getAttribute("data-value");
  const type = element2?.getAttribute("data-type");
  if (!value || !type) return;
  return parseAnyDateValue(value, type);
}
function useEnsureNonDisabledPlaceholder({
  ref,
  placeholder,
  defaultPlaceholder,
  minValue,
  maxValue,
  isDateDisabled
}) {
  function isDisabled(date) {
    if (isDateDisabled.current(date)) return true;
    if (minValue.current && isBefore(date, minValue.current)) return true;
    if (maxValue.current && isBefore(maxValue.current, date)) return true;
    return false;
  }
  watch$1(() => ref.current, () => {
    if (!ref.current) return;
    if (placeholder.current && $14e0f24ef4ac5c92$export$ea39ec197993aef0(placeholder.current, defaultPlaceholder) && isDisabled(defaultPlaceholder)) {
      placeholder.current = getFirstNonDisabledDateInView(ref.current) ?? defaultPlaceholder;
    }
  });
}
function getDateWithPreviousTime(date, prev2) {
  if (!date || !prev2) return date;
  if (hasTime(date) && hasTime(prev2)) {
    return date.set({
      hour: prev2.hour,
      minute: prev2.minute,
      millisecond: prev2.millisecond,
      second: prev2.second
    });
  }
  return date;
}
const calendarAttrs = createBitsAttrs({
  component: "calendar",
  parts: [
    "root",
    "grid",
    "cell",
    "next-button",
    "prev-button",
    "day",
    "grid-body",
    "grid-head",
    "grid-row",
    "head-cell",
    "header",
    "heading",
    "month-select",
    "year-select"
  ]
});
function getDefaultYears(opts) {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const latestYear = Math.max(opts.placeholderYear, currentYear);
  let minYear;
  let maxYear;
  if (opts.minValue) {
    minYear = opts.minValue.year;
  } else {
    const initialMinYear = latestYear - 100;
    minYear = opts.placeholderYear < initialMinYear ? opts.placeholderYear - 10 : initialMinYear;
  }
  if (opts.maxValue) {
    maxYear = opts.maxValue.year;
  } else {
    maxYear = latestYear + 10;
  }
  if (minYear > maxYear) {
    minYear = maxYear;
  }
  const totalYears = maxYear - minYear + 1;
  return Array.from({ length: totalYears }, (_, i) => minYear + i);
}
const CalendarRootContext = new Context$2("Calendar.Root | RangeCalender.Root");
class CalendarRootState {
  static create(opts) {
    return CalendarRootContext.set(new CalendarRootState(opts));
  }
  opts;
  #visibleMonths = derived(() => this.months.map((month) => month.value));
  get visibleMonths() {
    return this.#visibleMonths();
  }
  set visibleMonths($$value) {
    return this.#visibleMonths($$value);
  }
  formatter;
  accessibleHeadingId = useId$1();
  domContext;
  attachment;
  months = [];
  announcer;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(this.opts.ref);
    this.domContext = new DOMContext(opts.ref);
    this.announcer = getAnnouncer();
    this.formatter = createFormatter({
      initialLocale: this.opts.locale.current,
      monthFormat: this.opts.monthFormat,
      yearFormat: this.opts.yearFormat
    });
    this.setMonths = this.setMonths.bind(this);
    this.nextPage = this.nextPage.bind(this);
    this.prevPage = this.prevPage.bind(this);
    this.prevYear = this.prevYear.bind(this);
    this.nextYear = this.nextYear.bind(this);
    this.setYear = this.setYear.bind(this);
    this.setMonth = this.setMonth.bind(this);
    this.isOutsideVisibleMonths = this.isOutsideVisibleMonths.bind(this);
    this.isDateDisabled = this.isDateDisabled.bind(this);
    this.isDateSelected = this.isDateSelected.bind(this);
    this.shiftFocus = this.shiftFocus.bind(this);
    this.handleCellClick = this.handleCellClick.bind(this);
    this.handleMultipleUpdate = this.handleMultipleUpdate.bind(this);
    this.handleSingleUpdate = this.handleSingleUpdate.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
    this.getBitsAttr = this.getBitsAttr.bind(this);
    this.months = createMonths({
      dateObj: this.opts.placeholder.current,
      weekStartsOn: this.opts.weekStartsOn.current,
      locale: this.opts.locale.current,
      fixedWeeks: this.opts.fixedWeeks.current,
      numberOfMonths: this.opts.numberOfMonths.current
    });
    this.#setupInitialFocusEffect();
    this.#setupAccessibleHeadingEffect();
    this.#setupFormatterEffect();
    useMonthViewPlaceholderSync({
      placeholder: this.opts.placeholder,
      getVisibleMonths: () => this.visibleMonths,
      weekStartsOn: this.opts.weekStartsOn,
      locale: this.opts.locale,
      fixedWeeks: this.opts.fixedWeeks,
      numberOfMonths: this.opts.numberOfMonths,
      setMonths: (months) => this.months = months
    });
    useMonthViewOptionsSync({
      fixedWeeks: this.opts.fixedWeeks,
      locale: this.opts.locale,
      numberOfMonths: this.opts.numberOfMonths,
      placeholder: this.opts.placeholder,
      setMonths: this.setMonths,
      weekStartsOn: this.opts.weekStartsOn
    });
    watch$1(() => this.fullCalendarLabel, (label) => {
      const node = this.domContext.getElementById(this.accessibleHeadingId);
      if (!node) return;
      node.textContent = label;
    });
    watch$1(() => this.opts.value.current, () => {
      const value = this.opts.value.current;
      if (Array.isArray(value) && value.length) {
        const lastValue = value[value.length - 1];
        if (lastValue && this.opts.placeholder.current !== lastValue) {
          this.opts.placeholder.current = lastValue;
        }
      } else if (!Array.isArray(value) && value && this.opts.placeholder.current !== value) {
        this.opts.placeholder.current = value;
      }
    });
    useEnsureNonDisabledPlaceholder({
      placeholder: opts.placeholder,
      defaultPlaceholder: opts.defaultPlaceholder,
      isDateDisabled: opts.isDateDisabled,
      maxValue: opts.maxValue,
      minValue: opts.minValue,
      ref: opts.ref
    });
  }
  setMonths(months) {
    this.months = months;
  }
  #weekdays = derived(
    /**
     * This derived state holds an array of localized day names for the current
     * locale and calendar view. It dynamically syncs with the 'weekStartsOn' option,
     * updating its content when the option changes. Using this state to render the
     * calendar's days of the week is strongly recommended, as it guarantees that
     * the days are correctly formatted for the current locale and calendar view.
     */
    () => {
      return getWeekdays({
        months: this.months,
        formatter: this.formatter,
        weekdayFormat: this.opts.weekdayFormat.current
      });
    }
  );
  get weekdays() {
    return this.#weekdays();
  }
  set weekdays($$value) {
    return this.#weekdays($$value);
  }
  #initialPlaceholderYear = derived(() => run(() => this.opts.placeholder.current.year));
  get initialPlaceholderYear() {
    return this.#initialPlaceholderYear();
  }
  set initialPlaceholderYear($$value) {
    return this.#initialPlaceholderYear($$value);
  }
  #defaultYears = derived(() => {
    return getDefaultYears({
      minValue: this.opts.minValue.current,
      maxValue: this.opts.maxValue.current,
      placeholderYear: this.initialPlaceholderYear
    });
  });
  get defaultYears() {
    return this.#defaultYears();
  }
  set defaultYears($$value) {
    return this.#defaultYears($$value);
  }
  #setupInitialFocusEffect() {
  }
  #setupAccessibleHeadingEffect() {
  }
  #setupFormatterEffect() {
  }
  /**
   * Navigates to the next page of the calendar.
   */
  nextPage() {
    handleCalendarNextPage({
      fixedWeeks: this.opts.fixedWeeks.current,
      locale: this.opts.locale.current,
      numberOfMonths: this.opts.numberOfMonths.current,
      pagedNavigation: this.opts.pagedNavigation.current,
      setMonths: this.setMonths,
      setPlaceholder: (date) => this.opts.placeholder.current = date,
      weekStartsOn: this.opts.weekStartsOn.current,
      months: this.months
    });
  }
  /**
   * Navigates to the previous page of the calendar.
   */
  prevPage() {
    handleCalendarPrevPage({
      fixedWeeks: this.opts.fixedWeeks.current,
      locale: this.opts.locale.current,
      numberOfMonths: this.opts.numberOfMonths.current,
      pagedNavigation: this.opts.pagedNavigation.current,
      setMonths: this.setMonths,
      setPlaceholder: (date) => this.opts.placeholder.current = date,
      weekStartsOn: this.opts.weekStartsOn.current,
      months: this.months
    });
  }
  nextYear() {
    this.opts.placeholder.current = this.opts.placeholder.current.add({ years: 1 });
  }
  prevYear() {
    this.opts.placeholder.current = this.opts.placeholder.current.subtract({ years: 1 });
  }
  setYear(year) {
    this.opts.placeholder.current = this.opts.placeholder.current.set({ year });
  }
  setMonth(month) {
    this.opts.placeholder.current = this.opts.placeholder.current.set({ month });
  }
  #isNextButtonDisabled = derived(() => {
    return getIsNextButtonDisabled({
      maxValue: this.opts.maxValue.current,
      months: this.months,
      disabled: this.opts.disabled.current
    });
  });
  get isNextButtonDisabled() {
    return this.#isNextButtonDisabled();
  }
  set isNextButtonDisabled($$value) {
    return this.#isNextButtonDisabled($$value);
  }
  #isPrevButtonDisabled = derived(() => {
    return getIsPrevButtonDisabled({
      minValue: this.opts.minValue.current,
      months: this.months,
      disabled: this.opts.disabled.current
    });
  });
  get isPrevButtonDisabled() {
    return this.#isPrevButtonDisabled();
  }
  set isPrevButtonDisabled($$value) {
    return this.#isPrevButtonDisabled($$value);
  }
  #isInvalid = derived(() => {
    const value = this.opts.value.current;
    const isDateDisabled = this.opts.isDateDisabled.current;
    const isDateUnavailable = this.opts.isDateUnavailable.current;
    if (Array.isArray(value)) {
      if (!value.length) return false;
      for (const date of value) {
        if (isDateDisabled(date)) return true;
        if (isDateUnavailable(date)) return true;
      }
    } else {
      if (!value) return false;
      if (isDateDisabled(value)) return true;
      if (isDateUnavailable(value)) return true;
    }
    return false;
  });
  get isInvalid() {
    return this.#isInvalid();
  }
  set isInvalid($$value) {
    return this.#isInvalid($$value);
  }
  #headingValue = derived(() => {
    this.opts.monthFormat.current;
    this.opts.yearFormat.current;
    return getCalendarHeadingValue({
      months: this.months,
      formatter: this.formatter,
      locale: this.opts.locale.current
    });
  });
  get headingValue() {
    return this.#headingValue();
  }
  set headingValue($$value) {
    return this.#headingValue($$value);
  }
  #fullCalendarLabel = derived(() => {
    return `${this.opts.calendarLabel.current} ${this.headingValue}`;
  });
  get fullCalendarLabel() {
    return this.#fullCalendarLabel();
  }
  set fullCalendarLabel($$value) {
    return this.#fullCalendarLabel($$value);
  }
  isOutsideVisibleMonths(date) {
    return !this.visibleMonths.some((month) => $14e0f24ef4ac5c92$export$a18c89cbd24170ff(date, month));
  }
  isDateDisabled(date) {
    if (this.opts.isDateDisabled.current(date) || this.opts.disabled.current) return true;
    const minValue = this.opts.minValue.current;
    const maxValue = this.opts.maxValue.current;
    if (minValue && isBefore(date, minValue)) return true;
    if (maxValue && isBefore(maxValue, date)) return true;
    return false;
  }
  isDateSelected(date) {
    const value = this.opts.value.current;
    if (Array.isArray(value)) {
      return value.some((d) => $14e0f24ef4ac5c92$export$ea39ec197993aef0(d, date));
    } else if (!value) {
      return false;
    }
    return $14e0f24ef4ac5c92$export$ea39ec197993aef0(value, date);
  }
  shiftFocus(node, add) {
    return shiftCalendarFocus({
      node,
      add,
      placeholder: this.opts.placeholder,
      calendarNode: this.opts.ref.current,
      isPrevButtonDisabled: this.isPrevButtonDisabled,
      isNextButtonDisabled: this.isNextButtonDisabled,
      months: this.months,
      numberOfMonths: this.opts.numberOfMonths.current
    });
  }
  #isMultipleSelectionValid(selectedDates) {
    if (this.opts.type.current !== "multiple") return true;
    if (!this.opts.maxDays.current) return true;
    const selectedCount = selectedDates.length;
    if (this.opts.maxDays.current && selectedCount > this.opts.maxDays.current) return false;
    return true;
  }
  handleCellClick(_, date) {
    if (this.opts.readonly.current || this.opts.isDateDisabled.current?.(date) || this.opts.isDateUnavailable.current?.(date)) {
      return;
    }
    const prev2 = this.opts.value.current;
    const multiple = this.opts.type.current === "multiple";
    if (multiple) {
      if (Array.isArray(prev2) || prev2 === void 0) {
        this.opts.value.current = this.handleMultipleUpdate(prev2, date);
      }
    } else if (!Array.isArray(prev2)) {
      const next2 = this.handleSingleUpdate(prev2, date);
      if (!next2) {
        this.announcer.announce("Selected date is now empty.", "polite", 5e3);
      } else {
        this.announcer.announce(`Selected Date: ${this.formatter.selectedDate(next2, false)}`, "polite");
      }
      this.opts.value.current = getDateWithPreviousTime(next2, prev2);
      if (next2 !== void 0) {
        this.opts.onDateSelect?.current?.();
      }
    }
  }
  handleMultipleUpdate(prev2, date) {
    if (!prev2) {
      const newSelection = [date];
      return this.#isMultipleSelectionValid(newSelection) ? newSelection : [date];
    }
    if (!Array.isArray(prev2)) {
      throw new Error("Invalid value for multiple prop.");
    }
    const index2 = prev2.findIndex((d) => $14e0f24ef4ac5c92$export$ea39ec197993aef0(d, date));
    const preventDeselect = this.opts.preventDeselect.current;
    if (index2 === -1) {
      const newSelection = [...prev2, date];
      if (this.#isMultipleSelectionValid(newSelection)) {
        return newSelection;
      } else {
        return [date];
      }
    } else if (preventDeselect) {
      return prev2;
    } else {
      const next2 = prev2.filter((d) => !$14e0f24ef4ac5c92$export$ea39ec197993aef0(d, date));
      if (!next2.length) {
        this.opts.placeholder.current = date;
        return void 0;
      }
      return next2;
    }
  }
  handleSingleUpdate(prev2, date) {
    if (Array.isArray(prev2)) {
      throw new Error("Invalid value for single prop.");
    }
    if (!prev2) return date;
    const preventDeselect = this.opts.preventDeselect.current;
    if (!preventDeselect && $14e0f24ef4ac5c92$export$ea39ec197993aef0(prev2, date)) {
      this.opts.placeholder.current = date;
      return void 0;
    }
    return date;
  }
  onkeydown(event) {
    handleCalendarKeydown({
      event,
      handleCellClick: this.handleCellClick,
      shiftFocus: this.shiftFocus,
      placeholderValue: this.opts.placeholder.current
    });
  }
  #snippetProps = derived(() => ({ months: this.months, weekdays: this.weekdays }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  getBitsAttr = (part) => {
    return calendarAttrs.getAttr(part);
  };
  #props = derived(() => ({
    ...getCalendarElementProps({
      fullCalendarLabel: this.fullCalendarLabel,
      id: this.opts.id.current,
      isInvalid: this.isInvalid,
      disabled: this.opts.disabled.current,
      readonly: this.opts.readonly.current
    }),
    [this.getBitsAttr("root")]: "",
    //
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
const CalendarCellContext = new Context$2("Calendar.Cell | RangeCalendar.Cell");
class CalendarCellState {
  static create(opts) {
    return CalendarCellContext.set(new CalendarCellState(opts, CalendarRootContext.get()));
  }
  opts;
  root;
  #cellDate = derived(() => toDate(this.opts.date.current));
  get cellDate() {
    return this.#cellDate();
  }
  set cellDate($$value) {
    return this.#cellDate($$value);
  }
  #isUnavailable = derived(() => this.root.opts.isDateUnavailable.current(this.opts.date.current));
  get isUnavailable() {
    return this.#isUnavailable();
  }
  set isUnavailable($$value) {
    return this.#isUnavailable($$value);
  }
  #isDateToday = derived(() => $14e0f24ef4ac5c92$export$629b0a497aa65267(this.opts.date.current, $14e0f24ef4ac5c92$export$aa8b41735afcabd2()));
  get isDateToday() {
    return this.#isDateToday();
  }
  set isDateToday($$value) {
    return this.#isDateToday($$value);
  }
  #isOutsideMonth = derived(() => !$14e0f24ef4ac5c92$export$a18c89cbd24170ff(this.opts.date.current, this.opts.month.current));
  get isOutsideMonth() {
    return this.#isOutsideMonth();
  }
  set isOutsideMonth($$value) {
    return this.#isOutsideMonth($$value);
  }
  #isOutsideVisibleMonths = derived(() => this.root.isOutsideVisibleMonths(this.opts.date.current));
  get isOutsideVisibleMonths() {
    return this.#isOutsideVisibleMonths();
  }
  set isOutsideVisibleMonths($$value) {
    return this.#isOutsideVisibleMonths($$value);
  }
  #isDisabled = derived(() => this.root.isDateDisabled(this.opts.date.current) || this.isOutsideMonth && this.root.opts.disableDaysOutsideMonth.current);
  get isDisabled() {
    return this.#isDisabled();
  }
  set isDisabled($$value) {
    return this.#isDisabled($$value);
  }
  #isFocusedDate = derived(() => $14e0f24ef4ac5c92$export$ea39ec197993aef0(this.opts.date.current, this.root.opts.placeholder.current));
  get isFocusedDate() {
    return this.#isFocusedDate();
  }
  set isFocusedDate($$value) {
    return this.#isFocusedDate($$value);
  }
  #isSelectedDate = derived(() => this.root.isDateSelected(this.opts.date.current));
  get isSelectedDate() {
    return this.#isSelectedDate();
  }
  set isSelectedDate($$value) {
    return this.#isSelectedDate($$value);
  }
  #labelText = derived(() => this.root.formatter.custom(this.cellDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }));
  get labelText() {
    return this.#labelText();
  }
  set labelText($$value) {
    return this.#labelText($$value);
  }
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #snippetProps = derived(() => ({
    disabled: this.isDisabled,
    unavailable: this.isUnavailable,
    selected: this.isSelectedDate,
    day: `${this.opts.date.current.day}`
  }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #ariaDisabled = derived(() => {
    return this.isDisabled || this.isOutsideMonth && this.root.opts.disableDaysOutsideMonth.current || this.isUnavailable;
  });
  get ariaDisabled() {
    return this.#ariaDisabled();
  }
  set ariaDisabled($$value) {
    return this.#ariaDisabled($$value);
  }
  #sharedDataAttrs = derived(() => ({
    "data-unavailable": getDataUnavailable(this.isUnavailable),
    "data-today": this.isDateToday ? "" : void 0,
    "data-outside-month": this.isOutsideMonth ? "" : void 0,
    "data-outside-visible-months": this.isOutsideVisibleMonths ? "" : void 0,
    "data-focused": this.isFocusedDate ? "" : void 0,
    "data-selected": getDataSelected(this.isSelectedDate),
    "data-value": this.opts.date.current.toString(),
    "data-type": getDateValueType(this.opts.date.current),
    "data-disabled": getDataDisabled(this.isDisabled || this.isOutsideMonth && this.root.opts.disableDaysOutsideMonth.current)
  }));
  get sharedDataAttrs() {
    return this.#sharedDataAttrs();
  }
  set sharedDataAttrs($$value) {
    return this.#sharedDataAttrs($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "gridcell",
    "aria-selected": getAriaSelected(this.isSelectedDate),
    "aria-disabled": getAriaDisabled(this.ariaDisabled),
    ...this.sharedDataAttrs,
    [this.root.getBitsAttr("cell")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarDayState {
  static create(opts) {
    return new CalendarDayState(opts, CalendarCellContext.get());
  }
  opts;
  cell;
  attachment;
  constructor(opts, cell) {
    this.opts = opts;
    this.cell = cell;
    this.onclick = this.onclick.bind(this);
    this.attachment = attachRef(this.opts.ref);
  }
  #tabindex = derived(() => this.cell.isOutsideMonth && this.cell.root.opts.disableDaysOutsideMonth.current || this.cell.isDisabled ? void 0 : this.cell.isFocusedDate ? 0 : -1);
  onclick(e) {
    if (this.cell.isDisabled) return;
    this.cell.root.handleCellClick(e, this.cell.opts.date.current);
  }
  #snippetProps = derived(() => ({
    disabled: this.cell.isDisabled,
    unavailable: this.cell.isUnavailable,
    selected: this.cell.isSelectedDate,
    day: `${this.cell.opts.date.current.day}`
  }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "button",
    "aria-label": this.cell.labelText,
    "aria-disabled": getAriaDisabled(this.cell.ariaDisabled),
    ...this.cell.sharedDataAttrs,
    tabindex: this.#tabindex(),
    [this.cell.root.getBitsAttr("day")]: "",
    "data-bits-day": "",
    onclick: this.onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarNextButtonState {
  static create(opts) {
    return new CalendarNextButtonState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  #isDisabled = derived(() => this.root.isNextButtonDisabled);
  get isDisabled() {
    return this.#isDisabled();
  }
  set isDisabled($$value) {
    return this.#isDisabled($$value);
  }
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.onclick = this.onclick.bind(this);
    this.attachment = attachRef(this.opts.ref);
  }
  onclick(_) {
    if (this.isDisabled) return;
    this.root.nextPage();
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "button",
    type: "button",
    "aria-label": "Next",
    "aria-disabled": getAriaDisabled(this.isDisabled),
    "data-disabled": getDataDisabled(this.isDisabled),
    disabled: this.isDisabled,
    [this.root.getBitsAttr("next-button")]: "",
    //
    onclick: this.onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarPrevButtonState {
  static create(opts) {
    return new CalendarPrevButtonState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  #isDisabled = derived(() => this.root.isPrevButtonDisabled);
  get isDisabled() {
    return this.#isDisabled();
  }
  set isDisabled($$value) {
    return this.#isDisabled($$value);
  }
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.onclick = this.onclick.bind(this);
    this.attachment = attachRef(this.opts.ref);
  }
  onclick(_) {
    if (this.isDisabled) return;
    this.root.prevPage();
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "button",
    type: "button",
    "aria-label": "Previous",
    "aria-disabled": getAriaDisabled(this.isDisabled),
    "data-disabled": getDataDisabled(this.isDisabled),
    disabled: this.isDisabled,
    [this.root.getBitsAttr("prev-button")]: "",
    //
    onclick: this.onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarGridState {
  static create(opts) {
    return new CalendarGridState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    tabindex: -1,
    role: "grid",
    "aria-readonly": getAriaReadonly(this.root.opts.readonly.current),
    "aria-disabled": getAriaDisabled(this.root.opts.disabled.current),
    "data-readonly": getDataReadonly(this.root.opts.readonly.current),
    "data-disabled": getDataDisabled(this.root.opts.disabled.current),
    [this.root.getBitsAttr("grid")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarGridBodyState {
  static create(opts) {
    return new CalendarGridBodyState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-disabled": getDataDisabled(this.root.opts.disabled.current),
    "data-readonly": getDataReadonly(this.root.opts.readonly.current),
    [this.root.getBitsAttr("grid-body")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarGridHeadState {
  static create(opts) {
    return new CalendarGridHeadState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-disabled": getDataDisabled(this.root.opts.disabled.current),
    "data-readonly": getDataReadonly(this.root.opts.readonly.current),
    [this.root.getBitsAttr("grid-head")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarGridRowState {
  static create(opts) {
    return new CalendarGridRowState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-disabled": getDataDisabled(this.root.opts.disabled.current),
    "data-readonly": getDataReadonly(this.root.opts.readonly.current),
    [this.root.getBitsAttr("grid-row")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarHeadCellState {
  static create(opts) {
    return new CalendarHeadCellState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-disabled": getDataDisabled(this.root.opts.disabled.current),
    "data-readonly": getDataReadonly(this.root.opts.readonly.current),
    [this.root.getBitsAttr("head-cell")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarHeaderState {
  static create(opts) {
    return new CalendarHeaderState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-disabled": getDataDisabled(this.root.opts.disabled.current),
    "data-readonly": getDataReadonly(this.root.opts.readonly.current),
    [this.root.getBitsAttr("header")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarMonthSelectState {
  static create(opts) {
    return new CalendarMonthSelectState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.onchange = this.onchange.bind(this);
    this.attachment = attachRef(this.opts.ref);
  }
  #monthItems = derived(() => {
    this.root.opts.locale.current;
    const monthNumbers = this.opts.months.current;
    const monthFormat = this.opts.monthFormat.current;
    const months = [];
    for (const month of monthNumbers) {
      const date = this.root.opts.placeholder.current.set({ month });
      let label;
      if (typeof monthFormat === "function") {
        label = monthFormat(month);
      } else {
        label = this.root.formatter.custom(toDate(date), { month: monthFormat });
      }
      months.push({ value: month, label });
    }
    return months;
  });
  get monthItems() {
    return this.#monthItems();
  }
  set monthItems($$value) {
    return this.#monthItems($$value);
  }
  #currentMonth = derived(() => this.root.opts.placeholder.current.month);
  get currentMonth() {
    return this.#currentMonth();
  }
  set currentMonth($$value) {
    return this.#currentMonth($$value);
  }
  #isDisabled = derived(() => this.root.opts.disabled.current || this.opts.disabled.current);
  get isDisabled() {
    return this.#isDisabled();
  }
  set isDisabled($$value) {
    return this.#isDisabled($$value);
  }
  #snippetProps = derived(() => {
    return {
      monthItems: this.monthItems,
      selectedMonthItem: this.monthItems.find((month) => month.value === this.currentMonth)
    };
  });
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  onchange(event) {
    if (this.isDisabled) return;
    const target = event.target;
    const month = parseInt(target.value, 10);
    if (!isNaN(month)) {
      this.root.opts.placeholder.current = this.root.opts.placeholder.current.set({ month });
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    value: this.currentMonth,
    disabled: this.isDisabled,
    "data-disabled": getDataDisabled(this.isDisabled),
    [this.root.getBitsAttr("month-select")]: "",
    //
    onchange: this.onchange,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CalendarYearSelectState {
  static create(opts) {
    return new CalendarYearSelectState(opts, CalendarRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.onchange = this.onchange.bind(this);
    this.attachment = attachRef(this.opts.ref);
  }
  #years = derived(() => {
    if (this.opts.years.current && this.opts.years.current.length) return this.opts.years.current;
    return this.root.defaultYears;
  });
  get years() {
    return this.#years();
  }
  set years($$value) {
    return this.#years($$value);
  }
  #yearItems = derived(() => {
    this.root.opts.locale.current;
    const yearFormat = this.opts.yearFormat.current;
    const localYears = [];
    for (const year of this.years) {
      const date = this.root.opts.placeholder.current.set({ year });
      let label;
      if (typeof yearFormat === "function") {
        label = yearFormat(year);
      } else {
        label = this.root.formatter.custom(toDate(date), { year: yearFormat });
      }
      localYears.push({ value: year, label });
    }
    return localYears;
  });
  get yearItems() {
    return this.#yearItems();
  }
  set yearItems($$value) {
    return this.#yearItems($$value);
  }
  #currentYear = derived(() => this.root.opts.placeholder.current.year);
  get currentYear() {
    return this.#currentYear();
  }
  set currentYear($$value) {
    return this.#currentYear($$value);
  }
  #isDisabled = derived(() => this.root.opts.disabled.current || this.opts.disabled.current);
  get isDisabled() {
    return this.#isDisabled();
  }
  set isDisabled($$value) {
    return this.#isDisabled($$value);
  }
  #snippetProps = derived(() => {
    return {
      yearItems: this.yearItems,
      selectedYearItem: this.yearItems.find((year) => year.value === this.currentYear)
    };
  });
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  onchange(event) {
    if (this.isDisabled) return;
    const target = event.target;
    const year = parseInt(target.value, 10);
    if (!isNaN(year)) {
      this.root.opts.placeholder.current = this.root.opts.placeholder.current.set({ year });
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    value: this.currentYear,
    disabled: this.isDisabled,
    "data-disabled": getDataDisabled(this.isDisabled),
    [this.root.getBitsAttr("year-select")]: "",
    //
    onchange: this.onchange,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
Calendar$1[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar.svelte";
function Calendar$1($$payload, $$props) {
  push(Calendar$1);
  let {
    child,
    children,
    id = useId$1(),
    ref = null,
    value = void 0,
    onValueChange = noop,
    placeholder = void 0,
    onPlaceholderChange = noop,
    weekdayFormat = "narrow",
    weekStartsOn,
    pagedNavigation = false,
    isDateDisabled = () => false,
    isDateUnavailable = () => false,
    fixedWeeks = false,
    numberOfMonths = 1,
    locale,
    calendarLabel = "Event",
    disabled = false,
    readonly: readonly2 = false,
    minValue = void 0,
    maxValue = void 0,
    preventDeselect = false,
    type,
    disableDaysOutsideMonth = true,
    initialFocus = false,
    maxDays,
    monthFormat = "long",
    yearFormat = "numeric",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const defaultPlaceholder = getDefaultDate({ defaultValue: value });
  function handleDefaultPlaceholder() {
    if (placeholder !== void 0) return;
    placeholder = defaultPlaceholder;
  }
  handleDefaultPlaceholder();
  watch$1.pre(() => placeholder, () => {
    handleDefaultPlaceholder();
  });
  function handleDefaultValue() {
    if (value !== void 0) return;
    value = type === "single" ? void 0 : [];
  }
  handleDefaultValue();
  watch$1.pre(() => value, () => {
    handleDefaultValue();
  });
  const rootState = CalendarRootState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    weekdayFormat: box$1.with(() => weekdayFormat),
    weekStartsOn: box$1.with(() => weekStartsOn),
    pagedNavigation: box$1.with(() => pagedNavigation),
    isDateDisabled: box$1.with(() => isDateDisabled),
    isDateUnavailable: box$1.with(() => isDateUnavailable),
    fixedWeeks: box$1.with(() => fixedWeeks),
    numberOfMonths: box$1.with(() => numberOfMonths),
    locale: resolveLocaleProp(() => locale),
    calendarLabel: box$1.with(() => calendarLabel),
    readonly: box$1.with(() => readonly2),
    disabled: box$1.with(() => disabled),
    minValue: box$1.with(() => minValue),
    maxValue: box$1.with(() => maxValue),
    disableDaysOutsideMonth: box$1.with(() => disableDaysOutsideMonth),
    initialFocus: box$1.with(() => initialFocus),
    maxDays: box$1.with(() => maxDays),
    placeholder: box$1.with(() => placeholder, (v) => {
      placeholder = v;
      onPlaceholderChange(v);
    }),
    preventDeselect: box$1.with(() => preventDeselect),
    value: box$1.with(() => value, (v) => {
      value = v;
      onValueChange(v);
    }),
    type: box$1.with(() => type),
    monthFormat: box$1.with(() => monthFormat),
    yearFormat: box$1.with(() => yearFormat),
    defaultPlaceholder
  });
  const mergedProps = mergeProps$1(restProps, rootState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...rootState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 128, 1);
    children?.($$payload, rootState.snippetProps);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref, value, placeholder });
  pop();
}
Calendar$1.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_day[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-day.svelte";
function Calendar_day($$payload, $$props) {
  push(Calendar_day);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const dayState = CalendarDayState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, dayState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...dayState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 34, 1);
    if (children) {
      $$payload.out.push("<!--[-->");
      children?.($$payload, dayState.snippetProps);
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`${escape_html(dayState.cell.opts.date.current.day)}`);
    }
    $$payload.out.push(`<!--]--></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_day.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_grid[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-grid.svelte";
function Calendar_grid($$payload, $$props) {
  push(Calendar_grid);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const gridState = CalendarGridState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, gridState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<table${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "table", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></table>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_grid.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_grid_body[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-grid-body.svelte";
function Calendar_grid_body($$payload, $$props) {
  push(Calendar_grid_body);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const gridBodyState = CalendarGridBodyState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, gridBodyState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<tbody${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "tbody", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></tbody>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_grid_body.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_cell[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-cell.svelte";
function Calendar_cell($$payload, $$props) {
  push(Calendar_cell);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    date,
    month,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const cellState = CalendarCellState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    date: box$1.with(() => date),
    month: box$1.with(() => month)
  });
  const mergedProps = mergeProps$1(restProps, cellState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...cellState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<td${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "td", 38, 1);
    children?.($$payload, cellState.snippetProps);
    $$payload.out.push(`<!----></td>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_grid_head[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-grid-head.svelte";
function Calendar_grid_head($$payload, $$props) {
  push(Calendar_grid_head);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const gridHeadState = CalendarGridHeadState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, gridHeadState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<thead${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "thead", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></thead>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_grid_head.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_head_cell[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-head-cell.svelte";
function Calendar_head_cell($$payload, $$props) {
  push(Calendar_head_cell);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const headCellState = CalendarHeadCellState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, headCellState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<th${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "th", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></th>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_head_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_grid_row[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-grid-row.svelte";
function Calendar_grid_row($$payload, $$props) {
  push(Calendar_grid_row);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const gridRowState = CalendarGridRowState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, gridRowState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<tr${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "tr", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></tr>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_grid_row.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_header[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-header.svelte";
function Calendar_header($$payload, $$props) {
  push(Calendar_header);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const headerState = CalendarHeaderState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, headerState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<header${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "header", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></header>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_month_select[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-month-select.svelte";
function Calendar_month_select($$payload, $$props) {
  push(Calendar_month_select);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    monthFormat = "long",
    disabled = false,
    "aria-label": ariaLabel = "Select a month",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const monthSelectState = CalendarMonthSelectState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    months: box$1.with(() => months),
    monthFormat: box$1.with(() => monthFormat),
    disabled: box$1.with(() => Boolean(disabled))
  });
  const mergedProps = mergeProps$1(restProps, monthSelectState.props, { "aria-label": ariaLabel });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...monthSelectState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<select${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "select", 40, 1);
    $$payload.select_value = { ...mergedProps }?.value;
    if (children) {
      $$payload.out.push("<!--[-->");
      children?.($$payload, monthSelectState.snippetProps);
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      const each_array = ensure_array_like(monthSelectState.monthItems);
      $$payload.out.push(`<!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let month = each_array[$$index];
        $$payload.out.push(`<option${attr("value", month.value)}${maybe_selected($$payload, month.value)}${attr("selected", month.value === monthSelectState.currentMonth, true)}>`);
        push_element($$payload, "option", 45, 4);
        $$payload.out.push(`${escape_html(month.label)}</option>`);
        pop_element();
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
    $$payload.select_value = void 0;
    $$payload.out.push(`</select>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_month_select.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_next_button[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-next-button.svelte";
function Calendar_next_button($$payload, $$props) {
  push(Calendar_next_button);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    ref = null,
    // for safari
    tabindex = 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const nextButtonState = CalendarNextButtonState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, nextButtonState.props, { tabindex });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 33, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_next_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_prev_button[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-prev-button.svelte";
function Calendar_prev_button($$payload, $$props) {
  push(Calendar_prev_button);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    ref = null,
    // for safari
    tabindex = 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const prevButtonState = CalendarPrevButtonState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, prevButtonState.props, { tabindex });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 33, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_prev_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_year_select[FILENAME] = "node_modules/bits-ui/dist/bits/calendar/components/calendar-year-select.svelte";
function Calendar_year_select($$payload, $$props) {
  push(Calendar_year_select);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    years,
    yearFormat = "numeric",
    disabled = false,
    "aria-label": ariaLabel = "Select a year",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const yearSelectState = CalendarYearSelectState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    years: box$1.with(() => years),
    yearFormat: box$1.with(() => yearFormat),
    disabled: box$1.with(() => Boolean(disabled))
  });
  const mergedProps = mergeProps$1(restProps, yearSelectState.props, { "aria-label": ariaLabel });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...yearSelectState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<select${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "select", 40, 1);
    $$payload.select_value = { ...mergedProps }?.value;
    if (children) {
      $$payload.out.push("<!--[-->");
      children?.($$payload, yearSelectState.snippetProps);
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      const each_array = ensure_array_like(yearSelectState.yearItems);
      $$payload.out.push(`<!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let year = each_array[$$index];
        $$payload.out.push(`<option${attr("value", year.value)}${maybe_selected($$payload, year.value)}${attr("selected", year.value === yearSelectState.currentYear, true)}>`);
        push_element($$payload, "option", 45, 4);
        $$payload.out.push(`${escape_html(year.label)}</option>`);
        pop_element();
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
    $$payload.select_value = void 0;
    $$payload.out.push(`</select>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Calendar_year_select.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const checkboxAttrs = createBitsAttrs({
  component: "checkbox",
  parts: ["root", "group", "group-label", "input"]
});
const CheckboxGroupContext = new Context$2("Checkbox.Group");
const CheckboxRootContext = new Context$2("Checkbox.Root");
class CheckboxRootState {
  static create(opts, group = null) {
    return CheckboxRootContext.set(new CheckboxRootState(opts, group));
  }
  opts;
  group;
  #trueName = derived(() => {
    if (this.group && this.group.opts.name.current) return this.group.opts.name.current;
    return this.opts.name.current;
  });
  get trueName() {
    return this.#trueName();
  }
  set trueName($$value) {
    return this.#trueName($$value);
  }
  #trueRequired = derived(() => {
    if (this.group && this.group.opts.required.current) return true;
    return this.opts.required.current;
  });
  get trueRequired() {
    return this.#trueRequired();
  }
  set trueRequired($$value) {
    return this.#trueRequired($$value);
  }
  #trueDisabled = derived(() => {
    if (this.group && this.group.opts.disabled.current) return true;
    return this.opts.disabled.current;
  });
  get trueDisabled() {
    return this.#trueDisabled();
  }
  set trueDisabled($$value) {
    return this.#trueDisabled($$value);
  }
  #trueReadonly = derived(() => {
    if (this.group && this.group.opts.readonly.current) return true;
    return this.opts.readonly.current;
  });
  get trueReadonly() {
    return this.#trueReadonly();
  }
  set trueReadonly($$value) {
    return this.#trueReadonly($$value);
  }
  attachment;
  constructor(opts, group) {
    this.opts = opts;
    this.group = group;
    this.attachment = attachRef(this.opts.ref);
    this.onkeydown = this.onkeydown.bind(this);
    this.onclick = this.onclick.bind(this);
    watch$1.pre(
      [
        () => snapshot(this.group?.opts.value.current),
        () => this.opts.value.current
      ],
      ([groupValue, value]) => {
        if (!groupValue || !value) return;
        this.opts.checked.current = groupValue.includes(value);
      }
    );
    watch$1.pre(() => this.opts.checked.current, (checked) => {
      if (!this.group) return;
      if (checked) {
        this.group?.addValue(this.opts.value.current);
      } else {
        this.group?.removeValue(this.opts.value.current);
      }
    });
  }
  onkeydown(e) {
    if (this.trueDisabled || this.trueReadonly) return;
    if (e.key === ENTER) e.preventDefault();
    if (e.key === SPACE) {
      e.preventDefault();
      this.#toggle();
    }
  }
  #toggle() {
    if (this.opts.indeterminate.current) {
      this.opts.indeterminate.current = false;
      this.opts.checked.current = true;
    } else {
      this.opts.checked.current = !this.opts.checked.current;
    }
  }
  onclick(e) {
    if (this.trueDisabled || this.trueReadonly) return;
    if (this.opts.type.current === "submit") {
      this.#toggle();
      return;
    }
    e.preventDefault();
    this.#toggle();
  }
  #snippetProps = derived(() => ({
    checked: this.opts.checked.current,
    indeterminate: this.opts.indeterminate.current
  }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "checkbox",
    type: this.opts.type.current,
    disabled: this.trueDisabled,
    "aria-checked": getAriaChecked(this.opts.checked.current, this.opts.indeterminate.current),
    "aria-required": getAriaRequired$1(this.trueRequired),
    "aria-readonly": getAriaReadonly(this.trueReadonly),
    "data-disabled": getDataDisabled(this.trueDisabled),
    "data-readonly": getDataReadonly(this.trueReadonly),
    "data-state": getCheckboxDataState(this.opts.checked.current, this.opts.indeterminate.current),
    [checkboxAttrs.root]: "",
    onclick: this.onclick,
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CheckboxInputState {
  static create() {
    return new CheckboxInputState(CheckboxRootContext.get());
  }
  root;
  #trueChecked = derived(() => {
    if (!this.root.group) return this.root.opts.checked.current;
    if (this.root.opts.value.current !== void 0 && this.root.group.opts.value.current.includes(this.root.opts.value.current)) {
      return true;
    }
    return false;
  });
  get trueChecked() {
    return this.#trueChecked();
  }
  set trueChecked($$value) {
    return this.#trueChecked($$value);
  }
  #shouldRender = derived(() => Boolean(this.root.trueName));
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(root2) {
    this.root = root2;
  }
  #props = derived(() => ({
    type: "checkbox",
    checked: this.root.opts.checked.current === true,
    disabled: this.root.trueDisabled,
    required: this.root.trueRequired,
    name: this.root.trueName,
    value: this.root.opts.value.current,
    readonly: this.root.trueReadonly
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function getCheckboxDataState(checked, indeterminate) {
  if (indeterminate) return "indeterminate";
  return checked ? "checked" : "unchecked";
}
Hidden_input[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/hidden-input.svelte";
function Hidden_input($$payload, $$props) {
  push(Hidden_input);
  let { value = void 0, $$slots, $$events, ...restProps } = $$props;
  const mergedProps = mergeProps$1(restProps, {
    "aria-hidden": "true",
    tabindex: -1,
    style: srOnlyStylesString
  });
  if (mergedProps.type === "checkbox") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<input${spread_attributes({ ...mergedProps, value }, null)}/>`);
    push_element($$payload, "input", 17, 1);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<input${spread_attributes({ value, ...mergedProps }, null)}/>`);
    push_element($$payload, "input", 19, 1);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { value });
  pop();
}
Hidden_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Checkbox_input[FILENAME] = "node_modules/bits-ui/dist/bits/checkbox/components/checkbox-input.svelte";
function Checkbox_input($$payload, $$props) {
  push(Checkbox_input);
  const inputState = CheckboxInputState.create();
  if (inputState.shouldRender) {
    $$payload.out.push("<!--[-->");
    Hidden_input($$payload, spread_props([inputState.props]));
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Checkbox_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Checkbox[FILENAME] = "node_modules/bits-ui/dist/bits/checkbox/components/checkbox.svelte";
function Checkbox($$payload, $$props) {
  push(Checkbox);
  const uid = props_id($$payload);
  let {
    checked = false,
    ref = null,
    onCheckedChange,
    children,
    disabled = false,
    required = false,
    name = void 0,
    value = "on",
    id = createId$1(uid),
    indeterminate = false,
    onIndeterminateChange,
    child,
    type = "button",
    readonly: readonly2,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const group = CheckboxGroupContext.getOr(null);
  if (group && value) {
    if (group.opts.value.current.includes(value)) {
      checked = true;
    } else {
      checked = false;
    }
  }
  watch$1.pre(() => value, () => {
    if (group && value) {
      if (group.opts.value.current.includes(value)) {
        checked = true;
      } else {
        checked = false;
      }
    }
  });
  const rootState = CheckboxRootState.create(
    {
      checked: box$1.with(() => checked, (v) => {
        checked = v;
        onCheckedChange?.(v);
      }),
      disabled: box$1.with(() => disabled ?? false),
      required: box$1.with(() => required),
      name: box$1.with(() => name),
      value: box$1.with(() => value),
      id: box$1.with(() => id),
      ref: box$1.with(() => ref, (v) => ref = v),
      indeterminate: box$1.with(() => indeterminate, (v) => {
        indeterminate = v;
        onIndeterminateChange?.(v);
      }),
      type: box$1.with(() => type),
      readonly: box$1.with(() => Boolean(readonly2))
    },
    group
  );
  const mergedProps = mergeProps$1({ ...restProps }, rootState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...rootState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 92, 1);
    children?.($$payload, rootState.snippetProps);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]--> `);
  Checkbox_input($$payload);
  $$payload.out.push(`<!---->`);
  bind_props($$props, { checked, ref, indeterminate });
  pop();
}
Checkbox.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function get(valueOrGetValue) {
  return typeof valueOrGetValue === "function" ? valueOrGetValue() : valueOrGetValue;
}
function getDPR(element2) {
  if (typeof window === "undefined") return 1;
  const win = element2.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}
function roundByDPR(element2, value) {
  const dpr = getDPR(element2);
  return Math.round(value * dpr) / dpr;
}
function getFloatingContentCSSVars(name) {
  return {
    [`--bits-${name}-content-transform-origin`]: `var(--bits-floating-transform-origin)`,
    [`--bits-${name}-content-available-width`]: `var(--bits-floating-available-width)`,
    [`--bits-${name}-content-available-height`]: `var(--bits-floating-available-height)`,
    [`--bits-${name}-anchor-width`]: `var(--bits-floating-anchor-width)`,
    [`--bits-${name}-anchor-height`]: `var(--bits-floating-anchor-height)`
  };
}
function useFloating(options2) {
  const openOption = get(options2.open) ?? true;
  const middlewareOption = get(options2.middleware);
  const transformOption = get(options2.transform) ?? true;
  const placementOption = get(options2.placement) ?? "bottom";
  const strategyOption = get(options2.strategy) ?? "absolute";
  const sideOffsetOption = get(options2.sideOffset) ?? 0;
  const alignOffsetOption = get(options2.alignOffset) ?? 0;
  const reference = options2.reference;
  let x = 0;
  let y = 0;
  const floating = box$1(null);
  let strategy = strategyOption;
  let placement = placementOption;
  let middlewareData = {};
  let isPositioned = false;
  const floatingStyles = (() => {
    const xVal = floating.current ? roundByDPR(floating.current, x) : x;
    const yVal = floating.current ? roundByDPR(floating.current, y) : y;
    if (transformOption) {
      return {
        position: strategy,
        left: "0",
        top: "0",
        transform: `translate(${xVal}px, ${yVal}px)`,
        ...floating.current && getDPR(floating.current) >= 1.5 && { willChange: "transform" }
      };
    }
    return { position: strategy, left: `${xVal}px`, top: `${yVal}px` };
  })();
  function update() {
    if (reference.current === null || floating.current === null) return;
    computePosition(reference.current, floating.current, {
      middleware: middlewareOption,
      placement: placementOption,
      strategy: strategyOption
    }).then((position) => {
      if (!openOption && x !== 0 && y !== 0) {
        const maxExpectedOffset = Math.max(Math.abs(sideOffsetOption), Math.abs(alignOffsetOption), 15);
        if (position.x <= maxExpectedOffset && position.y <= maxExpectedOffset) return;
      }
      x = position.x;
      y = position.y;
      strategy = position.strategy;
      placement = position.placement;
      middlewareData = position.middlewareData;
      isPositioned = true;
    });
  }
  return {
    floating,
    reference,
    get strategy() {
      return strategy;
    },
    get placement() {
      return placement;
    },
    get middlewareData() {
      return middlewareData;
    },
    get isPositioned() {
      return isPositioned;
    },
    get floatingStyles() {
      return floatingStyles;
    },
    get update() {
      return update;
    }
  };
}
const OPPOSITE_SIDE = { top: "bottom", right: "left", bottom: "top", left: "right" };
const FloatingRootContext = new Context$2("Floating.Root");
const FloatingContentContext = new Context$2("Floating.Content");
const FloatingTooltipRootContext = new Context$2("Floating.Root");
class FloatingRootState {
  static create(tooltip = false) {
    return tooltip ? FloatingTooltipRootContext.set(new FloatingRootState()) : FloatingRootContext.set(new FloatingRootState());
  }
  anchorNode = box$1(null);
  customAnchorNode = box$1(null);
  triggerNode = box$1(null);
  constructor() {
  }
}
class FloatingContentState {
  static create(opts, tooltip = false) {
    return tooltip ? FloatingContentContext.set(new FloatingContentState(opts, FloatingTooltipRootContext.get())) : FloatingContentContext.set(new FloatingContentState(opts, FloatingRootContext.get()));
  }
  opts;
  root;
  // nodes
  contentRef = box$1(null);
  wrapperRef = box$1(null);
  arrowRef = box$1(null);
  contentAttachment = attachRef(this.contentRef);
  wrapperAttachment = attachRef(this.wrapperRef);
  arrowAttachment = attachRef(this.arrowRef);
  // ids
  arrowId = box$1(useId$1());
  #transformedStyle = derived(() => {
    if (typeof this.opts.style === "string") return cssToStyleObj$1(this.opts.style);
    if (!this.opts.style) return {};
  });
  #updatePositionStrategy = void 0;
  #arrowSize = new ElementSize(() => this.arrowRef.current ?? void 0);
  #arrowWidth = derived(() => this.#arrowSize?.width ?? 0);
  #arrowHeight = derived(() => this.#arrowSize?.height ?? 0);
  #desiredPlacement = derived(() => this.opts.side?.current + (this.opts.align.current !== "center" ? `-${this.opts.align.current}` : ""));
  #boundary = derived(() => Array.isArray(this.opts.collisionBoundary.current) ? this.opts.collisionBoundary.current : [this.opts.collisionBoundary.current]);
  #hasExplicitBoundaries = derived(() => this.#boundary().length > 0);
  get hasExplicitBoundaries() {
    return this.#hasExplicitBoundaries();
  }
  set hasExplicitBoundaries($$value) {
    return this.#hasExplicitBoundaries($$value);
  }
  #detectOverflowOptions = derived(() => ({
    padding: this.opts.collisionPadding.current,
    boundary: this.#boundary().filter(isNotNull),
    altBoundary: this.hasExplicitBoundaries
  }));
  get detectOverflowOptions() {
    return this.#detectOverflowOptions();
  }
  set detectOverflowOptions($$value) {
    return this.#detectOverflowOptions($$value);
  }
  #availableWidth = void 0;
  #availableHeight = void 0;
  #anchorWidth = void 0;
  #anchorHeight = void 0;
  #middleware = derived(() => [
    offset({
      mainAxis: this.opts.sideOffset.current + this.#arrowHeight(),
      alignmentAxis: this.opts.alignOffset.current
    }),
    this.opts.avoidCollisions.current && shift({
      mainAxis: true,
      crossAxis: false,
      limiter: this.opts.sticky.current === "partial" ? limitShift() : void 0,
      ...this.detectOverflowOptions
    }),
    this.opts.avoidCollisions.current && flip({ ...this.detectOverflowOptions }),
    size({
      ...this.detectOverflowOptions,
      apply: ({ rects, availableWidth, availableHeight }) => {
        const { width: anchorWidth, height: anchorHeight } = rects.reference;
        this.#availableWidth = availableWidth;
        this.#availableHeight = availableHeight;
        this.#anchorWidth = anchorWidth;
        this.#anchorHeight = anchorHeight;
      }
    }),
    this.arrowRef.current && arrow({
      element: this.arrowRef.current,
      padding: this.opts.arrowPadding.current
    }),
    transformOrigin({
      arrowWidth: this.#arrowWidth(),
      arrowHeight: this.#arrowHeight()
    }),
    this.opts.hideWhenDetached.current && hide({ strategy: "referenceHidden", ...this.detectOverflowOptions })
  ].filter(Boolean));
  get middleware() {
    return this.#middleware();
  }
  set middleware($$value) {
    return this.#middleware($$value);
  }
  floating;
  #placedSide = derived(() => getSideFromPlacement(this.floating.placement));
  get placedSide() {
    return this.#placedSide();
  }
  set placedSide($$value) {
    return this.#placedSide($$value);
  }
  #placedAlign = derived(() => getAlignFromPlacement(this.floating.placement));
  get placedAlign() {
    return this.#placedAlign();
  }
  set placedAlign($$value) {
    return this.#placedAlign($$value);
  }
  #arrowX = derived(() => this.floating.middlewareData.arrow?.x ?? 0);
  get arrowX() {
    return this.#arrowX();
  }
  set arrowX($$value) {
    return this.#arrowX($$value);
  }
  #arrowY = derived(() => this.floating.middlewareData.arrow?.y ?? 0);
  get arrowY() {
    return this.#arrowY();
  }
  set arrowY($$value) {
    return this.#arrowY($$value);
  }
  #cannotCenterArrow = derived(() => this.floating.middlewareData.arrow?.centerOffset !== 0);
  get cannotCenterArrow() {
    return this.#cannotCenterArrow();
  }
  set cannotCenterArrow($$value) {
    return this.#cannotCenterArrow($$value);
  }
  contentZIndex;
  #arrowBaseSide = derived(() => OPPOSITE_SIDE[this.placedSide]);
  get arrowBaseSide() {
    return this.#arrowBaseSide();
  }
  set arrowBaseSide($$value) {
    return this.#arrowBaseSide($$value);
  }
  #wrapperProps = derived(() => ({
    id: this.opts.wrapperId.current,
    "data-bits-floating-content-wrapper": "",
    style: {
      ...this.floating.floatingStyles,
      transform: this.floating.isPositioned ? this.floating.floatingStyles.transform : "translate(0, -200%)",
      minWidth: "max-content",
      zIndex: this.contentZIndex,
      "--bits-floating-transform-origin": `${this.floating.middlewareData.transformOrigin?.x} ${this.floating.middlewareData.transformOrigin?.y}`,
      "--bits-floating-available-width": `${this.#availableWidth}px`,
      "--bits-floating-available-height": `${this.#availableHeight}px`,
      "--bits-floating-anchor-width": `${this.#anchorWidth}px`,
      "--bits-floating-anchor-height": `${this.#anchorHeight}px`,
      ...this.floating.middlewareData.hide?.referenceHidden && { visibility: "hidden", "pointer-events": "none" },
      ...this.#transformedStyle()
    },
    dir: this.opts.dir.current,
    ...this.wrapperAttachment
  }));
  get wrapperProps() {
    return this.#wrapperProps();
  }
  set wrapperProps($$value) {
    return this.#wrapperProps($$value);
  }
  #props = derived(() => ({
    "data-side": this.placedSide,
    "data-align": this.placedAlign,
    style: styleToString$1({ ...this.#transformedStyle() }),
    ...this.contentAttachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  #arrowStyle = derived(() => ({
    position: "absolute",
    left: this.arrowX ? `${this.arrowX}px` : void 0,
    top: this.arrowY ? `${this.arrowY}px` : void 0,
    [this.arrowBaseSide]: 0,
    "transform-origin": { top: "", right: "0 0", bottom: "center 0", left: "100% 0" }[this.placedSide],
    transform: {
      top: "translateY(100%)",
      right: "translateY(50%) rotate(90deg) translateX(-50%)",
      bottom: "rotate(180deg)",
      left: "translateY(50%) rotate(-90deg) translateX(50%)"
    }[this.placedSide],
    visibility: this.cannotCenterArrow ? "hidden" : void 0
  }));
  get arrowStyle() {
    return this.#arrowStyle();
  }
  set arrowStyle($$value) {
    return this.#arrowStyle($$value);
  }
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    if (opts.customAnchor) {
      this.root.customAnchorNode.current = opts.customAnchor.current;
    }
    watch$1(() => opts.customAnchor.current, (customAnchor) => {
      this.root.customAnchorNode.current = customAnchor;
    });
    this.floating = useFloating({
      strategy: () => this.opts.strategy.current,
      placement: () => this.#desiredPlacement(),
      middleware: () => this.middleware,
      reference: this.root.anchorNode,
      open: () => this.opts.enabled.current,
      sideOffset: () => this.opts.sideOffset.current,
      alignOffset: () => this.opts.alignOffset.current
    });
    watch$1(() => this.contentRef.current, (contentNode) => {
      if (!contentNode) return;
      const win = getWindow(contentNode);
      this.contentZIndex = win.getComputedStyle(contentNode).zIndex;
    });
  }
}
class FloatingArrowState {
  static create(opts) {
    return new FloatingArrowState(opts, FloatingContentContext.get());
  }
  opts;
  content;
  constructor(opts, content) {
    this.opts = opts;
    this.content = content;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    style: this.content.arrowStyle,
    "data-side": this.content.placedSide,
    ...this.content.arrowAttachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class FloatingAnchorState {
  static create(opts, tooltip = false) {
    return tooltip ? new FloatingAnchorState(opts, FloatingTooltipRootContext.get()) : new FloatingAnchorState(opts, FloatingRootContext.get());
  }
  opts;
  root;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    if (opts.virtualEl && opts.virtualEl.current) {
      root2.triggerNode = box$1.from(opts.virtualEl.current);
    } else {
      root2.triggerNode = opts.ref;
    }
  }
}
function transformOrigin(options2) {
  return {
    name: "transformOrigin",
    options: options2,
    fn(data) {
      const { placement, rects, middlewareData } = data;
      const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
      const isArrowHidden = cannotCenterArrow;
      const arrowWidth = isArrowHidden ? 0 : options2.arrowWidth;
      const arrowHeight = isArrowHidden ? 0 : options2.arrowHeight;
      const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
      const noArrowAlign = { start: "0%", center: "50%", end: "100%" }[placedAlign];
      const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2;
      const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2;
      let x = "";
      let y = "";
      if (placedSide === "bottom") {
        x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
        y = `${-arrowHeight}px`;
      } else if (placedSide === "top") {
        x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
        y = `${rects.floating.height + arrowHeight}px`;
      } else if (placedSide === "right") {
        x = `${-arrowHeight}px`;
        y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
      } else if (placedSide === "left") {
        x = `${rects.floating.width + arrowHeight}px`;
        y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
      }
      return { data: { x, y } };
    }
  };
}
function getSideAndAlignFromPlacement(placement) {
  const [side, align = "center"] = placement.split("-");
  return [side, align];
}
function getSideFromPlacement(placement) {
  return getSideAndAlignFromPlacement(placement)[0];
}
function getAlignFromPlacement(placement) {
  return getSideAndAlignFromPlacement(placement)[1];
}
Floating_layer[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/floating-layer/components/floating-layer.svelte";
function Floating_layer($$payload, $$props) {
  push(Floating_layer);
  let { children, tooltip = false } = $$props;
  FloatingRootState.create(tooltip);
  children?.($$payload);
  $$payload.out.push(`<!---->`);
  pop();
}
Floating_layer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const defaultOptions = { afterMs: 1e4, onChange: noop };
function boxAutoReset(defaultValue, options2) {
  const { afterMs, onChange, getWindow: getWindow2 } = { ...defaultOptions, ...options2 };
  let timeout = null;
  let value = defaultValue;
  function resetAfter() {
    return getWindow2().setTimeout(
      () => {
        value = defaultValue;
        onChange?.(defaultValue);
      },
      afterMs
    );
  }
  return box$1.with(() => value, (v) => {
    value = v;
    onChange?.(v);
    if (timeout) getWindow2().clearTimeout(timeout);
    timeout = resetAfter();
  });
}
class DataTypeahead {
  #opts;
  #candidateValues = derived(() => this.#opts.candidateValues());
  #search;
  constructor(opts) {
    this.#opts = opts;
    this.#search = boxAutoReset("", { afterMs: 1e3, getWindow: this.#opts.getWindow });
    this.handleTypeaheadSearch = this.handleTypeaheadSearch.bind(this);
    this.resetTypeahead = this.resetTypeahead.bind(this);
  }
  handleTypeaheadSearch(key2) {
    if (!this.#opts.enabled() || !this.#candidateValues().length) return;
    this.#search.current = this.#search.current + key2;
    const currentItem = this.#opts.getCurrentItem();
    const currentMatch = this.#candidateValues().find((item) => item === currentItem) ?? "";
    const values = this.#candidateValues().map((item) => item ?? "");
    const nextMatch = getNextMatch(values, this.#search.current, currentMatch);
    const newItem = this.#candidateValues().find((item) => item === nextMatch);
    if (newItem) {
      this.#opts.onMatch(newItem);
    }
    return newItem;
  }
  resetTypeahead() {
    this.#search.current = "";
  }
}
class DOMTypeahead {
  #opts;
  #search;
  #onMatch = derived(() => {
    if (this.#opts.onMatch) return this.#opts.onMatch;
    return (node) => node.focus();
  });
  #getCurrentItem = derived(() => {
    if (this.#opts.getCurrentItem) return this.#opts.getCurrentItem;
    return this.#opts.getActiveElement;
  });
  constructor(opts) {
    this.#opts = opts;
    this.#search = boxAutoReset("", { afterMs: 1e3, getWindow: opts.getWindow });
    this.handleTypeaheadSearch = this.handleTypeaheadSearch.bind(this);
    this.resetTypeahead = this.resetTypeahead.bind(this);
  }
  handleTypeaheadSearch(key2, candidates) {
    if (!candidates.length) return;
    this.#search.current = this.#search.current + key2;
    const currentItem = this.#getCurrentItem()();
    const currentMatch = candidates.find((item) => item === currentItem)?.textContent?.trim() ?? "";
    const values = candidates.map((item) => item.textContent?.trim() ?? "");
    const nextMatch = getNextMatch(values, this.#search.current, currentMatch);
    const newItem = candidates.find((item) => item.textContent?.trim() === nextMatch);
    if (newItem) this.#onMatch()(newItem);
    return newItem;
  }
  resetTypeahead() {
    this.#search.current = "";
  }
  get search() {
    return this.#search.current;
  }
}
const FIRST_KEYS$1 = [ARROW_DOWN, PAGE_UP, HOME];
const LAST_KEYS$1 = [ARROW_UP, PAGE_DOWN, END];
const FIRST_LAST_KEYS$1 = [...FIRST_KEYS$1, ...LAST_KEYS$1];
const selectAttrs = createBitsAttrs({
  component: "select",
  parts: [
    "trigger",
    "content",
    "item",
    "viewport",
    "scroll-up-button",
    "scroll-down-button",
    "group",
    "group-label",
    "separator",
    "arrow",
    "input",
    "content-wrapper",
    "item-text",
    "value"
  ]
});
const SelectRootContext = new Context$2("Select.Root | Combobox.Root");
const SelectGroupContext = new Context$2("Select.Group | Combobox.Group");
const SelectContentContext = new Context$2("Select.Content | Combobox.Content");
class SelectBaseRootState {
  opts;
  touchedInput = false;
  inputNode = null;
  contentNode = null;
  triggerNode = null;
  valueId = "";
  highlightedNode = null;
  #highlightedValue = derived(() => {
    if (!this.highlightedNode) return null;
    return this.highlightedNode.getAttribute("data-value");
  });
  get highlightedValue() {
    return this.#highlightedValue();
  }
  set highlightedValue($$value) {
    return this.#highlightedValue($$value);
  }
  #highlightedId = derived(() => {
    if (!this.highlightedNode) return void 0;
    return this.highlightedNode.id;
  });
  get highlightedId() {
    return this.#highlightedId();
  }
  set highlightedId($$value) {
    return this.#highlightedId($$value);
  }
  #highlightedLabel = derived(() => {
    if (!this.highlightedNode) return null;
    return this.highlightedNode.getAttribute("data-label");
  });
  get highlightedLabel() {
    return this.#highlightedLabel();
  }
  set highlightedLabel($$value) {
    return this.#highlightedLabel($$value);
  }
  isUsingKeyboard = false;
  isCombobox = false;
  domContext = new DOMContext(() => null);
  constructor(opts) {
    this.opts = opts;
    this.isCombobox = opts.isCombobox;
    new OpenChangeComplete({
      ref: box$1.with(() => this.contentNode),
      open: this.opts.open,
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
  }
  #debouncedSetHighlightedToFirstCandidate = debounce(this.setHighlightedToFirstCandidate.bind(this), 20);
  setHighlightedNode(node, initial2 = false) {
    this.highlightedNode = node;
    if (node && (this.isUsingKeyboard || initial2)) {
      node.scrollIntoView({ block: this.opts.scrollAlignment.current });
    }
  }
  getCandidateNodes() {
    const node = this.contentNode;
    if (!node) return [];
    return Array.from(node.querySelectorAll(`[${this.getBitsAttr("item")}]:not([data-disabled])`));
  }
  setHighlightedToFirstCandidate(options2 = { debounced: false }) {
    if (options2.debounced) {
      this.#debouncedSetHighlightedToFirstCandidate();
      return;
    }
    this.setHighlightedNode(null);
    const candidateNodes = this.getCandidateNodes();
    if (!candidateNodes.length) return;
    this.setHighlightedNode(candidateNodes[0]);
  }
  getNodeByValue(value) {
    const candidateNodes = this.getCandidateNodes();
    return candidateNodes.find((node) => node.dataset.value === value) ?? null;
  }
  setOpen(open) {
    this.opts.open.current = open;
  }
  toggleOpen() {
    this.opts.open.current = !this.opts.open.current;
  }
  handleOpen() {
    this.setOpen(true);
  }
  handleClose() {
    this.setHighlightedNode(null);
    this.setOpen(false);
  }
  toggleMenu() {
    this.toggleOpen();
  }
  getBitsAttr = (part) => {
    return selectAttrs.getAttr(part, this.isCombobox ? "combobox" : void 0);
  };
}
class SelectSingleRootState extends SelectBaseRootState {
  opts;
  isMulti = false;
  #hasValue = derived(() => this.opts.value.current !== "");
  get hasValue() {
    return this.#hasValue();
  }
  set hasValue($$value) {
    return this.#hasValue($$value);
  }
  #currentLabel = derived(() => {
    if (!this.opts.items.current.length) return "";
    const match = this.opts.items.current.find((item) => item.value === this.opts.value.current)?.label;
    return match ?? "";
  });
  get currentLabel() {
    return this.#currentLabel();
  }
  set currentLabel($$value) {
    return this.#currentLabel($$value);
  }
  #candidateLabels = derived(() => {
    if (!this.opts.items.current.length) return [];
    const filteredItems = this.opts.items.current.filter((item) => !item.disabled);
    return filteredItems.map((item) => item.label);
  });
  get candidateLabels() {
    return this.#candidateLabels();
  }
  set candidateLabels($$value) {
    return this.#candidateLabels($$value);
  }
  #dataTypeaheadEnabled = derived(() => {
    if (this.isMulti) return false;
    if (this.opts.items.current.length === 0) return false;
    return true;
  });
  get dataTypeaheadEnabled() {
    return this.#dataTypeaheadEnabled();
  }
  set dataTypeaheadEnabled($$value) {
    return this.#dataTypeaheadEnabled($$value);
  }
  constructor(opts) {
    super(opts);
    this.opts = opts;
    watch$1(() => this.opts.open.current, () => {
      if (!this.opts.open.current) return;
      this.setInitialHighlightedNode();
    });
  }
  includesItem(itemValue) {
    return this.opts.value.current === itemValue;
  }
  toggleItem(itemValue, itemLabel = itemValue) {
    this.opts.value.current = this.includesItem(itemValue) ? "" : itemValue;
    this.opts.inputValue.current = itemLabel;
  }
  setInitialHighlightedNode() {
    afterTick(() => {
      if (this.highlightedNode && this.domContext.getDocument().contains(this.highlightedNode)) return;
      if (this.opts.value.current !== "") {
        const node = this.getNodeByValue(this.opts.value.current);
        if (node) {
          this.setHighlightedNode(node, true);
          return;
        }
      }
      const firstCandidate = this.getCandidateNodes()[0];
      if (!firstCandidate) return;
      this.setHighlightedNode(firstCandidate, true);
    });
  }
}
class SelectMultipleRootState extends SelectBaseRootState {
  opts;
  isMulti = true;
  #hasValue = derived(() => this.opts.value.current.length > 0);
  get hasValue() {
    return this.#hasValue();
  }
  set hasValue($$value) {
    return this.#hasValue($$value);
  }
  constructor(opts) {
    super(opts);
    this.opts = opts;
    watch$1(() => this.opts.open.current, () => {
      if (!this.opts.open.current) return;
      this.setInitialHighlightedNode();
    });
  }
  includesItem(itemValue) {
    return this.opts.value.current.includes(itemValue);
  }
  toggleItem(itemValue, itemLabel = itemValue) {
    if (this.includesItem(itemValue)) {
      this.opts.value.current = this.opts.value.current.filter((v) => v !== itemValue);
    } else {
      this.opts.value.current = [...this.opts.value.current, itemValue];
    }
    this.opts.inputValue.current = itemLabel;
  }
  setInitialHighlightedNode() {
    afterTick(() => {
      if (!this.domContext) return;
      if (this.highlightedNode && this.domContext.getDocument().contains(this.highlightedNode)) return;
      if (this.opts.value.current.length && this.opts.value.current[0] !== "") {
        const node = this.getNodeByValue(this.opts.value.current[0]);
        if (node) {
          this.setHighlightedNode(node, true);
          return;
        }
      }
      const firstCandidate = this.getCandidateNodes()[0];
      if (!firstCandidate) return;
      this.setHighlightedNode(firstCandidate, true);
    });
  }
}
class SelectRootState {
  static create(props) {
    const { type, ...rest } = props;
    const rootState = type === "single" ? new SelectSingleRootState(rest) : new SelectMultipleRootState(rest);
    return SelectRootContext.set(rootState);
  }
}
class SelectTriggerState {
  static create(opts) {
    return new SelectTriggerState(opts, SelectRootContext.get());
  }
  opts;
  root;
  attachment;
  #domTypeahead;
  #dataTypeahead;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(opts.ref, (v) => this.root.triggerNode = v);
    this.root.domContext = new DOMContext(opts.ref);
    this.#domTypeahead = new DOMTypeahead({
      getCurrentItem: () => this.root.highlightedNode,
      onMatch: (node) => {
        this.root.setHighlightedNode(node);
      },
      getActiveElement: () => this.root.domContext.getActiveElement(),
      getWindow: () => this.root.domContext.getWindow()
    });
    this.#dataTypeahead = new DataTypeahead({
      getCurrentItem: () => {
        if (this.root.isMulti) return "";
        return this.root.currentLabel;
      },
      onMatch: (label) => {
        if (this.root.isMulti) return;
        if (!this.root.opts.items.current) return;
        const matchedItem = this.root.opts.items.current.find((item) => item.label === label);
        if (!matchedItem) return;
        this.root.opts.value.current = matchedItem.value;
      },
      enabled: () => !this.root.isMulti && this.root.dataTypeaheadEnabled,
      candidateValues: () => this.root.isMulti ? [] : this.root.candidateLabels,
      getWindow: () => this.root.domContext.getWindow()
    });
    this.onkeydown = this.onkeydown.bind(this);
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointerup = this.onpointerup.bind(this);
    this.onclick = this.onclick.bind(this);
  }
  #handleOpen() {
    this.root.opts.open.current = true;
    this.#dataTypeahead.resetTypeahead();
    this.#domTypeahead.resetTypeahead();
  }
  #handlePointerOpen(_) {
    this.#handleOpen();
  }
  /**
   * Logic used to handle keyboard selection/deselection.
   *
   * If it returns true, it means the item was selected and whatever is calling
   * this function should return early
   *
   */
  #handleKeyboardSelection() {
    const isCurrentSelectedValue = this.root.highlightedValue === this.root.opts.value.current;
    if (!this.root.opts.allowDeselect.current && isCurrentSelectedValue && !this.root.isMulti) {
      this.root.handleClose();
      return true;
    }
    if (this.root.highlightedValue !== null) {
      this.root.toggleItem(this.root.highlightedValue, this.root.highlightedLabel ?? void 0);
    }
    if (!this.root.isMulti && !isCurrentSelectedValue) {
      this.root.handleClose();
      return true;
    }
    return false;
  }
  onkeydown(e) {
    this.root.isUsingKeyboard = true;
    if (e.key === ARROW_UP || e.key === ARROW_DOWN) e.preventDefault();
    if (!this.root.opts.open.current) {
      if (e.key === ENTER || e.key === SPACE || e.key === ARROW_DOWN || e.key === ARROW_UP) {
        e.preventDefault();
        this.root.handleOpen();
      } else if (!this.root.isMulti && this.root.dataTypeaheadEnabled) {
        this.#dataTypeahead.handleTypeaheadSearch(e.key);
        return;
      }
      if (this.root.hasValue) return;
      const candidateNodes2 = this.root.getCandidateNodes();
      if (!candidateNodes2.length) return;
      if (e.key === ARROW_DOWN) {
        const firstCandidate = candidateNodes2[0];
        this.root.setHighlightedNode(firstCandidate);
      } else if (e.key === ARROW_UP) {
        const lastCandidate = candidateNodes2[candidateNodes2.length - 1];
        this.root.setHighlightedNode(lastCandidate);
      }
      return;
    }
    if (e.key === TAB) {
      this.root.handleClose();
      return;
    }
    if ((e.key === ENTER || // if we're currently "typing ahead", we don't want to select the item
    // just yet as the item the user is trying to get to may have a space in it,
    // so we defer handling the close for this case until further down
    e.key === SPACE && this.#domTypeahead.search === "") && !e.isComposing) {
      e.preventDefault();
      const shouldReturn = this.#handleKeyboardSelection();
      if (shouldReturn) return;
    }
    if (e.key === ARROW_UP && e.altKey) {
      this.root.handleClose();
    }
    if (FIRST_LAST_KEYS$1.includes(e.key)) {
      e.preventDefault();
      const candidateNodes2 = this.root.getCandidateNodes();
      const currHighlightedNode = this.root.highlightedNode;
      const currIndex = currHighlightedNode ? candidateNodes2.indexOf(currHighlightedNode) : -1;
      const loop2 = this.root.opts.loop.current;
      let nextItem;
      if (e.key === ARROW_DOWN) {
        nextItem = next(candidateNodes2, currIndex, loop2);
      } else if (e.key === ARROW_UP) {
        nextItem = prev(candidateNodes2, currIndex, loop2);
      } else if (e.key === PAGE_DOWN) {
        nextItem = forward(candidateNodes2, currIndex, 10, loop2);
      } else if (e.key === PAGE_UP) {
        nextItem = backward(candidateNodes2, currIndex, 10, loop2);
      } else if (e.key === HOME) {
        nextItem = candidateNodes2[0];
      } else if (e.key === END) {
        nextItem = candidateNodes2[candidateNodes2.length - 1];
      }
      if (!nextItem) return;
      this.root.setHighlightedNode(nextItem);
      return;
    }
    const isModifierKey = e.ctrlKey || e.altKey || e.metaKey;
    const isCharacterKey = e.key.length === 1;
    const isSpaceKey = e.key === SPACE;
    const candidateNodes = this.root.getCandidateNodes();
    if (e.key === TAB) return;
    if (!isModifierKey && (isCharacterKey || isSpaceKey)) {
      const matchedNode = this.#domTypeahead.handleTypeaheadSearch(e.key, candidateNodes);
      if (!matchedNode && isSpaceKey) {
        e.preventDefault();
        this.#handleKeyboardSelection();
      }
      return;
    }
    if (!this.root.highlightedNode) {
      this.root.setHighlightedToFirstCandidate();
    }
  }
  onclick(e) {
    const currTarget = e.currentTarget;
    currTarget.focus();
  }
  onpointerdown(e) {
    if (this.root.opts.disabled.current) return;
    if (e.pointerType === "touch") return e.preventDefault();
    const target = e.target;
    if (target?.hasPointerCapture(e.pointerId)) {
      target?.releasePointerCapture(e.pointerId);
    }
    if (e.button === 0 && e.ctrlKey === false) {
      if (this.root.opts.open.current === false) {
        this.#handlePointerOpen(e);
      } else {
        this.root.handleClose();
      }
    }
  }
  onpointerup(e) {
    if (this.root.opts.disabled.current) return;
    e.preventDefault();
    if (e.pointerType === "touch") {
      if (this.root.opts.open.current === false) {
        this.#handlePointerOpen(e);
      } else {
        this.root.handleClose();
      }
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    disabled: this.root.opts.disabled.current ? true : void 0,
    "aria-haspopup": "listbox",
    "aria-expanded": getAriaExpanded(this.root.opts.open.current),
    "aria-activedescendant": this.root.highlightedId,
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    "data-disabled": getDataDisabled(this.root.opts.disabled.current),
    "data-placeholder": this.root.hasValue ? void 0 : "",
    [this.root.getBitsAttr("trigger")]: "",
    onpointerdown: this.onpointerdown,
    onkeydown: this.onkeydown,
    onclick: this.onclick,
    onpointerup: this.onpointerup,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectContentState {
  static create(opts) {
    return SelectContentContext.set(new SelectContentState(opts, SelectRootContext.get()));
  }
  opts;
  root;
  attachment;
  viewportNode = null;
  isPositioned = false;
  domContext;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(opts.ref, (v) => this.root.contentNode = v);
    this.domContext = new DOMContext(this.opts.ref);
    if (this.root.domContext === null) {
      this.root.domContext = this.domContext;
    }
    watch$1(() => this.root.opts.open.current, () => {
      if (this.root.opts.open.current) return;
      this.isPositioned = false;
    });
    this.onpointermove = this.onpointermove.bind(this);
  }
  onpointermove(_) {
    this.root.isUsingKeyboard = false;
  }
  #styles = derived(() => {
    return getFloatingContentCSSVars(this.root.isCombobox ? "combobox" : "select");
  });
  onInteractOutside = (e) => {
    if (e.target === this.root.triggerNode || e.target === this.root.inputNode) {
      e.preventDefault();
      return;
    }
    this.opts.onInteractOutside.current(e);
    if (e.defaultPrevented) return;
    this.root.handleClose();
  };
  onEscapeKeydown = (e) => {
    this.opts.onEscapeKeydown.current(e);
    if (e.defaultPrevented) return;
    this.root.handleClose();
  };
  onOpenAutoFocus = (e) => {
    e.preventDefault();
  };
  onCloseAutoFocus = (e) => {
    e.preventDefault();
  };
  #snippetProps = derived(() => ({ open: this.root.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "listbox",
    "aria-multiselectable": this.root.isMulti ? "true" : void 0,
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    [this.root.getBitsAttr("content")]: "",
    style: {
      display: "flex",
      flexDirection: "column",
      outline: "none",
      boxSizing: "border-box",
      pointerEvents: "auto",
      ...this.#styles()
    },
    onpointermove: this.onpointermove,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  popperProps = {
    onInteractOutside: this.onInteractOutside,
    onEscapeKeydown: this.onEscapeKeydown,
    onOpenAutoFocus: this.onOpenAutoFocus,
    onCloseAutoFocus: this.onCloseAutoFocus,
    trapFocus: false,
    loop: false,
    onPlaced: () => {
      if (this.root.opts.open.current) {
        this.isPositioned = true;
      }
    }
  };
}
class SelectItemState {
  static create(opts) {
    return new SelectItemState(opts, SelectRootContext.get());
  }
  opts;
  root;
  attachment;
  #isSelected = derived(() => this.root.includesItem(this.opts.value.current));
  get isSelected() {
    return this.#isSelected();
  }
  set isSelected($$value) {
    return this.#isSelected($$value);
  }
  #isHighlighted = derived(() => this.root.highlightedValue === this.opts.value.current);
  get isHighlighted() {
    return this.#isHighlighted();
  }
  set isHighlighted($$value) {
    return this.#isHighlighted($$value);
  }
  prevHighlighted = new Previous(() => this.isHighlighted);
  mounted = false;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(opts.ref);
    watch$1([() => this.isHighlighted, () => this.prevHighlighted.current], () => {
      if (this.isHighlighted) {
        this.opts.onHighlight.current();
      } else if (this.prevHighlighted.current) {
        this.opts.onUnhighlight.current();
      }
    });
    watch$1(() => this.mounted, () => {
      if (!this.mounted) return;
      this.root.setInitialHighlightedNode();
    });
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointerup = this.onpointerup.bind(this);
    this.onpointermove = this.onpointermove.bind(this);
  }
  handleSelect() {
    if (this.opts.disabled.current) return;
    const isCurrentSelectedValue = this.opts.value.current === this.root.opts.value.current;
    if (!this.root.opts.allowDeselect.current && isCurrentSelectedValue && !this.root.isMulti) {
      this.root.handleClose();
      return;
    }
    this.root.toggleItem(this.opts.value.current, this.opts.label.current);
    if (!this.root.isMulti && !isCurrentSelectedValue) {
      this.root.handleClose();
    }
  }
  #snippetProps = derived(() => ({ selected: this.isSelected, highlighted: this.isHighlighted }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  onpointerdown(e) {
    e.preventDefault();
  }
  /**
   * Using `pointerup` instead of `click` allows power users to pointerdown
   * the trigger, then release pointerup on an item to select it vs having to do
   * multiple clicks.
   */
  onpointerup(e) {
    if (e.defaultPrevented || !this.opts.ref.current) return;
    if (e.pointerType === "touch" && !isIOS) {
      on(
        this.opts.ref.current,
        "click",
        () => {
          this.handleSelect();
          this.root.setHighlightedNode(this.opts.ref.current);
        },
        { once: true }
      );
      return;
    }
    e.preventDefault();
    this.handleSelect();
    if (e.pointerType === "touch") {
      this.root.setHighlightedNode(this.opts.ref.current);
    }
  }
  onpointermove(e) {
    if (e.pointerType === "touch") return;
    if (this.root.highlightedNode !== this.opts.ref.current) {
      this.root.setHighlightedNode(this.opts.ref.current);
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "option",
    "aria-selected": this.root.includesItem(this.opts.value.current) ? "true" : void 0,
    "data-value": this.opts.value.current,
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    "data-highlighted": this.root.highlightedValue === this.opts.value.current && !this.opts.disabled.current ? "" : void 0,
    "data-selected": this.root.includesItem(this.opts.value.current) ? "" : void 0,
    "data-label": this.opts.label.current,
    [this.root.getBitsAttr("item")]: "",
    onpointermove: this.onpointermove,
    onpointerdown: this.onpointerdown,
    onpointerup: this.onpointerup,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectGroupState {
  static create(opts) {
    return SelectGroupContext.set(new SelectGroupState(opts, SelectRootContext.get()));
  }
  opts;
  root;
  labelNode = null;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "group",
    [this.root.getBitsAttr("group")]: "",
    "aria-labelledby": this.labelNode?.id ?? void 0,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectHiddenInputState {
  static create(opts) {
    return new SelectHiddenInputState(opts, SelectRootContext.get());
  }
  opts;
  root;
  #shouldRender = derived(() => this.root.opts.name.current !== "");
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.onfocus = this.onfocus.bind(this);
  }
  onfocus(e) {
    e.preventDefault();
    if (!this.root.isCombobox) {
      this.root.triggerNode?.focus();
    } else {
      this.root.inputNode?.focus();
    }
  }
  #props = derived(() => ({
    disabled: getDisabled(this.root.opts.disabled.current),
    required: getRequired(this.root.opts.required.current),
    name: this.root.opts.name.current,
    value: this.opts.value.current,
    onfocus: this.onfocus
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectViewportState {
  static create(opts) {
    return new SelectViewportState(opts, SelectContentContext.get());
  }
  opts;
  content;
  root;
  attachment;
  prevScrollTop = 0;
  constructor(opts, content) {
    this.opts = opts;
    this.content = content;
    this.root = content.root;
    this.attachment = attachRef(opts.ref, (v) => this.content.viewportNode = v);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "presentation",
    [this.root.getBitsAttr("viewport")]: "",
    style: {
      // we use position: 'relative' here on the `viewport` so that when we call
      // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
      // (independent of the scrollUpButton).
      position: "relative",
      flex: 1,
      overflow: "auto"
    },
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectScrollButtonImplState {
  opts;
  content;
  root;
  attachment;
  autoScrollTimer = null;
  userScrollTimer = -1;
  isUserScrolling = false;
  onAutoScroll = noop;
  mounted = false;
  constructor(opts, content) {
    this.opts = opts;
    this.content = content;
    this.root = content.root;
    this.attachment = attachRef(opts.ref);
    watch$1([() => this.mounted], () => {
      if (!this.mounted) {
        this.isUserScrolling = false;
        return;
      }
      if (this.isUserScrolling) return;
    });
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointermove = this.onpointermove.bind(this);
    this.onpointerleave = this.onpointerleave.bind(this);
  }
  handleUserScroll() {
    this.content.domContext.clearTimeout(this.userScrollTimer);
    this.isUserScrolling = true;
    this.userScrollTimer = this.content.domContext.setTimeout(
      () => {
        this.isUserScrolling = false;
      },
      200
    );
  }
  clearAutoScrollInterval() {
    if (this.autoScrollTimer === null) return;
    this.content.domContext.clearTimeout(this.autoScrollTimer);
    this.autoScrollTimer = null;
  }
  onpointerdown(_) {
    if (this.autoScrollTimer !== null) return;
    const autoScroll = (tick2) => {
      this.onAutoScroll();
      this.autoScrollTimer = this.content.domContext.setTimeout(() => autoScroll(tick2 + 1), this.opts.delay.current(tick2));
    };
    this.autoScrollTimer = this.content.domContext.setTimeout(() => autoScroll(1), this.opts.delay.current(0));
  }
  onpointermove(e) {
    this.onpointerdown(e);
  }
  onpointerleave(_) {
    this.clearAutoScrollInterval();
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "aria-hidden": getAriaHidden(true),
    style: { flexShrink: 0 },
    onpointerdown: this.onpointerdown,
    onpointermove: this.onpointermove,
    onpointerleave: this.onpointerleave,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectScrollDownButtonState {
  static create(opts) {
    return new SelectScrollDownButtonState(new SelectScrollButtonImplState(opts, SelectContentContext.get()));
  }
  scrollButtonState;
  content;
  root;
  canScrollDown = false;
  scrollIntoViewTimer = null;
  constructor(scrollButtonState) {
    this.scrollButtonState = scrollButtonState;
    this.content = scrollButtonState.content;
    this.root = scrollButtonState.root;
    this.scrollButtonState.onAutoScroll = this.handleAutoScroll;
    watch$1(
      [
        () => this.content.viewportNode,
        () => this.content.isPositioned
      ],
      () => {
        if (!this.content.viewportNode || !this.content.isPositioned) return;
        this.handleScroll(true);
        return on(this.content.viewportNode, "scroll", () => this.handleScroll());
      }
    );
    watch$1(() => this.scrollButtonState.mounted, () => {
      if (!this.scrollButtonState.mounted) return;
      if (this.scrollIntoViewTimer) {
        clearTimeout(this.scrollIntoViewTimer);
      }
      this.scrollIntoViewTimer = afterSleep(5, () => {
        const activeItem = this.root.highlightedNode;
        activeItem?.scrollIntoView({ block: this.root.opts.scrollAlignment.current });
      });
    });
  }
  /**
   * @param manual - if true, it means the function was invoked manually outside of an event
   * listener, so we don't call `handleUserScroll` to prevent the auto scroll from kicking in.
   */
  handleScroll = (manual = false) => {
    if (!manual) {
      this.scrollButtonState.handleUserScroll();
    }
    if (!this.content.viewportNode) return;
    const maxScroll = this.content.viewportNode.scrollHeight - this.content.viewportNode.clientHeight;
    const paddingTop = Number.parseInt(getComputedStyle(this.content.viewportNode).paddingTop, 10);
    this.canScrollDown = Math.ceil(this.content.viewportNode.scrollTop) < maxScroll - paddingTop;
  };
  handleAutoScroll = () => {
    const viewport = this.content.viewportNode;
    const selectedItem = this.root.highlightedNode;
    if (!viewport || !selectedItem) return;
    viewport.scrollTop = viewport.scrollTop + selectedItem.offsetHeight;
  };
  #props = derived(() => ({
    ...this.scrollButtonState.props,
    [this.root.getBitsAttr("scroll-down-button")]: ""
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectScrollUpButtonState {
  static create(opts) {
    return new SelectScrollUpButtonState(new SelectScrollButtonImplState(opts, SelectContentContext.get()));
  }
  scrollButtonState;
  content;
  root;
  canScrollUp = false;
  constructor(scrollButtonState) {
    this.scrollButtonState = scrollButtonState;
    this.content = scrollButtonState.content;
    this.root = scrollButtonState.root;
    this.scrollButtonState.onAutoScroll = this.handleAutoScroll;
    watch$1(
      [
        () => this.content.viewportNode,
        () => this.content.isPositioned
      ],
      () => {
        if (!this.content.viewportNode || !this.content.isPositioned) return;
        this.handleScroll(true);
        return on(this.content.viewportNode, "scroll", () => this.handleScroll());
      }
    );
  }
  /**
   * @param manual - if true, it means the function was invoked manually outside of an event
   * listener, so we don't call `handleUserScroll` to prevent the auto scroll from kicking in.
   */
  handleScroll = (manual = false) => {
    if (!manual) {
      this.scrollButtonState.handleUserScroll();
    }
    if (!this.content.viewportNode) return;
    const paddingTop = Number.parseInt(getComputedStyle(this.content.viewportNode).paddingTop, 10);
    this.canScrollUp = this.content.viewportNode.scrollTop - paddingTop > 0.1;
  };
  handleAutoScroll = () => {
    if (!this.content.viewportNode || !this.root.highlightedNode) return;
    this.content.viewportNode.scrollTop = this.content.viewportNode.scrollTop - this.root.highlightedNode.offsetHeight;
  };
  #props = derived(() => ({
    ...this.scrollButtonState.props,
    [this.root.getBitsAttr("scroll-up-button")]: ""
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
Select_hidden_input[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select-hidden-input.svelte";
function Select_hidden_input($$payload, $$props) {
  push(Select_hidden_input);
  let { value = "", autocomplete } = $$props;
  const hiddenInputState = SelectHiddenInputState.create({ value: box$1.with(() => value) });
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (hiddenInputState.shouldRender) {
      $$payload2.out.push("<!--[-->");
      Hidden_input($$payload2, spread_props([
        hiddenInputState.props,
        {
          autocomplete,
          get value() {
            return value;
          },
          set value($$value) {
            value = $$value;
            $$settled = false;
          }
        }
      ]));
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value });
  pop();
}
Select_hidden_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Floating_layer_anchor[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/floating-layer/components/floating-layer-anchor.svelte";
function Floating_layer_anchor($$payload, $$props) {
  push(Floating_layer_anchor);
  let { id, children, virtualEl, ref, tooltip = false } = $$props;
  FloatingAnchorState.create(
    {
      id: box$1.with(() => id),
      virtualEl: box$1.with(() => virtualEl),
      ref
    },
    tooltip
  );
  children?.($$payload);
  $$payload.out.push(`<!---->`);
  pop();
}
Floating_layer_anchor.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Arrow[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/arrow/arrow.svelte";
function Arrow($$payload, $$props) {
  push(Arrow);
  let {
    id = useId$1(),
    children,
    child,
    width = 10,
    height = 5,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const mergedProps = mergeProps$1(restProps, { id });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<span${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "span", 21, 1);
    if (children) {
      $$payload.out.push("<!--[-->");
      children?.($$payload);
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<svg${attr("width", width)}${attr("height", height)} viewBox="0 0 30 10" preserveAspectRatio="none" data-arrow="">`);
      push_element($$payload, "svg", 25, 3);
      $$payload.out.push(`<polygon points="0,0 30,0 15,10" fill="currentColor">`);
      push_element($$payload, "polygon", 26, 4);
      $$payload.out.push(`</polygon>`);
      pop_element();
      $$payload.out.push(`</svg>`);
      pop_element();
    }
    $$payload.out.push(`<!--]--></span>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Arrow.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Floating_layer_arrow[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/floating-layer/components/floating-layer-arrow.svelte";
function Floating_layer_arrow($$payload, $$props) {
  push(Floating_layer_arrow);
  let { id = useId$1(), ref = null, $$slots, $$events, ...restProps } = $$props;
  const arrowState = FloatingArrowState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, arrowState.props);
  Arrow($$payload, spread_props([mergedProps]));
  bind_props($$props, { ref });
  pop();
}
Floating_layer_arrow.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Floating_layer_content[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/floating-layer/components/floating-layer-content.svelte";
function Floating_layer_content($$payload, $$props) {
  push(Floating_layer_content);
  let {
    content,
    side = "bottom",
    sideOffset = 0,
    align = "center",
    alignOffset = 0,
    id,
    arrowPadding = 0,
    avoidCollisions = true,
    collisionBoundary = [],
    collisionPadding = 0,
    hideWhenDetached = false,
    onPlaced = () => {
    },
    sticky = "partial",
    updatePositionStrategy = "optimized",
    strategy = "fixed",
    dir = "ltr",
    style = {},
    wrapperId = useId$1(),
    customAnchor = null,
    enabled,
    tooltip = false
  } = $$props;
  const contentState = FloatingContentState.create(
    {
      side: box$1.with(() => side),
      sideOffset: box$1.with(() => sideOffset),
      align: box$1.with(() => align),
      alignOffset: box$1.with(() => alignOffset),
      id: box$1.with(() => id),
      arrowPadding: box$1.with(() => arrowPadding),
      avoidCollisions: box$1.with(() => avoidCollisions),
      collisionBoundary: box$1.with(() => collisionBoundary),
      collisionPadding: box$1.with(() => collisionPadding),
      hideWhenDetached: box$1.with(() => hideWhenDetached),
      onPlaced: box$1.with(() => onPlaced),
      sticky: box$1.with(() => sticky),
      updatePositionStrategy: box$1.with(() => updatePositionStrategy),
      strategy: box$1.with(() => strategy),
      dir: box$1.with(() => dir),
      style: box$1.with(() => style),
      enabled: box$1.with(() => enabled),
      wrapperId: box$1.with(() => wrapperId),
      customAnchor: box$1.with(() => customAnchor)
    },
    tooltip
  );
  const mergedProps = mergeProps$1(contentState.wrapperProps, { style: { pointerEvents: "auto" } });
  content?.($$payload, { props: contentState.props, wrapperProps: mergedProps });
  $$payload.out.push(`<!---->`);
  pop();
}
Floating_layer_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Floating_layer_content_static[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/floating-layer/components/floating-layer-content-static.svelte";
function Floating_layer_content_static($$payload, $$props) {
  push(Floating_layer_content_static);
  let { content, onPlaced } = $$props;
  content?.($$payload, { props: {}, wrapperProps: {} });
  $$payload.out.push(`<!---->`);
  pop();
}
Floating_layer_content_static.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const separatorAttrs = createBitsAttrs({ component: "separator", parts: ["root"] });
class SeparatorRootState {
  static create(opts) {
    return new SeparatorRootState(opts);
  }
  opts;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: this.opts.decorative.current ? "none" : "separator",
    "aria-orientation": getAriaOrientation(this.opts.orientation.current),
    "aria-hidden": getAriaHidden(this.opts.decorative.current),
    "data-orientation": getDataOrientation(this.opts.orientation.current),
    [separatorAttrs.root]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
Separator[FILENAME] = "node_modules/bits-ui/dist/bits/separator/components/separator.svelte";
function Separator($$payload, $$props) {
  push(Separator);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    child,
    children,
    decorative = false,
    orientation = "horizontal",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = SeparatorRootState.create({
    ref: box$1.with(() => ref, (v) => ref = v),
    id: box$1.with(() => id),
    decorative: box$1.with(() => decorative),
    orientation: box$1.with(() => orientation)
  });
  const mergedProps = mergeProps$1(restProps, rootState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 35, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Separator.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Popper_content[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/popper-layer/popper-content.svelte";
function Popper_content($$payload, $$props) {
  push(Popper_content);
  let {
    content,
    isStatic = false,
    onPlaced,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  if (isStatic) {
    $$payload.out.push("<!--[-->");
    Floating_layer_content_static($$payload, { content, onPlaced });
  } else {
    $$payload.out.push("<!--[!-->");
    Floating_layer_content($$payload, spread_props([{ content, onPlaced }, restProps]));
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Popper_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Popper_layer_inner[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/popper-layer/popper-layer-inner.svelte";
function Popper_layer_inner($$payload, $$props) {
  push(Popper_layer_inner);
  let {
    popper,
    onEscapeKeydown,
    escapeKeydownBehavior,
    preventOverflowTextSelection,
    id,
    onPointerDown,
    onPointerUp,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    avoidCollisions,
    collisionBoundary,
    collisionPadding,
    sticky,
    hideWhenDetached,
    updatePositionStrategy,
    strategy,
    dir,
    preventScroll,
    wrapperId,
    style,
    onPlaced,
    onInteractOutside,
    onCloseAutoFocus,
    onOpenAutoFocus,
    onFocusOutside,
    interactOutsideBehavior = "close",
    loop: loop2,
    trapFocus = true,
    isValidEvent: isValidEvent2 = () => false,
    customAnchor = null,
    isStatic = false,
    enabled,
    ref,
    tooltip = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  {
    let content = function($$payload2, { props: floatingProps, wrapperProps }) {
      validate_snippet_args($$payload2);
      if (restProps.forceMount && enabled) {
        $$payload2.out.push("<!--[-->");
        Scroll_lock($$payload2, { preventScroll });
      } else {
        $$payload2.out.push("<!--[!-->");
        if (!restProps.forceMount) {
          $$payload2.out.push("<!--[-->");
          Scroll_lock($$payload2, { preventScroll });
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]--> `);
      {
        let focusScope = function($$payload3, { props: focusScopeProps }) {
          validate_snippet_args($$payload3);
          Escape_layer($$payload3, {
            onEscapeKeydown,
            escapeKeydownBehavior,
            enabled,
            ref,
            children: prevent_snippet_stringification(($$payload4) => {
              {
                let children = function($$payload5, { props: dismissibleProps }) {
                  validate_snippet_args($$payload5);
                  Text_selection_layer($$payload5, {
                    id,
                    preventOverflowTextSelection,
                    onPointerDown,
                    onPointerUp,
                    enabled,
                    ref,
                    children: prevent_snippet_stringification(($$payload6) => {
                      popper?.($$payload6, {
                        props: mergeProps$1(restProps, floatingProps, dismissibleProps, focusScopeProps, { style: { pointerEvents: "auto" } }),
                        wrapperProps
                      });
                      $$payload6.out.push(`<!---->`);
                    })
                  });
                };
                prevent_snippet_stringification(children);
                Dismissible_layer($$payload4, {
                  id,
                  onInteractOutside,
                  onFocusOutside,
                  interactOutsideBehavior,
                  isValidEvent: isValidEvent2,
                  enabled,
                  ref,
                  children
                });
              }
            })
          });
        };
        prevent_snippet_stringification(focusScope);
        Focus_scope($$payload2, {
          onOpenAutoFocus,
          onCloseAutoFocus,
          loop: loop2,
          enabled,
          trapFocus,
          forceMount: restProps.forceMount,
          ref,
          focusScope
        });
      }
      $$payload2.out.push(`<!---->`);
    };
    prevent_snippet_stringification(content);
    Popper_content($$payload, {
      isStatic,
      id,
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      avoidCollisions,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      updatePositionStrategy,
      strategy,
      dir,
      wrapperId,
      style,
      onPlaced,
      customAnchor,
      enabled,
      tooltip,
      content,
      $$slots: { content: true }
    });
  }
  pop();
}
Popper_layer_inner.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Popper_layer[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/popper-layer/popper-layer.svelte";
function Popper_layer($$payload, $$props) {
  push(Popper_layer);
  let {
    popper,
    open,
    onEscapeKeydown,
    escapeKeydownBehavior,
    preventOverflowTextSelection,
    id,
    onPointerDown,
    onPointerUp,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    avoidCollisions,
    collisionBoundary,
    collisionPadding,
    sticky,
    hideWhenDetached,
    updatePositionStrategy,
    strategy,
    dir,
    preventScroll,
    wrapperId,
    style,
    onPlaced,
    onInteractOutside,
    onCloseAutoFocus,
    onOpenAutoFocus,
    onFocusOutside,
    interactOutsideBehavior = "close",
    loop: loop2,
    trapFocus = true,
    isValidEvent: isValidEvent2 = () => false,
    customAnchor = null,
    isStatic = false,
    ref,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  {
    let presence = function($$payload2) {
      validate_snippet_args($$payload2);
      Popper_layer_inner($$payload2, spread_props([
        {
          popper,
          onEscapeKeydown,
          escapeKeydownBehavior,
          preventOverflowTextSelection,
          id,
          onPointerDown,
          onPointerUp,
          side,
          sideOffset,
          align,
          alignOffset,
          arrowPadding,
          avoidCollisions,
          collisionBoundary,
          collisionPadding,
          sticky,
          hideWhenDetached,
          updatePositionStrategy,
          strategy,
          dir,
          preventScroll,
          wrapperId,
          style,
          onPlaced,
          customAnchor,
          isStatic,
          enabled: open,
          onInteractOutside,
          onCloseAutoFocus,
          onOpenAutoFocus,
          interactOutsideBehavior,
          loop: loop2,
          trapFocus,
          isValidEvent: isValidEvent2,
          onFocusOutside,
          forceMount: false,
          ref
        },
        restProps
      ]));
    };
    prevent_snippet_stringification(presence);
    Presence_layer($$payload, { open, ref, presence });
  }
  pop();
}
Popper_layer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Popper_layer_force_mount[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/popper-layer/popper-layer-force-mount.svelte";
function Popper_layer_force_mount($$payload, $$props) {
  push(Popper_layer_force_mount);
  let {
    popper,
    onEscapeKeydown,
    escapeKeydownBehavior,
    preventOverflowTextSelection,
    id,
    onPointerDown,
    onPointerUp,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    avoidCollisions,
    collisionBoundary,
    collisionPadding,
    sticky,
    hideWhenDetached,
    updatePositionStrategy,
    strategy,
    dir,
    preventScroll,
    wrapperId,
    style,
    onPlaced,
    onInteractOutside,
    onCloseAutoFocus,
    onOpenAutoFocus,
    onFocusOutside,
    interactOutsideBehavior = "close",
    loop: loop2,
    trapFocus = true,
    isValidEvent: isValidEvent2 = () => false,
    customAnchor = null,
    isStatic = false,
    enabled,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  Popper_layer_inner($$payload, spread_props([
    {
      popper,
      onEscapeKeydown,
      escapeKeydownBehavior,
      preventOverflowTextSelection,
      id,
      onPointerDown,
      onPointerUp,
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      avoidCollisions,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      updatePositionStrategy,
      strategy,
      dir,
      preventScroll,
      wrapperId,
      style,
      onPlaced,
      customAnchor,
      isStatic,
      enabled,
      onInteractOutside,
      onCloseAutoFocus,
      onOpenAutoFocus,
      interactOutsideBehavior,
      loop: loop2,
      trapFocus,
      isValidEvent: isValidEvent2,
      onFocusOutside
    },
    restProps,
    { forceMount: true }
  ]));
  pop();
}
Popper_layer_force_mount.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_content[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select-content.svelte";
function Select_content($$payload, $$props) {
  push(Select_content);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    forceMount = false,
    side = "bottom",
    onInteractOutside = noop,
    onEscapeKeydown = noop,
    children,
    child,
    preventScroll = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = SelectContentState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    onInteractOutside: box$1.with(() => onInteractOutside),
    onEscapeKeydown: box$1.with(() => onEscapeKeydown)
  });
  const mergedProps = mergeProps$1(restProps, contentState.props);
  if (forceMount) {
    $$payload.out.push("<!--[-->");
    {
      let popper = function($$payload2, { props, wrapperProps }) {
        validate_snippet_args($$payload2);
        const finalProps = mergeProps$1(props, { style: contentState.props.style });
        if (child) {
          $$payload2.out.push("<!--[-->");
          child($$payload2, {
            props: finalProps,
            wrapperProps,
            ...contentState.snippetProps
          });
          $$payload2.out.push(`<!---->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
          push_element($$payload2, "div", 54, 4);
          $$payload2.out.push(`<div${spread_attributes({ ...finalProps }, null)}>`);
          push_element($$payload2, "div", 55, 5);
          children?.($$payload2);
          $$payload2.out.push(`<!----></div>`);
          pop_element();
          $$payload2.out.push(`</div>`);
          pop_element();
        }
        $$payload2.out.push(`<!--]-->`);
      };
      prevent_snippet_stringification(popper);
      Popper_layer_force_mount($$payload, spread_props([
        mergedProps,
        contentState.popperProps,
        {
          ref: contentState.opts.ref,
          side,
          enabled: contentState.root.opts.open.current,
          id,
          preventScroll,
          forceMount: true,
          popper,
          $$slots: { popper: true }
        }
      ]));
    }
  } else {
    $$payload.out.push("<!--[!-->");
    if (!forceMount) {
      $$payload.out.push("<!--[-->");
      {
        let popper = function($$payload2, { props, wrapperProps }) {
          validate_snippet_args($$payload2);
          const finalProps = mergeProps$1(props, { style: contentState.props.style });
          if (child) {
            $$payload2.out.push("<!--[-->");
            child($$payload2, {
              props: finalProps,
              wrapperProps,
              ...contentState.snippetProps
            });
            $$payload2.out.push(`<!---->`);
          } else {
            $$payload2.out.push("<!--[!-->");
            $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
            push_element($$payload2, "div", 78, 4);
            $$payload2.out.push(`<div${spread_attributes({ ...finalProps }, null)}>`);
            push_element($$payload2, "div", 79, 5);
            children?.($$payload2);
            $$payload2.out.push(`<!----></div>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
          }
          $$payload2.out.push(`<!--]-->`);
        };
        prevent_snippet_stringification(popper);
        Popper_layer($$payload, spread_props([
          mergedProps,
          contentState.popperProps,
          {
            ref: contentState.opts.ref,
            side,
            open: contentState.root.opts.open.current,
            id,
            preventScroll,
            forceMount: false,
            popper,
            $$slots: { popper: true }
          }
        ]));
      }
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Select_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Mounted[FILENAME] = "node_modules/bits-ui/dist/bits/utilities/mounted.svelte";
function Mounted($$payload, $$props) {
  push(Mounted);
  let { mounted = false, onMountedChange = noop } = $$props;
  bind_props($$props, { mounted });
  pop();
}
Mounted.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_item[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select-item.svelte";
function Select_item($$payload, $$props) {
  push(Select_item);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    value,
    label = value,
    disabled = false,
    children,
    child,
    onHighlight = noop,
    onUnhighlight = noop,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const itemState = SelectItemState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    value: box$1.with(() => value),
    disabled: box$1.with(() => disabled),
    label: box$1.with(() => label),
    onHighlight: box$1.with(() => onHighlight),
    onUnhighlight: box$1.with(() => onUnhighlight)
  });
  const mergedProps = mergeProps$1(restProps, itemState.props);
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (child) {
      $$payload2.out.push("<!--[-->");
      child($$payload2, { props: mergedProps, ...itemState.snippetProps });
      $$payload2.out.push(`<!---->`);
    } else {
      $$payload2.out.push("<!--[!-->");
      $$payload2.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
      push_element($$payload2, "div", 43, 1);
      children?.($$payload2, itemState.snippetProps);
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    }
    $$payload2.out.push(`<!--]--> `);
    Mounted($$payload2, {
      get mounted() {
        return itemState.mounted;
      },
      set mounted($$value) {
        itemState.mounted = $$value;
        $$settled = false;
      }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Select_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_group[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select-group.svelte";
function Select_group($$payload, $$props) {
  push(Select_group);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const groupState = SelectGroupState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, groupState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Select_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_viewport[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select-viewport.svelte";
function Select_viewport($$payload, $$props) {
  push(Select_viewport);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const viewportState = SelectViewportState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, viewportState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Select_viewport.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_scroll_down_button[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select-scroll-down-button.svelte";
function Select_scroll_down_button($$payload, $$props) {
  push(Select_scroll_down_button);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    delay = () => 50,
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const scrollButtonState = SelectScrollDownButtonState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    delay: box$1.with(() => delay)
  });
  const mergedProps = mergeProps$1(restProps, scrollButtonState.props);
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (scrollButtonState.canScrollDown) {
      $$payload2.out.push("<!--[-->");
      Mounted($$payload2, {
        get mounted() {
          return scrollButtonState.scrollButtonState.mounted;
        },
        set mounted($$value) {
          scrollButtonState.scrollButtonState.mounted = $$value;
          $$settled = false;
        }
      });
      $$payload2.out.push(`<!----> `);
      if (child) {
        $$payload2.out.push("<!--[-->");
        child($$payload2, { props: restProps });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
        push_element($$payload2, "div", 36, 2);
        children?.($$payload2);
        $$payload2.out.push(`<!----></div>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Select_scroll_down_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_scroll_up_button[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select-scroll-up-button.svelte";
function Select_scroll_up_button($$payload, $$props) {
  push(Select_scroll_up_button);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    delay = () => 50,
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const scrollButtonState = SelectScrollUpButtonState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    delay: box$1.with(() => delay)
  });
  const mergedProps = mergeProps$1(restProps, scrollButtonState.props);
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (scrollButtonState.canScrollUp) {
      $$payload2.out.push("<!--[-->");
      Mounted($$payload2, {
        get mounted() {
          return scrollButtonState.scrollButtonState.mounted;
        },
        set mounted($$value) {
          scrollButtonState.scrollButtonState.mounted = $$value;
          $$settled = false;
        }
      });
      $$payload2.out.push(`<!----> `);
      if (child) {
        $$payload2.out.push("<!--[-->");
        child($$payload2, { props: restProps });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
        push_element($$payload2, "div", 36, 2);
        children?.($$payload2);
        $$payload2.out.push(`<!----></div>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Select_scroll_up_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function findNextSibling(el, selector) {
  let sibling = el.nextElementSibling;
  while (sibling) {
    if (sibling.matches(selector))
      return sibling;
    sibling = sibling.nextElementSibling;
  }
}
function findPreviousSibling(el, selector) {
  let sibling = el.previousElementSibling;
  while (sibling) {
    if (sibling.matches(selector))
      return sibling;
    sibling = sibling.previousElementSibling;
  }
}
function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  const length = value.length;
  let index2 = -1;
  let codeUnit;
  let result = "";
  const firstCodeUnit = value.charCodeAt(0);
  if (length === 1 && firstCodeUnit === 45)
    return "\\" + value;
  while (++index2 < length) {
    codeUnit = value.charCodeAt(index2);
    if (codeUnit === 0) {
      result += "�";
      continue;
    }
    if (
      // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is U+007F
      codeUnit >= 1 && codeUnit <= 31 || codeUnit === 127 || // If the character is the first character and is in the range [0-9] (U+0030 to U+0039)
      index2 === 0 && codeUnit >= 48 && codeUnit <= 57 || // If the character is the second character and is in the range [0-9] (U+0030 to U+0039)
      // and the first character is a `-` (U+002D)
      index2 === 1 && codeUnit >= 48 && codeUnit <= 57 && firstCodeUnit === 45
    ) {
      result += "\\" + codeUnit.toString(16) + " ";
      continue;
    }
    if (codeUnit >= 128 || codeUnit === 45 || codeUnit === 95 || codeUnit >= 48 && codeUnit <= 57 || codeUnit >= 65 && codeUnit <= 90 || codeUnit >= 97 && codeUnit <= 122) {
      result += value.charAt(index2);
      continue;
    }
    result += "\\" + value.charAt(index2);
  }
  return result;
}
const COMMAND_VALUE_ATTR = "data-value";
const commandAttrs = createBitsAttrs({
  component: "command",
  parts: [
    "root",
    "list",
    "input",
    "separator",
    "loading",
    "empty",
    "group",
    "group-items",
    "group-heading",
    "item",
    "viewport",
    "input-label"
  ]
});
const COMMAND_GROUP_SELECTOR = commandAttrs.selector("group");
const COMMAND_GROUP_ITEMS_SELECTOR = commandAttrs.selector("group-items");
const COMMAND_GROUP_HEADING_SELECTOR = commandAttrs.selector("group-heading");
const COMMAND_ITEM_SELECTOR = commandAttrs.selector("item");
const COMMAND_VALID_ITEM_SELECTOR = `${commandAttrs.selector("item")}:not([aria-disabled="true"])`;
const CommandRootContext = new Context$2("Command.Root");
const CommandListContext = new Context$2("Command.List");
const CommandGroupContainerContext = new Context$2("Command.Group");
const defaultState = {
  search: "",
  value: "",
  filtered: { count: 0, items: /* @__PURE__ */ new Map(), groups: /* @__PURE__ */ new Set() }
};
class CommandRootState {
  static create(opts) {
    return CommandRootContext.set(new CommandRootState(opts));
  }
  opts;
  attachment;
  #updateScheduled = false;
  #isInitialMount = true;
  sortAfterTick = false;
  sortAndFilterAfterTick = false;
  allItems = /* @__PURE__ */ new Set();
  allGroups = /* @__PURE__ */ new Map();
  allIds = /* @__PURE__ */ new Map();
  // attempt to prevent the harsh delay when user is typing fast
  key = 0;
  viewportNode = null;
  inputNode = null;
  labelNode = null;
  // published state that the components and other things can react to
  commandState = defaultState;
  // internal state that we mutate in batches and publish to the `state` at once
  _commandState = defaultState;
  #snapshot() {
    return snapshot(this._commandState);
  }
  #scheduleUpdate() {
    if (this.#updateScheduled) return;
    this.#updateScheduled = true;
    afterTick(() => {
      this.#updateScheduled = false;
      const currentState = this.#snapshot();
      const hasStateChanged = !Object.is(this.commandState, currentState);
      if (hasStateChanged) {
        this.commandState = currentState;
        this.opts.onStateChange?.current?.(currentState);
      }
    });
  }
  setState(key2, value, preventScroll) {
    if (Object.is(this._commandState[key2], value)) return;
    this._commandState[key2] = value;
    if (key2 === "search") {
      this.#filterItems();
      this.#sort();
    } else if (key2 === "value") {
      if (!preventScroll) this.#scrollSelectedIntoView();
    }
    this.#scheduleUpdate();
  }
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(this.opts.ref);
    const defaults = { ...this._commandState, value: this.opts.value.current ?? "" };
    this._commandState = defaults;
    this.commandState = defaults;
    this.onkeydown = this.onkeydown.bind(this);
  }
  /**
   * Calculates score for an item based on search text and keywords.
   * Higher score = better match.
   *
   * @param value - Item's display text
   * @param keywords - Optional keywords to boost scoring
   * @returns Score from 0-1, where 0 = no match
   */
  #score(value, keywords) {
    const filter = this.opts.filter.current ?? computeCommandScore;
    const score = value ? filter(value, this._commandState.search, keywords) : 0;
    return score;
  }
  /**
   * Sorts items and groups based on search scores.
   * Groups are sorted by their highest scoring item.
   * When no search active, selects first item.
   */
  #sort() {
    if (!this._commandState.search || this.opts.shouldFilter.current === false) {
      this.#selectFirstItem();
      return;
    }
    const scores = this._commandState.filtered.items;
    const groups = [];
    for (const value of this._commandState.filtered.groups) {
      const items = this.allGroups.get(value);
      let max2 = 0;
      if (!items) {
        groups.push([value, max2]);
        continue;
      }
      for (const item of items) {
        const score = scores.get(item);
        max2 = Math.max(score ?? 0, max2);
      }
      groups.push([value, max2]);
    }
    const listInsertionElement = this.viewportNode;
    const sorted = this.getValidItems().sort((a, b) => {
      const valueA = a.getAttribute("data-value");
      const valueB = b.getAttribute("data-value");
      const scoresA = scores.get(valueA) ?? 0;
      const scoresB = scores.get(valueB) ?? 0;
      return scoresB - scoresA;
    });
    for (const item of sorted) {
      const group = item.closest(COMMAND_GROUP_ITEMS_SELECTOR);
      if (group) {
        const itemToAppend = item.parentElement === group ? item : item.closest(`${COMMAND_GROUP_ITEMS_SELECTOR} > *`);
        if (itemToAppend) {
          group.appendChild(itemToAppend);
        }
      } else {
        const itemToAppend = item.parentElement === listInsertionElement ? item : item.closest(`${COMMAND_GROUP_ITEMS_SELECTOR} > *`);
        if (itemToAppend) {
          listInsertionElement?.appendChild(itemToAppend);
        }
      }
    }
    const sortedGroups = groups.sort((a, b) => b[1] - a[1]);
    for (const group of sortedGroups) {
      const element2 = listInsertionElement?.querySelector(`${COMMAND_GROUP_SELECTOR}[${COMMAND_VALUE_ATTR}="${cssEscape(group[0])}"]`);
      element2?.parentElement?.appendChild(element2);
    }
    this.#selectFirstItem();
  }
  /**
   * Sets current value and triggers re-render if cleared.
   *
   * @param value - New value to set
   */
  setValue(value, opts) {
    if (value !== this.opts.value.current && value === "") {
      afterTick(() => {
        this.key++;
      });
    }
    this.setState("value", value, opts);
    this.opts.value.current = value;
  }
  /**
   * Selects first non-disabled item on next tick.
   */
  #selectFirstItem() {
    afterTick(() => {
      const item = this.getValidItems().find((item2) => item2.getAttribute("aria-disabled") !== "true");
      const value = item?.getAttribute(COMMAND_VALUE_ATTR);
      const shouldPreventScroll = this.#isInitialMount && this.opts.disableInitialScroll.current;
      this.setValue(value ?? "", shouldPreventScroll);
      this.#isInitialMount = false;
    });
  }
  /**
   * Updates filtered items/groups based on search.
   * Recalculates scores and filtered count.
   */
  #filterItems() {
    if (!this._commandState.search || this.opts.shouldFilter.current === false) {
      this._commandState.filtered.count = this.allItems.size;
      return;
    }
    this._commandState.filtered.groups = /* @__PURE__ */ new Set();
    let itemCount = 0;
    for (const id of this.allItems) {
      const value = this.allIds.get(id)?.value ?? "";
      const keywords = this.allIds.get(id)?.keywords ?? [];
      const rank = this.#score(value, keywords);
      this._commandState.filtered.items.set(id, rank);
      if (rank > 0) itemCount++;
    }
    for (const [groupId, group] of this.allGroups) {
      for (const itemId of group) {
        const currItem = this._commandState.filtered.items.get(itemId);
        if (currItem && currItem > 0) {
          this._commandState.filtered.groups.add(groupId);
          break;
        }
      }
    }
    this._commandState.filtered.count = itemCount;
  }
  /**
   * Gets all non-disabled, visible command items.
   *
   * @returns Array of valid item elements
   * @remarks Exposed for direct item access and bound checking
   */
  getValidItems() {
    const node = this.opts.ref.current;
    if (!node) return [];
    const validItems = Array.from(node.querySelectorAll(COMMAND_VALID_ITEM_SELECTOR)).filter((el) => !!el);
    return validItems;
  }
  /**
   * Gets all visible command items.
   *
   * @returns Array of valid item elements
   * @remarks Exposed for direct item access and bound checking
   */
  getVisibleItems() {
    const node = this.opts.ref.current;
    if (!node) return [];
    const visibleItems = Array.from(node.querySelectorAll(COMMAND_ITEM_SELECTOR)).filter((el) => !!el);
    return visibleItems;
  }
  /** Returns all visible items in a matrix structure
   *
   * @remarks Returns empty if the command isn't configured as a grid
   *
   * @returns
   */
  get itemsGrid() {
    if (!this.isGrid) return [];
    const columns = this.opts.columns.current ?? 1;
    const items = this.getVisibleItems();
    const grid = [[]];
    let currentGroup = items[0]?.getAttribute("data-group");
    let column = 0;
    let row = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemGroup = item?.getAttribute("data-group");
      if (currentGroup !== itemGroup) {
        currentGroup = itemGroup;
        column = 1;
        row++;
        grid.push([{ index: i, firstRowOfGroup: true, ref: item }]);
      } else {
        column++;
        if (column > columns) {
          row++;
          column = 1;
          grid.push([]);
        }
        grid[row]?.push({
          index: i,
          firstRowOfGroup: grid[row]?.[0]?.firstRowOfGroup ?? i === 0,
          ref: item
        });
      }
    }
    return grid;
  }
  /**
   * Gets currently selected command item.
   *
   * @returns Selected element or undefined
   */
  #getSelectedItem() {
    const node = this.opts.ref.current;
    if (!node) return;
    const selectedNode = node.querySelector(`${COMMAND_VALID_ITEM_SELECTOR}[data-selected]`);
    if (!selectedNode) return;
    return selectedNode;
  }
  /**
   * Scrolls selected item into view.
   * Special handling for first items in groups.
   */
  #scrollSelectedIntoView() {
    afterTick(() => {
      const item = this.#getSelectedItem();
      if (!item) return;
      const grandparent = item.parentElement?.parentElement;
      if (!grandparent) return;
      if (this.isGrid) {
        const isFirstRowOfGroup = this.#itemIsFirstRowOfGroup(item);
        item.scrollIntoView({ block: "nearest" });
        if (isFirstRowOfGroup) {
          const closestGroupHeader = item?.closest(COMMAND_GROUP_SELECTOR)?.querySelector(COMMAND_GROUP_HEADING_SELECTOR);
          closestGroupHeader?.scrollIntoView({ block: "nearest" });
          return;
        }
      } else {
        const firstChildOfParent = getFirstNonCommentChild(grandparent);
        if (firstChildOfParent && firstChildOfParent.dataset?.value === item.dataset?.value) {
          const closestGroupHeader = item?.closest(COMMAND_GROUP_SELECTOR)?.querySelector(COMMAND_GROUP_HEADING_SELECTOR);
          closestGroupHeader?.scrollIntoView({ block: "nearest" });
          return;
        }
      }
      item.scrollIntoView({ block: "nearest" });
    });
  }
  #itemIsFirstRowOfGroup(item) {
    const grid = this.itemsGrid;
    if (grid.length === 0) return false;
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      if (row === void 0) continue;
      for (let c = 0; c < row.length; c++) {
        const column = row[c];
        if (column === void 0 || column.ref !== item) continue;
        return column.firstRowOfGroup;
      }
    }
    return false;
  }
  /**
   * Sets selection to item at specified index in valid items array.
   * If index is out of bounds, does nothing.
   *
   * @param index - Zero-based index of item to select
   * @remarks
   * Uses `getValidItems()` to get selectable items, filtering out disabled/hidden ones.
   * Access valid items directly via `getValidItems()` to check bounds before calling.
   *
   * @example
   * // get valid items length for bounds check
   * const items = getValidItems()
   * if (index < items.length) {
   *   updateSelectedToIndex(index)
   * }
   */
  updateSelectedToIndex(index2) {
    const item = this.getValidItems()[index2];
    if (!item) return;
    this.setValue(item.getAttribute(COMMAND_VALUE_ATTR) ?? "");
  }
  /**
   * Updates selected item by moving up/down relative to current selection.
   * Handles wrapping when loop option is enabled.
   *
   * @param change - Direction to move: 1 for next item, -1 for previous item
   * @remarks
   * The loop behavior wraps:
   * - From last item to first when moving next
   * - From first item to last when moving previous
   *
   * Uses `getValidItems()` to get all selectable items, which filters out disabled/hidden items.
   * You can call `getValidItems()` directly to get the current valid items array.
   *
   * @example
   * // select next item
   * updateSelectedByItem(1)
   *
   * // get all valid items
   * const items = getValidItems()
   */
  updateSelectedByItem(change) {
    const selected = this.#getSelectedItem();
    const items = this.getValidItems();
    const index2 = items.findIndex((item) => item === selected);
    let newSelected = items[index2 + change];
    if (this.opts.loop.current) {
      newSelected = index2 + change < 0 ? items[items.length - 1] : index2 + change === items.length ? items[0] : items[index2 + change];
    }
    if (newSelected) {
      this.setValue(newSelected.getAttribute(COMMAND_VALUE_ATTR) ?? "");
    }
  }
  /**
   * Moves selection to the first valid item in the next/previous group.
   * If no group is found, falls back to selecting the next/previous item globally.
   *
   * @param change - Direction to move: 1 for next group, -1 for previous group
   * @example
   * // move to first item in next group
   * updateSelectedByGroup(1)
   *
   * // move to first item in previous group
   * updateSelectedByGroup(-1)
   */
  updateSelectedByGroup(change) {
    const selected = this.#getSelectedItem();
    let group = selected?.closest(COMMAND_GROUP_SELECTOR);
    let item;
    while (group && !item) {
      group = change > 0 ? findNextSibling(group, COMMAND_GROUP_SELECTOR) : findPreviousSibling(group, COMMAND_GROUP_SELECTOR);
      item = group?.querySelector(COMMAND_VALID_ITEM_SELECTOR);
    }
    if (item) {
      this.setValue(item.getAttribute(COMMAND_VALUE_ATTR) ?? "");
    } else {
      this.updateSelectedByItem(change);
    }
  }
  /**
   * Maps item id to display value and search keywords.
   * Returns cleanup function to remove mapping.
   *
   * @param id - Unique item identifier
   * @param value - Display text
   * @param keywords - Optional search boost terms
   * @returns Cleanup function
   */
  registerValue(value, keywords) {
    if (!(value && value === this.allIds.get(value)?.value)) {
      this.allIds.set(value, { value, keywords });
    }
    this._commandState.filtered.items.set(value, this.#score(value, keywords));
    if (!this.sortAfterTick) {
      this.sortAfterTick = true;
      afterTick(() => {
        this.#sort();
        this.sortAfterTick = false;
      });
    }
    return () => {
      this.allIds.delete(value);
    };
  }
  /**
   * Registers item in command list and its group.
   * Handles filtering, sorting and selection updates.
   *
   * @param id - Item identifier
   * @param groupId - Optional group to add item to
   * @returns Cleanup function that handles selection
   */
  registerItem(id, groupId) {
    this.allItems.add(id);
    if (groupId) {
      if (!this.allGroups.has(groupId)) {
        this.allGroups.set(groupId, /* @__PURE__ */ new Set([id]));
      } else {
        this.allGroups.get(groupId).add(id);
      }
    }
    if (!this.sortAndFilterAfterTick) {
      this.sortAndFilterAfterTick = true;
      afterTick(() => {
        this.#filterItems();
        this.#sort();
        this.sortAndFilterAfterTick = false;
      });
    }
    this.#scheduleUpdate();
    return () => {
      const selectedItem = this.#getSelectedItem();
      this.allIds.delete(id);
      this.allItems.delete(id);
      this.commandState.filtered.items.delete(id);
      this.#filterItems();
      if (selectedItem?.getAttribute("id") === id) {
        this.#selectFirstItem();
      }
      this.#scheduleUpdate();
    };
  }
  /**
   * Creates empty group if not exists.
   *
   * @param id - Group identifier
   * @returns Cleanup function
   */
  registerGroup(id) {
    if (!this.allGroups.has(id)) {
      this.allGroups.set(id, /* @__PURE__ */ new Set());
    }
    return () => {
      this.allIds.delete(id);
      this.allGroups.delete(id);
    };
  }
  get isGrid() {
    return this.opts.columns.current !== null;
  }
  /**
   * Selects last valid item.
   */
  #last() {
    return this.updateSelectedToIndex(this.getValidItems().length - 1);
  }
  /**
   * Handles next item selection:
   * - Meta: Jump to last
   * - Alt: Next group
   * - Default: Next item
   *
   * @param e - Keyboard event
   */
  #next(e) {
    e.preventDefault();
    if (e.metaKey) {
      this.#last();
    } else if (e.altKey) {
      this.updateSelectedByGroup(1);
    } else {
      this.updateSelectedByItem(1);
    }
  }
  #down(e) {
    if (this.opts.columns.current === null) return;
    e.preventDefault();
    if (e.metaKey) {
      this.updateSelectedByGroup(1);
    } else {
      this.updateSelectedByItem(this.#nextRowColumnOffset(e));
    }
  }
  #getColumn(item, grid) {
    if (grid.length === 0) return null;
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      if (row === void 0) continue;
      for (let c = 0; c < row.length; c++) {
        const column = row[c];
        if (column === void 0 || column.ref !== item) continue;
        return { columnIndex: c, rowIndex: r };
      }
    }
    return null;
  }
  #nextRowColumnOffset(e) {
    const grid = this.itemsGrid;
    const selected = this.#getSelectedItem();
    if (!selected) return 0;
    const column = this.#getColumn(selected, grid);
    if (!column) return 0;
    let newItem = null;
    const skipRows = e.altKey ? 1 : 0;
    if (e.altKey && column.rowIndex === grid.length - 2 && !this.opts.loop.current) {
      newItem = this.#findNextNonDisabledItem({
        start: grid.length - 1,
        end: grid.length,
        expectedColumnIndex: column.columnIndex,
        grid
      });
    } else if (column.rowIndex === grid.length - 1) {
      if (!this.opts.loop.current) return 0;
      newItem = this.#findNextNonDisabledItem({
        start: 0 + skipRows,
        end: column.rowIndex,
        expectedColumnIndex: column.columnIndex,
        grid
      });
    } else {
      newItem = this.#findNextNonDisabledItem({
        start: column.rowIndex + 1 + skipRows,
        end: grid.length,
        expectedColumnIndex: column.columnIndex,
        grid
      });
      if (newItem === null && this.opts.loop.current) {
        newItem = this.#findNextNonDisabledItem({
          start: 0,
          end: column.rowIndex,
          expectedColumnIndex: column.columnIndex,
          grid
        });
      }
    }
    return this.#calculateOffset(selected, newItem);
  }
  /** Attempts to find the next non-disabled column that matches the expected column.
   *
   * @remarks
   * - Skips over disabled columns
   * - When a row is shorter than the expected column it defaults to the last item in the row
   *
   * @param param0
   * @returns
   */
  #findNextNonDisabledItem({ start, end, grid, expectedColumnIndex }) {
    let newItem = null;
    for (let r = start; r < end; r++) {
      const row = grid[r];
      newItem = row[expectedColumnIndex]?.ref ?? null;
      if (newItem !== null && itemIsDisabled(newItem)) {
        newItem = null;
        continue;
      }
      if (newItem === null) {
        for (let i = row.length - 1; i >= 0; i--) {
          const item = row[row.length - 1];
          if (item === void 0 || itemIsDisabled(item.ref)) continue;
          newItem = item.ref;
          break;
        }
      }
      break;
    }
    return newItem;
  }
  #calculateOffset(selected, newSelected) {
    if (newSelected === null) return 0;
    const items = this.getValidItems();
    const ogIndex = items.findIndex((item) => item === selected);
    const newIndex = items.findIndex((item) => item === newSelected);
    return newIndex - ogIndex;
  }
  #up(e) {
    if (this.opts.columns.current === null) return;
    e.preventDefault();
    if (e.metaKey) {
      this.updateSelectedByGroup(-1);
    } else {
      this.updateSelectedByItem(this.#previousRowColumnOffset(e));
    }
  }
  #previousRowColumnOffset(e) {
    const grid = this.itemsGrid;
    const selected = this.#getSelectedItem();
    if (selected === void 0) return 0;
    const column = this.#getColumn(selected, grid);
    if (column === null) return 0;
    let newItem = null;
    const skipRows = e.altKey ? 1 : 0;
    if (e.altKey && column.rowIndex === 1 && this.opts.loop.current === false) {
      newItem = this.#findNextNonDisabledItemDesc({
        start: 0,
        end: 0,
        expectedColumnIndex: column.columnIndex,
        grid
      });
    } else if (column.rowIndex === 0) {
      if (this.opts.loop.current === false) return 0;
      newItem = this.#findNextNonDisabledItemDesc({
        start: grid.length - 1 - skipRows,
        end: column.rowIndex + 1,
        expectedColumnIndex: column.columnIndex,
        grid
      });
    } else {
      newItem = this.#findNextNonDisabledItemDesc({
        start: column.rowIndex - 1 - skipRows,
        end: 0,
        expectedColumnIndex: column.columnIndex,
        grid
      });
      if (newItem === null && this.opts.loop.current) {
        newItem = this.#findNextNonDisabledItemDesc({
          start: grid.length - 1,
          end: column.rowIndex + 1,
          expectedColumnIndex: column.columnIndex,
          grid
        });
      }
    }
    return this.#calculateOffset(selected, newItem);
  }
  /**
   * Attempts to find the next non-disabled column that matches the expected column.
   *
   * @remarks
   * - Skips over disabled columns
   * - When a row is shorter than the expected column it defaults to the last item in the row
   */
  #findNextNonDisabledItemDesc({ start, end, grid, expectedColumnIndex }) {
    let newItem = null;
    for (let r = start; r >= end; r--) {
      const row = grid[r];
      if (row === void 0) continue;
      newItem = row[expectedColumnIndex]?.ref ?? null;
      if (newItem !== null && itemIsDisabled(newItem)) {
        newItem = null;
        continue;
      }
      if (newItem === null) {
        for (let i = row.length - 1; i >= 0; i--) {
          const item = row[row.length - 1];
          if (item === void 0 || itemIsDisabled(item.ref)) continue;
          newItem = item.ref;
          break;
        }
      }
      break;
    }
    return newItem;
  }
  /**
   * Handles previous item selection:
   * - Meta: Jump to first
   * - Alt: Previous group
   * - Default: Previous item
   *
   * @param e - Keyboard event
   */
  #prev(e) {
    e.preventDefault();
    if (e.metaKey) {
      this.updateSelectedToIndex(0);
    } else if (e.altKey) {
      this.updateSelectedByGroup(-1);
    } else {
      this.updateSelectedByItem(-1);
    }
  }
  onkeydown(e) {
    const isVim = this.opts.vimBindings.current && e.ctrlKey;
    switch (e.key) {
      case n:
      case j: {
        if (isVim) {
          if (this.isGrid) {
            this.#down(e);
          } else {
            this.#next(e);
          }
        }
        break;
      }
      case l: {
        if (isVim) {
          if (this.isGrid) {
            this.#next(e);
          }
        }
        break;
      }
      case ARROW_DOWN:
        if (this.isGrid) {
          this.#down(e);
        } else {
          this.#next(e);
        }
        break;
      case ARROW_RIGHT:
        if (!this.isGrid) break;
        this.#next(e);
        break;
      case p:
      case k: {
        if (isVim) {
          if (this.isGrid) {
            this.#up(e);
          } else {
            this.#prev(e);
          }
        }
        break;
      }
      case h: {
        if (isVim && this.isGrid) {
          this.#prev(e);
        }
        break;
      }
      case ARROW_UP:
        if (this.isGrid) {
          this.#up(e);
        } else {
          this.#prev(e);
        }
        break;
      case ARROW_LEFT:
        if (!this.isGrid) break;
        this.#prev(e);
        break;
      case HOME:
        e.preventDefault();
        this.updateSelectedToIndex(0);
        break;
      case END:
        e.preventDefault();
        this.#last();
        break;
      case ENTER: {
        if (!e.isComposing && e.keyCode !== 229) {
          e.preventDefault();
          const item = this.#getSelectedItem();
          if (item) {
            item?.click();
          }
        }
      }
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "application",
    [commandAttrs.root]: "",
    tabindex: -1,
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function itemIsDisabled(item) {
  return item.getAttribute("aria-disabled") === "true";
}
class CommandEmptyState {
  static create(opts) {
    return new CommandEmptyState(opts, CommandRootContext.get());
  }
  opts;
  root;
  attachment;
  #shouldRender = derived(() => {
    return this.root._commandState.filtered.count === 0 && this.#isInitialRender === false || this.opts.forceMount.current;
  });
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  #isInitialRender = true;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "presentation",
    [commandAttrs.empty]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CommandGroupContainerState {
  static create(opts) {
    return CommandGroupContainerContext.set(new CommandGroupContainerState(opts, CommandRootContext.get()));
  }
  opts;
  root;
  attachment;
  #shouldRender = derived(() => {
    if (this.opts.forceMount.current) return true;
    if (this.root.opts.shouldFilter.current === false) return true;
    if (!this.root.commandState.search) return true;
    return this.root._commandState.filtered.groups.has(this.trueValue);
  });
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  headingNode = null;
  trueValue = "";
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
    this.trueValue = opts.value.current ?? opts.id.current;
    watch$1(() => this.trueValue, () => {
      return this.root.registerGroup(this.trueValue);
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "presentation",
    hidden: this.shouldRender ? void 0 : true,
    "data-value": this.trueValue,
    [commandAttrs.group]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CommandGroupHeadingState {
  static create(opts) {
    return new CommandGroupHeadingState(opts, CommandGroupContainerContext.get());
  }
  opts;
  group;
  attachment;
  constructor(opts, group) {
    this.opts = opts;
    this.group = group;
    this.attachment = attachRef(this.opts.ref, (v) => this.group.headingNode = v);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [commandAttrs["group-heading"]]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CommandGroupItemsState {
  static create(opts) {
    return new CommandGroupItemsState(opts, CommandGroupContainerContext.get());
  }
  opts;
  group;
  attachment;
  constructor(opts, group) {
    this.opts = opts;
    this.group = group;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "group",
    [commandAttrs["group-items"]]: "",
    "aria-labelledby": this.group.headingNode?.id ?? void 0,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CommandInputState {
  static create(opts) {
    return new CommandInputState(opts, CommandRootContext.get());
  }
  opts;
  root;
  attachment;
  #selectedItemId = derived(() => {
    const item = this.root.viewportNode?.querySelector(`${COMMAND_ITEM_SELECTOR}[${COMMAND_VALUE_ATTR}="${cssEscape(this.root.opts.value.current)}"]`);
    if (item === void 0 || item === null) return;
    return item.getAttribute("id") ?? void 0;
  });
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref, (v) => this.root.inputNode = v);
    watch$1(() => this.opts.ref.current, () => {
      const node = this.opts.ref.current;
      if (node && this.opts.autofocus.current) {
        afterSleep(10, () => node.focus());
      }
    });
    watch$1(() => this.opts.value.current, () => {
      if (this.root.commandState.search !== this.opts.value.current) {
        this.root.setState("search", this.opts.value.current);
      }
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    type: "text",
    [commandAttrs.input]: "",
    autocomplete: "off",
    autocorrect: "off",
    spellcheck: false,
    "aria-autocomplete": "list",
    role: "combobox",
    "aria-expanded": getAriaExpanded(true),
    "aria-controls": this.root.viewportNode?.id ?? void 0,
    "aria-labelledby": this.root.labelNode?.id ?? void 0,
    "aria-activedescendant": this.#selectedItemId(),
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CommandItemState {
  static create(opts) {
    const group = CommandGroupContainerContext.getOr(null);
    return new CommandItemState({ ...opts, group }, CommandRootContext.get());
  }
  opts;
  root;
  attachment;
  #group = null;
  #trueForceMount = derived(() => {
    return this.opts.forceMount.current || this.#group?.opts.forceMount.current === true;
  });
  #shouldRender = derived(() => {
    this.opts.ref.current;
    if (this.#trueForceMount() || this.root.opts.shouldFilter.current === false || !this.root.commandState.search) {
      return true;
    }
    const currentScore = this.root.commandState.filtered.items.get(this.trueValue);
    if (currentScore === void 0) return false;
    return currentScore > 0;
  });
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  #isSelected = derived(() => this.root.opts.value.current === this.trueValue && this.trueValue !== "");
  get isSelected() {
    return this.#isSelected();
  }
  set isSelected($$value) {
    return this.#isSelected($$value);
  }
  trueValue = "";
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.#group = CommandGroupContainerContext.getOr(null);
    this.trueValue = opts.value.current;
    this.attachment = attachRef(this.opts.ref);
    watch$1(
      [
        () => this.trueValue,
        () => this.#group?.trueValue,
        () => this.opts.forceMount.current
      ],
      () => {
        if (this.opts.forceMount.current) return;
        return this.root.registerItem(this.trueValue, this.#group?.trueValue);
      }
    );
    watch$1([() => this.opts.value.current, () => this.opts.ref.current], () => {
      if (!this.opts.value.current && this.opts.ref.current?.textContent) {
        this.trueValue = this.opts.ref.current.textContent.trim();
      }
      this.root.registerValue(this.trueValue, opts.keywords.current.map((kw) => kw.trim()));
      this.opts.ref.current?.setAttribute(COMMAND_VALUE_ATTR, this.trueValue);
    });
    this.onclick = this.onclick.bind(this);
    this.onpointermove = this.onpointermove.bind(this);
  }
  #onSelect() {
    if (this.opts.disabled.current) return;
    this.#select();
    this.opts.onSelect?.current();
  }
  #select() {
    if (this.opts.disabled.current) return;
    this.root.setValue(this.trueValue, true);
  }
  onpointermove(_) {
    if (this.opts.disabled.current || this.root.opts.disablePointerSelection.current) return;
    this.#select();
  }
  onclick(_) {
    if (this.opts.disabled.current) return;
    this.#onSelect();
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "aria-disabled": getAriaDisabled(this.opts.disabled.current),
    "aria-selected": getAriaSelected(this.isSelected),
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    "data-selected": getDataSelected(this.isSelected),
    "data-value": this.trueValue,
    "data-group": this.#group?.trueValue,
    [commandAttrs.item]: "",
    role: "option",
    onpointermove: this.onpointermove,
    onclick: this.onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CommandSeparatorState {
  static create(opts) {
    return new CommandSeparatorState(opts, CommandRootContext.get());
  }
  opts;
  root;
  attachment;
  #shouldRender = derived(() => !this.root._commandState.search || this.opts.forceMount.current);
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    // role="separator" cannot belong to a role="listbox"
    "aria-hidden": "true",
    [commandAttrs.separator]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CommandListState {
  static create(opts) {
    return CommandListContext.set(new CommandListState(opts, CommandRootContext.get()));
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "listbox",
    "aria-label": this.opts.ariaLabel.current,
    [commandAttrs.list]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CommandLabelState {
  static create(opts) {
    return new CommandLabelState(opts, CommandRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref, (v) => this.root.labelNode = v);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [commandAttrs["input-label"]]: "",
    for: this.opts.for?.current,
    style: srOnlyStyles$1,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
_command_label[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/_command-label.svelte";
function _command_label($$payload, $$props) {
  push(_command_label);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const labelState = CommandLabelState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, labelState.props);
  $$payload.out.push(`<label${spread_attributes({ ...mergedProps }, null)}>`);
  push_element($$payload, "label", 29, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></label>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
_command_label.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command.svelte";
function Command($$payload, $$props) {
  push(Command);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    value = "",
    onValueChange = noop,
    onStateChange = noop,
    loop: loop2 = false,
    shouldFilter = true,
    filter = computeCommandScore,
    label = "",
    vimBindings = true,
    disablePointerSelection = false,
    disableInitialScroll = false,
    columns = null,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = CommandRootState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    filter: box$1.with(() => filter),
    shouldFilter: box$1.with(() => shouldFilter),
    loop: box$1.with(() => loop2),
    value: box$1.with(() => value, (v) => {
      if (value !== v) {
        value = v;
        onValueChange(v);
      }
    }),
    vimBindings: box$1.with(() => vimBindings),
    disablePointerSelection: box$1.with(() => disablePointerSelection),
    disableInitialScroll: box$1.with(() => disableInitialScroll),
    onStateChange: box$1.with(() => onStateChange),
    columns: box$1.with(() => columns)
  });
  const updateSelectedToIndex = (i) => rootState.updateSelectedToIndex(i);
  const updateSelectedByGroup = (c) => rootState.updateSelectedByGroup(c);
  const updateSelectedByItem = (c) => rootState.updateSelectedByItem(c);
  const getValidItems = () => rootState.getValidItems();
  const mergedProps = mergeProps$1(restProps, rootState.props);
  prevent_snippet_stringification(Label2);
  function Label2($$payload2) {
    validate_snippet_args($$payload2);
    _command_label($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->${escape_html(label)}`);
      }),
      $$slots: { default: true }
    });
  }
  if (child) {
    $$payload.out.push("<!--[-->");
    Label2($$payload);
    $$payload.out.push(`<!----> `);
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 133, 1);
    Label2($$payload);
    $$payload.out.push(`<!----> `);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, {
    ref,
    value,
    updateSelectedToIndex,
    updateSelectedByGroup,
    updateSelectedByItem,
    getValidItems
  });
  pop();
}
Command.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_empty[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command-empty.svelte";
function Command_empty($$payload, $$props) {
  push(Command_empty);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    children,
    child,
    forceMount = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const emptyState = CommandEmptyState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    forceMount: box$1.with(() => forceMount)
  });
  const mergedProps = mergeProps$1(emptyState.props, restProps);
  if (emptyState.shouldRender) {
    $$payload.out.push("<!--[-->");
    if (child) {
      $$payload.out.push("<!--[-->");
      child($$payload, { props: mergedProps });
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
      push_element($$payload, "div", 34, 2);
      children?.($$payload);
      $$payload.out.push(`<!----></div>`);
      pop_element();
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Command_empty.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_group[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command-group.svelte";
function Command_group($$payload, $$props) {
  push(Command_group);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    value = "",
    forceMount = false,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const groupState = CommandGroupContainerState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    forceMount: box$1.with(() => forceMount),
    value: box$1.with(() => value)
  });
  const mergedProps = mergeProps$1(restProps, groupState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 35, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Command_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_group_heading[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command-group-heading.svelte";
function Command_group_heading($$payload, $$props) {
  push(Command_group_heading);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const headingState = CommandGroupHeadingState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, headingState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Command_group_heading.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_group_items[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command-group-items.svelte";
function Command_group_items($$payload, $$props) {
  push(Command_group_items);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const groupItemsState = CommandGroupItemsState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, groupItemsState.props);
  $$payload.out.push(`<div style="display: contents;">`);
  push_element($$payload, "div", 28, 0);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 32, 2);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Command_group_items.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_input[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command-input.svelte";
function Command_input($$payload, $$props) {
  push(Command_input);
  const uid = props_id($$payload);
  let {
    value = "",
    autofocus = false,
    id = createId$1(uid),
    ref = null,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const inputState = CommandInputState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    value: box$1.with(() => value, (v) => {
      value = v;
    }),
    autofocus: box$1.with(() => autofocus ?? false)
  });
  const mergedProps = mergeProps$1(restProps, inputState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<input${spread_attributes({ ...mergedProps, value }, null)}/>`);
    push_element($$payload, "input", 39, 1);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { value, ref });
  pop();
}
Command_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_item[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command-item.svelte";
function Command_item($$payload, $$props) {
  push(Command_item);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    value = "",
    disabled = false,
    children,
    child,
    onSelect = noop,
    forceMount = false,
    keywords = [],
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const itemState = CommandItemState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    value: box$1.with(() => value),
    disabled: box$1.with(() => disabled),
    onSelect: box$1.with(() => onSelect),
    forceMount: box$1.with(() => forceMount),
    keywords: box$1.with(() => keywords)
  });
  const mergedProps = mergeProps$1(restProps, itemState.props);
  $$payload.out.push(`<!---->`);
  {
    $$payload.out.push(`<div style="display: contents;" data-item-wrapper=""${attr("data-value", itemState.trueValue)}>`);
    push_element($$payload, "div", 40, 1);
    if (itemState.shouldRender) {
      $$payload.out.push("<!--[-->");
      if (child) {
        $$payload.out.push("<!--[-->");
        child($$payload, { props: mergedProps });
        $$payload.out.push(`<!---->`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
        push_element($$payload, "div", 45, 4);
        children?.($$payload);
        $$payload.out.push(`<!----></div>`);
        pop_element();
      }
      $$payload.out.push(`<!--]-->`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
    pop_element();
  }
  $$payload.out.push(`<!---->`);
  bind_props($$props, { ref });
  pop();
}
Command_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_list[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command-list.svelte";
function Command_list($$payload, $$props) {
  push(Command_list);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    child,
    children,
    "aria-label": ariaLabel,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const listState = CommandListState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    ariaLabel: box$1.with(() => ariaLabel ?? "Suggestions...")
  });
  const mergedProps = mergeProps$1(restProps, listState.props);
  $$payload.out.push(`<!---->`);
  {
    if (child) {
      $$payload.out.push("<!--[-->");
      child($$payload, { props: mergedProps });
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
      push_element($$payload, "div", 34, 2);
      children?.($$payload);
      $$payload.out.push(`<!----></div>`);
      pop_element();
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!---->`);
  bind_props($$props, { ref });
  pop();
}
Command_list.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_separator[FILENAME] = "node_modules/bits-ui/dist/bits/command/components/command-separator.svelte";
function Command_separator($$payload, $$props) {
  push(Command_separator);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    forceMount = false,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const separatorState = CommandSeparatorState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    forceMount: box$1.with(() => forceMount)
  });
  const mergedProps = mergeProps$1(restProps, separatorState.props);
  if (separatorState.shouldRender) {
    $$payload.out.push("<!--[-->");
    if (child) {
      $$payload.out.push("<!--[-->");
      child($$payload, { props: mergedProps });
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
      push_element($$payload, "div", 34, 2);
      children?.($$payload);
      $$payload.out.push(`<!----></div>`);
      pop_element();
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Command_separator.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const SCORE_CONTINUE_MATCH = 1;
const SCORE_SPACE_WORD_JUMP = 0.9;
const SCORE_NON_SPACE_WORD_JUMP = 0.8;
const SCORE_CHARACTER_JUMP = 0.17;
const SCORE_TRANSPOSITION = 0.1;
const PENALTY_SKIPPED = 0.999;
const PENALTY_CASE_MISMATCH = 0.9999;
const PENALTY_NOT_COMPLETE = 0.99;
const IS_GAP_REGEXP = /[\\/_+.#"@[({&]/;
const COUNT_GAPS_REGEXP = /[\\/_+.#"@[({&]/g;
const IS_SPACE_REGEXP = /[\s-]/;
const COUNT_SPACE_REGEXP = /[\s-]/g;
function computeCommandScoreInner(string, abbreviation, lowerString, lowerAbbreviation, stringIndex, abbreviationIndex, memoizedResults) {
  if (abbreviationIndex === abbreviation.length) {
    if (stringIndex === string.length)
      return SCORE_CONTINUE_MATCH;
    return PENALTY_NOT_COMPLETE;
  }
  const memoizeKey = `${stringIndex},${abbreviationIndex}`;
  if (memoizedResults[memoizeKey] !== void 0)
    return memoizedResults[memoizeKey];
  const abbreviationChar = lowerAbbreviation.charAt(abbreviationIndex);
  let index2 = lowerString.indexOf(abbreviationChar, stringIndex);
  let highScore = 0;
  let score, transposedScore, wordBreaks, spaceBreaks;
  while (index2 >= 0) {
    score = computeCommandScoreInner(string, abbreviation, lowerString, lowerAbbreviation, index2 + 1, abbreviationIndex + 1, memoizedResults);
    if (score > highScore) {
      if (index2 === stringIndex) {
        score *= SCORE_CONTINUE_MATCH;
      } else if (IS_GAP_REGEXP.test(string.charAt(index2 - 1))) {
        score *= SCORE_NON_SPACE_WORD_JUMP;
        wordBreaks = string.slice(stringIndex, index2 - 1).match(COUNT_GAPS_REGEXP);
        if (wordBreaks && stringIndex > 0) {
          score *= PENALTY_SKIPPED ** wordBreaks.length;
        }
      } else if (IS_SPACE_REGEXP.test(string.charAt(index2 - 1))) {
        score *= SCORE_SPACE_WORD_JUMP;
        spaceBreaks = string.slice(stringIndex, index2 - 1).match(COUNT_SPACE_REGEXP);
        if (spaceBreaks && stringIndex > 0) {
          score *= PENALTY_SKIPPED ** spaceBreaks.length;
        }
      } else {
        score *= SCORE_CHARACTER_JUMP;
        if (stringIndex > 0) {
          score *= PENALTY_SKIPPED ** (index2 - stringIndex);
        }
      }
      if (string.charAt(index2) !== abbreviation.charAt(abbreviationIndex)) {
        score *= PENALTY_CASE_MISMATCH;
      }
    }
    if (score < SCORE_TRANSPOSITION && lowerString.charAt(index2 - 1) === lowerAbbreviation.charAt(abbreviationIndex + 1) || lowerAbbreviation.charAt(abbreviationIndex + 1) === lowerAbbreviation.charAt(abbreviationIndex) && lowerString.charAt(index2 - 1) !== lowerAbbreviation.charAt(abbreviationIndex)) {
      transposedScore = computeCommandScoreInner(string, abbreviation, lowerString, lowerAbbreviation, index2 + 1, abbreviationIndex + 2, memoizedResults);
      if (transposedScore * SCORE_TRANSPOSITION > score) {
        score = transposedScore * SCORE_TRANSPOSITION;
      }
    }
    if (score > highScore) {
      highScore = score;
    }
    index2 = lowerString.indexOf(abbreviationChar, index2 + 1);
  }
  memoizedResults[memoizeKey] = highScore;
  return highScore;
}
function formatInput(string) {
  return string.toLowerCase().replace(COUNT_SPACE_REGEXP, " ");
}
function computeCommandScore(command2, search, commandKeywords) {
  command2 = commandKeywords && commandKeywords.length > 0 ? `${`${command2} ${commandKeywords?.join(" ")}`}` : command2;
  return computeCommandScoreInner(command2, search, formatInput(command2), formatInput(search), 0, 0, {});
}
const SELECTION_KEYS = [ENTER, SPACE];
const FIRST_KEYS = [ARROW_DOWN, PAGE_UP, HOME];
const LAST_KEYS = [ARROW_UP, PAGE_DOWN, END];
const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
const SUB_OPEN_KEYS = {
  ltr: [...SELECTION_KEYS, ARROW_RIGHT],
  rtl: [...SELECTION_KEYS, ARROW_LEFT]
};
const SUB_CLOSE_KEYS = {
  ltr: [ARROW_LEFT],
  rtl: [ARROW_RIGHT]
};
function isMouseEvent(event) {
  return event.pointerType === "mouse";
}
function focus(element2, { select = false } = {}) {
  if (!element2 || !element2.focus)
    return;
  const doc = getDocument(element2);
  if (doc.activeElement === element2)
    return;
  const previouslyFocusedElement = doc.activeElement;
  element2.focus({ preventScroll: true });
  if (element2 !== previouslyFocusedElement && isSelectableInput(element2) && select) {
    element2.select();
  }
}
function focusFirst(candidates, { select = false } = {}, getActiveElement2) {
  const previouslyFocusedElement = getActiveElement2();
  for (const candidate of candidates) {
    focus(candidate, { select });
    if (getActiveElement2() !== previouslyFocusedElement)
      return true;
  }
}
function getTabbableOptions() {
  return {
    getShadowRoot: true,
    displayCheck: (
      // JSDOM does not support the `tabbable` library. To solve this we can
      // check if `ResizeObserver` is a real function (not polyfilled), which
      // determines if the current environment is JSDOM-like.
      typeof ResizeObserver === "function" && ResizeObserver.toString().includes("[native code]") ? "full" : "none"
    )
  };
}
function getTabbableFrom(currentNode, direction) {
  if (!isTabbable(currentNode, getTabbableOptions())) {
    return getTabbableFromFocusable(currentNode, direction);
  }
  const doc = getDocument(currentNode);
  const allTabbable = tabbable(doc.body, getTabbableOptions());
  if (direction === "prev")
    allTabbable.reverse();
  const activeIndex = allTabbable.indexOf(currentNode);
  if (activeIndex === -1)
    return doc.body;
  const nextTabbableElements = allTabbable.slice(activeIndex + 1);
  return nextTabbableElements[0];
}
function getTabbableFromFocusable(currentNode, direction) {
  const doc = getDocument(currentNode);
  if (!isFocusable(currentNode, getTabbableOptions()))
    return doc.body;
  const allFocusable = focusable(doc.body, getTabbableOptions());
  if (direction === "prev")
    allFocusable.reverse();
  const activeIndex = allFocusable.indexOf(currentNode);
  if (activeIndex === -1)
    return doc.body;
  const nextFocusableElements = allFocusable.slice(activeIndex + 1);
  return nextFocusableElements.find((node) => isTabbable(node, getTabbableOptions())) ?? doc.body;
}
class GraceArea {
  #opts;
  #enabled;
  #isPointerInTransit;
  #pointerGraceArea = null;
  constructor(opts) {
    this.#opts = opts;
    this.#enabled = derived(() => this.#opts.enabled());
    this.#isPointerInTransit = boxAutoReset(false, {
      afterMs: opts.transitTimeout ?? 300,
      onChange: (value) => {
        if (!this.#enabled()) return;
        this.#opts.setIsPointerInTransit?.(value);
      },
      getWindow: () => getWindow(this.#opts.triggerNode())
    });
    watch$1([opts.triggerNode, opts.contentNode, opts.enabled], ([triggerNode, contentNode, enabled]) => {
      if (!triggerNode || !contentNode || !enabled) return;
      const handleTriggerLeave = (e) => {
        this.#createGraceArea(e, contentNode);
      };
      const handleContentLeave = (e) => {
        this.#createGraceArea(e, triggerNode);
      };
      return executeCallbacks$1(on(triggerNode, "pointerleave", handleTriggerLeave), on(contentNode, "pointerleave", handleContentLeave));
    });
    watch$1(() => this.#pointerGraceArea, () => {
      const handleTrackPointerGrace = (e) => {
        if (!this.#pointerGraceArea) return;
        const target = e.target;
        if (!isElement(target)) return;
        const pointerPosition = { x: e.clientX, y: e.clientY };
        const hasEnteredTarget = opts.triggerNode()?.contains(target) || opts.contentNode()?.contains(target);
        const isPointerOutsideGraceArea = !isPointInPolygon(pointerPosition, this.#pointerGraceArea);
        if (hasEnteredTarget) {
          this.#removeGraceArea();
        } else if (isPointerOutsideGraceArea) {
          this.#removeGraceArea();
          opts.onPointerExit();
        }
      };
      const doc = getDocument(opts.triggerNode() ?? opts.contentNode());
      if (!doc) return;
      return on(doc, "pointermove", handleTrackPointerGrace);
    });
  }
  #removeGraceArea() {
    this.#pointerGraceArea = null;
    this.#isPointerInTransit.current = false;
  }
  #createGraceArea(e, hoverTarget) {
    const currentTarget = e.currentTarget;
    if (!isHTMLElement(currentTarget)) return;
    const exitPoint = { x: e.clientX, y: e.clientY };
    const exitSide = getExitSideFromRect(exitPoint, currentTarget.getBoundingClientRect());
    const paddedExitPoints = getPaddedExitPoints(exitPoint, exitSide);
    const hoverTargetPoints = getPointsFromRect(hoverTarget.getBoundingClientRect());
    const graceArea = getHull([...paddedExitPoints, ...hoverTargetPoints]);
    this.#pointerGraceArea = graceArea;
    this.#isPointerInTransit.current = true;
  }
}
function getExitSideFromRect(point, rect) {
  const top = Math.abs(rect.top - point.y);
  const bottom = Math.abs(rect.bottom - point.y);
  const right = Math.abs(rect.right - point.x);
  const left = Math.abs(rect.left - point.x);
  switch (Math.min(top, bottom, right, left)) {
    case left:
      return "left";
    case right:
      return "right";
    case top:
      return "top";
    case bottom:
      return "bottom";
    default:
      throw new Error("unreachable");
  }
}
function getPaddedExitPoints(exitPoint, exitSide, padding = 5) {
  const tipPadding = padding * 1.5;
  switch (exitSide) {
    case "top":
      return [
        { x: exitPoint.x - padding, y: exitPoint.y + padding },
        { x: exitPoint.x, y: exitPoint.y - tipPadding },
        { x: exitPoint.x + padding, y: exitPoint.y + padding }
      ];
    case "bottom":
      return [
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x, y: exitPoint.y + tipPadding },
        { x: exitPoint.x + padding, y: exitPoint.y - padding }
      ];
    case "left":
      return [
        { x: exitPoint.x + padding, y: exitPoint.y - padding },
        { x: exitPoint.x - tipPadding, y: exitPoint.y },
        { x: exitPoint.x + padding, y: exitPoint.y + padding }
      ];
    case "right":
      return [
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x + tipPadding, y: exitPoint.y },
        { x: exitPoint.x - padding, y: exitPoint.y + padding }
      ];
  }
}
function getPointsFromRect(rect) {
  const { top, right, bottom, left } = rect;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ];
}
function isPointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j2 = polygon.length - 1; i < polygon.length; j2 = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j2].x;
    const yj = polygon[j2].y;
    const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function getHull(points) {
  const newPoints = points.slice();
  newPoints.sort((a, b) => {
    if (a.x < b.x) return -1;
    else if (a.x > b.x) return 1;
    else if (a.y < b.y) return -1;
    else if (a.y > b.y) return 1;
    else return 0;
  });
  return getHullPresorted(newPoints);
}
function getHullPresorted(points) {
  if (points.length <= 1) return points.slice();
  const upperHull = [];
  for (let i = 0; i < points.length; i++) {
    const p2 = points[i];
    while (upperHull.length >= 2) {
      const q = upperHull[upperHull.length - 1];
      const r = upperHull[upperHull.length - 2];
      if ((q.x - r.x) * (p2.y - r.y) >= (q.y - r.y) * (p2.x - r.x)) upperHull.pop();
      else break;
    }
    upperHull.push(p2);
  }
  upperHull.pop();
  const lowerHull = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p2 = points[i];
    while (lowerHull.length >= 2) {
      const q = lowerHull[lowerHull.length - 1];
      const r = lowerHull[lowerHull.length - 2];
      if ((q.x - r.x) * (p2.y - r.y) >= (q.y - r.y) * (p2.x - r.x)) lowerHull.pop();
      else break;
    }
    lowerHull.push(p2);
  }
  lowerHull.pop();
  if (upperHull.length === 1 && lowerHull.length === 1 && upperHull[0].x === lowerHull[0].x && upperHull[0].y === lowerHull[0].y) return upperHull;
  else return upperHull.concat(lowerHull);
}
const MenuRootContext = new Context$2("Menu.Root");
const MenuMenuContext = new Context$2("Menu.Root | Menu.Sub");
const MenuContentContext = new Context$2("Menu.Content");
const MenuGroupContext = new Context$2("Menu.Group | Menu.RadioGroup");
const MenuOpenEvent = new CustomEventDispatcher("bitsmenuopen", { bubbles: false, cancelable: true });
const menuAttrs = createBitsAttrs({
  component: "menu",
  parts: [
    "trigger",
    "content",
    "sub-trigger",
    "item",
    "group",
    "group-heading",
    "checkbox-group",
    "checkbox-item",
    "radio-group",
    "radio-item",
    "separator",
    "sub-content",
    "arrow"
  ]
});
class MenuRootState {
  static create(opts) {
    const root2 = new MenuRootState(opts);
    return MenuRootContext.set(root2);
  }
  opts;
  isUsingKeyboard = new IsUsingKeyboard();
  ignoreCloseAutoFocus = false;
  isPointerInTransit = false;
  constructor(opts) {
    this.opts = opts;
  }
  getBitsAttr = (part) => {
    return menuAttrs.getAttr(part, this.opts.variant.current);
  };
}
class MenuMenuState {
  static create(opts, root2) {
    return MenuMenuContext.set(new MenuMenuState(opts, root2, null));
  }
  opts;
  root;
  parentMenu;
  contentId = box$1.with(() => "");
  contentNode = null;
  triggerNode = null;
  constructor(opts, root2, parentMenu) {
    this.opts = opts;
    this.root = root2;
    this.parentMenu = parentMenu;
    new OpenChangeComplete({
      ref: box$1.with(() => this.contentNode),
      open: this.opts.open,
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
    if (parentMenu) {
      watch$1(() => parentMenu.opts.open.current, () => {
        if (parentMenu.opts.open.current) return;
        this.opts.open.current = false;
      });
    }
  }
  toggleOpen() {
    this.opts.open.current = !this.opts.open.current;
  }
  onOpen() {
    this.opts.open.current = true;
  }
  onClose() {
    this.opts.open.current = false;
  }
}
class MenuContentState {
  static create(opts) {
    return MenuContentContext.set(new MenuContentState(opts, MenuMenuContext.get()));
  }
  opts;
  parentMenu;
  rovingFocusGroup;
  domContext;
  attachment;
  search = "";
  #timer = 0;
  #handleTypeaheadSearch;
  mounted = false;
  #isSub;
  constructor(opts, parentMenu) {
    this.opts = opts;
    this.parentMenu = parentMenu;
    this.domContext = new DOMContext(opts.ref);
    this.attachment = attachRef(this.opts.ref, (v) => {
      if (this.parentMenu.contentNode !== v) {
        this.parentMenu.contentNode = v;
      }
    });
    parentMenu.contentId = opts.id;
    this.#isSub = opts.isSub ?? false;
    this.onkeydown = this.onkeydown.bind(this);
    this.onblur = this.onblur.bind(this);
    this.onfocus = this.onfocus.bind(this);
    this.handleInteractOutside = this.handleInteractOutside.bind(this);
    new GraceArea({
      contentNode: () => this.parentMenu.contentNode,
      triggerNode: () => this.parentMenu.triggerNode,
      enabled: () => this.parentMenu.opts.open.current && Boolean(this.parentMenu.triggerNode?.hasAttribute(this.parentMenu.root.getBitsAttr("sub-trigger"))),
      onPointerExit: () => {
        this.parentMenu.opts.open.current = false;
      },
      setIsPointerInTransit: (value) => {
        this.parentMenu.root.isPointerInTransit = value;
      }
    });
    this.#handleTypeaheadSearch = new DOMTypeahead({
      getActiveElement: () => this.domContext.getActiveElement(),
      getWindow: () => this.domContext.getWindow()
    }).handleTypeaheadSearch;
    this.rovingFocusGroup = new RovingFocusGroup({
      rootNode: box$1.with(() => this.parentMenu.contentNode),
      candidateAttr: this.parentMenu.root.getBitsAttr("item"),
      loop: this.opts.loop,
      orientation: box$1.with(() => "vertical")
    });
    watch$1(() => this.parentMenu.contentNode, (contentNode) => {
      if (!contentNode) return;
      const handler = () => {
        afterTick(() => {
          if (!this.parentMenu.root.isUsingKeyboard.current) return;
          this.rovingFocusGroup.focusFirstCandidate();
        });
      };
      return MenuOpenEvent.listen(contentNode, handler);
    });
  }
  #getCandidateNodes() {
    const node = this.parentMenu.contentNode;
    if (!node) return [];
    const candidates = Array.from(node.querySelectorAll(`[${this.parentMenu.root.getBitsAttr("item")}]:not([data-disabled])`));
    return candidates;
  }
  #isPointerMovingToSubmenu() {
    return this.parentMenu.root.isPointerInTransit;
  }
  onCloseAutoFocus = (e) => {
    this.opts.onCloseAutoFocus.current?.(e);
    if (e.defaultPrevented || this.#isSub) return;
    if (this.parentMenu.triggerNode && isTabbable(this.parentMenu.triggerNode)) {
      this.parentMenu.triggerNode.focus();
    }
  };
  handleTabKeyDown(e) {
    let rootMenu = this.parentMenu;
    while (rootMenu.parentMenu !== null) {
      rootMenu = rootMenu.parentMenu;
    }
    if (!rootMenu.triggerNode) return;
    e.preventDefault();
    const nodeToFocus = getTabbableFrom(rootMenu.triggerNode, e.shiftKey ? "prev" : "next");
    if (nodeToFocus) {
      this.parentMenu.root.ignoreCloseAutoFocus = true;
      rootMenu.onClose();
      afterTick(() => {
        nodeToFocus.focus();
        afterTick(() => {
          this.parentMenu.root.ignoreCloseAutoFocus = false;
        });
      });
    } else {
      this.domContext.getDocument().body.focus();
    }
  }
  onkeydown(e) {
    if (e.defaultPrevented) return;
    if (e.key === TAB) {
      this.handleTabKeyDown(e);
      return;
    }
    const target = e.target;
    const currentTarget = e.currentTarget;
    if (!isHTMLElement(target) || !isHTMLElement(currentTarget)) return;
    const isKeydownInside = target.closest(`[${this.parentMenu.root.getBitsAttr("content")}]`)?.id === this.parentMenu.contentId.current;
    const isModifierKey = e.ctrlKey || e.altKey || e.metaKey;
    const isCharacterKey = e.key.length === 1;
    const kbdFocusedEl = this.rovingFocusGroup.handleKeydown(target, e);
    if (kbdFocusedEl) return;
    if (e.code === "Space") return;
    const candidateNodes = this.#getCandidateNodes();
    if (isKeydownInside) {
      if (!isModifierKey && isCharacterKey) {
        this.#handleTypeaheadSearch(e.key, candidateNodes);
      }
    }
    if (e.target?.id !== this.parentMenu.contentId.current) return;
    if (!FIRST_LAST_KEYS.includes(e.key)) return;
    e.preventDefault();
    if (LAST_KEYS.includes(e.key)) {
      candidateNodes.reverse();
    }
    focusFirst(candidateNodes, { select: false }, () => this.domContext.getActiveElement());
  }
  onblur(e) {
    if (!isElement(e.currentTarget)) return;
    if (!isElement(e.target)) return;
    if (!e.currentTarget.contains?.(e.target)) {
      this.domContext.getWindow().clearTimeout(this.#timer);
      this.search = "";
    }
  }
  onfocus(_) {
    if (!this.parentMenu.root.isUsingKeyboard.current) return;
    afterTick(() => this.rovingFocusGroup.focusFirstCandidate());
  }
  onItemEnter() {
    return this.#isPointerMovingToSubmenu();
  }
  onItemLeave(e) {
    if (e.currentTarget.hasAttribute(this.parentMenu.root.getBitsAttr("sub-trigger"))) return;
    if (this.#isPointerMovingToSubmenu() || this.parentMenu.root.isUsingKeyboard.current) return;
    const contentNode = this.parentMenu.contentNode;
    contentNode?.focus();
    this.rovingFocusGroup.setCurrentTabStopId("");
  }
  onTriggerLeave() {
    if (this.#isPointerMovingToSubmenu()) return true;
    return false;
  }
  onOpenAutoFocus = (e) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    const contentNode = this.parentMenu.contentNode;
    contentNode?.focus();
  };
  handleInteractOutside(e) {
    if (!isElementOrSVGElement(e.target)) return;
    const triggerId = this.parentMenu.triggerNode?.id;
    if (e.target.id === triggerId) {
      e.preventDefault();
      return;
    }
    if (e.target.closest(`#${triggerId}`)) {
      e.preventDefault();
    }
  }
  #snippetProps = derived(() => ({ open: this.parentMenu.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "menu",
    "aria-orientation": getAriaOrientation("vertical"),
    [this.parentMenu.root.getBitsAttr("content")]: "",
    "data-state": getDataOpenClosed(this.parentMenu.opts.open.current),
    onkeydown: this.onkeydown,
    onblur: this.onblur,
    onfocus: this.onfocus,
    dir: this.parentMenu.root.opts.dir.current,
    style: { pointerEvents: "auto" },
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  popperProps = { onCloseAutoFocus: (e) => this.onCloseAutoFocus(e) };
}
class MenuItemSharedState {
  opts;
  content;
  attachment;
  #isFocused = false;
  constructor(opts, content) {
    this.opts = opts;
    this.content = content;
    this.attachment = attachRef(this.opts.ref);
    this.onpointermove = this.onpointermove.bind(this);
    this.onpointerleave = this.onpointerleave.bind(this);
    this.onfocus = this.onfocus.bind(this);
    this.onblur = this.onblur.bind(this);
  }
  onpointermove(e) {
    if (e.defaultPrevented) return;
    if (!isMouseEvent(e)) return;
    if (this.opts.disabled.current) {
      this.content.onItemLeave(e);
    } else {
      const defaultPrevented = this.content.onItemEnter();
      if (defaultPrevented) return;
      const item = e.currentTarget;
      if (!isHTMLElement(item)) return;
      item.focus();
    }
  }
  onpointerleave(e) {
    if (e.defaultPrevented) return;
    if (!isMouseEvent(e)) return;
    this.content.onItemLeave(e);
  }
  onfocus(e) {
    afterTick(() => {
      if (e.defaultPrevented || this.opts.disabled.current) return;
      this.#isFocused = true;
    });
  }
  onblur(e) {
    afterTick(() => {
      if (e.defaultPrevented) return;
      this.#isFocused = false;
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    tabindex: -1,
    role: "menuitem",
    "aria-disabled": getAriaDisabled(this.opts.disabled.current),
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    "data-highlighted": this.#isFocused ? "" : void 0,
    [this.content.parentMenu.root.getBitsAttr("item")]: "",
    //
    onpointermove: this.onpointermove,
    onpointerleave: this.onpointerleave,
    onfocus: this.onfocus,
    onblur: this.onblur,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class MenuItemState {
  static create(opts) {
    const item = new MenuItemSharedState(opts, MenuContentContext.get());
    return new MenuItemState(opts, item);
  }
  opts;
  item;
  root;
  #isPointerDown = false;
  constructor(opts, item) {
    this.opts = opts;
    this.item = item;
    this.root = item.content.parentMenu.root;
    this.onkeydown = this.onkeydown.bind(this);
    this.onclick = this.onclick.bind(this);
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointerup = this.onpointerup.bind(this);
  }
  #handleSelect() {
    if (this.item.opts.disabled.current) return;
    const selectEvent = new CustomEvent("menuitemselect", { bubbles: true, cancelable: true });
    this.opts.onSelect.current(selectEvent);
    if (selectEvent.defaultPrevented) {
      this.item.content.parentMenu.root.isUsingKeyboard.current = false;
      return;
    }
    if (this.opts.closeOnSelect.current) {
      this.item.content.parentMenu.root.opts.onClose();
    }
  }
  onkeydown(e) {
    const isTypingAhead = this.item.content.search !== "";
    if (this.item.opts.disabled.current || isTypingAhead && e.key === SPACE) return;
    if (SELECTION_KEYS.includes(e.key)) {
      if (!isHTMLElement(e.currentTarget)) return;
      e.currentTarget.click();
      e.preventDefault();
    }
  }
  onclick(_) {
    if (this.item.opts.disabled.current) return;
    this.#handleSelect();
  }
  onpointerup(e) {
    if (e.defaultPrevented) return;
    if (!this.#isPointerDown) {
      if (!isHTMLElement(e.currentTarget)) return;
      e.currentTarget?.click();
    }
  }
  onpointerdown(_) {
    this.#isPointerDown = true;
  }
  #props = derived(() => mergeProps$1(this.item.props, {
    onclick: this.onclick,
    onpointerdown: this.onpointerdown,
    onpointerup: this.onpointerup,
    onkeydown: this.onkeydown
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class MenuSubTriggerState {
  static create(opts) {
    const content = MenuContentContext.get();
    const item = new MenuItemSharedState(opts, content);
    const submenu = MenuMenuContext.get();
    return new MenuSubTriggerState(opts, item, content, submenu);
  }
  opts;
  item;
  content;
  submenu;
  attachment;
  #openTimer = null;
  constructor(opts, item, content, submenu) {
    this.opts = opts;
    this.item = item;
    this.content = content;
    this.submenu = submenu;
    this.attachment = attachRef(this.opts.ref, (v) => this.submenu.triggerNode = v);
    this.onpointerleave = this.onpointerleave.bind(this);
    this.onpointermove = this.onpointermove.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
    this.onclick = this.onclick.bind(this);
  }
  #clearOpenTimer() {
    if (this.#openTimer === null) return;
    this.content.domContext.getWindow().clearTimeout(this.#openTimer);
    this.#openTimer = null;
  }
  onpointermove(e) {
    if (!isMouseEvent(e)) return;
    if (!this.item.opts.disabled.current && !this.submenu.opts.open.current && !this.#openTimer && !this.content.parentMenu.root.isPointerInTransit) {
      this.#openTimer = this.content.domContext.setTimeout(
        () => {
          this.submenu.onOpen();
          this.#clearOpenTimer();
        },
        100
      );
    }
  }
  onpointerleave(e) {
    if (!isMouseEvent(e)) return;
    this.#clearOpenTimer();
  }
  onkeydown(e) {
    const isTypingAhead = this.content.search !== "";
    if (this.item.opts.disabled.current || isTypingAhead && e.key === SPACE) return;
    if (SUB_OPEN_KEYS[this.submenu.root.opts.dir.current].includes(e.key)) {
      e.currentTarget.click();
      e.preventDefault();
    }
  }
  onclick(e) {
    if (this.item.opts.disabled.current) return;
    if (!isHTMLElement(e.currentTarget)) return;
    e.currentTarget.focus();
    const selectEvent = new CustomEvent("menusubtriggerselect", { bubbles: true, cancelable: true });
    this.opts.onSelect.current(selectEvent);
    if (!this.submenu.opts.open.current) {
      this.submenu.onOpen();
      afterTick(() => {
        const contentNode = this.submenu.contentNode;
        if (!contentNode) return;
        MenuOpenEvent.dispatch(contentNode);
      });
    }
  }
  #props = derived(() => mergeProps$1(
    {
      "aria-haspopup": "menu",
      "aria-expanded": getAriaExpanded(this.submenu.opts.open.current),
      "data-state": getDataOpenClosed(this.submenu.opts.open.current),
      "aria-controls": this.submenu.opts.open.current ? this.submenu.contentId.current : void 0,
      [this.submenu.root.getBitsAttr("sub-trigger")]: "",
      onclick: this.onclick,
      onpointermove: this.onpointermove,
      onpointerleave: this.onpointerleave,
      onkeydown: this.onkeydown,
      ...this.attachment
    },
    this.item.props
  ));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class MenuGroupState {
  static create(opts) {
    return MenuGroupContext.set(new MenuGroupState(opts, MenuRootContext.get()));
  }
  opts;
  root;
  attachment;
  groupHeadingId = void 0;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "group",
    "aria-labelledby": this.groupHeadingId,
    [this.root.getBitsAttr("group")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class MenuSeparatorState {
  static create(opts) {
    return new MenuSeparatorState(opts, MenuRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "group",
    [this.root.getBitsAttr("separator")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class DropdownMenuTriggerState {
  static create(opts) {
    return new DropdownMenuTriggerState(opts, MenuMenuContext.get());
  }
  opts;
  parentMenu;
  attachment;
  constructor(opts, parentMenu) {
    this.opts = opts;
    this.parentMenu = parentMenu;
    this.attachment = attachRef(this.opts.ref, (v) => this.parentMenu.triggerNode = v);
  }
  onpointerdown = (e) => {
    if (this.opts.disabled.current) return;
    if (e.pointerType === "touch") return e.preventDefault();
    if (e.button === 0 && e.ctrlKey === false) {
      this.parentMenu.toggleOpen();
      if (!this.parentMenu.opts.open.current) e.preventDefault();
    }
  };
  onpointerup = (e) => {
    if (this.opts.disabled.current) return;
    if (e.pointerType === "touch") {
      e.preventDefault();
      this.parentMenu.toggleOpen();
    }
  };
  onkeydown = (e) => {
    if (this.opts.disabled.current) return;
    if (e.key === SPACE || e.key === ENTER) {
      this.parentMenu.toggleOpen();
      e.preventDefault();
      return;
    }
    if (e.key === ARROW_DOWN) {
      this.parentMenu.onOpen();
      e.preventDefault();
    }
  };
  #ariaControls = derived(() => {
    if (this.parentMenu.opts.open.current && this.parentMenu.contentId.current) return this.parentMenu.contentId.current;
    return void 0;
  });
  #props = derived(() => ({
    id: this.opts.id.current,
    disabled: this.opts.disabled.current,
    "aria-haspopup": "menu",
    "aria-expanded": getAriaExpanded(this.parentMenu.opts.open.current),
    "aria-controls": this.#ariaControls(),
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    "data-state": getDataOpenClosed(this.parentMenu.opts.open.current),
    [this.parentMenu.root.getBitsAttr("trigger")]: "",
    //
    onpointerdown: this.onpointerdown,
    onpointerup: this.onpointerup,
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class MenuSubmenuState {
  static create(opts) {
    const menu = MenuMenuContext.get();
    return MenuMenuContext.set(new MenuMenuState(opts, menu.root, menu));
  }
}
Menu_sub[FILENAME] = "node_modules/bits-ui/dist/bits/menu/components/menu-sub.svelte";
function Menu_sub($$payload, $$props) {
  push(Menu_sub);
  let {
    open = false,
    onOpenChange = noop,
    onOpenChangeComplete = noop,
    children
  } = $$props;
  MenuSubmenuState.create({
    open: box$1.with(() => open, (v) => {
      open = v;
      onOpenChange?.(v);
    }),
    onOpenChangeComplete: box$1.with(() => onOpenChangeComplete)
  });
  Floating_layer($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      children?.($$payload2);
      $$payload2.out.push(`<!---->`);
    })
  });
  bind_props($$props, { open });
  pop();
}
Menu_sub.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Menu_item[FILENAME] = "node_modules/bits-ui/dist/bits/menu/components/menu-item.svelte";
function Menu_item($$payload, $$props) {
  push(Menu_item);
  const uid = props_id($$payload);
  let {
    child,
    children,
    ref = null,
    id = createId$1(uid),
    disabled = false,
    onSelect = noop,
    closeOnSelect = true,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const itemState = MenuItemState.create({
    id: box$1.with(() => id),
    disabled: box$1.with(() => disabled),
    onSelect: box$1.with(() => onSelect),
    ref: box$1.with(() => ref, (v) => ref = v),
    closeOnSelect: box$1.with(() => closeOnSelect)
  });
  const mergedProps = mergeProps$1(restProps, itemState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 38, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Menu_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Menu_group[FILENAME] = "node_modules/bits-ui/dist/bits/menu/components/menu-group.svelte";
function Menu_group($$payload, $$props) {
  push(Menu_group);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const groupState = MenuGroupState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, groupState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 30, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Menu_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Menu_separator[FILENAME] = "node_modules/bits-ui/dist/bits/menu/components/menu-separator.svelte";
function Menu_separator($$payload, $$props) {
  push(Menu_separator);
  const uid = props_id($$payload);
  let {
    ref = null,
    id = createId$1(uid),
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const separatorState = MenuSeparatorState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, separatorState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Menu_separator.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Menu_sub_content[FILENAME] = "node_modules/bits-ui/dist/bits/menu/components/menu-sub-content.svelte";
function Menu_sub_content($$payload, $$props) {
  push(Menu_sub_content);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    children,
    child,
    loop: loop2 = true,
    onInteractOutside = noop,
    forceMount = false,
    onEscapeKeydown = noop,
    interactOutsideBehavior = "defer-otherwise-close",
    escapeKeydownBehavior = "defer-otherwise-close",
    onOpenAutoFocus: onOpenAutoFocusProp = noop,
    onCloseAutoFocus: onCloseAutoFocusProp = noop,
    onFocusOutside = noop,
    side = "right",
    trapFocus = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const subContentState = MenuContentState.create({
    id: box$1.with(() => id),
    loop: box$1.with(() => loop2),
    ref: box$1.with(() => ref, (v) => ref = v),
    isSub: true,
    onCloseAutoFocus: box$1.with(() => handleCloseAutoFocus)
  });
  function onkeydown(e) {
    const isKeyDownInside = e.currentTarget.contains(e.target);
    const isCloseKey = SUB_CLOSE_KEYS[subContentState.parentMenu.root.opts.dir.current].includes(e.key);
    if (isKeyDownInside && isCloseKey) {
      subContentState.parentMenu.onClose();
      const triggerNode = subContentState.parentMenu.triggerNode;
      triggerNode?.focus();
      e.preventDefault();
    }
  }
  const dataAttr = subContentState.parentMenu.root.getBitsAttr("sub-content");
  const mergedProps = mergeProps$1(restProps, subContentState.props, { side, onkeydown, [dataAttr]: "" });
  function handleOpenAutoFocus(e) {
    onOpenAutoFocusProp(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    if (subContentState.parentMenu.root.isUsingKeyboard && subContentState.parentMenu.contentNode) {
      MenuOpenEvent.dispatch(subContentState.parentMenu.contentNode);
    }
  }
  function handleCloseAutoFocus(e) {
    onCloseAutoFocusProp(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
  }
  function handleInteractOutside(e) {
    onInteractOutside(e);
    if (e.defaultPrevented) return;
    subContentState.parentMenu.onClose();
  }
  function handleEscapeKeydown(e) {
    onEscapeKeydown(e);
    if (e.defaultPrevented) return;
    subContentState.parentMenu.onClose();
  }
  function handleOnFocusOutside(e) {
    onFocusOutside(e);
    if (e.defaultPrevented) return;
    if (!isHTMLElement(e.target)) return;
    if (e.target.id !== subContentState.parentMenu.triggerNode?.id) {
      subContentState.parentMenu.onClose();
    }
  }
  if (forceMount) {
    $$payload.out.push("<!--[-->");
    {
      let popper = function($$payload2, { props, wrapperProps }) {
        validate_snippet_args($$payload2);
        const finalProps = mergeProps$1(props, mergedProps, { style: getFloatingContentCSSVars("menu") });
        if (child) {
          $$payload2.out.push("<!--[-->");
          child($$payload2, {
            props: finalProps,
            wrapperProps,
            ...subContentState.snippetProps
          });
          $$payload2.out.push(`<!---->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
          push_element($$payload2, "div", 136, 4);
          $$payload2.out.push(`<div${spread_attributes({ ...finalProps }, null)}>`);
          push_element($$payload2, "div", 137, 5);
          children?.($$payload2);
          $$payload2.out.push(`<!----></div>`);
          pop_element();
          $$payload2.out.push(`</div>`);
          pop_element();
        }
        $$payload2.out.push(`<!--]-->`);
      };
      prevent_snippet_stringification(popper);
      Popper_layer_force_mount($$payload, spread_props([
        mergedProps,
        {
          ref: subContentState.opts.ref,
          interactOutsideBehavior,
          escapeKeydownBehavior,
          onOpenAutoFocus: handleOpenAutoFocus,
          enabled: subContentState.parentMenu.opts.open.current,
          onInteractOutside: handleInteractOutside,
          onEscapeKeydown: handleEscapeKeydown,
          onFocusOutside: handleOnFocusOutside,
          preventScroll: false,
          loop: loop2,
          trapFocus,
          popper,
          $$slots: { popper: true }
        }
      ]));
    }
  } else {
    $$payload.out.push("<!--[!-->");
    if (!forceMount) {
      $$payload.out.push("<!--[-->");
      {
        let popper = function($$payload2, { props, wrapperProps }) {
          validate_snippet_args($$payload2);
          const finalProps = mergeProps$1(props, mergedProps, { style: getFloatingContentCSSVars("menu") });
          if (child) {
            $$payload2.out.push("<!--[-->");
            child($$payload2, {
              props: finalProps,
              wrapperProps,
              ...subContentState.snippetProps
            });
            $$payload2.out.push(`<!---->`);
          } else {
            $$payload2.out.push("<!--[!-->");
            $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
            push_element($$payload2, "div", 171, 4);
            $$payload2.out.push(`<div${spread_attributes({ ...finalProps }, null)}>`);
            push_element($$payload2, "div", 172, 5);
            children?.($$payload2);
            $$payload2.out.push(`<!----></div>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
          }
          $$payload2.out.push(`<!--]-->`);
        };
        prevent_snippet_stringification(popper);
        Popper_layer($$payload, spread_props([
          mergedProps,
          {
            ref: subContentState.opts.ref,
            interactOutsideBehavior,
            escapeKeydownBehavior,
            onCloseAutoFocus: handleCloseAutoFocus,
            onOpenAutoFocus: handleOpenAutoFocus,
            open: subContentState.parentMenu.opts.open.current,
            onInteractOutside: handleInteractOutside,
            onEscapeKeydown: handleEscapeKeydown,
            onFocusOutside: handleOnFocusOutside,
            preventScroll: false,
            loop: loop2,
            trapFocus,
            popper,
            $$slots: { popper: true }
          }
        ]));
      }
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Menu_sub_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Menu_sub_trigger[FILENAME] = "node_modules/bits-ui/dist/bits/menu/components/menu-sub-trigger.svelte";
function Menu_sub_trigger($$payload, $$props) {
  push(Menu_sub_trigger);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    disabled = false,
    ref = null,
    children,
    child,
    onSelect = noop,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const subTriggerState = MenuSubTriggerState.create({
    disabled: box$1.with(() => disabled),
    onSelect: box$1.with(() => onSelect),
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, subTriggerState.props);
  Floating_layer_anchor($$payload, {
    id,
    ref: subTriggerState.opts.ref,
    children: prevent_snippet_stringification(($$payload2) => {
      if (child) {
        $$payload2.out.push("<!--[-->");
        child($$payload2, { props: mergedProps });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
        push_element($$payload2, "div", 38, 2);
        children?.($$payload2);
        $$payload2.out.push(`<!----></div>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    })
  });
  bind_props($$props, { ref });
  pop();
}
Menu_sub_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const popoverAttrs = createBitsAttrs({
  component: "popover",
  parts: ["root", "trigger", "content", "close"]
});
const PopoverRootContext = new Context$2("Popover.Root");
class PopoverRootState {
  static create(opts) {
    return PopoverRootContext.set(new PopoverRootState(opts));
  }
  opts;
  contentNode = null;
  triggerNode = null;
  constructor(opts) {
    this.opts = opts;
    new OpenChangeComplete({
      ref: box$1.with(() => this.contentNode),
      open: this.opts.open,
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
  }
  toggleOpen() {
    this.opts.open.current = !this.opts.open.current;
  }
  handleClose() {
    if (!this.opts.open.current) return;
    this.opts.open.current = false;
  }
}
class PopoverTriggerState {
  static create(opts) {
    return new PopoverTriggerState(opts, PopoverRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref, (v) => this.root.triggerNode = v);
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  onclick(e) {
    if (this.opts.disabled.current) return;
    if (e.button !== 0) return;
    this.root.toggleOpen();
  }
  onkeydown(e) {
    if (this.opts.disabled.current) return;
    if (!(e.key === ENTER || e.key === SPACE)) return;
    e.preventDefault();
    this.root.toggleOpen();
  }
  #getAriaControls() {
    if (this.root.opts.open.current && this.root.contentNode?.id) {
      return this.root.contentNode?.id;
    }
    return void 0;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "aria-haspopup": "dialog",
    "aria-expanded": getAriaExpanded(this.root.opts.open.current),
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    "aria-controls": this.#getAriaControls(),
    [popoverAttrs.trigger]: "",
    disabled: this.opts.disabled.current,
    //
    onkeydown: this.onkeydown,
    onclick: this.onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class PopoverContentState {
  static create(opts) {
    return new PopoverContentState(opts, PopoverRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref, (v) => this.root.contentNode = v);
  }
  onInteractOutside = (e) => {
    this.opts.onInteractOutside.current(e);
    if (e.defaultPrevented) return;
    if (!isElement(e.target)) return;
    const closestTrigger = e.target.closest(popoverAttrs.selector("trigger"));
    if (closestTrigger && closestTrigger === this.root.triggerNode) return;
    if (this.opts.customAnchor.current) {
      if (isElement(this.opts.customAnchor.current)) {
        if (this.opts.customAnchor.current.contains(e.target)) return;
      } else if (typeof this.opts.customAnchor.current === "string") {
        const el = document.querySelector(this.opts.customAnchor.current);
        if (el && el.contains(e.target)) return;
      }
    }
    this.root.handleClose();
  };
  onEscapeKeydown = (e) => {
    this.opts.onEscapeKeydown.current(e);
    if (e.defaultPrevented) return;
    this.root.handleClose();
  };
  onCloseAutoFocus = (e) => {
    this.opts.onCloseAutoFocus.current?.(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    this.root.triggerNode?.focus();
  };
  #snippetProps = derived(() => ({ open: this.root.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    tabindex: -1,
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    [popoverAttrs.content]: "",
    style: { pointerEvents: "auto" },
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  popperProps = {
    onInteractOutside: this.onInteractOutside,
    onEscapeKeydown: this.onEscapeKeydown,
    onCloseAutoFocus: this.onCloseAutoFocus
  };
}
Popover_content[FILENAME] = "node_modules/bits-ui/dist/bits/popover/components/popover-content.svelte";
function Popover_content($$payload, $$props) {
  push(Popover_content);
  const uid = props_id($$payload);
  let {
    child,
    children,
    ref = null,
    id = createId$1(uid),
    forceMount = false,
    onCloseAutoFocus = noop,
    onEscapeKeydown = noop,
    onInteractOutside = noop,
    trapFocus = true,
    preventScroll = false,
    customAnchor = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = PopoverContentState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    onInteractOutside: box$1.with(() => onInteractOutside),
    onEscapeKeydown: box$1.with(() => onEscapeKeydown),
    onCloseAutoFocus: box$1.with(() => onCloseAutoFocus),
    customAnchor: box$1.with(() => customAnchor)
  });
  const mergedProps = mergeProps$1(restProps, contentState.props);
  if (forceMount) {
    $$payload.out.push("<!--[-->");
    {
      let popper = function($$payload2, { props, wrapperProps }) {
        validate_snippet_args($$payload2);
        const finalProps = mergeProps$1(props, { style: getFloatingContentCSSVars("popover") });
        if (child) {
          $$payload2.out.push("<!--[-->");
          child($$payload2, {
            props: finalProps,
            wrapperProps,
            ...contentState.snippetProps
          });
          $$payload2.out.push(`<!---->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
          push_element($$payload2, "div", 63, 4);
          $$payload2.out.push(`<div${spread_attributes({ ...finalProps }, null)}>`);
          push_element($$payload2, "div", 64, 5);
          children?.($$payload2);
          $$payload2.out.push(`<!----></div>`);
          pop_element();
          $$payload2.out.push(`</div>`);
          pop_element();
        }
        $$payload2.out.push(`<!--]-->`);
      };
      prevent_snippet_stringification(popper);
      Popper_layer_force_mount($$payload, spread_props([
        mergedProps,
        contentState.popperProps,
        {
          ref: contentState.opts.ref,
          enabled: contentState.root.opts.open.current,
          id,
          trapFocus,
          preventScroll,
          loop: true,
          forceMount: true,
          customAnchor,
          popper,
          $$slots: { popper: true }
        }
      ]));
    }
  } else {
    $$payload.out.push("<!--[!-->");
    if (!forceMount) {
      $$payload.out.push("<!--[-->");
      {
        let popper = function($$payload2, { props, wrapperProps }) {
          validate_snippet_args($$payload2);
          const finalProps = mergeProps$1(props, { style: getFloatingContentCSSVars("popover") });
          if (child) {
            $$payload2.out.push("<!--[-->");
            child($$payload2, {
              props: finalProps,
              wrapperProps,
              ...contentState.snippetProps
            });
            $$payload2.out.push(`<!---->`);
          } else {
            $$payload2.out.push("<!--[!-->");
            $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
            push_element($$payload2, "div", 91, 4);
            $$payload2.out.push(`<div${spread_attributes({ ...finalProps }, null)}>`);
            push_element($$payload2, "div", 92, 5);
            children?.($$payload2);
            $$payload2.out.push(`<!----></div>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
          }
          $$payload2.out.push(`<!--]-->`);
        };
        prevent_snippet_stringification(popper);
        Popper_layer($$payload, spread_props([
          mergedProps,
          contentState.popperProps,
          {
            ref: contentState.opts.ref,
            open: contentState.root.opts.open.current,
            id,
            trapFocus,
            preventScroll,
            loop: true,
            forceMount: false,
            customAnchor,
            popper,
            $$slots: { popper: true }
          }
        ]));
      }
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Popover_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Popover_trigger[FILENAME] = "node_modules/bits-ui/dist/bits/popover/components/popover-trigger.svelte";
function Popover_trigger($$payload, $$props) {
  push(Popover_trigger);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    ref = null,
    type = "button",
    disabled = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const triggerState = PopoverTriggerState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    disabled: box$1.with(() => Boolean(disabled))
  });
  const mergedProps = mergeProps$1(restProps, triggerState.props, { type });
  Floating_layer_anchor($$payload, {
    id,
    ref: triggerState.opts.ref,
    children: prevent_snippet_stringification(($$payload2) => {
      if (child) {
        $$payload2.out.push("<!--[-->");
        child($$payload2, { props: mergedProps });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
        push_element($$payload2, "button", 36, 2);
        children?.($$payload2);
        $$payload2.out.push(`<!----></button>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    })
  });
  bind_props($$props, { ref });
  pop();
}
Popover_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog[FILENAME] = "node_modules/bits-ui/dist/bits/dialog/components/dialog.svelte";
function Dialog($$payload, $$props) {
  push(Dialog);
  let {
    open = false,
    onOpenChange = noop,
    onOpenChangeComplete = noop,
    children
  } = $$props;
  DialogRootState.create({
    variant: box$1.with(() => "dialog"),
    open: box$1.with(() => open, (v) => {
      open = v;
      onOpenChange(v);
    }),
    onOpenChangeComplete: box$1.with(() => onOpenChangeComplete)
  });
  children?.($$payload);
  $$payload.out.push(`<!---->`);
  bind_props($$props, { open });
  pop();
}
Dialog.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_close[FILENAME] = "node_modules/bits-ui/dist/bits/dialog/components/dialog-close.svelte";
function Dialog_close($$payload, $$props) {
  push(Dialog_close);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    ref = null,
    disabled = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const closeState = DialogCloseState.create({
    variant: box$1.with(() => "close"),
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    disabled: box$1.with(() => Boolean(disabled))
  });
  const mergedProps = mergeProps$1(restProps, closeState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 34, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Dialog_close.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_content[FILENAME] = "node_modules/bits-ui/dist/bits/dialog/components/dialog-content.svelte";
function Dialog_content($$payload, $$props) {
  push(Dialog_content);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    children,
    child,
    ref = null,
    forceMount = false,
    onCloseAutoFocus = noop,
    onOpenAutoFocus = noop,
    onEscapeKeydown = noop,
    onInteractOutside = noop,
    trapFocus = true,
    preventScroll = true,
    restoreScrollDelay = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = DialogContentState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, contentState.props);
  {
    let presence = function($$payload2) {
      validate_snippet_args($$payload2);
      {
        let focusScope = function($$payload3, { props: focusScopeProps }) {
          validate_snippet_args($$payload3);
          Escape_layer($$payload3, spread_props([
            mergedProps,
            {
              enabled: contentState.root.opts.open.current,
              ref: contentState.opts.ref,
              onEscapeKeydown: (e) => {
                onEscapeKeydown(e);
                if (e.defaultPrevented) return;
                contentState.root.handleClose();
              },
              children: prevent_snippet_stringification(($$payload4) => {
                Dismissible_layer($$payload4, spread_props([
                  mergedProps,
                  {
                    ref: contentState.opts.ref,
                    enabled: contentState.root.opts.open.current,
                    onInteractOutside: (e) => {
                      onInteractOutside(e);
                      if (e.defaultPrevented) return;
                      contentState.root.handleClose();
                    },
                    children: prevent_snippet_stringification(($$payload5) => {
                      Text_selection_layer($$payload5, spread_props([
                        mergedProps,
                        {
                          ref: contentState.opts.ref,
                          enabled: contentState.root.opts.open.current,
                          children: prevent_snippet_stringification(($$payload6) => {
                            if (child) {
                              $$payload6.out.push("<!--[-->");
                              if (contentState.root.opts.open.current) {
                                $$payload6.out.push("<!--[-->");
                                Scroll_lock($$payload6, { preventScroll, restoreScrollDelay });
                              } else {
                                $$payload6.out.push("<!--[!-->");
                              }
                              $$payload6.out.push(`<!--]--> `);
                              child($$payload6, {
                                props: mergeProps$1(mergedProps, focusScopeProps),
                                ...contentState.snippetProps
                              });
                              $$payload6.out.push(`<!---->`);
                            } else {
                              $$payload6.out.push("<!--[!-->");
                              Scroll_lock($$payload6, { preventScroll });
                              $$payload6.out.push(`<!----> <div${spread_attributes({ ...mergeProps$1(mergedProps, focusScopeProps) }, null)}>`);
                              push_element($$payload6, "div", 102, 8);
                              children?.($$payload6);
                              $$payload6.out.push(`<!----></div>`);
                              pop_element();
                            }
                            $$payload6.out.push(`<!--]-->`);
                          }),
                          $$slots: { default: true }
                        }
                      ]));
                    }),
                    $$slots: { default: true }
                  }
                ]));
              }),
              $$slots: { default: true }
            }
          ]));
        };
        prevent_snippet_stringification(focusScope);
        Focus_scope($$payload2, {
          ref: contentState.opts.ref,
          loop: true,
          trapFocus,
          enabled: shouldEnableFocusTrap({
            forceMount,
            present: contentState.root.opts.open.current,
            open: contentState.root.opts.open.current
          }),
          onOpenAutoFocus,
          onCloseAutoFocus: (e) => {
            onCloseAutoFocus(e);
            if (e.defaultPrevented) return;
            afterSleep(1, () => contentState.root.triggerNode?.focus());
          },
          focusScope
        });
      }
    };
    prevent_snippet_stringification(presence);
    Presence_layer($$payload, spread_props([
      mergedProps,
      {
        forceMount,
        open: contentState.root.opts.open.current || forceMount,
        ref: contentState.opts.ref,
        presence,
        $$slots: { presence: true }
      }
    ]));
  }
  bind_props($$props, { ref });
  pop();
}
Dialog_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Menu[FILENAME] = "node_modules/bits-ui/dist/bits/menu/components/menu.svelte";
function Menu($$payload, $$props) {
  push(Menu);
  let {
    open = false,
    dir = "ltr",
    onOpenChange = noop,
    onOpenChangeComplete = noop,
    _internal_variant: variant = "dropdown-menu",
    children
  } = $$props;
  const root2 = MenuRootState.create({
    variant: box$1.with(() => variant),
    dir: box$1.with(() => dir),
    onClose: () => {
      open = false;
      onOpenChange(false);
    }
  });
  MenuMenuState.create(
    {
      open: box$1.with(() => open, (v) => {
        open = v;
        onOpenChange(v);
      }),
      onOpenChangeComplete: box$1.with(() => onOpenChangeComplete)
    },
    root2
  );
  Floating_layer($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      children?.($$payload2);
      $$payload2.out.push(`<!---->`);
    })
  });
  bind_props($$props, { open });
  pop();
}
Menu.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_content[FILENAME] = "node_modules/bits-ui/dist/bits/dropdown-menu/components/dropdown-menu-content.svelte";
function Dropdown_menu_content($$payload, $$props) {
  push(Dropdown_menu_content);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    child,
    children,
    ref = null,
    loop: loop2 = true,
    onInteractOutside = noop,
    onEscapeKeydown = noop,
    onCloseAutoFocus = noop,
    forceMount = false,
    trapFocus = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = MenuContentState.create({
    id: box$1.with(() => id),
    loop: box$1.with(() => loop2),
    ref: box$1.with(() => ref, (v) => ref = v),
    onCloseAutoFocus: box$1.with(() => onCloseAutoFocus)
  });
  const mergedProps = mergeProps$1(restProps, contentState.props);
  function handleInteractOutside(e) {
    contentState.handleInteractOutside(e);
    if (e.defaultPrevented) return;
    onInteractOutside(e);
    if (e.defaultPrevented) return;
    if (e.target && e.target instanceof Element) {
      const subContentSelector = `[${contentState.parentMenu.root.getBitsAttr("sub-content")}]`;
      if (e.target.closest(subContentSelector)) return;
    }
    contentState.parentMenu.onClose();
  }
  function handleEscapeKeydown(e) {
    onEscapeKeydown(e);
    if (e.defaultPrevented) return;
    contentState.parentMenu.onClose();
  }
  if (forceMount) {
    $$payload.out.push("<!--[-->");
    {
      let popper = function($$payload2, { props, wrapperProps }) {
        validate_snippet_args($$payload2);
        const finalProps = mergeProps$1(props, { style: getFloatingContentCSSVars("dropdown-menu") });
        if (child) {
          $$payload2.out.push("<!--[-->");
          child($$payload2, {
            props: finalProps,
            wrapperProps,
            ...contentState.snippetProps
          });
          $$payload2.out.push(`<!---->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
          push_element($$payload2, "div", 79, 4);
          $$payload2.out.push(`<div${spread_attributes({ ...finalProps }, null)}>`);
          push_element($$payload2, "div", 80, 5);
          children?.($$payload2);
          $$payload2.out.push(`<!----></div>`);
          pop_element();
          $$payload2.out.push(`</div>`);
          pop_element();
        }
        $$payload2.out.push(`<!--]-->`);
      };
      prevent_snippet_stringification(popper);
      Popper_layer_force_mount($$payload, spread_props([
        mergedProps,
        contentState.popperProps,
        {
          ref: contentState.opts.ref,
          enabled: contentState.parentMenu.opts.open.current,
          onInteractOutside: handleInteractOutside,
          onEscapeKeydown: handleEscapeKeydown,
          trapFocus,
          loop: loop2,
          forceMount: true,
          id,
          popper,
          $$slots: { popper: true }
        }
      ]));
    }
  } else {
    $$payload.out.push("<!--[!-->");
    if (!forceMount) {
      $$payload.out.push("<!--[-->");
      {
        let popper = function($$payload2, { props, wrapperProps }) {
          validate_snippet_args($$payload2);
          const finalProps = mergeProps$1(props, { style: getFloatingContentCSSVars("dropdown-menu") });
          if (child) {
            $$payload2.out.push("<!--[-->");
            child($$payload2, {
              props: finalProps,
              wrapperProps,
              ...contentState.snippetProps
            });
            $$payload2.out.push(`<!---->`);
          } else {
            $$payload2.out.push("<!--[!-->");
            $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
            push_element($$payload2, "div", 107, 4);
            $$payload2.out.push(`<div${spread_attributes({ ...finalProps }, null)}>`);
            push_element($$payload2, "div", 108, 5);
            children?.($$payload2);
            $$payload2.out.push(`<!----></div>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
          }
          $$payload2.out.push(`<!--]-->`);
        };
        prevent_snippet_stringification(popper);
        Popper_layer($$payload, spread_props([
          mergedProps,
          contentState.popperProps,
          {
            ref: contentState.opts.ref,
            open: contentState.parentMenu.opts.open.current,
            onInteractOutside: handleInteractOutside,
            onEscapeKeydown: handleEscapeKeydown,
            trapFocus,
            loop: loop2,
            forceMount: false,
            id,
            popper,
            $$slots: { popper: true }
          }
        ]));
      }
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Menu_trigger[FILENAME] = "node_modules/bits-ui/dist/bits/menu/components/menu-trigger.svelte";
function Menu_trigger($$payload, $$props) {
  push(Menu_trigger);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    child,
    children,
    disabled = false,
    type = "button",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const triggerState = DropdownMenuTriggerState.create({
    id: box$1.with(() => id),
    disabled: box$1.with(() => disabled ?? false),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, triggerState.props, { type });
  Floating_layer_anchor($$payload, {
    id,
    ref: triggerState.opts.ref,
    children: prevent_snippet_stringification(($$payload2) => {
      if (child) {
        $$payload2.out.push("<!--[-->");
        child($$payload2, { props: mergedProps });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
        push_element($$payload2, "button", 36, 2);
        children?.($$payload2);
        $$payload2.out.push(`<!----></button>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    })
  });
  bind_props($$props, { ref });
  pop();
}
Menu_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const labelAttrs = createBitsAttrs({ component: "label", parts: ["root"] });
class LabelRootState {
  static create(opts) {
    return new LabelRootState(opts);
  }
  opts;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(this.opts.ref);
    this.onmousedown = this.onmousedown.bind(this);
  }
  onmousedown(e) {
    if (e.detail > 1) e.preventDefault();
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [labelAttrs.root]: "",
    onmousedown: this.onmousedown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
Label$1[FILENAME] = "node_modules/bits-ui/dist/bits/label/components/label.svelte";
function Label$1($$payload, $$props) {
  push(Label$1);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    ref = null,
    for: forProp,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = LabelRootState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, rootState.props, { for: forProp });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<label${spread_attributes({ ...mergedProps, for: forProp }, null)}>`);
    push_element($$payload, "label", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></label>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Label$1.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Popover[FILENAME] = "node_modules/bits-ui/dist/bits/popover/components/popover.svelte";
function Popover($$payload, $$props) {
  push(Popover);
  let {
    open = false,
    onOpenChange = noop,
    onOpenChangeComplete = noop,
    children
  } = $$props;
  PopoverRootState.create({
    open: box$1.with(() => open, (v) => {
      open = v;
      onOpenChange(v);
    }),
    onOpenChangeComplete: box$1.with(() => onOpenChangeComplete)
  });
  Floating_layer($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      children?.($$payload2);
      $$payload2.out.push(`<!---->`);
    })
  });
  bind_props($$props, { open });
  pop();
}
Popover.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const radioGroupAttrs = createBitsAttrs({ component: "radio-group", parts: ["root", "item"] });
const RadioGroupRootContext = new Context$2("RadioGroup.Root");
class RadioGroupRootState {
  static create(opts) {
    return RadioGroupRootContext.set(new RadioGroupRootState(opts));
  }
  opts;
  #hasValue = derived(() => this.opts.value.current !== "");
  get hasValue() {
    return this.#hasValue();
  }
  set hasValue($$value) {
    return this.#hasValue($$value);
  }
  rovingFocusGroup;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(this.opts.ref);
    this.rovingFocusGroup = new RovingFocusGroup({
      rootNode: this.opts.ref,
      candidateAttr: radioGroupAttrs.item,
      loop: this.opts.loop,
      orientation: this.opts.orientation
    });
  }
  isChecked(value) {
    return this.opts.value.current === value;
  }
  setValue(value) {
    this.opts.value.current = value;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "radiogroup",
    "aria-required": getAriaRequired$1(this.opts.required.current),
    "aria-disabled": getAriaDisabled(this.opts.disabled.current),
    "aria-readonly": this.opts.readonly.current ? "true" : void 0,
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    "data-readonly": getDataReadonly(this.opts.readonly.current),
    "data-orientation": this.opts.orientation.current,
    [radioGroupAttrs.root]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class RadioGroupItemState {
  static create(opts) {
    return new RadioGroupItemState(opts, RadioGroupRootContext.get());
  }
  opts;
  root;
  attachment;
  #checked = derived(() => this.root.opts.value.current === this.opts.value.current);
  get checked() {
    return this.#checked();
  }
  set checked($$value) {
    return this.#checked($$value);
  }
  #isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
  #isReadonly = derived(() => this.root.opts.readonly.current);
  #isChecked = derived(() => this.root.isChecked(this.opts.value.current));
  #tabIndex = -1;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
    if (this.opts.value.current === this.root.opts.value.current) {
      this.root.rovingFocusGroup.setCurrentTabStopId(this.opts.id.current);
      this.#tabIndex = 0;
    } else if (!this.root.opts.value.current) {
      this.#tabIndex = 0;
    }
    watch$1(
      [
        () => this.opts.value.current,
        () => this.root.opts.value.current
      ],
      () => {
        if (this.opts.value.current === this.root.opts.value.current) {
          this.root.rovingFocusGroup.setCurrentTabStopId(this.opts.id.current);
          this.#tabIndex = 0;
        }
      }
    );
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
    this.onfocus = this.onfocus.bind(this);
  }
  onclick(_) {
    if (this.opts.disabled.current || this.#isReadonly()) return;
    this.root.setValue(this.opts.value.current);
  }
  onfocus(_) {
    if (!this.root.hasValue || this.#isReadonly()) return;
    this.root.setValue(this.opts.value.current);
  }
  onkeydown(e) {
    if (this.#isDisabled()) return;
    if (e.key === SPACE) {
      e.preventDefault();
      if (!this.#isReadonly()) {
        this.root.setValue(this.opts.value.current);
      }
      return;
    }
    this.root.rovingFocusGroup.handleKeydown(this.opts.ref.current, e, true);
  }
  #snippetProps = derived(() => ({ checked: this.#isChecked() }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    disabled: this.#isDisabled() ? true : void 0,
    "data-value": this.opts.value.current,
    "data-orientation": this.root.opts.orientation.current,
    "data-disabled": getDataDisabled(this.#isDisabled()),
    "data-readonly": getDataReadonly(this.#isReadonly()),
    "data-state": this.#isChecked() ? "checked" : "unchecked",
    "aria-checked": getAriaChecked(this.#isChecked(), false),
    [radioGroupAttrs.item]: "",
    type: "button",
    role: "radio",
    tabindex: this.#tabIndex,
    onkeydown: this.onkeydown,
    onfocus: this.onfocus,
    onclick: this.onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class RadioGroupInputState {
  static create() {
    return new RadioGroupInputState(RadioGroupRootContext.get());
  }
  root;
  #shouldRender = derived(() => this.root.opts.name.current !== void 0);
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  #props = derived(() => ({
    name: this.root.opts.name.current,
    value: this.root.opts.value.current,
    required: this.root.opts.required.current,
    disabled: this.root.opts.disabled.current
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  constructor(root2) {
    this.root = root2;
  }
}
Radio_group_input[FILENAME] = "node_modules/bits-ui/dist/bits/radio-group/components/radio-group-input.svelte";
function Radio_group_input($$payload, $$props) {
  push(Radio_group_input);
  const inputState = RadioGroupInputState.create();
  if (inputState.shouldRender) {
    $$payload.out.push("<!--[-->");
    Hidden_input($$payload, spread_props([inputState.props]));
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Radio_group_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Radio_group[FILENAME] = "node_modules/bits-ui/dist/bits/radio-group/components/radio-group.svelte";
function Radio_group($$payload, $$props) {
  push(Radio_group);
  const uid = props_id($$payload);
  let {
    disabled = false,
    children,
    child,
    value = "",
    ref = null,
    orientation = "vertical",
    loop: loop2 = true,
    name = void 0,
    required = false,
    readonly: readonly2 = false,
    id = createId$1(uid),
    onValueChange = noop,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = RadioGroupRootState.create({
    orientation: box$1.with(() => orientation),
    disabled: box$1.with(() => disabled),
    loop: box$1.with(() => loop2),
    name: box$1.with(() => name),
    required: box$1.with(() => required),
    readonly: box$1.with(() => readonly2),
    id: box$1.with(() => id),
    value: box$1.with(() => value, (v) => {
      if (v === value) return;
      value = v;
      onValueChange?.(v);
    }),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, rootState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 55, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]--> `);
  Radio_group_input($$payload);
  $$payload.out.push(`<!---->`);
  bind_props($$props, { value, ref });
  pop();
}
Radio_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Radio_group_item[FILENAME] = "node_modules/bits-ui/dist/bits/radio-group/components/radio-group-item.svelte";
function Radio_group_item($$payload, $$props) {
  push(Radio_group_item);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    children,
    child,
    value,
    disabled = false,
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const itemState = RadioGroupItemState.create({
    value: box$1.with(() => value),
    disabled: box$1.with(() => disabled ?? false),
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, itemState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...itemState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 35, 1);
    children?.($$payload, itemState.snippetProps);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Radio_group_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select.svelte";
function Select($$payload, $$props) {
  push(Select);
  let {
    value = void 0,
    onValueChange = noop,
    name = "",
    disabled = false,
    type,
    open = false,
    onOpenChange = noop,
    onOpenChangeComplete = noop,
    loop: loop2 = false,
    scrollAlignment = "nearest",
    required = false,
    items = [],
    allowDeselect = false,
    autocomplete,
    children
  } = $$props;
  function handleDefaultValue() {
    if (value !== void 0) return;
    value = type === "single" ? "" : [];
  }
  handleDefaultValue();
  watch$1.pre(() => value, () => {
    handleDefaultValue();
  });
  let inputValue = "";
  const rootState = SelectRootState.create({
    type,
    value: box$1.with(() => value, (v) => {
      value = v;
      onValueChange(v);
    }),
    disabled: box$1.with(() => disabled),
    required: box$1.with(() => required),
    open: box$1.with(() => open, (v) => {
      open = v;
      onOpenChange(v);
    }),
    loop: box$1.with(() => loop2),
    scrollAlignment: box$1.with(() => scrollAlignment),
    name: box$1.with(() => name),
    isCombobox: false,
    items: box$1.with(() => items),
    allowDeselect: box$1.with(() => allowDeselect),
    inputValue: box$1.with(() => inputValue, (v) => inputValue = v),
    onOpenChangeComplete: box$1.with(() => onOpenChangeComplete)
  });
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Floating_layer($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        children?.($$payload3);
        $$payload3.out.push(`<!---->`);
      })
    });
    $$payload2.out.push(`<!----> `);
    if (Array.isArray(rootState.opts.value.current)) {
      $$payload2.out.push("<!--[-->");
      if (rootState.opts.value.current.length === 0) {
        $$payload2.out.push("<!--[-->");
        Select_hidden_input($$payload2, { autocomplete });
      } else {
        $$payload2.out.push("<!--[!-->");
        const each_array = ensure_array_like(rootState.opts.value.current);
        $$payload2.out.push(`<!--[-->`);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let item = each_array[$$index];
          Select_hidden_input($$payload2, { value: item, autocomplete });
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]-->`);
    } else {
      $$payload2.out.push("<!--[!-->");
      Select_hidden_input($$payload2, {
        autocomplete,
        get value() {
          return rootState.opts.value.current;
        },
        set value($$value) {
          rootState.opts.value.current = $$value;
          $$settled = false;
        }
      });
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value, open });
  pop();
}
Select.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_trigger[FILENAME] = "node_modules/bits-ui/dist/bits/select/components/select-trigger.svelte";
function Select_trigger($$payload, $$props) {
  push(Select_trigger);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    child,
    children,
    type = "button",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const triggerState = SelectTriggerState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, triggerState.props, { type });
  $$payload.out.push(`<!---->`);
  Floating_layer_anchor($$payload, {
    id,
    ref: triggerState.opts.ref,
    children: prevent_snippet_stringification(($$payload2) => {
      if (child) {
        $$payload2.out.push("<!--[-->");
        child($$payload2, { props: mergedProps });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
        push_element($$payload2, "button", 34, 2);
        children?.($$payload2);
        $$payload2.out.push(`<!----></button>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    })
  });
  $$payload.out.push(`<!---->`);
  bind_props($$props, { ref });
  pop();
}
Select_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const switchAttrs = createBitsAttrs({ component: "switch", parts: ["root", "thumb"] });
const SwitchRootContext = new Context$2("Switch.Root");
class SwitchRootState {
  static create(opts) {
    return SwitchRootContext.set(new SwitchRootState(opts));
  }
  opts;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(opts.ref);
    this.onkeydown = this.onkeydown.bind(this);
    this.onclick = this.onclick.bind(this);
  }
  #toggle() {
    this.opts.checked.current = !this.opts.checked.current;
  }
  onkeydown(e) {
    if (!(e.key === ENTER || e.key === SPACE) || this.opts.disabled.current) return;
    e.preventDefault();
    this.#toggle();
  }
  onclick(_) {
    if (this.opts.disabled.current) return;
    this.#toggle();
  }
  #sharedProps = derived(() => ({
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    "data-state": getDataChecked(this.opts.checked.current),
    "data-required": getDataRequired(this.opts.required.current)
  }));
  get sharedProps() {
    return this.#sharedProps();
  }
  set sharedProps($$value) {
    return this.#sharedProps($$value);
  }
  #snippetProps = derived(() => ({ checked: this.opts.checked.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    ...this.sharedProps,
    id: this.opts.id.current,
    role: "switch",
    disabled: getDisabled(this.opts.disabled.current),
    "aria-checked": getAriaChecked(this.opts.checked.current, false),
    "aria-required": getAriaRequired$1(this.opts.required.current),
    [switchAttrs.root]: "",
    onclick: this.onclick,
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SwitchInputState {
  static create() {
    return new SwitchInputState(SwitchRootContext.get());
  }
  root;
  #shouldRender = derived(() => this.root.opts.name.current !== void 0);
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(root2) {
    this.root = root2;
  }
  #props = derived(() => ({
    type: "checkbox",
    name: this.root.opts.name.current,
    value: this.root.opts.value.current,
    checked: this.root.opts.checked.current,
    disabled: this.root.opts.disabled.current,
    required: this.root.opts.required.current
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SwitchThumbState {
  static create(opts) {
    return new SwitchThumbState(opts, SwitchRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(opts.ref);
  }
  #snippetProps = derived(() => ({ checked: this.root.opts.checked.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    ...this.root.sharedProps,
    id: this.opts.id.current,
    [switchAttrs.thumb]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
Switch_input[FILENAME] = "node_modules/bits-ui/dist/bits/switch/components/switch-input.svelte";
function Switch_input($$payload, $$props) {
  push(Switch_input);
  const inputState = SwitchInputState.create();
  if (inputState.shouldRender) {
    $$payload.out.push("<!--[-->");
    Hidden_input($$payload, spread_props([inputState.props]));
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Switch_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Switch[FILENAME] = "node_modules/bits-ui/dist/bits/switch/components/switch.svelte";
function Switch($$payload, $$props) {
  push(Switch);
  const uid = props_id($$payload);
  let {
    child,
    children,
    ref = null,
    id = createId$1(uid),
    disabled = false,
    required = false,
    checked = false,
    value = "on",
    name = void 0,
    type = "button",
    onCheckedChange = noop,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = SwitchRootState.create({
    checked: box$1.with(() => checked, (v) => {
      checked = v;
      onCheckedChange?.(v);
    }),
    disabled: box$1.with(() => disabled ?? false),
    required: box$1.with(() => required),
    value: box$1.with(() => value),
    name: box$1.with(() => name),
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, rootState.props, { type });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...rootState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 51, 1);
    children?.($$payload, rootState.snippetProps);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]--> `);
  Switch_input($$payload);
  $$payload.out.push(`<!---->`);
  bind_props($$props, { ref, checked });
  pop();
}
Switch.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Switch_thumb[FILENAME] = "node_modules/bits-ui/dist/bits/switch/components/switch-thumb.svelte";
function Switch_thumb($$payload, $$props) {
  push(Switch_thumb);
  const uid = props_id($$payload);
  let {
    child,
    children,
    ref = null,
    id = createId$1(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const thumbState = SwitchThumbState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, thumbState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...thumbState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<span${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "span", 31, 1);
    children?.($$payload, thumbState.snippetProps);
    $$payload.out.push(`<!----></span>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Switch_thumb.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const tabsAttrs = createBitsAttrs({
  component: "tabs",
  parts: ["root", "list", "trigger", "content"]
});
const TabsRootContext = new Context$2("Tabs.Root");
class TabsRootState {
  static create(opts) {
    return TabsRootContext.set(new TabsRootState(opts));
  }
  opts;
  attachment;
  rovingFocusGroup;
  triggerIds = [];
  // holds the trigger ID for each value to associate it with the content
  valueToTriggerId = new SvelteMap();
  // holds the content ID for each value to associate it with the trigger
  valueToContentId = new SvelteMap();
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(opts.ref);
    this.rovingFocusGroup = new RovingFocusGroup({
      candidateAttr: tabsAttrs.trigger,
      rootNode: this.opts.ref,
      loop: this.opts.loop,
      orientation: this.opts.orientation
    });
  }
  registerTrigger(id, value) {
    this.triggerIds.push(id);
    this.valueToTriggerId.set(value, id);
    return () => {
      this.triggerIds = this.triggerIds.filter((triggerId) => triggerId !== id);
      this.valueToTriggerId.delete(value);
    };
  }
  registerContent(id, value) {
    this.valueToContentId.set(value, id);
    return () => {
      this.valueToContentId.delete(value);
    };
  }
  setValue(v) {
    this.opts.value.current = v;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-orientation": getDataOrientation(this.opts.orientation.current),
    [tabsAttrs.root]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class TabsListState {
  static create(opts) {
    return new TabsListState(opts, TabsRootContext.get());
  }
  opts;
  root;
  attachment;
  #isDisabled = derived(() => this.root.opts.disabled.current);
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "tablist",
    "aria-orientation": getAriaOrientation(this.root.opts.orientation.current),
    "data-orientation": getDataOrientation(this.root.opts.orientation.current),
    [tabsAttrs.list]: "",
    "data-disabled": getDataDisabled(this.#isDisabled()),
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class TabsTriggerState {
  static create(opts) {
    return new TabsTriggerState(opts, TabsRootContext.get());
  }
  opts;
  root;
  attachment;
  #tabIndex = 0;
  #isActive = derived(() => this.root.opts.value.current === this.opts.value.current);
  #isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
  #ariaControls = derived(() => this.root.valueToContentId.get(this.opts.value.current));
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(opts.ref);
    watch$1([() => this.opts.id.current, () => this.opts.value.current], ([id, value]) => {
      return this.root.registerTrigger(id, value);
    });
    this.onfocus = this.onfocus.bind(this);
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  #activate() {
    if (this.root.opts.value.current === this.opts.value.current) return;
    this.root.setValue(this.opts.value.current);
  }
  onfocus(_) {
    if (this.root.opts.activationMode.current !== "automatic" || this.#isDisabled()) return;
    this.#activate();
  }
  onclick(_) {
    if (this.#isDisabled()) return;
    this.#activate();
  }
  onkeydown(e) {
    if (this.#isDisabled()) return;
    if (e.key === SPACE || e.key === ENTER) {
      e.preventDefault();
      this.#activate();
      return;
    }
    this.root.rovingFocusGroup.handleKeydown(this.opts.ref.current, e);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "tab",
    "data-state": getTabDataState(this.#isActive()),
    "data-value": this.opts.value.current,
    "data-orientation": getDataOrientation(this.root.opts.orientation.current),
    "data-disabled": getDataDisabled(this.#isDisabled()),
    "aria-selected": getAriaSelected(this.#isActive()),
    "aria-controls": this.#ariaControls(),
    [tabsAttrs.trigger]: "",
    disabled: getDisabled(this.#isDisabled()),
    tabindex: this.#tabIndex,
    //
    onclick: this.onclick,
    onfocus: this.onfocus,
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class TabsContentState {
  static create(opts) {
    return new TabsContentState(opts, TabsRootContext.get());
  }
  opts;
  root;
  attachment;
  #isActive = derived(() => this.root.opts.value.current === this.opts.value.current);
  #ariaLabelledBy = derived(() => this.root.valueToTriggerId.get(this.opts.value.current));
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(opts.ref);
    watch$1([() => this.opts.id.current, () => this.opts.value.current], ([id, value]) => {
      return this.root.registerContent(id, value);
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "tabpanel",
    hidden: getHidden(!this.#isActive()),
    tabindex: 0,
    "data-value": this.opts.value.current,
    "data-state": getTabDataState(this.#isActive()),
    "aria-labelledby": this.#ariaLabelledBy(),
    "data-orientation": getDataOrientation(this.root.opts.orientation.current),
    [tabsAttrs.content]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function getTabDataState(condition) {
  return condition ? "active" : "inactive";
}
Tabs[FILENAME] = "node_modules/bits-ui/dist/bits/tabs/components/tabs.svelte";
function Tabs($$payload, $$props) {
  push(Tabs);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    value = "",
    onValueChange = noop,
    orientation = "horizontal",
    loop: loop2 = true,
    activationMode = "automatic",
    disabled = false,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = TabsRootState.create({
    id: box$1.with(() => id),
    value: box$1.with(() => value, (v) => {
      value = v;
      onValueChange(v);
    }),
    orientation: box$1.with(() => orientation),
    loop: box$1.with(() => loop2),
    activationMode: box$1.with(() => activationMode),
    disabled: box$1.with(() => disabled),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, rootState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 49, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref, value });
  pop();
}
Tabs.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tabs_content[FILENAME] = "node_modules/bits-ui/dist/bits/tabs/components/tabs-content.svelte";
function Tabs_content($$payload, $$props) {
  push(Tabs_content);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    ref = null,
    value,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = TabsContentState.create({
    value: box$1.with(() => value),
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, contentState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 33, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Tabs_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tabs_list[FILENAME] = "node_modules/bits-ui/dist/bits/tabs/components/tabs-list.svelte";
function Tabs_list($$payload, $$props) {
  push(Tabs_list);
  const uid = props_id($$payload);
  let {
    child,
    children,
    id = createId$1(uid),
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const listState = TabsListState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, listState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 31, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Tabs_list.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tabs_trigger[FILENAME] = "node_modules/bits-ui/dist/bits/tabs/components/tabs-trigger.svelte";
function Tabs_trigger($$payload, $$props) {
  push(Tabs_trigger);
  const uid = props_id($$payload);
  let {
    child,
    children,
    disabled = false,
    id = createId$1(uid),
    type = "button",
    value,
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const triggerState = TabsTriggerState.create({
    id: box$1.with(() => id),
    disabled: box$1.with(() => disabled ?? false),
    value: box$1.with(() => value),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, triggerState.props, { type });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 36, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Tabs_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const toggleGroupAttrs = createBitsAttrs({ component: "toggle-group", parts: ["root", "item"] });
const ToggleGroupRootContext = new Context$2("ToggleGroup.Root");
class ToggleGroupBaseState {
  opts;
  rovingFocusGroup;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(this.opts.ref);
    this.rovingFocusGroup = new RovingFocusGroup({
      candidateAttr: toggleGroupAttrs.item,
      rootNode: opts.ref,
      loop: opts.loop,
      orientation: opts.orientation
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [toggleGroupAttrs.root]: "",
    role: "group",
    "data-orientation": getDataOrientation(this.opts.orientation.current),
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class ToggleGroupSingleState extends ToggleGroupBaseState {
  opts;
  isMulti = false;
  #anyPressed = derived(() => this.opts.value.current !== "");
  get anyPressed() {
    return this.#anyPressed();
  }
  set anyPressed($$value) {
    return this.#anyPressed($$value);
  }
  constructor(opts) {
    super(opts);
    this.opts = opts;
  }
  includesItem(item) {
    return this.opts.value.current === item;
  }
  toggleItem(item, id) {
    if (this.includesItem(item)) {
      this.opts.value.current = "";
    } else {
      this.opts.value.current = item;
      this.rovingFocusGroup.setCurrentTabStopId(id);
    }
  }
}
class ToggleGroupMultipleState extends ToggleGroupBaseState {
  opts;
  isMulti = true;
  #anyPressed = derived(() => this.opts.value.current.length > 0);
  get anyPressed() {
    return this.#anyPressed();
  }
  set anyPressed($$value) {
    return this.#anyPressed($$value);
  }
  constructor(opts) {
    super(opts);
    this.opts = opts;
  }
  includesItem(item) {
    return this.opts.value.current.includes(item);
  }
  toggleItem(item, id) {
    if (this.includesItem(item)) {
      this.opts.value.current = this.opts.value.current.filter((v) => v !== item);
    } else {
      this.opts.value.current = [...this.opts.value.current, item];
      this.rovingFocusGroup.setCurrentTabStopId(id);
    }
  }
}
class ToggleGroupRootState {
  static create(opts) {
    const { type, ...rest } = opts;
    const rootState = type === "single" ? new ToggleGroupSingleState(rest) : new ToggleGroupMultipleState(rest);
    return ToggleGroupRootContext.set(rootState);
  }
}
class ToggleGroupItemState {
  static create(opts) {
    return new ToggleGroupItemState(opts, ToggleGroupRootContext.get());
  }
  opts;
  root;
  attachment;
  #isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
  #isPressed = derived(() => this.root.includesItem(this.opts.value.current));
  get isPressed() {
    return this.#isPressed();
  }
  set isPressed($$value) {
    return this.#isPressed($$value);
  }
  #ariaChecked = derived(() => {
    return this.root.isMulti ? void 0 : getAriaChecked(this.isPressed, false);
  });
  #ariaPressed = derived(() => {
    return this.root.isMulti ? getAriaPressed(this.isPressed) : void 0;
  });
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref);
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  #toggleItem() {
    if (this.#isDisabled()) return;
    this.root.toggleItem(this.opts.value.current, this.opts.id.current);
  }
  onclick(_) {
    if (this.#isDisabled()) return;
    this.root.toggleItem(this.opts.value.current, this.opts.id.current);
  }
  onkeydown(e) {
    if (this.#isDisabled()) return;
    if (e.key === ENTER || e.key === SPACE) {
      e.preventDefault();
      this.#toggleItem();
      return;
    }
    if (!this.root.opts.rovingFocus.current) return;
    this.root.rovingFocusGroup.handleKeydown(this.opts.ref.current, e);
  }
  #tabIndex = 0;
  #snippetProps = derived(() => ({ pressed: this.isPressed }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: this.root.isMulti ? void 0 : "radio",
    tabindex: this.#tabIndex,
    "data-orientation": getDataOrientation(this.root.opts.orientation.current),
    "data-disabled": getDataDisabled(this.#isDisabled()),
    "data-state": getToggleItemDataState(this.isPressed),
    "data-value": this.opts.value.current,
    "aria-pressed": this.#ariaPressed(),
    "aria-checked": this.#ariaChecked(),
    disabled: getDisabled(this.#isDisabled()),
    [toggleGroupAttrs.item]: "",
    onclick: this.onclick,
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function getToggleItemDataState(condition) {
  return condition ? "on" : "off";
}
Toggle_group[FILENAME] = "node_modules/bits-ui/dist/bits/toggle-group/components/toggle-group.svelte";
function Toggle_group($$payload, $$props) {
  push(Toggle_group);
  const uid = props_id($$payload);
  let {
    id = createId$1(uid),
    ref = null,
    value = void 0,
    onValueChange = noop,
    type,
    disabled = false,
    loop: loop2 = true,
    orientation = "horizontal",
    rovingFocus = true,
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  function handleDefaultValue() {
    if (value !== void 0) return;
    value = type === "single" ? "" : [];
  }
  handleDefaultValue();
  watch$1.pre(() => value, () => {
    handleDefaultValue();
  });
  const rootState = ToggleGroupRootState.create({
    id: box$1.with(() => id),
    value: box$1.with(() => value, (v) => {
      value = v;
      onValueChange(v);
    }),
    disabled: box$1.with(() => disabled),
    loop: box$1.with(() => loop2),
    orientation: box$1.with(() => orientation),
    rovingFocus: box$1.with(() => rovingFocus),
    type,
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, rootState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 69, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref, value });
  pop();
}
Toggle_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Toggle_group_item[FILENAME] = "node_modules/bits-ui/dist/bits/toggle-group/components/toggle-group-item.svelte";
function Toggle_group_item($$payload, $$props) {
  push(Toggle_group_item);
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    value,
    disabled = false,
    id = createId$1(uid),
    type = "button",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const itemState = ToggleGroupItemState.create({
    id: box$1.with(() => id),
    value: box$1.with(() => value),
    disabled: box$1.with(() => disabled ?? false),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, itemState.props, { type });
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...itemState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 36, 1);
    children?.($$payload, itemState.snippetProps);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Toggle_group_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const defaultOpts = {
  immediate: true
};
class TimeoutFn {
  #opts;
  #interval;
  #cb;
  #timer = null;
  constructor(cb, interval, opts = {}) {
    this.#cb = cb;
    this.#interval = interval;
    this.#opts = { ...defaultOpts, ...opts };
    this.stop = this.stop.bind(this);
    this.start = this.start.bind(this);
    if (this.#opts.immediate && BROWSER) ;
    onDestroyEffect(this.stop);
  }
  #clear() {
    if (this.#timer !== null) {
      window.clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
  stop() {
    this.#clear();
  }
  start(...args) {
    this.#clear();
    this.#timer = window.setTimeout(() => {
      this.#timer = null;
      this.#cb(...args);
    }, this.#interval);
  }
}
const tooltipAttrs = createBitsAttrs({ component: "tooltip", parts: ["content", "trigger"] });
const TooltipProviderContext = new Context$2("Tooltip.Provider");
const TooltipRootContext = new Context$2("Tooltip.Root");
class TooltipProviderState {
  static create(opts) {
    return TooltipProviderContext.set(new TooltipProviderState(opts));
  }
  opts;
  isOpenDelayed = true;
  isPointerInTransit = box$1(false);
  #timerFn;
  #openTooltip = null;
  constructor(opts) {
    this.opts = opts;
    this.#timerFn = new TimeoutFn(
      () => {
        this.isOpenDelayed = true;
      },
      this.opts.skipDelayDuration.current,
      { immediate: false }
    );
  }
  #startTimer = () => {
    const skipDuration = this.opts.skipDelayDuration.current;
    if (skipDuration === 0) {
      return;
    } else {
      this.#timerFn.start();
    }
  };
  #clearTimer = () => {
    this.#timerFn.stop();
  };
  onOpen = (tooltip) => {
    if (this.#openTooltip && this.#openTooltip !== tooltip) {
      this.#openTooltip.handleClose();
    }
    this.#clearTimer();
    this.isOpenDelayed = false;
    this.#openTooltip = tooltip;
  };
  onClose = (tooltip) => {
    if (this.#openTooltip === tooltip) {
      this.#openTooltip = null;
    }
    this.#startTimer();
  };
  isTooltipOpen = (tooltip) => {
    return this.#openTooltip === tooltip;
  };
}
class TooltipRootState {
  static create(opts) {
    return TooltipRootContext.set(new TooltipRootState(opts, TooltipProviderContext.get()));
  }
  opts;
  provider;
  #delayDuration = derived(() => this.opts.delayDuration.current ?? this.provider.opts.delayDuration.current);
  get delayDuration() {
    return this.#delayDuration();
  }
  set delayDuration($$value) {
    return this.#delayDuration($$value);
  }
  #disableHoverableContent = derived(() => this.opts.disableHoverableContent.current ?? this.provider.opts.disableHoverableContent.current);
  get disableHoverableContent() {
    return this.#disableHoverableContent();
  }
  set disableHoverableContent($$value) {
    return this.#disableHoverableContent($$value);
  }
  #disableCloseOnTriggerClick = derived(() => this.opts.disableCloseOnTriggerClick.current ?? this.provider.opts.disableCloseOnTriggerClick.current);
  get disableCloseOnTriggerClick() {
    return this.#disableCloseOnTriggerClick();
  }
  set disableCloseOnTriggerClick($$value) {
    return this.#disableCloseOnTriggerClick($$value);
  }
  #disabled = derived(() => this.opts.disabled.current ?? this.provider.opts.disabled.current);
  get disabled() {
    return this.#disabled();
  }
  set disabled($$value) {
    return this.#disabled($$value);
  }
  #ignoreNonKeyboardFocus = derived(() => this.opts.ignoreNonKeyboardFocus.current ?? this.provider.opts.ignoreNonKeyboardFocus.current);
  get ignoreNonKeyboardFocus() {
    return this.#ignoreNonKeyboardFocus();
  }
  set ignoreNonKeyboardFocus($$value) {
    return this.#ignoreNonKeyboardFocus($$value);
  }
  contentNode = null;
  triggerNode = null;
  #wasOpenDelayed = false;
  #timerFn;
  #stateAttr = derived(() => {
    if (!this.opts.open.current) return "closed";
    return this.#wasOpenDelayed ? "delayed-open" : "instant-open";
  });
  get stateAttr() {
    return this.#stateAttr();
  }
  set stateAttr($$value) {
    return this.#stateAttr($$value);
  }
  constructor(opts, provider) {
    this.opts = opts;
    this.provider = provider;
    this.#timerFn = new TimeoutFn(
      () => {
        this.#wasOpenDelayed = true;
        this.opts.open.current = true;
      },
      this.delayDuration ?? 0,
      { immediate: false }
    );
    new OpenChangeComplete({
      open: this.opts.open,
      ref: box$1.with(() => this.contentNode),
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
    watch$1(() => this.delayDuration, () => {
      if (this.delayDuration === void 0) return;
      this.#timerFn = new TimeoutFn(
        () => {
          this.#wasOpenDelayed = true;
          this.opts.open.current = true;
        },
        this.delayDuration,
        { immediate: false }
      );
    });
    watch$1(() => this.opts.open.current, (isOpen) => {
      if (isOpen) {
        this.provider.onOpen(this);
      } else {
        this.provider.onClose(this);
      }
    });
  }
  handleOpen = () => {
    this.#timerFn.stop();
    this.#wasOpenDelayed = false;
    this.opts.open.current = true;
  };
  handleClose = () => {
    this.#timerFn.stop();
    this.opts.open.current = false;
  };
  #handleDelayedOpen = () => {
    this.#timerFn.stop();
    const shouldSkipDelay = !this.provider.isOpenDelayed;
    const delayDuration = this.delayDuration ?? 0;
    if (shouldSkipDelay || delayDuration === 0) {
      this.#wasOpenDelayed = delayDuration > 0 && shouldSkipDelay;
      this.opts.open.current = true;
    } else {
      this.#timerFn.start();
    }
  };
  onTriggerEnter = () => {
    this.#handleDelayedOpen();
  };
  onTriggerLeave = () => {
    if (this.disableHoverableContent) {
      this.handleClose();
    } else {
      this.#timerFn.stop();
    }
  };
}
class TooltipTriggerState {
  static create(opts) {
    return new TooltipTriggerState(opts, TooltipRootContext.get());
  }
  opts;
  root;
  attachment;
  #isPointerDown = box$1(false);
  #hasPointerMoveOpened = false;
  #isDisabled = derived(() => this.opts.disabled.current || this.root.disabled);
  domContext;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.domContext = new DOMContext(opts.ref);
    this.attachment = attachRef(this.opts.ref, (v) => this.root.triggerNode = v);
  }
  handlePointerUp = () => {
    this.#isPointerDown.current = false;
  };
  #onpointerup = () => {
    if (this.#isDisabled()) return;
    this.#isPointerDown.current = false;
  };
  #onpointerdown = () => {
    if (this.#isDisabled()) return;
    this.#isPointerDown.current = true;
    this.domContext.getDocument().addEventListener(
      "pointerup",
      () => {
        this.handlePointerUp();
      },
      { once: true }
    );
  };
  #onpointermove = (e) => {
    if (this.#isDisabled()) return;
    if (e.pointerType === "touch") return;
    if (this.#hasPointerMoveOpened) return;
    if (this.root.provider.isPointerInTransit.current) return;
    this.root.onTriggerEnter();
    this.#hasPointerMoveOpened = true;
  };
  #onpointerleave = () => {
    if (this.#isDisabled()) return;
    this.root.onTriggerLeave();
    this.#hasPointerMoveOpened = false;
  };
  #onfocus = (e) => {
    if (this.#isPointerDown.current || this.#isDisabled()) return;
    if (this.root.ignoreNonKeyboardFocus && !isFocusVisible(e.currentTarget)) return;
    this.root.handleOpen();
  };
  #onblur = () => {
    if (this.#isDisabled()) return;
    this.root.handleClose();
  };
  #onclick = () => {
    if (this.root.disableCloseOnTriggerClick || this.#isDisabled()) return;
    this.root.handleClose();
  };
  #props = derived(() => ({
    id: this.opts.id.current,
    "aria-describedby": this.root.opts.open.current ? this.root.contentNode?.id : void 0,
    "data-state": this.root.stateAttr,
    "data-disabled": getDataDisabled(this.#isDisabled()),
    "data-delay-duration": `${this.root.delayDuration}`,
    [tooltipAttrs.trigger]: "",
    tabindex: this.#isDisabled() ? void 0 : 0,
    disabled: this.opts.disabled.current,
    onpointerup: this.#onpointerup,
    onpointerdown: this.#onpointerdown,
    onpointermove: this.#onpointermove,
    onpointerleave: this.#onpointerleave,
    onfocus: this.#onfocus,
    onblur: this.#onblur,
    onclick: this.#onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class TooltipContentState {
  static create(opts) {
    return new TooltipContentState(opts, TooltipRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root2) {
    this.opts = opts;
    this.root = root2;
    this.attachment = attachRef(this.opts.ref, (v) => this.root.contentNode = v);
    new GraceArea({
      triggerNode: () => this.root.triggerNode,
      contentNode: () => this.root.contentNode,
      enabled: () => this.root.opts.open.current && !this.root.disableHoverableContent,
      onPointerExit: () => {
        if (this.root.provider.isTooltipOpen(this.root)) {
          this.root.handleClose();
        }
      },
      setIsPointerInTransit: (value) => {
        this.root.provider.isPointerInTransit.current = value;
      },
      transitTimeout: this.root.provider.opts.skipDelayDuration.current
    });
  }
  onInteractOutside = (e) => {
    if (isElement(e.target) && this.root.triggerNode?.contains(e.target) && this.root.disableCloseOnTriggerClick) {
      e.preventDefault();
      return;
    }
    this.opts.onInteractOutside.current(e);
    if (e.defaultPrevented) return;
    this.root.handleClose();
  };
  onEscapeKeydown = (e) => {
    this.opts.onEscapeKeydown.current?.(e);
    if (e.defaultPrevented) return;
    this.root.handleClose();
  };
  onOpenAutoFocus = (e) => {
    e.preventDefault();
  };
  onCloseAutoFocus = (e) => {
    e.preventDefault();
  };
  #snippetProps = derived(() => ({ open: this.root.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-state": this.root.stateAttr,
    "data-disabled": getDataDisabled(this.root.disabled),
    style: { pointerEvents: "auto", outline: "none" },
    [tooltipAttrs.content]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  popperProps = {
    onInteractOutside: this.onInteractOutside,
    onEscapeKeydown: this.onEscapeKeydown,
    onOpenAutoFocus: this.onOpenAutoFocus,
    onCloseAutoFocus: this.onCloseAutoFocus
  };
}
Tooltip$1[FILENAME] = "node_modules/bits-ui/dist/bits/tooltip/components/tooltip.svelte";
function Tooltip$1($$payload, $$props) {
  push(Tooltip$1);
  let {
    open = false,
    onOpenChange = noop,
    onOpenChangeComplete = noop,
    disabled,
    delayDuration,
    disableCloseOnTriggerClick,
    disableHoverableContent,
    ignoreNonKeyboardFocus,
    children
  } = $$props;
  TooltipRootState.create({
    open: box$1.with(() => open, (v) => {
      open = v;
      onOpenChange(v);
    }),
    delayDuration: box$1.with(() => delayDuration),
    disableCloseOnTriggerClick: box$1.with(() => disableCloseOnTriggerClick),
    disableHoverableContent: box$1.with(() => disableHoverableContent),
    ignoreNonKeyboardFocus: box$1.with(() => ignoreNonKeyboardFocus),
    disabled: box$1.with(() => disabled),
    onOpenChangeComplete: box$1.with(() => onOpenChangeComplete)
  });
  Floating_layer($$payload, {
    tooltip: true,
    children: prevent_snippet_stringification(($$payload2) => {
      children?.($$payload2);
      $$payload2.out.push(`<!---->`);
    })
  });
  bind_props($$props, { open });
  pop();
}
Tooltip$1.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tooltip_content[FILENAME] = "node_modules/bits-ui/dist/bits/tooltip/components/tooltip-content.svelte";
function Tooltip_content($$payload, $$props) {
  push(Tooltip_content);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    ref = null,
    side = "top",
    sideOffset = 0,
    align = "center",
    avoidCollisions = true,
    arrowPadding = 0,
    sticky = "partial",
    hideWhenDetached = false,
    collisionPadding = 0,
    onInteractOutside = noop,
    onEscapeKeydown = noop,
    forceMount = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = TooltipContentState.create({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    onInteractOutside: box$1.with(() => onInteractOutside),
    onEscapeKeydown: box$1.with(() => onEscapeKeydown)
  });
  const floatingProps = {
    side,
    sideOffset,
    align,
    avoidCollisions,
    arrowPadding,
    sticky,
    hideWhenDetached,
    collisionPadding
  };
  const mergedProps = mergeProps$1(restProps, floatingProps, contentState.props);
  if (forceMount) {
    $$payload.out.push("<!--[-->");
    {
      let popper = function($$payload2, { props, wrapperProps }) {
        validate_snippet_args($$payload2);
        const mergedProps2 = mergeProps$1(props, { style: getFloatingContentCSSVars("tooltip") });
        if (child) {
          $$payload2.out.push("<!--[-->");
          child($$payload2, {
            props: mergedProps2,
            wrapperProps,
            ...contentState.snippetProps
          });
          $$payload2.out.push(`<!---->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
          push_element($$payload2, "div", 76, 4);
          $$payload2.out.push(`<div${spread_attributes({ ...mergedProps2 }, null)}>`);
          push_element($$payload2, "div", 77, 5);
          children?.($$payload2);
          $$payload2.out.push(`<!----></div>`);
          pop_element();
          $$payload2.out.push(`</div>`);
          pop_element();
        }
        $$payload2.out.push(`<!--]-->`);
      };
      prevent_snippet_stringification(popper);
      Popper_layer_force_mount($$payload, spread_props([
        mergedProps,
        contentState.popperProps,
        {
          enabled: contentState.root.opts.open.current,
          id,
          trapFocus: false,
          loop: false,
          preventScroll: false,
          forceMount: true,
          ref: contentState.opts.ref,
          tooltip: true,
          popper,
          $$slots: { popper: true }
        }
      ]));
    }
  } else {
    $$payload.out.push("<!--[!-->");
    if (!forceMount) {
      $$payload.out.push("<!--[-->");
      {
        let popper = function($$payload2, { props, wrapperProps }) {
          validate_snippet_args($$payload2);
          const mergedProps2 = mergeProps$1(props, { style: getFloatingContentCSSVars("tooltip") });
          if (child) {
            $$payload2.out.push("<!--[-->");
            child($$payload2, {
              props: mergedProps2,
              wrapperProps,
              ...contentState.snippetProps
            });
            $$payload2.out.push(`<!---->`);
          } else {
            $$payload2.out.push("<!--[!-->");
            $$payload2.out.push(`<div${spread_attributes({ ...wrapperProps }, null)}>`);
            push_element($$payload2, "div", 104, 4);
            $$payload2.out.push(`<div${spread_attributes({ ...mergedProps2 }, null)}>`);
            push_element($$payload2, "div", 105, 5);
            children?.($$payload2);
            $$payload2.out.push(`<!----></div>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
          }
          $$payload2.out.push(`<!--]-->`);
        };
        prevent_snippet_stringification(popper);
        Popper_layer($$payload, spread_props([
          mergedProps,
          contentState.popperProps,
          {
            open: contentState.root.opts.open.current,
            id,
            trapFocus: false,
            loop: false,
            preventScroll: false,
            forceMount: false,
            ref: contentState.opts.ref,
            tooltip: true,
            popper,
            $$slots: { popper: true }
          }
        ]));
      }
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Tooltip_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tooltip_trigger[FILENAME] = "node_modules/bits-ui/dist/bits/tooltip/components/tooltip-trigger.svelte";
function Tooltip_trigger($$payload, $$props) {
  push(Tooltip_trigger);
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId$1(uid),
    disabled = false,
    type = "button",
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const triggerState = TooltipTriggerState.create({
    id: box$1.with(() => id),
    disabled: box$1.with(() => disabled ?? false),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps$1(restProps, triggerState.props, { type });
  Floating_layer_anchor($$payload, {
    id,
    ref: triggerState.opts.ref,
    tooltip: true,
    children: prevent_snippet_stringification(($$payload2) => {
      if (child) {
        $$payload2.out.push("<!--[-->");
        child($$payload2, { props: mergedProps });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
        push_element($$payload2, "button", 36, 2);
        children?.($$payload2);
        $$payload2.out.push(`<!----></button>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    })
  });
  bind_props($$props, { ref });
  pop();
}
Tooltip_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tooltip_arrow[FILENAME] = "node_modules/bits-ui/dist/bits/tooltip/components/tooltip-arrow.svelte";
function Tooltip_arrow($$payload, $$props) {
  push(Tooltip_arrow);
  let { ref = null, $$slots, $$events, ...restProps } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Floating_layer_arrow($$payload2, spread_props([
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Tooltip_arrow.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tooltip_provider[FILENAME] = "node_modules/bits-ui/dist/bits/tooltip/components/tooltip-provider.svelte";
function Tooltip_provider($$payload, $$props) {
  push(Tooltip_provider);
  let {
    children,
    delayDuration = 700,
    disableCloseOnTriggerClick = false,
    disableHoverableContent = false,
    disabled = false,
    ignoreNonKeyboardFocus = false,
    skipDelayDuration = 300
  } = $$props;
  TooltipProviderState.create({
    delayDuration: box$1.with(() => delayDuration),
    disableCloseOnTriggerClick: box$1.with(() => disableCloseOnTriggerClick),
    disableHoverableContent: box$1.with(() => disableHoverableContent),
    disabled: box$1.with(() => disabled),
    ignoreNonKeyboardFocus: box$1.with(() => ignoreNonKeyboardFocus),
    skipDelayDuration: box$1.with(() => skipDelayDuration)
  });
  children?.($$payload);
  $$payload.out.push(`<!---->`);
  pop();
}
Tooltip_provider.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
let isUsingKeyboard = false;
class IsUsingKeyboard {
  static _refs = 0;
  // Reference counting to avoid multiple listeners.
  static _cleanup;
  constructor() {
  }
  get current() {
    return isUsingKeyboard;
  }
  set current(value) {
    isUsingKeyboard = value;
  }
}
function isFunction(value) {
  return typeof value === "function";
}
function isObject(value) {
  return value !== null && typeof value === "object";
}
const CLASS_VALUE_PRIMITIVE_TYPES = ["string", "number", "bigint", "boolean"];
function isClassValue(value) {
  if (value === null || value === void 0)
    return true;
  if (CLASS_VALUE_PRIMITIVE_TYPES.includes(typeof value))
    return true;
  if (Array.isArray(value))
    return value.every((item) => isClassValue(item));
  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype)
      return false;
    return true;
  }
  return false;
}
const BoxSymbol = Symbol("box");
const isWritableSymbol = Symbol("is-writable");
function isBox(value) {
  return isObject(value) && BoxSymbol in value;
}
function isWritableBox(value) {
  return box.isBox(value) && isWritableSymbol in value;
}
function box(initialValue) {
  let current = initialValue;
  return {
    [BoxSymbol]: true,
    [isWritableSymbol]: true,
    get current() {
      return current;
    },
    set current(v) {
      current = v;
    }
  };
}
function boxWith(getter, setter) {
  const derived2 = getter();
  if (setter) {
    return {
      [BoxSymbol]: true,
      [isWritableSymbol]: true,
      get current() {
        return derived2;
      },
      set current(v) {
        setter(v);
      }
    };
  }
  return {
    [BoxSymbol]: true,
    get current() {
      return getter();
    }
  };
}
function boxFrom(value) {
  if (box.isBox(value)) return value;
  if (isFunction(value)) return box.with(value);
  return box(value);
}
function boxFlatten(boxes) {
  return Object.entries(boxes).reduce(
    (acc, [key2, b]) => {
      if (!box.isBox(b)) {
        return Object.assign(acc, { [key2]: b });
      }
      if (box.isWritableBox(b)) {
        Object.defineProperty(acc, key2, {
          get() {
            return b.current;
          },
          // eslint-disable-next-line ts/no-explicit-any
          set(v) {
            b.current = v;
          }
        });
      } else {
        Object.defineProperty(acc, key2, {
          get() {
            return b.current;
          }
        });
      }
      return acc;
    },
    {}
  );
}
function toReadonlyBox(b) {
  if (!box.isWritableBox(b)) return b;
  return {
    [BoxSymbol]: true,
    get current() {
      return b.current;
    }
  };
}
box.from = boxFrom;
box.with = boxWith;
box.flatten = boxFlatten;
box.readonly = toReadonlyBox;
box.isBox = isBox;
box.isWritableBox = isWritableBox;
function composeHandlers(...handlers) {
  return function(e) {
    for (const handler of handlers) {
      if (!handler)
        continue;
      if (e.defaultPrevented)
        return;
      if (typeof handler === "function") {
        handler.call(this, e);
      } else {
        handler.current?.call(this, e);
      }
    }
  };
}
const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char))
    return void 0;
  return char !== char.toLowerCase();
}
function splitByCase(str) {
  const parts = [];
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = STR_SPLITTERS.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function pascalCase(str) {
  if (!str)
    return "";
  return splitByCase(str).map((p2) => upperFirst(p2)).join("");
}
function camelCase(str) {
  return lowerFirst(pascalCase(str || ""));
}
function upperFirst(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function lowerFirst(str) {
  return str ? str[0].toLowerCase() + str.slice(1) : "";
}
function cssToStyleObj(css) {
  if (!css)
    return {};
  const styleObj = {};
  function iterator(name, value) {
    if (name.startsWith("-moz-") || name.startsWith("-webkit-") || name.startsWith("-ms-") || name.startsWith("-o-")) {
      styleObj[pascalCase(name)] = value;
      return;
    }
    if (name.startsWith("--")) {
      styleObj[name] = value;
      return;
    }
    styleObj[camelCase(name)] = value;
  }
  parse$1(css, iterator);
  return styleObj;
}
function executeCallbacks(...callbacks) {
  return (...args) => {
    for (const callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}
function createParser(matcher, replacer) {
  const regex = RegExp(matcher, "g");
  return (str) => {
    if (typeof str !== "string") {
      throw new TypeError(`expected an argument of type string, but got ${typeof str}`);
    }
    if (!str.match(regex))
      return str;
    return str.replace(regex, replacer);
  };
}
const camelToKebab = createParser(/[A-Z]/, (match) => `-${match.toLowerCase()}`);
function styleToCSS(styleObj) {
  if (!styleObj || typeof styleObj !== "object" || Array.isArray(styleObj)) {
    throw new TypeError(`expected an argument of type object, but got ${typeof styleObj}`);
  }
  return Object.keys(styleObj).map((property) => `${camelToKebab(property)}: ${styleObj[property]};`).join("\n");
}
function styleToString(style = {}) {
  return styleToCSS(style).replace("\n", " ");
}
const srOnlyStyles = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: "0",
  transform: "translateX(-100%)"
};
styleToString(srOnlyStyles);
function isEventHandler(key2) {
  return key2.length > 2 && key2.startsWith("on") && key2[2] === key2[2]?.toLowerCase();
}
function mergeProps(...args) {
  const result = { ...args[0] };
  for (let i = 1; i < args.length; i++) {
    const props = args[i];
    for (const key2 in props) {
      const a = result[key2];
      const b = props[key2];
      const aIsFunction = typeof a === "function";
      const bIsFunction = typeof b === "function";
      if (aIsFunction && typeof bIsFunction && isEventHandler(key2)) {
        const aHandler = a;
        const bHandler = b;
        result[key2] = composeHandlers(aHandler, bHandler);
      } else if (aIsFunction && bIsFunction) {
        result[key2] = executeCallbacks(a, b);
      } else if (key2 === "class") {
        const aIsClassValue = isClassValue(a);
        const bIsClassValue = isClassValue(b);
        if (aIsClassValue && bIsClassValue) {
          result[key2] = clsx$1(a, b);
        } else if (aIsClassValue) {
          result[key2] = clsx$1(a);
        } else if (bIsClassValue) {
          result[key2] = clsx$1(b);
        }
      } else if (key2 === "style") {
        const aIsObject = typeof a === "object";
        const bIsObject = typeof b === "object";
        const aIsString = typeof a === "string";
        const bIsString = typeof b === "string";
        if (aIsObject && bIsObject) {
          result[key2] = { ...a, ...b };
        } else if (aIsObject && bIsString) {
          const parsedStyle = cssToStyleObj(b);
          result[key2] = { ...a, ...parsedStyle };
        } else if (aIsString && bIsObject) {
          const parsedStyle = cssToStyleObj(a);
          result[key2] = { ...parsedStyle, ...b };
        } else if (aIsString && bIsString) {
          const parsedStyleA = cssToStyleObj(a);
          const parsedStyleB = cssToStyleObj(b);
          result[key2] = { ...parsedStyleA, ...parsedStyleB };
        } else if (aIsObject) {
          result[key2] = a;
        } else if (bIsObject) {
          result[key2] = b;
        } else if (aIsString) {
          result[key2] = a;
        } else if (bIsString) {
          result[key2] = b;
        }
      } else {
        result[key2] = b !== void 0 ? b : a;
      }
    }
  }
  if (typeof result.style === "object") {
    result.style = styleToString(result.style).replaceAll("\n", " ");
  }
  if (result.hidden !== true) {
    result.hidden = void 0;
    delete result.hidden;
  }
  if (result.disabled !== true) {
    result.disabled = void 0;
    delete result.disabled;
  }
  return result;
}
function useRefById({
  id,
  ref,
  deps = () => true,
  onRefChange = () => {
  },
  getRootNode = () => typeof document !== "undefined" ? document : void 0
}) {
  (() => deps())();
  (() => getRootNode())();
}
function useOnChange(getDep, onChange) {
  getDep();
}
function extractErrorArray(errors) {
  if (Array.isArray(errors))
    return [...errors];
  if (typeof errors === "object" && "_errors" in errors) {
    if (errors._errors !== void 0)
      return [...errors._errors];
  }
  return [];
}
function getValueAtPath(path2, obj) {
  const keys = path2.split(/[[\].]/).filter(Boolean);
  let value = obj;
  for (const key2 of keys) {
    if (typeof value !== "object" || value === null) {
      return void 0;
    }
    value = value[key2];
  }
  return value;
}
function getAriaDescribedBy({ fieldErrorsId = void 0, descriptionId = void 0, errors }) {
  let describedBy = "";
  if (descriptionId) {
    describedBy += `${descriptionId} `;
  }
  if (errors.length && fieldErrorsId) {
    describedBy += fieldErrorsId;
  }
  return describedBy ? describedBy.trim() : void 0;
}
function getAriaRequired(constraints) {
  if (!("required" in constraints))
    return void 0;
  return constraints.required ? "true" : void 0;
}
function getAriaInvalid(errors) {
  return errors && errors.length ? "true" : void 0;
}
function getDataFsError(errors) {
  return errors && errors.length ? "" : void 0;
}
let count = 0;
function useId(prefix = "formsnap") {
  count++;
  return `${prefix}-${count}`;
}
class FormFieldState {
  #name;
  #formErrors;
  #formConstraints;
  #formTainted;
  #formData;
  form;
  #_name = derived(() => this.#name.current);
  get name() {
    return this.#_name();
  }
  set name($$value) {
    return this.#_name($$value);
  }
  #errors = derived(() => extractErrorArray(getValueAtPath(this.#name.current, structuredClone(this.#formErrors.current))));
  get errors() {
    return this.#errors();
  }
  set errors($$value) {
    return this.#errors($$value);
  }
  #constraints = derived(() => getValueAtPath(this.#name.current, structuredClone(this.#formConstraints.current)) ?? {});
  get constraints() {
    return this.#constraints();
  }
  set constraints($$value) {
    return this.#constraints($$value);
  }
  #tainted = derived(() => this.#formTainted.current ? getValueAtPath(this.#name.current, structuredClone(this.#formTainted.current)) === true : false);
  get tainted() {
    return this.#tainted();
  }
  set tainted($$value) {
    return this.#tainted($$value);
  }
  errorNode = null;
  descriptionNode = null;
  errorId;
  descriptionId;
  constructor(props) {
    this.#name = props.name;
    this.form = props.form.current;
    this.#formErrors = fromStore(props.form.current.errors);
    this.#formConstraints = fromStore(props.form.current.constraints);
    this.#formTainted = fromStore(props.form.current.tainted);
    this.#formData = fromStore(props.form.current.form);
  }
  #snippetProps = derived(() => ({
    value: this.#formData.current[this.#name.current],
    errors: this.errors,
    tainted: this.tainted,
    constraints: this.constraints
  }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
}
class FieldErrorsState {
  #ref;
  #id;
  field;
  #errorAttr = derived(() => getDataFsError(this.field.errors));
  constructor(props, field) {
    this.#ref = props.ref;
    this.#id = props.id;
    this.field = field;
    useRefById({
      id: this.#id,
      ref: this.#ref,
      onRefChange: (node) => {
        this.field.errorNode = node;
      }
    });
  }
  #snippetProps = derived(() => ({ errors: this.field.errors, errorProps: this.errorProps }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #fieldErrorsProps = derived(() => ({
    id: this.#id.current,
    "data-fs-error": this.#errorAttr(),
    "data-fs-field-errors": "",
    "aria-live": "assertive"
  }));
  get fieldErrorsProps() {
    return this.#fieldErrorsProps();
  }
  set fieldErrorsProps($$value) {
    return this.#fieldErrorsProps($$value);
  }
  #errorProps = derived(() => ({
    "data-fs-field-error": "",
    "data-fs-error": this.#errorAttr()
  }));
  get errorProps() {
    return this.#errorProps();
  }
  set errorProps($$value) {
    return this.#errorProps($$value);
  }
}
class ControlState {
  #id;
  field;
  labelId = box(useId());
  id = useId();
  constructor(props, field) {
    this.#id = props.id;
    this.field = field;
    useOnChange(() => this.#id.current);
  }
  #props = derived(() => ({
    id: this.id,
    name: this.field.name,
    "data-fs-error": getDataFsError(this.field.errors),
    "aria-describedby": getAriaDescribedBy({
      fieldErrorsId: this.field.errorId,
      descriptionId: this.field.descriptionId,
      errors: this.field.errors
    }),
    "aria-invalid": getAriaInvalid(this.field.errors),
    "aria-required": getAriaRequired(this.field.constraints),
    "data-fs-control": ""
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  #labelProps = derived(() => ({
    id: this.labelId.current,
    "data-fs-label": "",
    "data-fs-error": getDataFsError(this.field.errors),
    for: this.id
  }));
  get labelProps() {
    return this.#labelProps();
  }
  set labelProps($$value) {
    return this.#labelProps($$value);
  }
}
class LabelState {
  #ref;
  #id;
  control;
  constructor(props, control) {
    this.#ref = props.ref;
    this.#id = props.id;
    this.control = control;
    this.control.labelId = this.#id;
    useRefById({ id: this.#id, ref: this.#ref });
  }
  get props() {
    return this.control.labelProps;
  }
}
const FORM_FIELD_CTX = Symbol.for("formsnap.form-field");
const FORM_CONTROL_CTX = Symbol.for("formsnap.form-control");
function useField(props) {
  return setContext(FORM_FIELD_CTX, new FormFieldState(props));
}
function getField() {
  return getContext(FORM_FIELD_CTX);
}
function useFieldErrors(props) {
  return new FieldErrorsState(props, getField());
}
function useControl(props) {
  return setContext(FORM_CONTROL_CTX, new ControlState(props, getField()));
}
function _getFormControl() {
  return getContext(FORM_CONTROL_CTX);
}
function useLabel(props) {
  return new LabelState(props, _getFormControl());
}
Field[FILENAME] = "node_modules/formsnap/dist/components/field.svelte";
function Field($$payload, $$props) {
  push(Field);
  let { form: form2, name, children } = $$props;
  const fieldState = useField({ form: box.with(() => form2), name: box.with(() => name) });
  children?.($$payload, fieldState.snippetProps);
  $$payload.out.push(`<!---->`);
  pop();
}
Field.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Control[FILENAME] = "node_modules/formsnap/dist/components/control.svelte";
function Control($$payload, $$props) {
  push(Control);
  let { id = useId(), children } = $$props;
  const controlState = useControl({ id: box.with(() => id) });
  children?.($$payload, { props: controlState.props });
  $$payload.out.push(`<!---->`);
  pop();
}
Control.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Label[FILENAME] = "node_modules/formsnap/dist/components/label.svelte";
function Label($$payload, $$props) {
  push(Label);
  let {
    id = useId(),
    ref = null,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const labelState = useLabel({
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, labelState.props);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<label${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "label", 51, 1);
    children?.($$payload);
    $$payload.out.push(`<!----></label>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Label.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Field_errors[FILENAME] = "node_modules/formsnap/dist/components/field-errors.svelte";
function Field_errors($$payload, $$props) {
  push(Field_errors);
  let {
    id = useId(),
    ref = null,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const fieldErrorsState = useFieldErrors({
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, fieldErrorsState.fieldErrorsProps);
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps, ...fieldErrorsState.snippetProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 46, 1);
    if (children) {
      $$payload.out.push("<!--[-->");
      children($$payload, fieldErrorsState.snippetProps);
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      const each_array = ensure_array_like(fieldErrorsState.field.errors);
      $$payload.out.push(`<!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let error2 = each_array[$$index];
        $$payload.out.push(`<div${spread_attributes({ ...fieldErrorsState.errorProps }, null)}>`);
        push_element($$payload, "div", 51, 4);
        $$payload.out.push(`${escape_html(error2)}</div>`);
        pop_element();
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]--></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Field_errors.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function create_updated_store() {
  const { set: set2, subscribe } = writable(false);
  {
    return {
      subscribe,
      // eslint-disable-next-line @typescript-eslint/require-await
      check: async () => false
    };
  }
}
const is_legacy = noop$1.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop$1.toString());
if (is_legacy) {
  ({
    data: {},
    form: null,
    error: null,
    params: {},
    route: { id: null },
    state: {},
    status: -1,
    url: new URL("https://example.com")
  });
}
const stores = {
  updated: /* @__PURE__ */ create_updated_store()
};
function goto(url, opts = {}) {
  {
    throw new Error("Cannot call goto(...) on the server");
  }
}
function invalidateAll() {
  {
    throw new Error("Cannot call invalidateAll() on the server");
  }
}
async function applyAction(result) {
  {
    throw new Error("Cannot call applyAction(...) on the server");
  }
}
{
  const console_warn = console.warn;
  console.warn = function warn(...args) {
    if (args.length === 1 && /<(Layout|Page|Error)(_[\w$]+)?> was created (with unknown|without expected) prop '(data|form)'/.test(
      args[0]
    )) {
      return;
    }
    console_warn(...args);
  };
}
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page$2 = {
  subscribe(fn) {
    const store = get_store("page");
    return store.subscribe(fn);
  }
};
const navigating = {
  subscribe(fn) {
    const store = get_store("navigating");
    return store.subscribe(fn);
  }
};
function get_store(name) {
  try {
    return getStores()[name];
  } catch {
    throw new Error(
      `Cannot subscribe to '${name}' store on the server outside of a Svelte component, as it is bound to the current request via component context. This prevents state from leaking between users.For more information, see https://svelte.dev/docs/kit/state-management#avoid-shared-state-on-the-server`
    );
  }
}
function deserialize(result) {
  const parsed = JSON.parse(result);
  if (parsed.data) {
    parsed.data = devalue.parse(parsed.data, app.decoders);
  }
  return parsed;
}
function clone(element2) {
  return (
    /** @type {T} */
    HTMLElement.prototype.cloneNode.call(element2)
  );
}
function enhance(form_element, submit = () => {
}) {
  if (clone(form_element).method !== "post") {
    throw new Error('use:enhance can only be used on <form> fields with method="POST"');
  }
  const fallback_callback = async ({
    action,
    result,
    reset: reset2 = true,
    invalidateAll: shouldInvalidateAll = true
  }) => {
    if (result.type === "success") {
      if (reset2) {
        HTMLFormElement.prototype.reset.call(form_element);
      }
      if (shouldInvalidateAll) {
        await invalidateAll();
      }
    }
    if (location.origin + location.pathname === action.origin + action.pathname || result.type === "redirect" || result.type === "error") {
      await applyAction();
    }
  };
  async function handle_submit(event) {
    const method = event.submitter?.hasAttribute("formmethod") ? (
      /** @type {HTMLButtonElement | HTMLInputElement} */
      event.submitter.formMethod
    ) : clone(form_element).method;
    if (method !== "post") return;
    event.preventDefault();
    const action = new URL(
      // We can't do submitter.formAction directly because that property is always set
      event.submitter?.hasAttribute("formaction") ? (
        /** @type {HTMLButtonElement | HTMLInputElement} */
        event.submitter.formAction
      ) : clone(form_element).action
    );
    const enctype = event.submitter?.hasAttribute("formenctype") ? (
      /** @type {HTMLButtonElement | HTMLInputElement} */
      event.submitter.formEnctype
    ) : clone(form_element).enctype;
    const form_data = new FormData(form_element);
    if (enctype !== "multipart/form-data") {
      for (const value of form_data.values()) {
        if (value instanceof File) {
          throw new Error(
            'Your form contains <input type="file"> fields, but is missing the necessary `enctype="multipart/form-data"` attribute. This will lead to inconsistent behavior between enhanced and native forms. For more details, see https://github.com/sveltejs/kit/issues/9819.'
          );
        }
      }
    }
    const submitter_name = event.submitter?.getAttribute("name");
    if (submitter_name) {
      form_data.append(submitter_name, event.submitter?.getAttribute("value") ?? "");
    }
    const controller2 = new AbortController();
    let cancelled = false;
    const cancel = () => cancelled = true;
    const callback = await submit({
      action,
      cancel,
      controller: controller2,
      formData: form_data,
      formElement: form_element,
      submitter: event.submitter
    }) ?? fallback_callback;
    if (cancelled) return;
    let result;
    try {
      const headers2 = new Headers({
        accept: "application/json",
        "x-sveltekit-action": "true"
      });
      if (enctype !== "multipart/form-data") {
        headers2.set(
          "Content-Type",
          /^(:?application\/x-www-form-urlencoded|text\/plain)$/.test(enctype) ? enctype : "application/x-www-form-urlencoded"
        );
      }
      const body2 = enctype === "multipart/form-data" ? form_data : new URLSearchParams(form_data);
      const response = await fetch(action, {
        method: "POST",
        headers: headers2,
        cache: "no-store",
        body: body2,
        signal: controller2.signal
      });
      result = deserialize(await response.text());
      if (result.type === "error") result.status = response.status;
    } catch (error2) {
      if (
        /** @type {any} */
        error2?.name === "AbortError"
      ) return;
      result = { type: "error", error: error2 };
    }
    await callback({
      action,
      formData: form_data,
      formElement: form_element,
      update: (opts) => fallback_callback({
        action,
        result,
        reset: opts?.reset,
        invalidateAll: opts?.invalidateAll
      }),
      // @ts-expect-error generic constraints stuff we don't care about
      result
    });
  }
  HTMLFormElement.prototype.addEventListener.call(form_element, "submit", handle_submit);
  return {
    destroy() {
      HTMLFormElement.prototype.removeEventListener.call(form_element, "submit", handle_submit);
    }
  };
}
({
  check: stores.updated.check
});
function context() {
  return getContext("__request__");
}
function context_dev(name) {
  try {
    return context();
  } catch {
    throw new Error(
      `Can only read '${name}' on the server during rendering (not in e.g. \`load\` functions), as it is bound to the current request via component context. This prevents state from leaking between users.For more information, see https://svelte.dev/docs/kit/state-management#avoid-shared-state-on-the-server`
    );
  }
}
const page$1 = {
  get data() {
    return context_dev("page.data").page.data;
  },
  get error() {
    return context_dev("page.error").page.error;
  },
  get status() {
    return context_dev("page.status").page.status;
  }
};
const page = page$1;
const defaultWindow$1 = void 0;
function getActiveElement$1(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
let ActiveElement$1 = class ActiveElement3 {
  #document;
  #subscribe;
  constructor(options2 = {}) {
    const { window: window2 = defaultWindow$1, document: document2 = window2?.document } = options2;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement$1(this.#document);
  }
};
new ActiveElement$1();
let Context$1 = class Context2 {
  #name;
  #key;
  /**
   * @param name The name of the context.
   * This is used for generating the context key and error messages.
   */
  constructor(name) {
    this.#name = name;
    this.#key = Symbol(name);
  }
  /**
   * The key used to get and set the context.
   *
   * It is not recommended to use this value directly.
   * Instead, use the methods provided by this class.
   */
  get key() {
    return this.#key;
  }
  /**
   * Checks whether this has been set in the context of a parent component.
   *
   * Must be called during component initialisation.
   */
  exists() {
    return hasContext(this.#key);
  }
  /**
   * Retrieves the context that belongs to the closest parent component.
   *
   * Must be called during component initialisation.
   *
   * @throws An error if the context does not exist.
   */
  get() {
    const context2 = getContext(this.#key);
    if (context2 === void 0) {
      throw new Error(`Context "${this.#name}" not found`);
    }
    return context2;
  }
  /**
   * Retrieves the context that belongs to the closest parent component,
   * or the given fallback value if the context does not exist.
   *
   * Must be called during component initialisation.
   */
  getOr(fallback) {
    const context2 = getContext(this.#key);
    if (context2 === void 0) {
      return fallback;
    }
    return context2;
  }
  /**
   * Associates the given value with the current component and returns it.
   *
   * Must be called during component initialisation.
   */
  set(context2) {
    return setContext(this.#key, context2);
  }
};
Error$1[FILENAME] = "node_modules/@sveltejs/kit/src/runtime/components/svelte-5/error.svelte";
function Error$1($$payload, $$props) {
  push(Error$1);
  $$payload.out.push(`<h1>`);
  push_element($$payload, "h1", 5, 0);
  $$payload.out.push(`${escape_html(page.status)}</h1>`);
  pop_element();
  $$payload.out.push(` <p>`);
  push_element($$payload, "p", 6, 0);
  $$payload.out.push(`${escape_html(page.error?.message)}</p>`);
  pop_element();
  pop();
}
Error$1.render = function() {
  throw new Error$1("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}
function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}
function cartesianToPolar(x, y) {
  let radians = Math.atan2(y, x);
  radians += Math.PI / 2;
  if (radians < 0) {
    radians += 2 * Math.PI;
  }
  return {
    radius: Math.sqrt(x ** 2 + y ** 2),
    radians
  };
}
function accessor(prop) {
  if (Array.isArray(prop)) {
    return (d) => prop.map((p2) => accessor(p2)(d));
  } else if (typeof prop === "function") {
    return prop;
  } else if (typeof prop === "string" || typeof prop === "number") {
    return (d) => get$4(d, prop);
  } else {
    return (d) => d;
  }
}
function chartDataArray(data) {
  if (data == null) {
    return [];
  } else if (Array.isArray(data)) {
    return data;
  } else if ("nodes" in data) {
    return data.nodes;
  } else if ("descendants" in data) {
    return data.descendants();
  }
  return [];
}
function findRelatedData(data, original, accessor2) {
  return data.find((d) => {
    return accessor2(d)?.valueOf() === accessor2(original)?.valueOf();
  });
}
const MEASUREMENT_ELEMENT_ID = "__text_measurement_id";
function _getStringWidth(str, style) {
  try {
    let textEl = document.getElementById(MEASUREMENT_ELEMENT_ID);
    if (!textEl) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.width = "0";
      svg.style.height = "0";
      svg.style.position = "absolute";
      svg.style.top = "-100%";
      svg.style.left = "-100%";
      textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textEl.setAttribute("id", MEASUREMENT_ELEMENT_ID);
      svg.appendChild(textEl);
      document.body.appendChild(svg);
    }
    Object.assign(textEl.style, style);
    textEl.textContent = str;
    return textEl.getComputedTextLength();
  } catch (e) {
    return null;
  }
}
const getStringWidth = memoize(_getStringWidth, {
  cacheKey: ([str, style]) => `${str}_${JSON.stringify(style)}`
});
function toTitleCase(str) {
  return str.replace(/^\w/, (d) => d.toUpperCase());
}
const DEFAULT_ELLIPSIS = "…";
function truncateText(text2, { position = "end", ellipsis = DEFAULT_ELLIPSIS, maxWidth, style, maxChars }) {
  if (!text2)
    return "";
  if (maxWidth === void 0 && maxChars === void 0)
    return text2;
  let workingText = text2;
  if (maxChars !== void 0 && text2.length > maxChars) {
    if (position === "start") {
      workingText = ellipsis + text2.slice(-maxChars);
    } else if (position === "middle") {
      const half = Math.floor(maxChars / 2);
      workingText = text2.slice(0, half) + ellipsis + text2.slice(-half);
    } else {
      workingText = text2.slice(0, maxChars) + ellipsis;
    }
  }
  if (maxWidth !== void 0) {
    const fullWidth = getStringWidth(workingText, style);
    if (fullWidth === null || fullWidth <= maxWidth)
      return workingText;
    const ellipsisWidth = getStringWidth(ellipsis, style) ?? 0;
    let availableWidth = maxWidth - ellipsisWidth;
    if (position === "start") {
      let truncated = workingText.slice(ellipsis.length);
      let truncatedWidth = getStringWidth(truncated, style);
      while (truncatedWidth !== null && truncatedWidth > availableWidth && truncated.length > 0) {
        truncated = truncated.slice(1);
        truncatedWidth = getStringWidth(truncated, style);
      }
      return ellipsis + truncated;
    } else if (position === "middle") {
      const halfWidth = availableWidth / 2;
      let left = "";
      let right = "";
      let bestLeft = "";
      let bestRight = "";
      for (let i = 0, j2 = workingText.length - 1; i < workingText.length && j2 >= 0; i++, j2--) {
        const leftTest = workingText.slice(0, i + 1);
        const rightTest = workingText.slice(j2);
        const leftWidth = getStringWidth(leftTest, style);
        const rightWidth = getStringWidth(rightTest, style);
        if (leftWidth !== null && leftWidth <= halfWidth)
          left = leftTest;
        if (rightWidth !== null && rightWidth <= halfWidth)
          right = rightTest;
        const combinedWidth = getStringWidth(left + ellipsis + right, style);
        if (combinedWidth !== null && combinedWidth <= maxWidth) {
          bestLeft = left;
          bestRight = right;
        } else {
          break;
        }
      }
      return bestLeft + ellipsis + bestRight;
    } else {
      let truncated = workingText.slice(0, -ellipsis.length);
      let truncatedWidth = getStringWidth(truncated + ellipsis, style);
      while (truncatedWidth !== null && truncatedWidth > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
        truncatedWidth = getStringWidth(truncated + ellipsis, style);
      }
      return truncated + ellipsis;
    }
  }
  return workingText;
}
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length)
    return false;
  return arr1.every((k2) => {
    return arr2.includes(k2);
  });
}
function calcDomain(s2, extents, domain) {
  return extents ? partialDomain(extents[s2], domain) : domain;
}
function partialDomain(domain = [], directive) {
  if (Array.isArray(directive) === true) {
    return directive.map((d, i) => {
      if (d === null) {
        return domain[i];
      }
      return d;
    });
  }
  return domain;
}
function createChartScale(axis, { domain, scale, padding, nice, reverse, width, height, range: range2, percentRange }) {
  const defaultRange = getDefaultRange(axis, width, height, reverse, range2, percentRange);
  const trueScale = scale.copy();
  trueScale.domain(domain);
  if (!trueScale.interpolator || typeof trueScale.interpolator === "function" && trueScale.interpolator().name.startsWith("identity")) {
    trueScale.range(defaultRange);
  }
  if (padding) {
    trueScale.domain(padScale(trueScale, padding));
  }
  if (nice === true || typeof nice === "number") {
    if (typeof trueScale.nice === "function") {
      trueScale.nice(typeof nice === "number" ? nice : void 0);
    } else {
      console.error(`[Layer Chart] You set \`${axis}Nice: true\` but the ${axis}Scale does not have a \`.nice\` method. Ignoring...`);
    }
  }
  return trueScale;
}
const unpaddable = ["scaleThreshold", "scaleQuantile", "scaleQuantize", "scaleSequentialQuantile"];
function padScale(scale, padding) {
  if (typeof scale.range !== "function") {
    throw new Error("Scale method `range` must be a function");
  }
  if (typeof scale.domain !== "function") {
    throw new Error("Scale method `domain` must be a function");
  }
  if (!Array.isArray(padding) || unpaddable.includes(findScaleName(scale))) {
    return scale.domain();
  }
  if (isOrdinalDomain(scale) === true)
    return scale.domain();
  const { lift, ground } = getPadFunctions(scale);
  const d0 = scale.domain()[0];
  const isTime = Object.prototype.toString.call(d0) === "[object Date]";
  const [d1, d2] = scale.domain().map((d) => {
    return isTime ? lift(d.getTime()) : lift(d);
  });
  const [r1, r2] = scale.range();
  const paddingLeft = padding[0] || 0;
  const paddingRight = padding[1] || 0;
  const step = (d2 - d1) / (Math.abs(r2 - r1) - paddingLeft - paddingRight);
  return [d1 - paddingLeft * step, paddingRight * step + d2].map((d) => {
    return isTime ? ground(new Date(d).getTime()) : ground(d);
  });
}
function f(name, modifier = "") {
  return `scale${toTitleCase(modifier)}${toTitleCase(name)}`;
}
function findScaleName(scale) {
  if (typeof scale.bandwidth === "function") {
    if (typeof scale.paddingInner === "function") {
      return f("band");
    }
    return f("point");
  }
  if (arraysEqual(Object.keys(scale), ["domain", "range", "unknown", "copy"])) {
    return f("ordinal");
  }
  let modifier = "";
  if (scale.interpolator) {
    if (scale.domain().length === 3) {
      modifier = "diverging";
    } else {
      modifier = "sequential";
    }
  }
  if (scale.quantiles) {
    return f("quantile", modifier);
  }
  if (scale.thresholds) {
    return f("quantize", modifier);
  }
  if (scale.constant) {
    return f("symlog", modifier);
  }
  if (scale.base) {
    return f("log", modifier);
  }
  if (scale.exponent) {
    if (scale.exponent() === 0.5) {
      return f("sqrt", modifier);
    }
    return f("pow", modifier);
  }
  if (arraysEqual(Object.keys(scale), ["domain", "range", "invertExtent", "unknown", "copy"])) {
    return f("threshold");
  }
  if (arraysEqual(Object.keys(scale), [
    "invert",
    "range",
    "domain",
    "unknown",
    "copy",
    "ticks",
    "tickFormat",
    "nice"
  ])) {
    return f("identity");
  }
  if (arraysEqual(Object.keys(scale), [
    "invert",
    "domain",
    "range",
    "rangeRound",
    "round",
    "clamp",
    "unknown",
    "copy",
    "ticks",
    "tickFormat",
    "nice"
  ])) {
    return f("radial");
  }
  if (modifier) {
    return f(modifier);
  }
  if (scale.domain()[0] instanceof Date) {
    const d = /* @__PURE__ */ new Date();
    let s2 = "";
    d.getDay = () => s2 = "time";
    d.getUTCDay = () => s2 = "utc";
    scale.tickFormat(0, "%a")(d);
    return f(s2);
  }
  return f("linear");
}
function isOrdinalDomain(scale) {
  if (typeof scale.bandwidth === "function")
    return true;
  if (arraysEqual(Object.keys(scale), ["domain", "range", "unknown", "copy"])) {
    return true;
  }
  return false;
}
function calcScaleExtents(flatData, getters, activeScales) {
  const scaleGroups = Object.entries(activeScales).reduce((groups, [key2, scaleInfo]) => {
    const domainType = isOrdinalDomain(scaleInfo.scale) === true ? "ordinal" : "other";
    if (!groups[domainType]) {
      groups[domainType] = {};
    }
    groups[domainType][key2] = getters[key2];
    return groups;
  }, { ordinal: false, other: false });
  let extents = {};
  if (scaleGroups.ordinal) {
    const sortOptions = Object.fromEntries(Object.entries(activeScales).map(([key2, scaleInfo]) => [key2, scaleInfo.sort]));
    extents = calcUniques(flatData, scaleGroups.ordinal, sortOptions);
  }
  if (scaleGroups.other) {
    const otherExtents = calcExtents(flatData, scaleGroups.other);
    extents = { ...extents, ...otherExtents };
  }
  return extents;
}
function calcUniques(data, fields, sortOptions = {}) {
  if (!Array.isArray(data)) {
    throw new TypeError(`The first argument of calcUniques() must be an array. You passed in a ${typeof data}. If you got this error using the <Chart> component, consider passing a flat array to the \`flatData\` prop`);
  }
  if (Array.isArray(fields) || fields === void 0 || fields === null) {
    throw new TypeError("The second argument of calcUniques() must be an object with field names as keys and accessor functions as values.");
  }
  const uniques = {};
  const keys = Object.keys(fields);
  for (const key2 of keys) {
    const set2 = new InternSet();
    const accessor2 = fields[key2];
    if (!accessor2)
      continue;
    for (const item of data) {
      const value = accessor2(item);
      if (Array.isArray(value)) {
        for (const val of value) {
          set2.add(val);
        }
      } else {
        set2.add(value);
      }
    }
    const results = Array.from(set2);
    if (sortOptions.sort === true || sortOptions[key2] === true) {
      results.sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") {
          return a - b;
        }
        return String(a).localeCompare(String(b));
      });
    }
    uniques[key2] = results;
  }
  return uniques;
}
function calcBaseRange(s2, width, height, reverse, percentRange) {
  let min2;
  let max2;
  if (percentRange === true) {
    min2 = 0;
    max2 = 100;
  } else {
    min2 = s2 === "r" ? 1 : 0;
    max2 = s2 === "y" ? height : s2 === "r" ? 25 : width;
  }
  return reverse === true ? [max2, min2] : [min2, max2];
}
function getDefaultRange(s2, width, height, reverse, range2, percentRange = false) {
  return !range2 ? calcBaseRange(s2, width, height, reverse, percentRange) : typeof range2 === "function" ? range2({ width, height }) : range2;
}
function identity(d) {
  return d;
}
function findScaleType(scale) {
  if (scale.constant) {
    return "symlog";
  }
  if (scale.base) {
    return "log";
  }
  if (typeof scale.exponent === "function") {
    const expValue = scale.exponent();
    if (expValue === 0.5) {
      return "sqrt";
    }
    return "pow";
  }
  return "other";
}
function log(sign) {
  return (x) => Math.log(sign * x);
}
function exp(sign) {
  return (x) => sign * Math.exp(x);
}
function symlog(c) {
  return (x) => Math.sign(x) * Math.log1p(Math.abs(x / c));
}
function symexp(c) {
  return (x) => Math.sign(x) * Math.expm1(Math.abs(x)) * c;
}
function pow(exponent) {
  return function powFn(x) {
    return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
  };
}
function getPadFunctions(scale) {
  const scaleType = findScaleType(scale);
  switch (scaleType) {
    case "log": {
      const domain = scale.domain();
      const sign = Math.sign(domain[0]);
      return { lift: log(sign), ground: exp(sign), scaleType };
    }
    case "pow": {
      const exponent = 1;
      return {
        lift: pow(exponent),
        ground: pow(1 / exponent),
        scaleType
      };
    }
    case "sqrt": {
      const exponent = 0.5;
      return {
        lift: pow(exponent),
        ground: pow(1 / exponent),
        scaleType
      };
    }
    case "symlog": {
      const constant = 1;
      return {
        lift: symlog(constant),
        ground: symexp(constant),
        scaleType
      };
    }
    default:
      return {
        lift: identity,
        ground: identity,
        scaleType
      };
  }
}
function createGetter(accessor2, scale) {
  return (d) => {
    const val = accessor2(d);
    if (!scale)
      return void 0;
    if (Array.isArray(val)) {
      return val.map((v) => scale(v));
    }
    return scale(val);
  };
}
function calcExtents(data, fields) {
  if (!Array.isArray(data)) {
    throw new TypeError(`The first argument of calcExtents() must be an array. You passed in a ${typeof data}. If you got this error using the <Chart> component, consider passing a flat array to the \`flatData\` prop.`);
  }
  if (Array.isArray(fields) || fields === void 0 || fields === null) {
    throw new TypeError("The second argument of calcExtents() must be an object with field names as keys as accessor functions as values.");
  }
  const extents = {};
  const keys = Object.keys(fields);
  const kl = keys.length;
  let i;
  let j2;
  let k2;
  let s2;
  let min2;
  let max2;
  let acc;
  let val;
  const dl = data.length;
  for (i = 0; i < kl; i += 1) {
    s2 = keys[i];
    acc = fields[s2];
    min2 = null;
    max2 = null;
    if (!acc)
      continue;
    for (j2 = 0; j2 < dl; j2 += 1) {
      val = acc(data[j2]);
      if (Array.isArray(val)) {
        const vl = val.length;
        for (k2 = 0; k2 < vl; k2 += 1) {
          if (val[k2] !== void 0 && val[k2] !== null && (typeof val[k2] === "string" || Number.isNaN(val[k2]) === false)) {
            if (min2 === null || val[k2] < min2) {
              min2 = val[k2];
            }
            if (max2 === null || val[k2] > max2) {
              max2 = val[k2];
            }
          }
        }
      } else if (val !== void 0 && val !== null && (typeof val === "string" || Number.isNaN(val) === false)) {
        if (min2 === null || val < min2) {
          min2 = val;
        }
        if (max2 === null || val > max2) {
          max2 = val;
        }
      }
    }
    extents[s2] = [min2, max2];
  }
  return extents;
}
function raise(node) {
  if (node.nextSibling) {
    node.parentNode?.appendChild(node);
  }
}
const indent = "    ";
function printObject(obj) {
  Object.entries(obj).forEach(([key2, value]) => {
    console.log(`${indent}${key2}:`, value);
  });
}
function getRgb(clr) {
  const { r, g, b, opacity: o } = rgb(clr);
  if (![r, g, b].every((c) => c >= 0 && c <= 255)) {
    return false;
  }
  return { r, g, b, o };
}
function printValues(scale, method, extraSpace = "") {
  const values = scale[method]();
  const colorValues = colorizeArray(values);
  if (colorValues) {
    printColorArray(colorValues, method, values);
  } else {
    console.log(`${indent}${indent}${toTitleCase(method)}:${extraSpace}`, values);
  }
}
function printColorArray(colorValues, method, values) {
  console.log(`${indent}${indent}${toTitleCase(method)}:    %cArray%c(${values.length}) ` + colorValues[0] + "%c ]", "color: #1377e4", "color: #737373", "color: #1478e4", ...colorValues[1], "color: #1478e4");
}
function colorizeArray(arr) {
  const colors = [];
  const a = arr.map((d, i) => {
    const rgbo = getRgb(d);
    if (rgbo !== false) {
      colors.push(rgbo);
      const space = i === arr.length - 1 ? " " : "";
      return `%c ${d}${space}`;
    }
    return d;
  });
  if (colors.length) {
    return [
      `%c[ ${a.join(", ")}`,
      colors.map((d) => `background-color: rgba(${d.r}, ${d.g}, ${d.b}, ${d.o}); color:${contrast(d)};`)
    ];
  }
  return null;
}
function printScale(s2, scale, acc) {
  const scaleName = findScaleName(scale);
  console.log(`${indent}${s2}:`);
  console.log(`${indent}${indent}Accessor: "${acc.toString()}"`);
  console.log(`${indent}${indent}Type: ${scaleName}`);
  printValues(scale, "domain");
  printValues(scale, "range", " ");
}
function contrast({ r, g, b }) {
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "black" : "white";
}
function printDebug(obj) {
  console.log("/********* LayerChart Debug ************/");
  console.log("Bounding box:");
  printObject(obj.boundingBox);
  console.log("Data:");
  console.log(indent, obj.data);
  if (obj.flatData) {
    console.log("flatData:");
    console.log(indent, obj.flatData);
  }
  console.log("Scales:");
  Object.keys(obj.activeGetters).forEach((g) => {
    printScale(g, obj[`${g}Scale`], obj[g]);
  });
  console.log("/************ End LayerChart Debug ***************/\n");
}
function filterObject(obj, comparisonObj = {}) {
  return Object.fromEntries(Object.entries(obj).filter(([key2, value]) => {
    return value !== void 0 && comparisonObj[key2] === void 0;
  }));
}
function is_date(obj) {
  return Object.prototype.toString.call(obj) === "[object Date]";
}
function tick_spring(ctx, last_value, current_value, target_value) {
  if (typeof current_value === "number" || is_date(current_value)) {
    const delta = target_value - current_value;
    const velocity = (current_value - last_value) / (ctx.dt || 1 / 60);
    const spring = ctx.opts.stiffness * delta;
    const damper = ctx.opts.damping * velocity;
    const acceleration = (spring - damper) * ctx.inv_mass;
    const d = (velocity + acceleration) * ctx.dt;
    if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
      return target_value;
    } else {
      ctx.settled = false;
      return is_date(current_value) ? new Date(current_value.getTime() + d) : current_value + d;
    }
  } else if (Array.isArray(current_value)) {
    return current_value.map(
      (_, i) => (
        // @ts-ignore
        tick_spring(ctx, last_value[i], current_value[i], target_value[i])
      )
    );
  } else if (typeof current_value === "object") {
    const next_value = {};
    for (const k2 in current_value) {
      next_value[k2] = tick_spring(ctx, last_value[k2], current_value[k2], target_value[k2]);
    }
    return next_value;
  } else {
    throw new Error(`Cannot spring ${typeof current_value} values`);
  }
}
class Spring {
  #stiffness = /* @__PURE__ */ state(0.15);
  #damping = /* @__PURE__ */ state(0.8);
  #precision = /* @__PURE__ */ state(0.01);
  #current;
  #target;
  #last_value = (
    /** @type {T} */
    void 0
  );
  #last_time = 0;
  #inverse_mass = 1;
  #momentum = 0;
  /** @type {import('../internal/client/types').Task | null} */
  #task = null;
  /** @type {ReturnType<typeof deferred> | null} */
  #deferred = null;
  /**
   * @param {T} value
   * @param {SpringOpts} [options]
   */
  constructor(value, options2 = {}) {
    this.#current = tag(/* @__PURE__ */ state(value), "Spring.current");
    this.#target = tag(/* @__PURE__ */ state(value), "Spring.target");
    if (typeof options2.stiffness === "number") this.#stiffness.v = clamp(options2.stiffness, 0, 1);
    if (typeof options2.damping === "number") this.#damping.v = clamp(options2.damping, 0, 1);
    if (typeof options2.precision === "number") this.#precision.v = options2.precision;
    {
      tag(this.#stiffness, "Spring.stiffness");
      tag(this.#damping, "Spring.damping");
      tag(this.#precision, "Spring.precision");
      tag(this.#current, "Spring.current");
      tag(this.#target, "Spring.target");
    }
  }
  /**
   * Create a spring whose value is bound to the return value of `fn`. This must be called
   * inside an effect root (for example, during component initialisation).
   *
   * ```svelte
   * <script>
   * 	import { Spring } from 'svelte/motion';
   *
   * 	let { number } = $props();
   *
   * 	const spring = Spring.of(() => number);
   * <\/script>
   * ```
   * @template U
   * @param {() => U} fn
   * @param {SpringOpts} [options]
   */
  static of(fn, options2) {
    const spring = new Spring(fn(), options2);
    render_effect(() => {
      spring.set(fn());
    });
    return spring;
  }
  /** @param {T} value */
  #update(value) {
    set(this.#target, value);
    this.#current.v ??= value;
    this.#last_value ??= this.#current.v;
    if (!this.#task) {
      this.#last_time = raf.now();
      var inv_mass_recovery_rate = 1e3 / (this.#momentum * 60);
      this.#task ??= loop((now2) => {
        this.#inverse_mass = Math.min(this.#inverse_mass + inv_mass_recovery_rate, 1);
        const elapsed = Math.min(now2 - this.#last_time, 1e3 / 30);
        const ctx = {
          inv_mass: this.#inverse_mass,
          opts: {
            stiffness: this.#stiffness.v,
            damping: this.#damping.v,
            precision: this.#precision.v
          },
          settled: true,
          dt: elapsed * 60 / 1e3
        };
        var next2 = tick_spring(ctx, this.#last_value, this.#current.v, this.#target.v);
        this.#last_value = this.#current.v;
        this.#last_time = now2;
        set(this.#current, next2);
        if (ctx.settled) {
          this.#task = null;
        }
        return !ctx.settled;
      });
    }
    return this.#task.promise;
  }
  /**
   * Sets `spring.target` to `value` and returns a `Promise` that resolves if and when `spring.current` catches up to it.
   *
   * If `options.instant` is `true`, `spring.current` immediately matches `spring.target`.
   *
   * If `options.preserveMomentum` is provided, the spring will continue on its current trajectory for
   * the specified number of milliseconds. This is useful for things like 'fling' gestures.
   *
   * @param {T} value
   * @param {SpringUpdateOpts} [options]
   */
  set(value, options2) {
    this.#deferred?.reject(new Error("Aborted"));
    if (options2?.instant || this.#current.v === void 0) {
      this.#task?.abort();
      this.#task = null;
      set(this.#current, set(this.#target, value));
      this.#last_value = value;
      return Promise.resolve();
    }
    if (options2?.preserveMomentum) {
      this.#inverse_mass = 0;
      this.#momentum = options2.preserveMomentum;
    }
    var d = this.#deferred = deferred();
    d.promise.catch(noop$1);
    this.#update(value).then(() => {
      if (d !== this.#deferred) return;
      d.resolve(void 0);
    });
    return d.promise;
  }
  get current() {
    return get$3(this.#current);
  }
  get damping() {
    return get$3(this.#damping);
  }
  set damping(v) {
    set(this.#damping, clamp(v, 0, 1));
  }
  get precision() {
    return get$3(this.#precision);
  }
  set precision(v) {
    set(this.#precision, v);
  }
  get stiffness() {
    return get$3(this.#stiffness);
  }
  set stiffness(v) {
    set(this.#stiffness, clamp(v, 0, 1));
  }
  get target() {
    return get$3(this.#target);
  }
  set target(v) {
    this.set(v);
  }
}
function clamp(n2, min2, max2) {
  return Math.max(min2, Math.min(max2, n2));
}
function linear$1(t) {
  return t;
}
function cubicInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 0.5 * Math.pow(2 * t - 2, 3) + 1;
}
function cubicIn(t) {
  return t * t * t;
}
function get_interpolator(a, b) {
  if (a === b || a !== a) return () => a;
  const type = typeof a;
  if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    throw new Error("Cannot interpolate values of different type");
  }
  if (Array.isArray(a)) {
    const arr = (
      /** @type {Array<any>} */
      b.map((bi, i) => {
        return get_interpolator(
          /** @type {Array<any>} */
          a[i],
          bi
        );
      })
    );
    return (t) => arr.map((fn) => fn(t));
  }
  if (type === "object") {
    if (!a || !b) {
      throw new Error("Object cannot be null");
    }
    if (is_date(a) && is_date(b)) {
      const an = a.getTime();
      const bn = b.getTime();
      const delta = bn - an;
      return (t) => new Date(an + t * delta);
    }
    const keys = Object.keys(b);
    const interpolators = {};
    keys.forEach((key2) => {
      interpolators[key2] = get_interpolator(a[key2], b[key2]);
    });
    return (t) => {
      const result = {};
      keys.forEach((key2) => {
        result[key2] = interpolators[key2](t);
      });
      return result;
    };
  }
  if (type === "number") {
    const delta = (
      /** @type {number} */
      b - /** @type {number} */
      a
    );
    return (t) => a + t * delta;
  }
  return () => b;
}
class Tween {
  #current;
  #target;
  /** @type {TweenedOptions<T>} */
  #defaults;
  /** @type {import('../internal/client/types').Task | null} */
  #task = null;
  /**
   * @param {T} value
   * @param {TweenedOptions<T>} options
   */
  constructor(value, options2 = {}) {
    this.#current = /* @__PURE__ */ state(value);
    this.#target = /* @__PURE__ */ state(value);
    this.#defaults = options2;
    {
      tag(this.#current, "Tween.current");
      tag(this.#target, "Tween.target");
    }
  }
  /**
   * Create a tween whose value is bound to the return value of `fn`. This must be called
   * inside an effect root (for example, during component initialisation).
   *
   * ```svelte
   * <script>
   * 	import { Tween } from 'svelte/motion';
   *
   * 	let { number } = $props();
   *
   * 	const tween = Tween.of(() => number);
   * <\/script>
   * ```
   * @template U
   * @param {() => U} fn
   * @param {TweenedOptions<U>} [options]
   */
  static of(fn, options2) {
    const tween = new Tween(fn(), options2);
    render_effect(() => {
      tween.set(fn());
    });
    return tween;
  }
  /**
   * Sets `tween.target` to `value` and returns a `Promise` that resolves if and when `tween.current` catches up to it.
   *
   * If `options` are provided, they will override the tween's defaults.
   * @param {T} value
   * @param {TweenedOptions<T>} [options]
   * @returns
   */
  set(value, options2) {
    set(this.#target, value);
    let {
      delay = 0,
      duration = 400,
      easing = linear$1,
      interpolate: interpolate2 = get_interpolator
    } = { ...this.#defaults, ...options2 };
    if (duration === 0) {
      this.#task?.abort();
      set(this.#current, value);
      return Promise.resolve();
    }
    const start = raf.now() + delay;
    let fn;
    let started = false;
    let previous_task = this.#task;
    this.#task = loop((now2) => {
      if (now2 < start) {
        return true;
      }
      if (!started) {
        started = true;
        const prev2 = this.#current.v;
        fn = interpolate2(prev2, value);
        if (typeof duration === "function") {
          duration = duration(prev2, value);
        }
        previous_task?.abort();
      }
      const elapsed = now2 - start;
      if (elapsed > /** @type {number} */
      duration) {
        set(this.#current, value);
        return false;
      }
      set(this.#current, fn(easing(elapsed / /** @type {number} */
      duration)));
      return true;
    });
    return this.#task.promise;
  }
  get current() {
    return get$3(this.#current);
  }
  get target() {
    return get$3(this.#target);
  }
  set target(v) {
    this.set(v);
  }
}
class MotionSpring extends Spring {
  type = "spring";
  constructor(value, options2) {
    super(value, options2);
  }
}
class MotionTween extends Tween {
  type = "tween";
  constructor(value, options2) {
    super(value, options2);
  }
}
class MotionNone {
  type = "none";
  #current = null;
  #target = null;
  constructor(value, _options = {}) {
    this.#current = value;
    this.#target = value;
  }
  /**
   * Updates the value immediately and returns a resolved promise
   * to maintain API compatibility with animated motion classes
   */
  set(value, _options = {}) {
    this.#current = value;
    this.#target = value;
    return Promise.resolve();
  }
  get current() {
    return this.#current;
  }
  get target() {
    return this.#target;
  }
  set target(v) {
    this.set(v);
  }
}
function setupTracking(motion, getValue, options2) {
  if (options2.controlled) return;
}
function createMotion(initialValue, getValue, motionProp, options2 = {}) {
  const motion = parseMotionProp(motionProp);
  const motionState = motion.type === "spring" ? new MotionSpring(initialValue, motion.options) : motion.type === "tween" ? new MotionTween(initialValue, motion.options) : new MotionNone(initialValue);
  setupTracking(motionState, getValue, options2);
  return motionState;
}
function createControlledMotion(initialValue, motionProp) {
  return createMotion(initialValue, () => initialValue, motionProp, { controlled: true });
}
function createMotionTracker() {
  let latestIndex = 0;
  let current = false;
  function handle(promise) {
    latestIndex += 1;
    if (!promise) {
      current = false;
      return;
    }
    let currIndex = latestIndex;
    current = true;
    promise.then(() => {
      if (currIndex === latestIndex) {
        current = false;
      }
    }).catch(() => {
    });
  }
  return {
    handle,
    get current() {
      return current;
    }
  };
}
function extractTweenConfig(prop) {
  const resolved = parseMotionProp(prop);
  if (resolved.type === "tween") return resolved;
}
function parseMotionProp(config, accessor2) {
  if (typeof config === "object" && "type" in config && "options" in config) {
    if (typeof config.options === "object") return config;
    return { type: config.type, options: {} };
  }
  if (config === void 0) return { type: "none", options: {} };
  if (typeof config === "string") {
    if (config === "spring") {
      return { type: "spring", options: {} };
    } else if (config === "tween") {
      return { type: "tween", options: {} };
    }
    return { type: "none", options: {} };
  }
  if (typeof config === "object" && "type" in config) {
    if (config.type === "spring") {
      const { type, ...options2 } = config;
      return { type: "spring", options: options2 };
    } else if (config.type === "tween") {
      const { type, ...options2 } = config;
      return { type: "tween", options: options2 };
    } else {
      return { type: "none", options: {} };
    }
  }
  if (accessor2) {
    const propConfig = config[accessor2];
    if (propConfig !== void 0) {
      return parseMotionProp(propConfig);
    }
  }
  return { type: "none", options: {} };
}
function isAnyScale(scale) {
  return typeof scale === "function" && typeof scale.range === "function";
}
function isScaleBand(scale) {
  return typeof scale.bandwidth === "function";
}
function isScaleTime(scale) {
  const domain = scale.domain();
  return domain[0] instanceof Date || domain[1] instanceof Date;
}
function isScaleNumeric(scale) {
  const domain = scale.domain();
  return typeof domain[0] === "number" || typeof domain[1] === "number";
}
function getRange(scale) {
  if (isAnyScale(scale)) {
    return scale.range();
  }
  console.error("[LayerChart] Your scale doesn't have a `.range` method?");
  return [];
}
function scaleBandInvert(scale) {
  const domain = scale.domain();
  const eachBand = scale.step();
  const paddingOuter = eachBand * (scale.paddingOuter?.() ?? scale.padding());
  return function(value) {
    const index2 = Math.floor((value - paddingOuter / 2) / eachBand);
    return domain[Math.max(0, Math.min(index2, domain.length - 1))];
  };
}
function scaleInvert(scale, value) {
  if (isScaleBand(scale)) {
    return scaleBandInvert(scale)(value);
  } else {
    return scale.invert?.(value);
  }
}
function createScale(scale, domain, range2, context2) {
  const scaleCopy = scale.copy();
  if (domain) {
    scaleCopy.domain(domain);
  }
  if (typeof range2 === "function") {
    scaleCopy.range(range2(context2));
  } else {
    scaleCopy.range(range2);
  }
  return scaleCopy;
}
function autoScale(domain, data, propAccessor) {
  let values = null;
  if (domain && domain.length > 0) {
    values = domain;
  } else if (data && data.length > 0 && propAccessor) {
    const value = accessor(propAccessor)(data[0]);
    if (Array.isArray(value)) {
      values = value;
    } else {
      values = [value];
    }
  }
  if (values) {
    if (values.some((v) => v instanceof Date)) {
      return scaleTime();
    } else if (values.some((v) => typeof v === "number")) {
      return scaleLinear();
    } else if (values.some((v) => typeof v === "string")) {
      return scaleBand();
    }
  }
  return scaleLinear();
}
function canBeZero(val) {
  if (val === 0) return true;
  return val;
}
function makeAccessor(acc) {
  if (!canBeZero(acc)) return null;
  if (Array.isArray(acc)) {
    return (d) => acc.map((k2) => {
      return typeof k2 !== "function" ? d[k2] : k2(d);
    });
  } else if (typeof acc !== "function") {
    return (d) => d[acc];
  }
  return acc;
}
const defaultWindow = void 0;
function getActiveElement(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
class ActiveElement4 {
  #document;
  #subscribe;
  constructor(options2 = {}) {
    const { window: window2 = defaultWindow, document: document2 = window2?.document } = options2;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement(this.#document);
  }
}
new ActiveElement4();
function extract(value, defaultValue) {
  return value;
}
class Context3 {
  #name;
  #key;
  /**
   * @param name The name of the context.
   * This is used for generating the context key and error messages.
   */
  constructor(name) {
    this.#name = name;
    this.#key = Symbol(name);
  }
  /**
   * The key used to get and set the context.
   *
   * It is not recommended to use this value directly.
   * Instead, use the methods provided by this class.
   */
  get key() {
    return this.#key;
  }
  /**
   * Checks whether this has been set in the context of a parent component.
   *
   * Must be called during component initialisation.
   */
  exists() {
    return hasContext(this.#key);
  }
  /**
   * Retrieves the context that belongs to the closest parent component.
   *
   * Must be called during component initialisation.
   *
   * @throws An error if the context does not exist.
   */
  get() {
    const context2 = getContext(this.#key);
    if (context2 === void 0) {
      throw new Error(`Context "${this.#name}" not found`);
    }
    return context2;
  }
  /**
   * Retrieves the context that belongs to the closest parent component,
   * or the given fallback value if the context does not exist.
   *
   * Must be called during component initialisation.
   */
  getOr(fallback) {
    const context2 = getContext(this.#key);
    if (context2 === void 0) {
      return fallback;
    }
    return context2;
  }
  /**
   * Associates the given value with the current component and returns it.
   *
   * Must be called during component initialisation.
   */
  set(context2) {
    return setContext(this.#key, context2);
  }
}
function useDebounce(callback, wait) {
  let context2 = null;
  const wait$ = extract(wait);
  function debounced(...args) {
    if (context2) {
      if (context2.timeout) {
        clearTimeout(context2.timeout);
      }
    } else {
      let resolve2;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve2 = res;
        reject = rej;
      });
      context2 = { timeout: null, runner: null, promise, resolve: resolve2, reject };
    }
    context2.runner = async () => {
      if (!context2) return;
      const ctx = context2;
      context2 = null;
      try {
        ctx.resolve(await callback.apply(this, args));
      } catch (error2) {
        ctx.reject(error2);
      }
    };
    context2.timeout = setTimeout(context2.runner, wait$);
    return context2.promise;
  }
  debounced.cancel = async () => {
    if (!context2 || context2.timeout === null) {
      await new Promise((resolve2) => setTimeout(resolve2, 0));
      if (!context2 || context2.timeout === null) return;
    }
    clearTimeout(context2.timeout);
    context2.reject("Cancelled");
    context2 = null;
  };
  debounced.runScheduledNow = async () => {
    if (!context2 || !context2.timeout) {
      await new Promise((resolve2) => setTimeout(resolve2, 0));
      if (!context2 || !context2.timeout) return;
    }
    clearTimeout(context2.timeout);
    context2.timeout = null;
    await context2.runner?.();
  };
  Object.defineProperty(debounced, "pending", {
    enumerable: true,
    get() {
      return !!context2?.timeout;
    }
  });
  return debounced;
}
function runWatcher(sources, flush, effect, options2 = {}) {
  const { lazy = false } = options2;
}
function watch(sources, effect, options2) {
  runWatcher(sources, "post", effect, options2);
}
function watchPre(sources, effect, options2) {
  runWatcher(sources, "pre", effect, options2);
}
watch.pre = watchPre;
function layerClass(layerName) {
  return `lc-${layerName}`;
}
function isObjectWithClass(val) {
  return typeof val === "object" && val !== null && typeof val !== "function";
}
function extractLayerProps(props, layerName, extraClasses) {
  const className = layerClass(layerName);
  if (isObjectWithClass(props)) {
    return {
      ...props,
      class: cls(className, props.class ?? "", extraClasses)
    };
  }
  return {
    class: cls(className, extraClasses)
  };
}
TransformContext[FILENAME] = "node_modules/layerchart/dist/components/TransformContext.svelte";
const DEFAULT_TRANSLATE = { x: 0, y: 0 };
const DEFAULT_SCALE = 1;
const _TransformContext = new Context3("TransformContext");
function createDefaultTransformContext() {
  let defaultTranslate = DEFAULT_TRANSLATE;
  let defaultScale = DEFAULT_SCALE;
  const defaultContext = {
    mode: "none",
    get scale() {
      return defaultScale;
    },
    setScale: (value) => {
      defaultScale = value;
    },
    get translate() {
      return defaultTranslate;
    },
    setTranslate: (value) => {
      defaultTranslate = value;
    },
    moving: false,
    dragging: false,
    scrollMode: "none",
    setScrollMode: () => {
    },
    reset: () => {
    },
    zoomIn: () => {
    },
    zoomOut: () => {
    },
    translateCenter: () => {
    },
    zoomTo: () => {
    }
  };
  return defaultContext;
}
function getTransformContext() {
  return _TransformContext.getOr(createDefaultTransformContext());
}
function setTransformContext(transform) {
  return _TransformContext.set(transform);
}
function TransformContext($$payload, $$props) {
  push(TransformContext);
  let {
    mode = "none",
    motion,
    processTranslate = (x, y, deltaX, deltaY) => ({ x: x + deltaX, y: y + deltaY }),
    disablePointer = false,
    initialScrollMode = "none",
    clickDistance = 10,
    ondragend = () => {
    },
    ondragstart = () => {
    },
    onTransform = () => {
    },
    initialTranslate,
    initialScale,
    onwheel = () => {
    },
    onpointerdown = () => {
    },
    onpointermove = () => {
    },
    ontouchmove = () => {
    },
    onpointerup = () => {
    },
    ondblclick = () => {
    },
    onclickcapture = () => {
    },
    ref: refProp = void 0,
    children,
    class: className,
    transformContext = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  transformContext = {
    get mode() {
      return mode;
    },
    get scale() {
      return scale.current;
    },
    setScale,
    get translate() {
      return translate.current;
    },
    setTranslate,
    get dragging() {
      return dragging;
    },
    get moving() {
      return moving;
    },
    reset: reset2,
    zoomIn,
    zoomOut,
    translateCenter,
    zoomTo,
    get scrollMode() {
      return scrollMode;
    },
    setScrollMode
  };
  const ctx = getChartContext();
  let dragging = false;
  let scrollMode = initialScrollMode;
  const resolvedMotion = parseMotionProp(motion);
  const translate = createControlledMotion(initialTranslate ?? DEFAULT_TRANSLATE, resolvedMotion);
  const scale = createControlledMotion(initialScale ?? DEFAULT_SCALE, resolvedMotion);
  function setScrollMode(mode2) {
    scrollMode = mode2;
  }
  function reset2() {
    translate.target = initialTranslate ?? DEFAULT_TRANSLATE;
    scale.target = initialScale ?? DEFAULT_SCALE;
  }
  function zoomIn() {
    scaleTo(1.25, {
      x: (ctx.width + ctx.padding.left) / 2,
      y: (ctx.height + ctx.padding.top) / 2
    });
  }
  function zoomOut() {
    scaleTo(0.8, {
      x: (ctx.width + ctx.padding.left) / 2,
      y: (ctx.height + ctx.padding.top) / 2
    });
  }
  function translateCenter() {
    translate.target = { x: 0, y: 0 };
  }
  function zoomTo(center, rect) {
    const newScale = rect ? ctx.width < ctx.height ? ctx.width / rect.width : ctx.height / rect.height : 1;
    translate.target = {
      x: ctx.width / 2 - center.x * newScale,
      y: ctx.height / 2 - center.y * newScale
    };
    if (rect) {
      scale.target = newScale;
    }
  }
  function scaleTo(value, point, options2 = void 0) {
    const currentScale = scale.current;
    const newScale = scale.current * value;
    setScale(newScale, options2);
    const invertTransformPoint = {
      x: (point.x - ctx.padding.left - translate.current.x) / currentScale,
      y: (point.y - ctx.padding.top - translate.current.y) / currentScale
    };
    const newTranslate = {
      x: point.x - ctx.padding.left - invertTransformPoint.x * newScale,
      y: point.y - ctx.padding.top - invertTransformPoint.y * newScale
    };
    setTranslate(newTranslate, options2);
  }
  const translating = createMotionTracker();
  const scaling = createMotionTracker();
  const moving = dragging || translating.current || scaling.current;
  function setTranslate(point, options2) {
    translating.handle(translate.set(point, options2));
  }
  function setScale(value, options2) {
    scaling.handle(scale.set(value, options2));
  }
  watch([() => scale.current, () => translate.current], () => {
    onTransform({ scale: scale.current, translate: translate.current });
  });
  setTransformContext(transformContext);
  $$payload.out.push(`<div${spread_attributes(
    {
      class: clsx(
        // Touch events cause pointer events to be interrupted.
        // Typically `touch-action: none` works, but doesn't appear to with SVG, but `preventDefault()` works here
        // https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events#touch-action_css_property
        cls(layerClass("transform-context"), "h-full", className)
      ),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 506, 0);
  children?.($$payload, { transformContext });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, {
    ref: refProp,
    transformContext,
    setScrollMode,
    reset: reset2,
    zoomIn,
    zoomOut,
    translateCenter,
    zoomTo,
    setTranslate,
    setScale
  });
  pop();
}
TransformContext.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
GeoContext[FILENAME] = "node_modules/layerchart/dist/components/GeoContext.svelte";
const _GeoContext = new Context3("GeoContext");
function getGeoContext() {
  return _GeoContext.getOr({ projection: void 0 });
}
function setGeoContext(geo) {
  return _GeoContext.set(geo);
}
function GeoContext($$payload, $$props) {
  push(GeoContext);
  let {
    projection: projectionProp,
    fitGeojson,
    fixedAspectRatio,
    clipAngle,
    clipExtent,
    rotate,
    scale,
    translate,
    center,
    applyTransform = [],
    reflectX,
    reflectY,
    geoContext: geoContextProp = void 0,
    children
  } = $$props;
  const ctx = getChartContext();
  getTransformContext();
  let projection = void 0;
  const geoContext = {
    get projection() {
      return projection;
    },
    set projection(v) {
      projection = v;
    }
  };
  geoContextProp = geoContext;
  setGeoContext(geoContext);
  fixedAspectRatio ? [100, 100 / fixedAspectRatio] : [ctx.width, ctx.height];
  children($$payload, { geoContext });
  $$payload.out.push(`<!---->`);
  bind_props($$props, { geoContext: geoContextProp });
  pop();
}
GeoContext.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Svg[FILENAME] = "node_modules/layerchart/dist/components/layout/Svg.svelte";
function Svg($$payload, $$props) {
  push(Svg);
  let {
    ref: refProp = void 0,
    innerRef: innerRefProp = void 0,
    zIndex = 0,
    pointerEvents,
    viewBox,
    ignoreTransform = false,
    center = false,
    class: className,
    title,
    defs,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let ref = void 0;
  const ctx = getChartContext();
  const transformCtx = getTransformContext();
  const transform = (() => {
    if (transformCtx.mode === "canvas" && !ignoreTransform) {
      return `translate(${transformCtx.translate.x},${transformCtx.translate.y}) scale(${transformCtx.scale})`;
    } else if (center) {
      return `translate(${center === "x" || center === true ? ctx.width / 2 : 0}, ${center === "y" || center === true ? ctx.height / 2 : 0})`;
    }
  })();
  setRenderContext("svg");
  $$payload.out.push(`<svg${spread_attributes(
    {
      viewBox,
      width: ctx.containerWidth,
      height: ctx.containerHeight,
      class: clsx(cls(layerClass("layout-svg"), "absolute top-0 left-0 overflow-visible", pointerEvents === false && "pointer-events-none", className)),
      role: "figure",
      ...restProps
    },
    null,
    void 0,
    { "z-index": zIndex },
    3
  )}>`);
  push_element($$payload, "svg", 111, 0);
  if (typeof title === "function") {
    $$payload.out.push("<!--[-->");
    title($$payload);
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (title) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<title${attr_class(clsx(layerClass("layout-svg-title")))}>`);
      push_element($$payload, "title", 129, 4);
      $$payload.out.push(`${escape_html(title)}</title>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--><defs>`);
  push_element($$payload, "defs", 132, 2);
  defs?.($$payload);
  $$payload.out.push(`<!----></defs>`);
  pop_element();
  $$payload.out.push(`<g${attr_class(clsx(layerClass("layout-svg-g")))}${attr("transform", `translate(${stringify(ctx.padding.left)}, ${stringify(ctx.padding.top)})`)}>`);
  push_element($$payload, "g", 136, 2);
  if (transform) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<g${attr("transform", transform)}${attr_class(clsx(layerClass("layout-svg-g-transform")))}>`);
    push_element($$payload, "g", 142, 6);
    children?.($$payload, { ref });
    $$payload.out.push(`<!----></g>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
    children?.($$payload, { ref });
    $$payload.out.push(`<!---->`);
  }
  $$payload.out.push(`<!--]--></g>`);
  pop_element();
  $$payload.out.push(`</svg>`);
  pop_element();
  bind_props($$props, { ref: refProp, innerRef: innerRefProp });
  pop();
}
Svg.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function createId(prefix, uid) {
  return `${prefix}-${uid}`;
}
ClipPath[FILENAME] = "node_modules/layerchart/dist/components/ClipPath.svelte";
function ClipPath($$payload, $$props) {
  push(ClipPath);
  const uid = props_id($$payload);
  let {
    id = createId("clipPath-", uid),
    useId: useId2,
    disabled = false,
    children,
    clip,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const url = `url(#${id})`;
  const renderContext = getRenderContext();
  if (renderContext === "svg") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<defs>`);
    push_element($$payload, "defs", 64, 2);
    $$payload.out.push(`<clipPath${spread_attributes({ id, ...restProps }, null, void 0, void 0, 3)}>`);
    push_element($$payload, "clipPath", 65, 4);
    clip?.($$payload, { id });
    $$payload.out.push(`<!---->`);
    if (useId2) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<use${attr("href", `#${stringify(useId2)}`)}>`);
      push_element($$payload, "use", 69, 8);
      $$payload.out.push(`</use>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></clipPath>`);
    pop_element();
    $$payload.out.push(`</defs>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  if (children) {
    $$payload.out.push("<!--[-->");
    if (disabled || renderContext !== "svg") {
      $$payload.out.push("<!--[-->");
      children($$payload, { id, url, useId: useId2 });
      $$payload.out.push(`<!---->`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<g${attr_class(clsx(layerClass("clip-path-g")))}${attr_style("", { "clip-path": url })}>`);
      push_element($$payload, "g", 79, 4);
      children($$payload, { id, url, useId: useId2 });
      $$payload.out.push(`<!----></g>`);
      pop_element();
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
ClipPath.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const DEFAULT_FILL = "rgb(0, 0, 0)";
const CANVAS_STYLES_ELEMENT_ID = "__layerchart_canvas_styles_id";
const supportedStyles = [
  "fill",
  "fillOpacity",
  "stroke",
  "strokeWidth",
  "opacity",
  "fontWeight",
  "fontSize",
  "fontFamily",
  "textAnchor",
  "textAlign",
  "paintOrder"
];
function _getComputedStyles(canvas, { styles, classes } = {}) {
  try {
    let svg = document.getElementById(CANVAS_STYLES_ELEMENT_ID);
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("id", CANVAS_STYLES_ELEMENT_ID);
      svg.style.display = "none";
      canvas.after(svg);
    }
    svg = svg;
    svg.removeAttribute("style");
    svg.removeAttribute("class");
    if (styles) {
      Object.assign(svg.style, styles);
    }
    svg.style.display = "none";
    if (classes) {
      svg.setAttribute("class", cls(classes).split(" ").filter((s2) => !s2.startsWith("transition-")).join(" "));
    }
    const computedStyles = supportedStyles.reduce((acc, style) => {
      acc[style] = window.getComputedStyle(svg)[style];
      return acc;
    }, {});
    return computedStyles;
  } catch (e) {
    console.error("Unable to get computed styles", e);
    return {};
  }
}
function getComputedStylesKey(canvas, { styles, classes } = {}) {
  return JSON.stringify({ canvasId: canvas.id, styles, classes });
}
const getComputedStyles = memoize(_getComputedStyles, {
  cacheKey: ([canvas, styleOptions]) => {
    return getComputedStylesKey(canvas, styleOptions);
  }
});
function render(ctx, render2, styleOptions = {}, { applyText } = {}) {
  let resolvedStyles;
  if (styleOptions.classes == null && !Object.values(styleOptions.styles ?? {}).some((v) => typeof v === "string" && v.includes("var("))) {
    resolvedStyles = styleOptions.styles ?? {};
  } else {
    const { constantStyles, variableStyles } = Object.entries(styleOptions.styles ?? {}).reduce((acc, [key2, value]) => {
      if (typeof value === "number" || typeof value === "string" && !value.includes("var(")) {
        acc.constantStyles[key2] = value;
      } else if (typeof value === "string" && value.includes("var(")) {
        acc.variableStyles[key2] = value;
      }
      return acc;
    }, { constantStyles: {}, variableStyles: {} });
    const computedStyles = getComputedStyles(ctx.canvas, {
      styles: variableStyles,
      classes: styleOptions.classes
    });
    resolvedStyles = { ...computedStyles, ...constantStyles };
  }
  const paintOrder = resolvedStyles?.paintOrder === "stroke" ? ["stroke", "fill"] : ["fill", "stroke"];
  if (resolvedStyles?.opacity) {
    ctx.globalAlpha = Number(resolvedStyles?.opacity);
  }
  if (applyText) {
    ctx.font = `${resolvedStyles.fontWeight} ${resolvedStyles.fontSize} ${resolvedStyles.fontFamily}`;
    if (resolvedStyles.textAnchor === "middle") {
      ctx.textAlign = "center";
    } else if (resolvedStyles.textAnchor === "end") {
      ctx.textAlign = "right";
    } else {
      ctx.textAlign = resolvedStyles.textAlign;
    }
  }
  if (resolvedStyles.strokeDasharray?.includes(",")) {
    const dashArray = resolvedStyles.strokeDasharray.split(",").map((s2) => Number(s2.replace("px", "")));
    ctx.setLineDash(dashArray);
  }
  for (const attr2 of paintOrder) {
    if (attr2 === "fill") {
      const fill = styleOptions.styles?.fill && (styleOptions.styles?.fill instanceof CanvasGradient || styleOptions.styles?.fill instanceof CanvasPattern || !styleOptions.styles?.fill?.includes("var")) ? styleOptions.styles.fill : resolvedStyles?.fill;
      if (fill && !["none", DEFAULT_FILL].includes(fill)) {
        const currentGlobalAlpha = ctx.globalAlpha;
        const fillOpacity = Number(resolvedStyles?.fillOpacity);
        const opacity = Number(resolvedStyles?.opacity);
        ctx.globalAlpha = fillOpacity * opacity;
        ctx.fillStyle = fill;
        render2.fill(ctx);
        ctx.globalAlpha = currentGlobalAlpha;
      }
    } else if (attr2 === "stroke") {
      const stroke = styleOptions.styles?.stroke && (styleOptions.styles?.stroke instanceof CanvasGradient || !styleOptions.styles?.stroke?.includes("var")) ? styleOptions.styles?.stroke : resolvedStyles?.stroke;
      if (stroke && !["none"].includes(stroke)) {
        ctx.lineWidth = typeof resolvedStyles?.strokeWidth === "string" ? Number(resolvedStyles?.strokeWidth?.replace("px", "")) : resolvedStyles?.strokeWidth ?? 1;
        ctx.strokeStyle = stroke;
        render2.stroke(ctx);
      }
    }
  }
}
function renderPathData(ctx, pathData, styleOptions = {}) {
  const path2 = new Path2D(pathData ?? "");
  render(ctx, {
    fill: (ctx2) => ctx2.fill(path2),
    stroke: (ctx2) => ctx2.stroke(path2)
  }, styleOptions);
}
function renderCircle(ctx, coords, styleOptions = {}) {
  ctx.beginPath();
  ctx.arc(coords.cx, coords.cy, coords.r, 0, 2 * Math.PI);
  render(ctx, {
    fill: (ctx2) => {
      ctx2.fill();
    },
    stroke: (ctx2) => {
      ctx2.stroke();
    }
  }, styleOptions);
  ctx.closePath();
}
function _createLinearGradient(ctx, x0, y0, x1, y1, stops) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const { offset: offset2, color } of stops) {
    gradient.addColorStop(offset2, color);
  }
  return gradient;
}
memoize(_createLinearGradient, {
  cacheKey: (args) => JSON.stringify(args.slice(1))
  // Ignore `ctx` argument
});
function _createPattern(ctx, width, height, shapes, background) {
  const patternCanvas = document.createElement("canvas");
  const patternCtx = patternCanvas.getContext("2d");
  ctx.canvas.after(patternCanvas);
  patternCanvas.width = width;
  patternCanvas.height = height;
  if (background) {
    patternCtx.fillStyle = background;
    patternCtx.fillRect(0, 0, width, height);
  }
  for (const shape of shapes) {
    patternCtx.save();
    if (shape.type === "circle") {
      renderCircle(patternCtx, { cx: shape.cx, cy: shape.cy, r: shape.r }, { styles: { fill: shape.fill, opacity: shape.opacity } });
    } else if (shape.type === "line") {
      renderPathData(patternCtx, shape.path, {
        styles: { stroke: shape.stroke, strokeWidth: shape.strokeWidth, opacity: shape.opacity }
      });
    }
    patternCtx.restore();
  }
  const pattern2 = ctx.createPattern(patternCanvas, "repeat");
  ctx.canvas.parentElement?.removeChild(patternCanvas);
  return pattern2;
}
memoize(_createPattern, {
  cacheKey: (args) => JSON.stringify(args.slice(1))
  // Ignore `ctx` argument
});
const CanvasContext = new Context3("CanvasContext");
const defaultCanvasContext = {
  register: (_) => {
    return () => {
    };
  },
  invalidate: () => {
  }
};
function getCanvasContext() {
  return CanvasContext.getOr(defaultCanvasContext);
}
function registerCanvasComponent(component) {
  getCanvasContext();
}
function createKey(getValue) {
  const value = getValue();
  const key2 = value && typeof value === "object" ? objectId(value) : value;
  return {
    get current() {
      return key2;
    }
  };
}
Rect[FILENAME] = "node_modules/layerchart/dist/components/Rect.svelte";
function Rect($$payload, $$props) {
  push(Rect);
  let {
    height,
    width,
    x = 0,
    y = 0,
    initialX = x,
    initialY = y,
    fill,
    fillOpacity,
    stroke,
    initialHeight = height,
    initialWidth = width,
    strokeWidth,
    opacity,
    ref: refProp = void 0,
    motion,
    class: className,
    onclick,
    ondblclick,
    onpointerenter,
    onpointermove,
    onpointerleave: onpointerleave2,
    onpointerover,
    onpointerout,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const motionX = createMotion(initialX, () => x, parseMotionProp(motion, "x"));
  const motionY = createMotion(initialY, () => y, parseMotionProp(motion, "y"));
  const motionWidth = createMotion(initialWidth, () => width, parseMotionProp(motion, "width"));
  const motionHeight = createMotion(initialHeight, () => height, parseMotionProp(motion, "height"));
  const renderCtx = getRenderContext();
  createKey(() => fill);
  createKey(() => stroke);
  if (renderCtx === "canvas") {
    registerCanvasComponent();
  }
  if (renderCtx === "svg") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<rect${spread_attributes(
      {
        x: motionX.current,
        y: motionY.current,
        width: motionWidth.current,
        height: motionHeight.current,
        fill,
        "fill-opacity": fillOpacity,
        stroke,
        "stroke-width": strokeWidth,
        opacity,
        class: clsx(cls(layerClass("rect"), fill == null && "fill-surface-content", className)),
        ...restProps
      },
      null,
      void 0,
      void 0,
      3
    )}>`);
    push_element($$payload, "rect", 148, 2);
    $$payload.out.push(`</rect>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref: refProp });
  pop();
}
Rect.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
RectClipPath[FILENAME] = "node_modules/layerchart/dist/components/RectClipPath.svelte";
function RectClipPath($$payload, $$props) {
  push(RectClipPath);
  const uid = props_id($$payload);
  let {
    id = createId("clipPath-", uid),
    x = 0,
    y = 0,
    disabled = false,
    children: childrenProp,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  {
    let clip = function($$payload2) {
      validate_snippet_args($$payload2);
      Rect($$payload2, spread_props([{ x, y }, extractLayerProps(restProps, "clip-path-rect")]));
    }, children = function($$payload2, { url }) {
      validate_snippet_args($$payload2);
      childrenProp?.($$payload2, { id, url });
      $$payload2.out.push(`<!---->`);
    };
    prevent_snippet_stringification(clip);
    prevent_snippet_stringification(children);
    ClipPath($$payload, {
      id,
      disabled,
      clip,
      children,
      $$slots: { clip: true, default: true }
    });
  }
  pop();
}
RectClipPath.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
ChartClipPath[FILENAME] = "node_modules/layerchart/dist/components/ChartClipPath.svelte";
function ChartClipPath($$payload, $$props) {
  push(ChartClipPath);
  let {
    full = false,
    disabled = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const ctx = getChartContext();
  RectClipPath($$payload, spread_props([
    {
      x: full && ctx.padding.left ? -ctx.padding.left : 0,
      y: full && ctx.padding.top ? -ctx.padding.top : 0,
      disabled,
      height: ctx.height + (full ? (ctx.padding?.top ?? 0) + (ctx.padding?.bottom ?? 0) : 0),
      width: ctx.width + (full ? (ctx.padding?.left ?? 0) + (ctx.padding?.right ?? 0) : 0)
    },
    extractLayerProps(restProps, "chart-clip-path")
  ]));
  pop();
}
ChartClipPath.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function geoCurvePath(projection, curve, context2) {
  const pathContext = path();
  const geoPath$1 = geoPath(projection, curveContext(curve(pathContext)));
  const fn = (object) => {
    geoPath$1(object);
    return pathContext + "";
  };
  Object.setPrototypeOf(fn, geoPath$1);
  return fn;
}
function curveContext(curve) {
  return {
    beginPath() {
    },
    moveTo(x, y) {
      curve.lineStart();
      curve.point(x, y);
    },
    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
    },
    lineTo(x, y) {
      curve.point(x, y);
    },
    closePath() {
      curve.lineEnd();
    }
  };
}
function geoFitObjectTransform(projection, size2, object) {
  const newProjection = projection.fitSize(size2, object);
  const translate = newProjection.translate();
  return { translate: { x: translate[0], y: translate[1] }, scale: newProjection.scale() };
}
GeoPath[FILENAME] = "node_modules/layerchart/dist/components/GeoPath.svelte";
function GeoPath($$payload, $$props) {
  push(GeoPath);
  let {
    fill,
    stroke,
    strokeWidth,
    opacity,
    geoTransform: geoTransform$1,
    geojson,
    tooltipContext,
    curve = curveLinearClosed,
    onclick,
    class: className,
    ref: refProp = void 0,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const geo = getGeoContext();
  const projection = geoTransform$1 && geo.projection ? geoTransform(geoTransform$1(geo.projection)) : geo.projection;
  const geoPath$1 = (() => {
    if (!projection) return;
    if (curve === curveLinearClosed) {
      return geoPath(projection);
    }
    return geoCurvePath(projection, curve);
  })();
  const renderCtx = getRenderContext();
  createKey(() => fill);
  createKey(() => stroke);
  const _onPointerEnter = (e) => {
    restProps.onpointerenter?.(e);
    tooltipContext?.show(e, geojson);
  };
  const _onPointerMove = (e) => {
    restProps.onpointermove?.(e);
    tooltipContext?.show(e, geojson);
  };
  const _onPointerLeave = (e) => {
    restProps.onpointerleave?.(e);
    tooltipContext?.hide();
  };
  if (renderCtx === "canvas") {
    registerCanvasComponent({
      events: {
        pointerenter: restProps.onpointerenter || tooltipContext ? _onPointerEnter : void 0,
        pointermove: restProps.onpointermove || tooltipContext ? _onPointerMove : void 0,
        pointerleave: restProps.onpointerleave || tooltipContext ? _onPointerLeave : void 0,
        pointerdown: restProps.onpointerdown,
        touchmove: restProps.ontouchmove
      }
    });
  }
  if (children) {
    $$payload.out.push("<!--[-->");
    children($$payload, { geoPath: geoPath$1 });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (renderCtx === "svg") {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<path${spread_attributes(
        {
          ...restProps,
          d: geojson ? geoPath$1?.(geojson) : "",
          fill,
          stroke,
          "stroke-width": strokeWidth,
          opacity,
          class: clsx(cls(layerClass("geo-path"), fill == null && "fill-transparent", className))
        },
        null,
        void 0,
        void 0,
        3
      )}>`);
      push_element($$payload, "path", 190, 2);
      $$payload.out.push(`</path>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref: refProp });
  pop();
}
GeoPath.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const linear = (x) => x;
function fade(node, { delay = 0, duration = 400, easing = linear } = {}) {
  const o = +getComputedStyle(node).opacity;
  return {
    delay,
    duration,
    easing,
    css: (t) => `opacity: ${t * o}`
  };
}
Group[FILENAME] = "node_modules/layerchart/dist/components/Group.svelte";
function Group($$payload, $$props) {
  push(Group);
  const ctx = getChartContext();
  let {
    x,
    initialX: initialXProp,
    y,
    initialY: initialYProp,
    center = false,
    preventTouchMove = false,
    opacity = void 0,
    motion,
    transitionIn: transitionInProp,
    transitionInParams: transitionInParamsProp,
    class: className,
    children,
    ref: refProp = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const initialX = initialXProp ?? x;
  const initialY = initialYProp ?? y;
  const trueX = x ?? (center === "x" || center === true ? ctx.width / 2 : 0);
  const trueY = y ?? (center === "y" || center === true ? ctx.height / 2 : 0);
  const motionX = createMotion(initialX, () => trueX, motion);
  const motionY = createMotion(initialY, () => trueY, motion);
  transitionInProp ? transitionInProp : extractTweenConfig(motion)?.options ? fade : () => {
  };
  const transform = (() => {
    if (center || x != null || y != null) {
      return `translate(${motionX.current}px, ${motionY.current}px)`;
    }
  })();
  const renderCtx = getRenderContext();
  if (renderCtx === "canvas") {
    registerCanvasComponent({
      events: {
        click: restProps.onclick,
        dblclick: restProps.ondblclick,
        pointerenter: restProps.onpointerenter,
        pointermove: restProps.onpointermove,
        pointerleave: restProps.onpointerleave,
        pointerdown: restProps.onpointerdown
      }
    });
  }
  if (renderCtx === "canvas") {
    $$payload.out.push("<!--[-->");
    children?.($$payload);
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (renderCtx === "svg") {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<g${spread_attributes(
        {
          class: clsx(cls(layerClass("group-g"), className)),
          opacity,
          ...restProps
        },
        null,
        void 0,
        { transform },
        3
      )}>`);
      push_element($$payload, "g", 179, 2);
      children?.($$payload);
      $$payload.out.push(`<!----></g>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<div${spread_attributes(
        {
          ...restProps,
          class: clsx(cls(layerClass("group-div"), "absolute", className))
        },
        null,
        void 0,
        { transform, opacity }
      )}>`);
      push_element($$payload, "div", 191, 2);
      children?.($$payload);
      $$payload.out.push(`<!----></div>`);
      pop_element();
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref: refProp });
  pop();
}
Group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function flattenPathData(pathData, yOverride = 0) {
  let result = pathData;
  result = result.replace(/([MLTQCSAZ])(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (match, command2, x, y) => {
    return `${command2}${x},${yOverride}`;
  });
  result = result.replace(/([v])(-?\d*\.?\d+)/g, (match, command2, l2) => {
    return `${command2}${0}`;
  });
  return result;
}
Marker[FILENAME] = "node_modules/layerchart/dist/components/Marker.svelte";
function Marker($$payload, $$props) {
  push(Marker);
  const uid = props_id($$payload);
  let {
    type,
    id = createId("marker-", uid),
    size: size2 = 10,
    markerWidth = size2,
    markerHeight = size2,
    markerUnits = "userSpaceOnUse",
    orient = "auto-start-reverse",
    refX = ["arrow", "triangle"].includes(type ?? "") ? 9 : 5,
    refY = 5,
    viewBox = "0 0 10 10",
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<defs>`);
  push_element($$payload, "defs", 97, 0);
  $$payload.out.push(`<marker${spread_attributes(
    {
      id,
      markerWidth,
      markerHeight,
      markerUnits,
      orient,
      refX,
      refY,
      viewBox,
      ...restProps,
      class: clsx(cls(
        layerClass("marker"),
        "overflow-visible",
        // stroke
        restProps.stroke == null && (["arrow", "circle-stroke", "line"].includes(type ?? "") ? "stroke-[context-stroke]" : type === "circle" ? "stroke-surface-100" : "stroke-none"),
        // extra stroke attrs
        "[stroke-linecap:round] [stroke-linejoin:round]",
        //fill
        restProps.fill == null && (["triangle", "dot", "circle"].includes(type ?? "") ? "fill-[context-stroke]" : type === "circle-stroke" ? "fill-surface-100" : "fill-none"),
        className
      ))
    },
    null,
    void 0,
    void 0,
    3
  )}>`);
  push_element($$payload, "marker", 98, 2);
  if (children) {
    $$payload.out.push("<!--[-->");
    children($$payload);
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (type === "triangle") {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<path d="M 0 0 L 10 5 L 0 10 z"${attr_class(clsx(layerClass("marker-triangle")))}>`);
      push_element($$payload, "path", 133, 6);
      $$payload.out.push(`</path>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
      if (type === "arrow") {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<polyline points="0 0, 10 5, 0 10"${attr_class(clsx(layerClass("marker-arrow")))}>`);
        push_element($$payload, "polyline", 135, 6);
        $$payload.out.push(`</polyline>`);
        pop_element();
      } else {
        $$payload.out.push("<!--[!-->");
        if (type === "circle" || type === "circle-stroke" || type === "dot") {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<circle${attr("cx", 5)}${attr("cy", 5)}${attr("r", 5)}${attr_class(clsx(layerClass("marker-circle")))}>`);
          push_element($$payload, "circle", 137, 6);
          $$payload.out.push(`</circle>`);
          pop_element();
        } else {
          $$payload.out.push("<!--[!-->");
          if (type === "line") {
            $$payload.out.push("<!--[-->");
            $$payload.out.push(`<polyline points="5 0, 5 10"${attr_class(clsx(layerClass("marker-line")))}>`);
            push_element($$payload, "polyline", 139, 6);
            $$payload.out.push(`</polyline>`);
            pop_element();
          } else {
            $$payload.out.push("<!--[!-->");
          }
          $$payload.out.push(`<!--]-->`);
        }
        $$payload.out.push(`<!--]-->`);
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></marker>`);
  pop_element();
  $$payload.out.push(`</defs>`);
  pop_element();
  pop();
}
Marker.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
MarkerWrapper[FILENAME] = "node_modules/layerchart/dist/components/MarkerWrapper.svelte";
function MarkerWrapper($$payload, $$props) {
  push(MarkerWrapper);
  let { id, marker } = $$props;
  if (typeof marker === "function") {
    $$payload.out.push("<!--[-->");
    marker($$payload, { id });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (marker) {
      $$payload.out.push("<!--[-->");
      Marker($$payload, spread_props([
        { id, type: typeof marker === "string" ? marker : void 0 },
        typeof marker === "object" ? marker : null
      ]));
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
MarkerWrapper.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Spline[FILENAME] = "node_modules/layerchart/dist/components/Spline.svelte";
function Spline($$payload, $$props) {
  push(Spline);
  const uid = props_id($$payload);
  const ctx = getChartContext();
  let {
    data,
    pathData,
    x,
    y,
    motion,
    draw,
    curve,
    defined,
    fill,
    stroke,
    strokeWidth,
    fillOpacity,
    class: className,
    marker,
    markerStart: markerStartProp,
    markerMid: markerMidProp,
    markerEnd: markerEndProp,
    startContent,
    endContent,
    opacity,
    pathRef: pathRefProp = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let pathRef = void 0;
  const markerStart = markerStartProp ?? marker;
  const markerMid = markerMidProp ?? marker;
  const markerEnd = markerEndProp ?? marker;
  const markerStartId = markerStart ? createId("marker-start", uid) : "";
  const markerMidId = markerMid ? createId("marker-mid", uid) : "";
  const markerEndId = markerEnd ? createId("marker-end", uid) : "";
  function getScaleValue(data2, scale, accessor2) {
    let value = accessor2(data2);
    if (Array.isArray(value)) {
      value = max(value);
    }
    if (scale.domain().length) {
      return scale(value);
    } else {
      return value;
    }
  }
  const xAccessor = x ? accessor(x) : ctx.x;
  const yAccessor = y ? accessor(y) : ctx.y;
  const xOffset = isScaleBand(ctx.xScale) ? ctx.xScale.bandwidth() / 2 : 0;
  const yOffset = isScaleBand(ctx.yScale) ? ctx.yScale.bandwidth() / 2 : 0;
  const extractedTween = extractTweenConfig(motion);
  const tweenedOptions = extractedTween ? {
    type: extractedTween.type,
    options: { interpolate: interpolatePath, ...extractedTween.options }
  } : void 0;
  function defaultPathData() {
    if (!tweenedOptions) {
      return "";
    } else if (pathData) {
      return flattenPathData(pathData, Math.min(ctx.yScale(0) ?? ctx.yRange[0], ctx.yRange[0]));
    } else if (ctx.config.x) {
      const path2 = ctx.radial ? lineRadial().angle((d2) => ctx.xScale(xAccessor(d2)) + 0).radius((d2) => Math.min(ctx.yScale(0), ctx.yRange[0])) : line().x((d2) => ctx.xScale(xAccessor(d2)) + xOffset).y((d2) => Math.min(ctx.yScale(0), ctx.yRange[0]));
      path2.defined(defined ?? ((d2) => xAccessor(d2) != null && yAccessor(d2) != null));
      if (curve) path2.curve(curve);
      return path2(data ?? ctx.data);
    }
  }
  const d = (() => {
    const path2 = ctx.radial ? lineRadial().angle((d2) => getScaleValue(d2, ctx.xScale, xAccessor) + 0).radius((d2) => getScaleValue(d2, ctx.yScale, yAccessor) + yOffset) : line().x((d2) => getScaleValue(d2, ctx.xScale, xAccessor) + xOffset).y((d2) => getScaleValue(d2, ctx.yScale, yAccessor) + yOffset);
    path2.defined(defined ?? ((d2) => xAccessor(d2) != null && yAccessor(d2) != null));
    if (curve) path2.curve(curve);
    return pathData ?? path2(data ?? ctx.data) ?? "";
  })();
  const tweenedState = createMotion(defaultPathData(), () => d, tweenedOptions);
  const renderCtx = getRenderContext();
  createKey(() => fill);
  createKey(() => stroke);
  if (renderCtx === "canvas") {
    registerCanvasComponent({
      events: {
        click: restProps.onclick,
        pointerenter: restProps.onpointerenter,
        pointermove: restProps.onpointermove,
        pointerleave: restProps.onpointerleave,
        pointerdown: restProps.onpointerdown,
        pointerover: restProps.onpointerover,
        pointerout: restProps.onpointerout,
        touchmove: restProps.ontouchmove
      }
    });
  }
  const endPointDuration = (() => {
    if (typeof draw === "object" && draw.duration !== void 0 && typeof draw.duration !== "function") {
      return draw.duration;
    }
    return 800;
  })();
  const endPoint = createControlledMotion(void 0, draw ? {
    type: "tween",
    duration: () => endPointDuration,
    easing: typeof draw === "object" && draw.easing ? draw.easing : cubicInOut,
    interpolate() {
      return (t) => {
        const totalLength = 0;
        const point = pathRef?.getPointAtLength(totalLength * t);
        return point;
      };
    }
  } : { type: "none" });
  if (
    // Anytime the path data changes, redraw
    renderCtx === "svg"
  ) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<!---->`);
    {
      $$payload.out.push(`<path${spread_attributes(
        {
          d: tweenedState.current,
          ...restProps,
          class: clsx(cls(layerClass("spline-path"), !fill && "fill-none", !stroke && "stroke-surface-content", className)),
          fill,
          "fill-opacity": fillOpacity,
          stroke,
          "stroke-width": strokeWidth,
          opacity,
          "marker-start": markerStartId ? `url(#${markerStartId})` : void 0,
          "marker-mid": markerMidId ? `url(#${markerMidId})` : void 0,
          "marker-end": markerEndId ? `url(#${markerEndId})` : void 0
        },
        null,
        void 0,
        void 0,
        3
      )}>`);
      push_element($$payload, "path", 362, 4);
      $$payload.out.push(`</path>`);
      pop_element();
      MarkerWrapper($$payload, { id: markerStartId, marker: markerStart });
      $$payload.out.push(`<!---->`);
      MarkerWrapper($$payload, { id: markerMidId, marker: markerMid });
      $$payload.out.push(`<!---->`);
      MarkerWrapper($$payload, { id: markerEndId, marker: markerEnd });
      $$payload.out.push(`<!---->`);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
      if (endContent && endPoint.current) {
        $$payload.out.push("<!--[-->");
        Group($$payload, {
          x: endPoint.current.x,
          y: endPoint.current.y,
          class: layerClass("spline-g-end"),
          children: prevent_snippet_stringification(($$payload2) => {
            endContent($$payload2, {
              point: endPoint.current,
              value: {
                x: ctx.xScale?.invert?.(endPoint.current.x),
                y: ctx.yScale?.invert?.(endPoint.current.y)
              }
            });
            $$payload2.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { pathRef: pathRefProp });
  pop();
}
Spline.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Circle[FILENAME] = "node_modules/layerchart/dist/components/Circle.svelte";
function Circle($$payload, $$props) {
  push(Circle);
  let {
    cx = 0,
    initialCx: initialCxProp,
    cy = 0,
    initialCy: initialCyProp,
    r = 1,
    initialR: initialRProp,
    motion,
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    opacity,
    class: className,
    ref: refProp = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const initialCx = initialCxProp ?? cx;
  const initialCy = initialCyProp ?? cy;
  const initialR = initialRProp ?? r;
  const renderCtx = getRenderContext();
  const motionCx = createMotion(initialCx, () => cx, motion);
  const motionCy = createMotion(initialCy, () => cy, motion);
  const motionR = createMotion(initialR, () => r, motion);
  createKey(() => fill);
  createKey(() => stroke);
  if (renderCtx === "canvas") {
    registerCanvasComponent({
      events: {
        click: restProps.onclick,
        pointerdown: restProps.onpointerdown,
        pointerenter: restProps.onpointerenter,
        pointermove: restProps.onpointermove,
        pointerleave: restProps.onpointerleave
      }
    });
  }
  if (renderCtx === "svg") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<circle${spread_attributes(
      {
        cx: motionCx.current,
        cy: motionCy.current,
        r: motionR.current,
        fill,
        "fill-opacity": fillOpacity,
        stroke,
        "stroke-width": strokeWidth,
        opacity,
        class: clsx(cls(layerClass("circle"), fill == null && "fill-surface-content", className)),
        ...restProps
      },
      null,
      void 0,
      void 0,
      3
    )}>`);
    push_element($$payload, "circle", 154, 2);
    $$payload.out.push(`</circle>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref: refProp });
  pop();
}
Circle.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
CircleClipPath[FILENAME] = "node_modules/layerchart/dist/components/CircleClipPath.svelte";
function CircleClipPath($$payload, $$props) {
  push(CircleClipPath);
  const uid = props_id($$payload);
  let {
    id = createId("clipPath-", uid),
    cx = 0,
    cy = 0,
    r,
    motion,
    disabled = false,
    ref: refProp = void 0,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let ref = void 0;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    {
      let clip = function($$payload3) {
        validate_snippet_args($$payload3);
        Circle($$payload3, spread_props([
          { cx, cy, r, motion },
          extractLayerProps(restProps, "clip-path-circle"),
          {
            get ref() {
              return ref;
            },
            set ref($$value) {
              ref = $$value;
              $$settled = false;
            }
          }
        ]));
      };
      prevent_snippet_stringification(clip);
      ClipPath($$payload2, { id, disabled, children, clip, $$slots: { clip: true } });
    }
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref: refProp });
  pop();
}
CircleClipPath.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Voronoi[FILENAME] = "node_modules/layerchart/dist/components/Voronoi.svelte";
function Voronoi($$payload, $$props) {
  push(Voronoi);
  let {
    data,
    r,
    classes = {},
    onclick,
    onpointerenter,
    onpointerdown,
    onpointermove,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const ctx = getChartContext();
  const geo = getGeoContext();
  const points = (data ?? ctx.flatData).map((d) => {
    const xValue = geo.projection ? ctx.x(d) : ctx.xGet(d);
    const yValue = geo.projection ? ctx.y(d) : ctx.yGet(d);
    const x = Array.isArray(xValue) ? min(xValue) : xValue;
    const y = Array.isArray(yValue) ? min(yValue) : yValue;
    let point;
    if (ctx.radial) {
      const radialPoint = pointRadial(x, y);
      point = [
        radialPoint[0] + ctx.width / 2,
        radialPoint[1] + ctx.height / 2
      ];
    } else {
      point = [x, y];
    }
    point.data = d;
    return point;
  });
  const boundWidth = Math.max(ctx.width, 0);
  const boundHeight = Math.max(ctx.height, 0);
  const disableClip = r === 0 || r == null || r === Infinity;
  Group($$payload, spread_props([
    restProps,
    {
      class: cls(layerClass("voronoi-g"), classes.root, className),
      children: prevent_snippet_stringification(($$payload2) => {
        if (geo.projection) {
          $$payload2.out.push("<!--[-->");
          const polygons = geoVoronoi().polygons(points);
          const each_array = ensure_array_like(polygons.features);
          $$payload2.out.push(`<!--[-->`);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let feature = each_array[$$index];
            const point = r ? geo.projection?.(feature.properties.sitecoordinates) : null;
            CircleClipPath($$payload2, {
              cx: point?.[0],
              cy: point?.[1],
              r: r ?? 0,
              disabled: point == null || disableClip,
              children: prevent_snippet_stringification(($$payload3) => {
                GeoPath($$payload3, {
                  geojson: feature,
                  class: cls(layerClass("voronoi-geo-path"), "fill-transparent stroke-transparent", classes.path),
                  onclick: (e) => onclick?.(e, { data: feature.properties.site.data, feature }),
                  onpointerenter: (e) => onpointerenter?.(e, { data: feature.properties.site.data, feature }),
                  onpointermove: (e) => onpointermove?.(e, { data: feature.properties.site.data, feature }),
                  onpointerdown: (e) => onpointerdown?.(e, { data: feature.properties.site.data, feature }),
                  onpointerleave,
                  ontouchmove: (e) => {
                    e.preventDefault();
                  }
                });
              }),
              $$slots: { default: true }
            });
          }
          $$payload2.out.push(`<!--]-->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          const voronoi = Delaunay.from(points).voronoi([0, 0, boundWidth, boundHeight]);
          const each_array_1 = ensure_array_like(points);
          $$payload2.out.push(`<!--[-->`);
          for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
            let point = each_array_1[i];
            const pathData = voronoi.renderCell(i);
            if (pathData) {
              $$payload2.out.push("<!--[-->");
              CircleClipPath($$payload2, {
                cx: point[0],
                cy: point[1],
                r: r ?? 0,
                disabled: disableClip,
                children: prevent_snippet_stringification(($$payload3) => {
                  Spline($$payload3, {
                    pathData,
                    class: cls(layerClass("voronoi-path"), "fill-transparent stroke-transparent", classes.path),
                    onclick: (e) => onclick?.(e, { data: point.data, point }),
                    onpointerenter: (e) => onpointerenter?.(e, { data: point.data, point }),
                    onpointermove: (e) => onpointermove?.(e, { data: point.data, point }),
                    onpointerleave,
                    onpointerdown: (e) => onpointerdown?.(e, { data: point.data, point }),
                    ontouchmove: (e) => {
                      e.preventDefault();
                    }
                  });
                }),
                $$slots: { default: true }
              });
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]-->`);
          }
          $$payload2.out.push(`<!--]-->`);
        }
        $$payload2.out.push(`<!--]-->`);
      }),
      $$slots: { default: true }
    }
  ]));
  pop();
}
Voronoi.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function quadtreeRects(quadtree2, showLeaves = true) {
  const rects = [];
  quadtree2.visit((node, x0, y0, x1, y1) => {
    if (showLeaves || Array.isArray(node)) {
      rects.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    }
  });
  return rects;
}
function asAny(x) {
  return x;
}
function handleBarTooltipPayload({ ctx, data, metaCtx }) {
  const seriesItems = metaCtx.stackSeries ? [...metaCtx.visibleSeries].reverse() : metaCtx.visibleSeries;
  const payload = seriesItems.map((s2) => {
    const seriesTooltipData = s2.data ? findRelatedData(s2.data, data, ctx.x) : data;
    const valueAccessor = accessor(s2.value ?? (s2.data ? ctx.y : s2.key));
    const label = metaCtx.orientation === "vertical" ? ctx.x(data) : ctx.y(data);
    const name = s2.label ?? (s2.key !== "default" ? s2.key : "value");
    const value = seriesTooltipData ? valueAccessor(seriesTooltipData) : void 0;
    const color = s2.color ?? ctx.cScale?.(ctx.c(data));
    return {
      ...s2.data,
      chartType: "bar",
      color,
      label,
      name,
      value,
      valueAccessor,
      key: s2.key,
      payload: data,
      rawSeriesData: s2,
      formatter: format
    };
  });
  return payload;
}
function handleAreaTooltipPayload({ ctx, data, metaCtx }) {
  const seriesItems = metaCtx.stackSeries ? [...metaCtx.visibleSeries].reverse() : metaCtx.visibleSeries;
  const payload = seriesItems.map((s2) => {
    const seriesTooltipData = s2.data ? findRelatedData(s2.data, data, ctx.x) : data;
    const valueAccessor = accessor(s2.value ?? (s2.data ? asAny(ctx.y) : s2.key));
    const label = ctx.x(data);
    const name = s2.label ?? (s2.key !== "default" ? s2.key : "value");
    const value = seriesTooltipData ? valueAccessor(seriesTooltipData) : void 0;
    const color = s2.color ?? ctx.cScale?.(ctx.c(data));
    return {
      ...s2.data,
      chartType: "area",
      color,
      label,
      name,
      value,
      valueAccessor,
      key: s2.key,
      payload: data,
      rawSeriesData: s2,
      formatter: format
    };
  });
  return payload;
}
function handleLineTooltipPayload({ ctx, data, metaCtx }) {
  return metaCtx.visibleSeries.map((s2) => {
    const seriesTooltipData = s2.data ? findRelatedData(s2.data, data, ctx.x) : data;
    const label = ctx.x(data);
    const valueAccessor = accessor(s2.value ?? (s2.data ? asAny(ctx.y) : s2.key));
    const name = s2.label ?? (s2.key !== "default" ? s2.key : "value");
    const value = seriesTooltipData ? valueAccessor(seriesTooltipData) : void 0;
    const color = s2.color ?? ctx.cScale?.(ctx.c(data));
    return {
      ...s2.data,
      chartType: "line",
      color,
      label,
      name,
      value,
      valueAccessor,
      key: s2.key,
      payload: data,
      rawSeriesData: s2,
      formatter: format
    };
  });
}
function handlePieOrArcTooltipPayload({ ctx, data, metaCtx }) {
  const keyAccessor = accessor(metaCtx.key);
  const labelAccessor = accessor(metaCtx.label);
  const valueAccessor = accessor(metaCtx.value);
  const colorAccessor = accessor(metaCtx.color);
  return [
    {
      key: keyAccessor(data),
      label: labelAccessor(data) || keyAccessor(data),
      value: valueAccessor(data),
      color: colorAccessor(data) ?? ctx.cScale?.(ctx.c(data)),
      payload: data,
      chartType: "pie",
      labelAccessor,
      keyAccessor,
      valueAccessor,
      colorAccessor
    }
  ];
}
function handleScatterTooltipPayload({ ctx, data, metaCtx }) {
  return [{ payload: data, key: "" }];
}
const _TooltipMetaContext = new Context3("TooltipMetaContext");
function getTooltipMetaContext() {
  return _TooltipMetaContext.getOr(null);
}
function getTooltipPayload({ ctx, tooltipData, metaCtx }) {
  if (!metaCtx)
    return [{ payload: tooltipData, key: "" }];
  switch (metaCtx.type) {
    case "bar":
      return handleBarTooltipPayload({ ctx, data: tooltipData, metaCtx });
    case "area":
      return handleAreaTooltipPayload({ ctx, data: tooltipData, metaCtx });
    case "line":
      return handleLineTooltipPayload({ ctx, data: tooltipData, metaCtx });
    case "pie":
    case "arc":
      return handlePieOrArcTooltipPayload({ ctx, data: tooltipData, metaCtx });
    case "scatter":
      return handleScatterTooltipPayload({ ctx, data: tooltipData, metaCtx });
  }
}
TooltipContext[FILENAME] = "node_modules/layerchart/dist/components/tooltip/TooltipContext.svelte";
const _TooltipContext = new Context3("TooltipContext");
function getTooltipContext() {
  return _TooltipContext.get();
}
function setTooltipContext(tooltip) {
  return _TooltipContext.set(tooltip);
}
function TooltipContext($$payload, $$props) {
  push(TooltipContext);
  const ctx = getChartContext();
  const geoCtx = getGeoContext();
  let {
    ref: refProp = void 0,
    debug = false,
    findTooltipData = "closest",
    hideDelay = 0,
    locked = false,
    mode = "manual",
    onclick = () => {
    },
    radius = Infinity,
    raiseTarget = false,
    tooltipContext: tooltipContextProp = void 0,
    children
  } = $$props;
  let x = 0;
  let y = 0;
  let data = null;
  let payload = [];
  let isHoveringTooltipArea = false;
  let isHoveringTooltipContent = false;
  const metaCtx = getTooltipMetaContext();
  const tooltipContext = {
    get x() {
      return x;
    },
    get y() {
      return y;
    },
    get data() {
      return data;
    },
    get payload() {
      return payload;
    },
    show: showTooltip,
    hide: hideTooltip,
    get mode() {
      return mode;
    },
    get isHoveringTooltipArea() {
      return isHoveringTooltipArea;
    },
    get isHoveringTooltipContent() {
      return isHoveringTooltipContent;
    },
    set isHoveringTooltipContent(value) {
      isHoveringTooltipContent = value;
    }
  };
  tooltipContextProp = tooltipContext;
  setTooltipContext(tooltipContext);
  let hideTimeoutId;
  const bisectX = bisector((d) => {
    const value = ctx.x(d);
    if (Array.isArray(value)) {
      return value[0];
    } else {
      return value;
    }
  }).left;
  const bisectY = bisector((d) => {
    const value = ctx.y(d);
    if (Array.isArray(value)) {
      return value[0];
    } else {
      return value;
    }
  }).left;
  function findData(previousValue, currentValue, valueAtPoint, accessor2) {
    switch (findTooltipData) {
      case "closest":
        if (currentValue === void 0) {
          return previousValue;
        } else if (previousValue === void 0) {
          return currentValue;
        } else {
          return Number(valueAtPoint) - Number(accessor2(previousValue)) > Number(accessor2(currentValue)) - Number(valueAtPoint) ? currentValue : previousValue;
        }
      case "left":
        return previousValue;
      case "right":
      default:
        return currentValue;
    }
  }
  function showTooltip(e, tooltipData) {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }
    if (locked) {
      return;
    }
    const containerNode = e.target.closest(".lc-root-container");
    const point = localPoint(e, containerNode);
    if (tooltipData == null) {
      switch (mode) {
        case "bisect-x": {
          let xValueAtPoint;
          if (ctx.radial) {
            const { radians } = cartesianToPolar(point.x - ctx.width / 2, point.y - ctx.height / 2);
            xValueAtPoint = scaleInvert(ctx.xScale, radians);
          } else {
            xValueAtPoint = scaleInvert(ctx.xScale, point.x - ctx.padding.left);
          }
          const index2 = bisectX(ctx.flatData, xValueAtPoint, 1);
          const previousValue = ctx.flatData[index2 - 1];
          const currentValue = ctx.flatData[index2];
          tooltipData = findData(previousValue, currentValue, xValueAtPoint, ctx.x);
          break;
        }
        case "bisect-y": {
          const yValueAtPoint = scaleInvert(ctx.yScale, point.y - ctx.padding.top);
          const index2 = bisectY(ctx.flatData, yValueAtPoint, 1);
          const previousValue = ctx.flatData[index2 - 1];
          const currentValue = ctx.flatData[index2];
          tooltipData = findData(previousValue, currentValue, yValueAtPoint, ctx.y);
          break;
        }
        case "bisect-band": {
          const xValueAtPoint = scaleInvert(ctx.xScale, point.x);
          const yValueAtPoint = scaleInvert(ctx.yScale, point.y);
          if (isScaleBand(ctx.xScale)) {
            const bandData = ctx.flatData.filter((d) => ctx.x(d) === xValueAtPoint).sort(sortFunc(ctx.y));
            const index2 = bisectY(bandData, yValueAtPoint, 1);
            const previousValue = bandData[index2 - 1];
            const currentValue = bandData[index2];
            tooltipData = findData(previousValue, currentValue, yValueAtPoint, ctx.y);
          } else if (isScaleBand(ctx.yScale)) {
            const bandData = ctx.flatData.filter((d) => ctx.y(d) === yValueAtPoint).sort(sortFunc(ctx.x));
            const index2 = bisectX(bandData, xValueAtPoint, 1);
            const previousValue = bandData[index2 - 1];
            const currentValue = bandData[index2];
            tooltipData = findData(previousValue, currentValue, xValueAtPoint, ctx.x);
          } else ;
          break;
        }
        case "quadtree-x":
        case "quadtree-y":
        case "quadtree": {
          tooltipData = quadtree$1?.find(point.x - ctx.padding.left, point.y - ctx.padding.top, radius);
          break;
        }
      }
    }
    if (tooltipData) {
      if (raiseTarget) {
        raise(e.target);
      }
      const payloadData = getTooltipPayload({ ctx, tooltipData, metaCtx });
      x = point.x;
      y = point.y;
      data = tooltipData;
      payload = payloadData;
    } else {
      hideTooltip();
    }
  }
  function hideTooltip() {
    if (locked) {
      return;
    }
    isHoveringTooltipArea = false;
    hideTimeoutId = setTimeout(
      () => {
        if (!isHoveringTooltipArea && !isHoveringTooltipContent) {
          data = null;
          payload = [];
        }
      },
      hideDelay
    );
  }
  const quadtree$1 = (() => {
    if (["quadtree", "quadtree-x", "quadtree-y"].includes(mode)) {
      return quadtree().x((d) => {
        if (mode === "quadtree-y") {
          return 0;
        }
        if (geoCtx.projection) {
          const lat = ctx.x(d);
          const long = ctx.y(d);
          const geoValue = geoCtx.projection([lat, long]) ?? [0, 0];
          return geoValue[0];
        }
        const value = ctx.xGet(d);
        if (Array.isArray(value)) {
          return min(value);
        } else {
          return value;
        }
      }).y((d) => {
        if (mode === "quadtree-x") {
          return 0;
        }
        if (geoCtx.projection) {
          const lat = ctx.x(d);
          const long = ctx.y(d);
          const geoValue = geoCtx.projection([lat, long]) ?? [0, 0];
          return geoValue[1];
        }
        const value = ctx.yGet(d);
        if (Array.isArray(value)) {
          return min(value);
        } else {
          return value;
        }
      }).addAll(ctx.flatData);
    }
  })();
  const rects = (() => {
    if (mode === "bounds" || mode === "band") {
      return ctx.flatData.map((d) => {
        const xValue = ctx.xGet(d);
        const yValue = ctx.yGet(d);
        const x2 = Array.isArray(xValue) ? xValue[0] : xValue;
        const y2 = Array.isArray(yValue) ? yValue[0] : yValue;
        const xOffset = isScaleBand(ctx.xScale) ? ctx.xScale.padding() * ctx.xScale.step() / 2 : 0;
        const yOffset = isScaleBand(ctx.yScale) ? ctx.yScale.padding() * ctx.yScale.step() / 2 : 0;
        const fullWidth = max(ctx.xRange) - min(ctx.xRange);
        const fullHeight = max(ctx.yRange) - min(ctx.yRange);
        if (mode === "band") {
          if (isScaleBand(ctx.xScale)) {
            return {
              x: x2 - xOffset,
              y: min(ctx.yRange),
              width: ctx.xScale.step(),
              height: fullHeight,
              data: d
            };
          } else if (isScaleBand(ctx.yScale)) {
            return {
              x: min(ctx.xRange),
              y: y2 - yOffset,
              width: fullWidth,
              height: ctx.yScale.step(),
              data: d
            };
          } else if (isScaleTime(ctx.xScale)) {
            const index2 = ctx.flatData.findIndex((d2) => Number(ctx.x(d2)) === Number(ctx.x(d)));
            const isLastPoint = index2 + 1 === ctx.flatData.length;
            const nextDataPoint = isLastPoint ? max(ctx.xDomain) : ctx.x(ctx.flatData[index2 + 1]);
            return {
              x: x2 - xOffset,
              y: min(ctx.yRange),
              width: (ctx.xScale(nextDataPoint) ?? 0) - (xValue ?? 0),
              height: fullHeight,
              data: d
            };
          } else if (isScaleTime(ctx.yScale)) {
            const index2 = ctx.flatData.findIndex((d2) => Number(ctx.y(d2)) === Number(ctx.y(d)));
            const isLastPoint = index2 + 1 === ctx.flatData.length;
            const nextDataPoint = isLastPoint ? max(ctx.yDomain) : ctx.y(ctx.flatData[index2 + 1]);
            return {
              x: min(ctx.xRange),
              y: y2 - yOffset,
              width: fullWidth,
              height: (ctx.yScale(nextDataPoint) ?? 0) - (yValue ?? 0),
              data: d
            };
          } else {
            console.warn("[layerchart] TooltipContext band mode requires at least one scale to be band or time.");
            return void 0;
          }
        } else if (mode === "bounds") {
          return {
            x: isScaleBand(ctx.xScale) || Array.isArray(xValue) ? x2 - xOffset : min(ctx.xRange),
            // y: isScaleBand($yScale) || Array.isArray(yValue) ? y - yOffset : min($yRange),
            y: y2 - yOffset,
            width: Array.isArray(xValue) ? xValue[1] - xValue[0] : isScaleBand(ctx.xScale) ? ctx.xScale.step() : min(ctx.xRange) + x2,
            height: Array.isArray(yValue) ? yValue[1] - yValue[0] : isScaleBand(ctx.yScale) ? ctx.yScale.step() : max(ctx.yRange) - y2,
            data: d
          };
        }
      }).filter((x2) => x2 !== void 0).sort(sortFunc("x"));
    }
    return [];
  })();
  const triggerPointerEvents = [
    "bisect-x",
    "bisect-y",
    "bisect-band",
    "quadtree",
    "quadtree-x",
    "quadtree-y"
  ].includes(mode);
  $$payload.out.push(`<div${attr_class(clsx(cls(layerClass("tooltip-context"), "absolute", debug && triggerPointerEvents && "bg-danger/10 outline outline-danger")))}${attr_style("", {
    top: `${stringify(ctx.padding.top)}px`,
    left: `${stringify(ctx.padding.left)}px`,
    width: `${stringify(ctx.width)}px`,
    height: `${stringify(ctx.height)}px`
  })}>`);
  push_element($$payload, "div", 603, 0);
  $$payload.out.push(`<div${attr_class(clsx(
    // Ignore clicks without data (triggered from Legend clicks, for example)
    cls(layerClass("tooltip-context-container"), "absolute")
  ))}${attr_style("", {
    top: `-${stringify(ctx.padding.top ?? 0)}px`,
    left: `-${stringify(ctx.padding.left ?? 0)}px`,
    width: `${stringify(ctx.containerWidth)}px`,
    height: `${stringify(ctx.containerHeight)}px`
  })}>`);
  push_element($$payload, "div", 629, 2);
  children?.($$payload, { tooltipContext });
  $$payload.out.push(`<!----> `);
  if (mode === "voronoi") {
    $$payload.out.push("<!--[-->");
    Svg($$payload, {
      children: prevent_snippet_stringification(($$payload2) => {
        Voronoi($$payload2, {
          r: radius,
          onpointerenter: (e, { data: data2 }) => {
            showTooltip(e, data2);
          },
          onpointermove: (e, { data: data2 }) => {
            showTooltip(e, data2);
          },
          onpointerleave: () => hideTooltip(),
          onpointerdown: (e) => {
            if (e.target?.hasPointerCapture(e.pointerId)) {
              e.target.releasePointerCapture(e.pointerId);
            }
          },
          onclick: (e, { data: data2 }) => {
            onclick(e, { data: data2 });
          },
          classes: { path: cls(debug && "fill-danger/10 stroke-danger") }
        });
      }),
      $$slots: { default: true }
    });
  } else {
    $$payload.out.push("<!--[!-->");
    if (mode === "bounds" || mode === "band") {
      $$payload.out.push("<!--[-->");
      Svg($$payload, {
        center: ctx.radial,
        children: prevent_snippet_stringification(($$payload2) => {
          const each_array = ensure_array_like(rects);
          $$payload2.out.push(`<g${attr_class(clsx(layerClass("tooltip-rects-g")))}>`);
          push_element($$payload2, "g", 664, 8);
          $$payload2.out.push(`<!--[-->`);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let rect = each_array[$$index];
            if (ctx.radial) {
              $$payload2.out.push("<!--[-->");
              Arc($$payload2, {
                innerRadius: rect.y,
                outerRadius: rect.y + rect.height,
                startAngle: rect.x,
                endAngle: rect.x + rect.width,
                class: cls(layerClass("tooltip-rect"), debug ? "fill-danger/10 stroke-danger" : "fill-transparent"),
                onpointerenter: (e) => showTooltip(e, rect?.data),
                onpointermove: (e) => showTooltip(e, rect?.data),
                onpointerleave: () => hideTooltip(),
                onpointerdown: (e) => {
                  const target = e.target;
                  if (target?.hasPointerCapture(e.pointerId)) {
                    target.releasePointerCapture(e.pointerId);
                  }
                },
                onclick: (e) => {
                  onclick(e, { data: rect?.data });
                }
              });
            } else {
              $$payload2.out.push("<!--[!-->");
              $$payload2.out.push(`<rect${attr("x", rect?.x)}${attr("y", rect?.y)}${attr("width", rect?.width)}${attr("height", rect?.height)}${attr_class(clsx(cls(layerClass("tooltip-rect"), debug ? "fill-danger/10 stroke-danger" : "fill-transparent")))}>`);
              push_element($$payload2, "rect", 691, 14);
              $$payload2.out.push(`</rect>`);
              pop_element();
            }
            $$payload2.out.push(`<!--]-->`);
          }
          $$payload2.out.push(`<!--]--></g>`);
          pop_element();
        }),
        $$slots: { default: true }
      });
    } else {
      $$payload.out.push("<!--[!-->");
      if (["quadtree", "quadtree-x", "quadtree-y"].includes(mode) && debug) {
        $$payload.out.push("<!--[-->");
        Svg($$payload, {
          pointerEvents: false,
          children: prevent_snippet_stringification(($$payload2) => {
            ChartClipPath($$payload2, {
              children: prevent_snippet_stringification(($$payload3) => {
                $$payload3.out.push(`<g${attr_class(clsx(layerClass("tooltip-quadtree-g")))}>`);
                push_element($$payload3, "g", 720, 10);
                if (quadtree$1) {
                  $$payload3.out.push("<!--[-->");
                  const each_array_1 = ensure_array_like(quadtreeRects(quadtree$1, false));
                  $$payload3.out.push(`<!--[-->`);
                  for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                    let rect = each_array_1[$$index_1];
                    $$payload3.out.push(`<rect${attr("x", rect.x)}${attr("y", rect.y)}${attr("width", rect.width)}${attr("height", rect.height)}${attr_class(clsx(cls(layerClass("tooltip-quadtree-rect"), debug ? "fill-danger/10 stroke-danger" : "fill-transparent")))}>`);
                    push_element($$payload3, "rect", 723, 16);
                    $$payload3.out.push(`</rect>`);
                    pop_element();
                  }
                  $$payload3.out.push(`<!--]-->`);
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]--></g>`);
                pop_element();
              }),
              $$slots: { default: true }
            });
          }),
          $$slots: { default: true }
        });
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  bind_props($$props, { ref: refProp, tooltipContext: tooltipContextProp });
  pop();
}
TooltipContext.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
BrushContext[FILENAME] = "node_modules/layerchart/dist/components/BrushContext.svelte";
const _BrushContext = new Context3("BrushContext");
function setBrushContext(brush) {
  return _BrushContext.set(brush);
}
function BrushContext($$payload, $$props) {
  push(BrushContext);
  const ctx = getChartContext();
  let {
    brushContext: brushContextProp = void 0,
    axis = "x",
    handleSize = 5,
    resetOnEnd = false,
    ignoreResetClick = false,
    xDomain,
    yDomain,
    mode = "integrated",
    disabled = false,
    range: range2 = {},
    handle = {},
    classes = {},
    onBrushEnd = () => {
    },
    onBrushStart = () => {
    },
    onChange = () => {
    },
    onReset = () => {
    },
    children
  } = $$props;
  if (xDomain === void 0) {
    xDomain = ctx.xScale.domain();
  }
  if (yDomain === void 0) {
    yDomain = ctx.yScale.domain();
  }
  ctx.config.xDomain;
  ctx.config.yDomain;
  const xDomainMinMax = extent(ctx.xScale.domain());
  xDomainMinMax[0];
  xDomainMinMax[1];
  const yDomainMinMax = extent(ctx.yScale.domain());
  yDomainMinMax[0];
  yDomainMinMax[1];
  const top = ctx.yScale(yDomain?.[1]);
  const bottom = ctx.yScale(yDomain?.[0]);
  const left = ctx.xScale(xDomain?.[0]);
  const right = ctx.xScale(xDomain?.[1]);
  const _range = {
    x: axis === "both" || axis === "x" ? left : 0,
    y: axis === "both" || axis === "y" ? top : 0,
    width: axis === "both" || axis === "x" ? right - left : ctx.width,
    height: axis === "both" || axis === "y" ? bottom - top : ctx.height
  };
  let isActive = false;
  const brushContext = {
    get xDomain() {
      return xDomain;
    },
    set xDomain(v) {
      xDomain = v;
    },
    get yDomain() {
      return yDomain;
    },
    set yDomain(v) {
      yDomain = v;
    },
    get isActive() {
      return isActive;
    },
    set isActive(v) {
      isActive = v;
    },
    get range() {
      return _range;
    },
    get handleSize() {
      return handleSize;
    }
  };
  brushContextProp = brushContext;
  setBrushContext(brushContext);
  new Logger("BrushContext");
  if (
    // Set reactively to handle cases where xDomain/yDomain are set externally (ex. `bind:xDomain`)
    disabled
  ) {
    $$payload.out.push("<!--[-->");
    children?.($$payload, { brushContext });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    const handleClass = layerClass("brush-handle");
    $$payload.out.push(`<div${attr_class(clsx(cls(layerClass("brush-context"), "absolute touch-none")))}${attr_style("", {
      top: `${stringify(ctx.padding.top)}px`,
      left: `${stringify(ctx.padding.left)}px`,
      width: `${stringify(ctx.width)}px`,
      height: `${stringify(ctx.height)}px`
    })}>`);
    push_element($$payload, "div", 468, 2);
    $$payload.out.push(`<div${attr_class(clsx(cls(layerClass("brush-container"), "absolute")))}${attr_style("", {
      top: `-${stringify(ctx.padding.top ?? 0)}px`,
      left: `-${stringify(ctx.padding.left ?? 0)}px`,
      width: `${stringify(ctx.containerWidth)}px`,
      height: `${stringify(ctx.containerHeight)}px`
    })}>`);
    push_element($$payload, "div", 478, 4);
    children?.($$payload, { brushContext });
    $$payload.out.push(`<!----></div>`);
    pop_element();
    $$payload.out.push(` `);
    if (brushContext.isActive) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div${spread_attributes(
        {
          ...range2,
          class: clsx(cls(layerClass("brush-range"), "absolute bg-surface-content/10 cursor-move select-none", "z-10", classes.range, range2?.class))
        },
        null,
        void 0,
        {
          left: `${stringify(_range.x)}px`,
          top: `${stringify(_range.y)}px`,
          width: `${stringify(_range.width)}px`,
          height: `${stringify(_range.height)}px`
        }
      )}>`);
      push_element($$payload, "div", 489, 6);
      $$payload.out.push(`</div>`);
      pop_element();
      $$payload.out.push(` `);
      if (axis === "both" || axis === "y") {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div${spread_attributes(
          {
            ...handle,
            "data-position": "top",
            class: clsx(cls(handleClass, "cursor-ns-resize select-none", "range absolute", "z-10", classes.handle, handle?.class))
          },
          null,
          void 0,
          {
            left: `${stringify(_range.x)}px`,
            top: `${stringify(_range.y)}px`,
            width: `${stringify(_range.width)}px`,
            height: `${stringify(handleSize)}px`
          }
        )}>`);
        push_element($$payload, "div", 507, 8);
        $$payload.out.push(`</div>`);
        pop_element();
        $$payload.out.push(` <div${spread_attributes(
          {
            ...handle,
            "data-position": "bottom",
            class: clsx(cls(handleClass, "handle bottom", "cursor-ns-resize select-none", "range absolute", "z-10", classes.handle, handle?.class))
          },
          null,
          void 0,
          {
            left: `${stringify(_range.x)}px`,
            top: `${stringify(bottom - handleSize)}px`,
            width: `${stringify(_range.width)}px`,
            height: `${stringify(handleSize)}px`
          }
        )}>`);
        push_element($$payload, "div", 532, 8);
        $$payload.out.push(`</div>`);
        pop_element();
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> `);
      if (axis === "both" || axis === "x") {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div${spread_attributes(
          {
            ...handle,
            "data-position": "left",
            class: clsx(cls(handleClass, "cursor-ew-resize select-none", "range absolute", "z-10", classes.handle, handle?.class))
          },
          null,
          void 0,
          {
            left: `${stringify(_range.x)}px`,
            top: `${stringify(_range.y)}px`,
            width: `${stringify(handleSize)}px`,
            height: `${stringify(_range.height)}px`
          }
        )}>`);
        push_element($$payload, "div", 560, 8);
        $$payload.out.push(`</div>`);
        pop_element();
        $$payload.out.push(` <div${spread_attributes(
          {
            ...handle,
            "data-position": "right",
            class: clsx(cls(handleClass, "cursor-ew-resize select-none", "range absolute", "z-10", classes.handle, handle?.class))
          },
          null,
          void 0,
          {
            left: `${stringify(right - handleSize + 1)}px`,
            top: `${stringify(_range.y)}px`,
            width: `${stringify(handleSize)}px`,
            height: `${stringify(_range.height)}px`
          }
        )}>`);
        push_element($$payload, "div", 585, 8);
        $$payload.out.push(`</div>`);
        pop_element();
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { brushContext: brushContextProp });
  pop();
}
BrushContext.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Chart[FILENAME] = "node_modules/layerchart/dist/components/Chart.svelte";
const defaultPadding = { top: 0, right: 0, bottom: 0, left: 0 };
const _ChartContext = new Context3("ChartContext");
function getChartContext() {
  return _ChartContext.getOr({});
}
function setChartContext(context2) {
  return _ChartContext.set(context2);
}
const _RenderContext = new Context3("RenderContext");
function getRenderContext() {
  return _RenderContext.get();
}
function setRenderContext(context2) {
  return _RenderContext.set(context2);
}
function Chart($$payload, $$props) {
  push(Chart);
  let {
    ssr = false,
    pointerEvents = true,
    position = "relative",
    percentRange = false,
    ref: refProp = void 0,
    x: xProp,
    y: yProp,
    z: zProp,
    r: rProp,
    data = [],
    flatData: flatDataProp,
    xDomain: xDomainProp,
    yDomain: yDomainProp,
    zDomain: zDomainProp,
    rDomain: rDomainProp,
    xNice = false,
    yNice = false,
    zNice = false,
    rNice = false,
    xPadding,
    yPadding,
    zPadding,
    rPadding,
    // @ts-expect-error shh
    xScale: xScaleProp = autoScale(xDomainProp, flatDataProp ?? data, xProp),
    // @ts-expect-error shh
    yScale: yScaleProp = autoScale(yDomainProp, flatDataProp ?? data, yProp),
    // @ts-expect-error shh
    zScale: zScaleProp = autoScale(zDomainProp, flatDataProp ?? data, zProp),
    rScale: rScaleProp = scaleSqrt(),
    padding: paddingProp = {},
    verbose = true,
    debug = false,
    extents: extentsProp = {},
    xDomainSort = false,
    yDomainSort = false,
    zDomainSort = false,
    rDomainSort = false,
    xReverse = false,
    zReverse = false,
    rReverse = false,
    yRange: _yRangeProp,
    zRange: zRangeProp,
    rRange: rRangeProp,
    xBaseline = null,
    yBaseline = null,
    xInterval = null,
    yInterval = null,
    meta = {},
    children: _children,
    radial = false,
    xRange: _xRangeProp,
    x1: x1Prop,
    x1Domain: x1DomainProp,
    x1Range: x1RangeProp,
    x1Scale: x1ScaleProp,
    y1: y1Prop,
    y1Domain: y1DomainProp,
    y1Range: y1RangeProp,
    y1Scale: y1ScaleProp,
    c: cProp,
    cScale: cScaleProp,
    cDomain: cDomainProp,
    cRange: cRangeProp,
    onResize,
    geo,
    context: contextProp = void 0,
    tooltip,
    transform,
    onTransform,
    ondragend,
    ondragstart,
    brush
  } = $$props;
  let ref = void 0;
  const xRangeProp = _xRangeProp ? _xRangeProp : radial ? [0, 2 * Math.PI] : void 0;
  let containerWidth = 100;
  let containerHeight = 100;
  useDebounce(printDebug, 200);
  const _xDomain = (() => {
    if (xDomainProp !== void 0) return xDomainProp;
    if (xInterval != null && Array.isArray(data) && data.length > 0) {
      const lastXValue = accessor(xProp)(data[data.length - 1]);
      return [null, xInterval.offset(lastXValue)];
    }
    if (xBaseline != null && Array.isArray(data)) {
      const xValues = data.flatMap(accessor(xProp));
      return [min([xBaseline, ...xValues]), max([xBaseline, ...xValues])];
    }
  })();
  const _yDomain = (() => {
    if (yDomainProp !== void 0) return yDomainProp;
    if (yInterval != null && Array.isArray(data) && data.length > 0) {
      const lastYValue = accessor(yProp)(data[data.length - 1]);
      return [null, yInterval.offset(lastYValue)];
    }
    if (yBaseline != null && Array.isArray(data)) {
      const yValues = data.flatMap(accessor(yProp));
      return [min([yBaseline, ...yValues]), max([yBaseline, ...yValues])];
    }
  })();
  const yRangeProp = _yRangeProp ?? (radial ? ({ height: height2 }) => [0, height2 / 2] : void 0);
  const yReverse = yScaleProp ? !isScaleBand(yScaleProp) && !isScaleTime(yScaleProp) : true;
  const x = makeAccessor(xProp);
  const y = makeAccessor(yProp);
  const z = makeAccessor(zProp);
  const r = makeAccessor(rProp);
  const c = accessor(cProp);
  const x1 = accessor(x1Prop);
  const y1 = accessor(y1Prop);
  const flatData = flatDataProp ?? data;
  const filteredExtents = filterObject(snapshot(extentsProp));
  const activeGetters = { x, y, z, r };
  const padding = (() => {
    if (typeof paddingProp === "number") {
      return {
        ...defaultPadding,
        top: paddingProp,
        right: paddingProp,
        bottom: paddingProp,
        left: paddingProp
      };
    }
    return { ...defaultPadding, ...paddingProp };
  })();
  const box2 = (() => {
    const top = padding.top;
    const right = containerWidth - padding.right;
    const bottom = containerHeight - padding.bottom;
    const left = padding.left;
    const width2 = right - left;
    const height2 = bottom - top;
    return { top, left, bottom, right, width: width2, height: height2 };
  })();
  const width = box2.width;
  const height = box2.height;
  const extents = (() => {
    const scaleLookup = {
      x: { scale: xScaleProp, sort: xDomainSort },
      y: { scale: yScaleProp, sort: yDomainSort },
      z: { scale: zScaleProp, sort: zDomainSort },
      r: { scale: rScaleProp, sort: rDomainSort }
    };
    const getters = filterObject(activeGetters, filteredExtents);
    const activeScales = Object.fromEntries(Object.keys(getters).map((k2) => [k2, scaleLookup[k2]]));
    if (Object.keys(getters).length > 0) {
      const calculatedExtents = calcScaleExtents(flatData, getters, activeScales);
      return { ...calculatedExtents, ...filteredExtents };
    } else {
      return {};
    }
  })();
  const xDomain = calcDomain("x", extents, _xDomain);
  const yDomain = calcDomain("y", extents, _yDomain);
  const zDomain = calcDomain("z", extents, zDomainProp);
  const rDomain = calcDomain("r", extents, rDomainProp);
  const x1Domain = x1DomainProp ?? extent(chartDataArray(data), x1);
  const y1Domain = y1DomainProp ?? extent(chartDataArray(data), y1);
  const cDomain = cDomainProp ?? unique(chartDataArray(data).map(c));
  const snappedPadding = snapshot(xPadding);
  snapshot(extents);
  const xScale = createChartScale("x", {
    scale: xScaleProp,
    domain: xDomain,
    padding: snappedPadding,
    nice: xNice,
    reverse: xReverse,
    percentRange,
    range: xRangeProp,
    height,
    width
  });
  const xGet = createGetter(x, xScale);
  const yScale = createChartScale("y", {
    scale: yScaleProp,
    domain: yDomain,
    padding: yPadding,
    nice: yNice,
    reverse: yReverse,
    percentRange,
    range: yRangeProp,
    height,
    width
  });
  const yGet = createGetter(y, yScale);
  const zScale = createChartScale("z", {
    scale: zScaleProp,
    domain: zDomain,
    padding: zPadding,
    nice: zNice,
    reverse: zReverse,
    percentRange,
    range: zRangeProp,
    height,
    width
  });
  const zGet = createGetter(z, zScale);
  const rScale = createChartScale("r", {
    scale: rScaleProp,
    domain: rDomain,
    padding: rPadding,
    nice: rNice,
    reverse: rReverse,
    percentRange,
    range: rRangeProp,
    height,
    width
  });
  const rGet = createGetter(r, rScale);
  const x1Scale = x1RangeProp ? createScale(
    // @ts-expect-error shh
    x1ScaleProp ?? autoScale(x1DomainProp, flatDataProp ?? data, x1Prop),
    x1Domain,
    x1RangeProp,
    { xScale, width, height }
  ) : null;
  const x1Get = createGetter(x1, x1Scale);
  const y1Scale = y1RangeProp ? createScale(
    // @ts-expect-error shh
    y1ScaleProp ?? autoScale(y1DomainProp, flatDataProp ?? data, y1Prop),
    y1Domain,
    y1RangeProp,
    { yScale, width, height }
  ) : null;
  const y1Get = createGetter(y1, y1Scale);
  const cScale = cRangeProp ? createScale(cScaleProp ?? scaleOrdinal(), cDomain, cRangeProp, { width, height }) : null;
  const cGet = (d) => cScale?.(c(d));
  const xDomainPossiblyNice = xScale.domain();
  const yDomainPossiblyNice = yScale.domain();
  const zDomainPossiblyNice = zScale.domain();
  const rDomainPossiblyNice = rScale.domain();
  const xRange = getRange(xScale);
  const yRange = getRange(yScale);
  const zRange = getRange(zScale);
  const rRange = getRange(rScale);
  const aspectRatio = width / height;
  const config = {
    x: xProp,
    y: yProp,
    z: zProp,
    r: rProp,
    c: cProp,
    x1: x1Prop,
    y1: y1Prop,
    xDomain: _xDomain,
    yDomain: _yDomain,
    zDomain: zDomainProp,
    rDomain: rDomainProp,
    x1Domain: x1DomainProp,
    y1Domain: y1DomainProp,
    cDomain: cDomainProp,
    xRange: _xRangeProp,
    yRange: _yRangeProp,
    zRange: zRangeProp,
    rRange: rRangeProp,
    cRange: cRangeProp,
    x1Range: x1RangeProp,
    y1Range: y1RangeProp
  };
  let geoContext = null;
  let transformContext = null;
  let tooltipContext = null;
  let brushContext = null;
  const context2 = {
    get activeGetters() {
      return activeGetters;
    },
    get config() {
      return config;
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get percentRange() {
      return percentRange;
    },
    get aspectRatio() {
      return aspectRatio;
    },
    get containerWidth() {
      return containerWidth;
    },
    get containerHeight() {
      return containerHeight;
    },
    get x() {
      return x;
    },
    get y() {
      return y;
    },
    get z() {
      return z;
    },
    get r() {
      return r;
    },
    get c() {
      return c;
    },
    get x1() {
      return x1;
    },
    get y1() {
      return y1;
    },
    get data() {
      return data;
    },
    get xNice() {
      return xNice;
    },
    get yNice() {
      return yNice;
    },
    get zNice() {
      return zNice;
    },
    get rNice() {
      return rNice;
    },
    get xDomainSort() {
      return xDomainSort;
    },
    get yDomainSort() {
      return yDomainSort;
    },
    get zDomainSort() {
      return zDomainSort;
    },
    get rDomainSort() {
      return rDomainSort;
    },
    get xReverse() {
      return xReverse;
    },
    get yReverse() {
      return yReverse;
    },
    get zReverse() {
      return zReverse;
    },
    get rReverse() {
      return rReverse;
    },
    get xPadding() {
      return xPadding;
    },
    get yPadding() {
      return yPadding;
    },
    get zPadding() {
      return zPadding;
    },
    get rPadding() {
      return rPadding;
    },
    get padding() {
      return padding;
    },
    get flatData() {
      return flatData;
    },
    get extents() {
      return extents;
    },
    get xDomain() {
      return xDomainPossiblyNice;
    },
    get yDomain() {
      return yDomainPossiblyNice;
    },
    get zDomain() {
      return zDomainPossiblyNice;
    },
    get rDomain() {
      return rDomainPossiblyNice;
    },
    get cDomain() {
      return cDomain;
    },
    get x1Domain() {
      return x1Domain;
    },
    get y1Domain() {
      return y1Domain;
    },
    get xRange() {
      return xRange;
    },
    get yRange() {
      return yRange;
    },
    get zRange() {
      return zRange;
    },
    get rRange() {
      return rRange;
    },
    get cRange() {
      return cRangeProp;
    },
    get x1Range() {
      return x1RangeProp;
    },
    get y1Range() {
      return y1RangeProp;
    },
    get meta() {
      return meta;
    },
    set meta(v) {
      meta = v;
    },
    get xScale() {
      return xScale;
    },
    get yScale() {
      return yScale;
    },
    get zScale() {
      return zScale;
    },
    get rScale() {
      return rScale;
    },
    get yGet() {
      return yGet;
    },
    get xGet() {
      return xGet;
    },
    get zGet() {
      return zGet;
    },
    get rGet() {
      return rGet;
    },
    get cGet() {
      return cGet;
    },
    get x1Get() {
      return x1Get;
    },
    get y1Get() {
      return y1Get;
    },
    get cScale() {
      return cScale;
    },
    get x1Scale() {
      return x1Scale;
    },
    get y1Scale() {
      return y1Scale;
    },
    get xInterval() {
      return xInterval;
    },
    get yInterval() {
      return yInterval;
    },
    get radial() {
      return radial;
    },
    get containerRef() {
      return ref;
    },
    get geo() {
      return geoContext;
    },
    get transform() {
      return transformContext;
    },
    get tooltip() {
      return tooltipContext;
    },
    get brush() {
      return brushContext;
    }
  };
  contextProp = context2;
  setChartContext(context2);
  const initialTransform = geo?.applyTransform?.includes("translate") && geo?.fitGeojson && geo?.projection ? geoFitObjectTransform(geo.projection(), [width, height], geo.fitGeojson) : void 0;
  const processTranslate = (() => {
    if (!geo) return void 0;
    return (x2, y2, deltaX, deltaY) => {
      if (geo.applyTransform?.includes("rotate") && geoContext?.projection) {
        const projectionScale = geoContext.projection.scale() ?? 0;
        const sensitivity = 75;
        return {
          x: x2 + deltaX * (sensitivity / projectionScale),
          y: y2 + deltaY * (sensitivity / projectionScale) * -1
        };
      } else {
        return { x: x2 + deltaX, y: y2 + deltaY };
      }
    };
  })();
  const brushProps = typeof brush === "object" ? brush : { disabled: !brush };
  const tooltipProps = typeof tooltip === "object" ? tooltip : {};
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (ssr === true || typeof window !== "undefined") {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div${attr_class(clsx(layerClass("root-container")), "svelte-1j8sovf")}${attr_style("", {
        position,
        top: position === "absolute" ? "0" : null,
        right: position === "absolute" ? "0" : null,
        bottom: position === "absolute" ? "0" : null,
        left: position === "absolute" ? "0" : null,
        "pointer-events": pointerEvents === false ? "none" : null
      })}>`);
      push_element($$payload2, "div", 1387, 2);
      $$payload2.out.push(`<!---->`);
      {
        TransformContext($$payload2, spread_props([
          {
            mode: transform?.mode ?? geo?.applyTransform?.length ? "manual" : "none",
            initialTranslate: initialTransform?.translate,
            initialScale: initialTransform?.scale,
            processTranslate
          },
          transform,
          {
            ondragstart,
            onTransform,
            ondragend,
            get transformContext() {
              return transformContext;
            },
            set transformContext($$value) {
              transformContext = $$value;
              $$settled = false;
            },
            children: prevent_snippet_stringification(($$payload3) => {
              GeoContext($$payload3, spread_props([
                geo,
                {
                  get geoContext() {
                    return geoContext;
                  },
                  set geoContext($$value) {
                    geoContext = $$value;
                    $$settled = false;
                  },
                  children: prevent_snippet_stringification(($$payload4) => {
                    BrushContext($$payload4, spread_props([
                      brushProps,
                      {
                        get brushContext() {
                          return brushContext;
                        },
                        set brushContext($$value) {
                          brushContext = $$value;
                          $$settled = false;
                        },
                        children: prevent_snippet_stringification(($$payload5) => {
                          TooltipContext($$payload5, spread_props([
                            tooltipProps,
                            {
                              get tooltipContext() {
                                return tooltipContext;
                              },
                              set tooltipContext($$value) {
                                tooltipContext = $$value;
                                $$settled = false;
                              },
                              children: prevent_snippet_stringification(($$payload6) => {
                                _children?.($$payload6, { context: context2 });
                                $$payload6.out.push(`<!---->`);
                              }),
                              $$slots: { default: true }
                            }
                          ]));
                        }),
                        $$slots: { default: true }
                      }
                    ]));
                  }),
                  $$slots: { default: true }
                }
              ]));
            }),
            $$slots: { default: true }
          }
        ]));
      }
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref: refProp, context: contextProp });
  pop();
}
Chart.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function extractOutsideArc(arcPath) {
  const matches = arcPath.match(/(^.+?)(L|Z)/);
  if (!matches || !matches[1]) return arcPath;
  return matches[1];
}
function normalizeAngle(angle) {
  return (angle % 360 + 360) % 360;
}
function getArcPathMiddle(props) {
  const centerRadius = (props.innerRadius() + props.outerRadius()) / 2;
  const cornerAngleOffset = (() => {
    if (props.cornerRadius() <= 0 || centerRadius <= 0) return 0;
    const effectiveCornerRadius = Math.min(props.cornerRadius(), centerRadius);
    return effectiveCornerRadius * 0.5 / centerRadius;
  })();
  const effectiveStartAngle = (() => {
    if (props.invertCorner()) {
      return props.startAngle() - cornerAngleOffset;
    }
    return props.startAngle() + cornerAngleOffset;
  })();
  const effectiveEndAngle = (() => {
    if (props.invertCorner()) {
      return props.endAngle() + cornerAngleOffset;
    }
    return props.endAngle() - cornerAngleOffset;
  })();
  const path2 = extractOutsideArc(arc().outerRadius(centerRadius).innerRadius(centerRadius - 0.5).startAngle(effectiveStartAngle).endAngle(effectiveEndAngle)() ?? "");
  return {
    get current() {
      return path2;
    }
  };
}
function getArcPathInner(props) {
  const cornerAngleOffset = (() => {
    if (props.cornerRadius() <= 0 || props.innerRadius() <= 0) return 0;
    if (props.cornerRadius() >= props.innerRadius()) return Math.PI / 4;
    return props.cornerRadius() * 0.5 / props.innerRadius();
  })();
  const effectiveStartAngle = (() => {
    if (props.invertCorner()) {
      return props.startAngle() - cornerAngleOffset;
    }
    return props.startAngle() + cornerAngleOffset;
  })();
  const effectiveEndAngle = (() => {
    if (props.invertCorner()) {
      return props.endAngle() + cornerAngleOffset;
    }
    return props.endAngle() - cornerAngleOffset;
  })();
  const path2 = extractOutsideArc(arc().innerRadius(props.innerRadius()).outerRadius(props.innerRadius() + 0.5).startAngle(effectiveStartAngle).endAngle(effectiveEndAngle)() ?? "");
  return {
    get current() {
      return path2;
    }
  };
}
function getArcPathOuter(props) {
  const cornerAngleOffset = (() => {
    if (props.cornerRadius() <= 0 || props.outerRadius() <= 0) return 0;
    return props.cornerRadius() * 0.5 / props.outerRadius();
  })();
  const effectiveStartAngle = (() => {
    if (props.invertCorner()) {
      return props.startAngle() - cornerAngleOffset;
    }
    return props.startAngle() + cornerAngleOffset;
  })();
  const effectiveEndAngle = (() => {
    if (props.invertCorner()) {
      return props.endAngle() + cornerAngleOffset;
    }
    return props.endAngle() - cornerAngleOffset;
  })();
  const path2 = extractOutsideArc(arc().innerRadius(props.outerRadius() - 0.5).outerRadius(props.outerRadius()).startAngle(effectiveStartAngle).endAngle(effectiveEndAngle)() ?? "");
  return {
    get current() {
      return path2;
    }
  };
}
function pointOnCircle(radius, angle) {
  const adjustedAngle = angle - Math.PI / 2;
  return [
    radius * Math.cos(adjustedAngle),
    radius * Math.sin(adjustedAngle)
  ];
}
function createArcTextProps(props, opts = {}, position) {
  const effectiveStartAngleRadians = (() => {
    const start = props.startAngle();
    const end = props.endAngle();
    const offset2 = opts.startOffset;
    if (offset2) {
      try {
        const percentage = parseFloat(offset2.slice(0, -1)) / 100;
        if (!isNaN(percentage) && percentage >= 0 && percentage <= 1) {
          const span = end - start;
          return start + span * percentage;
        } else {
          console.warn("Invalid percentage for startOffset:", offset2);
        }
      } catch (e) {
        console.warn("Could not parse startOffset percentage:", offset2, e);
      }
    }
    return start;
  })();
  const effectiveStartDegrees = radiansToDegrees(effectiveStartAngleRadians);
  const normalizedStartDegrees = normalizeAngle(effectiveStartDegrees);
  const startDegrees = radiansToDegrees(props.startAngle());
  const endDegrees = radiansToDegrees(props.endAngle());
  const isClockwise = startDegrees < endDegrees;
  const isTopCw = isClockwise && (normalizedStartDegrees >= 270 || normalizedStartDegrees <= 90);
  const isTopCcw = !isClockwise && (normalizedStartDegrees > 270 || normalizedStartDegrees <= 90);
  const isBottomCw = isClockwise && normalizedStartDegrees < 270 && normalizedStartDegrees >= 90;
  const isBottomCcw = !isClockwise && normalizedStartDegrees <= 270 && normalizedStartDegrees > 90;
  const reverseText = isTopCcw || isBottomCw;
  const pathGenProps = {
    ...props,
    startAngle: () => reverseText ? props.endAngle() : props.startAngle(),
    endAngle: () => reverseText ? props.startAngle() : props.endAngle(),
    invertCorner: () => isBottomCw || isBottomCcw
  };
  const innerPath = getArcPathInner(pathGenProps);
  const middlePath = getArcPathMiddle(pathGenProps);
  const outerPath = getArcPathOuter(pathGenProps);
  const innerDominantBaseline = (() => {
    if (isBottomCw || isBottomCcw) return "auto";
    if (isTopCw || isTopCcw) return "hanging";
    return "auto";
  })();
  const outerDominantBaseline = (() => {
    if (isBottomCw || isBottomCcw) return "hanging";
    return void 0;
  })();
  const sharedProps = (() => {
    if (reverseText) {
      return { startOffset: opts.startOffset ?? "100%", textAnchor: "end" };
    }
    return { startOffset: opts.startOffset ?? void 0 };
  })();
  const radialPositionProps = (() => {
    if (position !== "outer-radial") return {};
    const midAngle = (props.startAngle() + props.endAngle()) / 2;
    const basePadding = opts.radialOffset ?? opts.outerPadding ?? 23;
    const midAngleDegrees = normalizeAngle(radiansToDegrees(midAngle));
    let textAnchor = "middle";
    let effectivePadding = basePadding;
    const isBottomZone = midAngleDegrees > 45 && midAngleDegrees < 135;
    const isTopZone = midAngleDegrees > 225 && midAngleDegrees < 315;
    const isRightZone = midAngleDegrees <= 45 || midAngleDegrees >= 315;
    const isLeftZone = midAngleDegrees >= 135 && midAngleDegrees <= 225;
    const positionRadius = props.outerRadius() + effectivePadding;
    const [x, y] = pointOnCircle(positionRadius, midAngle);
    if (isRightZone) {
      textAnchor = "start";
      if (midAngleDegrees > 350 || midAngleDegrees < 10) textAnchor = "start";
    } else if (isLeftZone) {
      textAnchor = "end";
      if (midAngleDegrees > 170 && midAngleDegrees < 190) textAnchor = "end";
    } else if (isBottomZone) {
      textAnchor = "middle";
    } else if (isTopZone) {
      textAnchor = "middle";
    }
    return { x, y, textAnchor, dominantBaseline: "middle" };
  })();
  const current = (() => {
    if (position === "inner") {
      return {
        path: innerPath.current,
        ...sharedProps,
        dominantBaseline: innerDominantBaseline
      };
    } else if (position === "outer") {
      return {
        path: outerPath.current,
        ...sharedProps,
        dominantBaseline: outerDominantBaseline
      };
    } else if (position === "middle") {
      return {
        path: middlePath.current,
        ...sharedProps,
        dominantBaseline: "middle"
      };
    } else if (position === "centroid") {
      const centroid = props.centroid();
      return {
        x: centroid[0],
        y: centroid[1],
        textAnchor: "middle",
        verticalAnchor: "middle"
      };
    } else {
      return radialPositionProps;
    }
  })();
  return {
    get current() {
      return current;
    }
  };
}
Arc[FILENAME] = "node_modules/layerchart/dist/components/Arc.svelte";
function Arc($$payload, $$props) {
  push(Arc);
  let {
    ref: refProp = void 0,
    trackRef: trackRefProp = void 0,
    motion,
    value = 0,
    initialValue = 0,
    domain = [0, 100],
    range: range2 = [0, 360],
    // degrees
    startAngle: startAngleProp,
    endAngle: endAngleProp,
    innerRadius: innerRadiusProp,
    outerRadius: outerRadiusProp,
    cornerRadius = 0,
    padAngle = 0,
    trackStartAngle: trackStartAngleProp,
    trackEndAngle: trackEndAngleProp,
    trackInnerRadius: trackInnerRadiusProp,
    trackOuterRadius: trackOuterRadiusProp,
    trackCornerRadius: trackCornerRadiusProp,
    trackPadAngle: trackPadAngleProp,
    fill,
    fillOpacity,
    stroke = "none",
    strokeWidth,
    opacity,
    data,
    offset: offset2 = 0,
    onpointerenter = () => {
    },
    onpointermove = () => {
    },
    onpointerleave: onpointerleave2 = () => {
    },
    ontouchmove = () => {
    },
    tooltipContext,
    track = false,
    children,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let ref = void 0;
  let trackRef = void 0;
  const ctx = getChartContext();
  const endAngle = endAngleProp ?? degreesToRadians(ctx.config.xRange ? max(ctx.xRange) : max(range2));
  const motionEndAngle = createMotion(initialValue, () => value, motion);
  const scale = scaleLinear().domain(domain).range(range2);
  function getOuterRadius(outerRadius2, chartRadius) {
    if (!outerRadius2) {
      return chartRadius;
    } else if (outerRadius2 > 1) {
      return outerRadius2;
    } else if (outerRadius2 > 0) {
      return chartRadius * outerRadius2;
    } else if (outerRadius2 < 0) {
      return chartRadius + outerRadius2;
    } else {
      return outerRadius2;
    }
  }
  const outerRadius = getOuterRadius(outerRadiusProp, (Math.min(ctx.xRange[1], ctx.yRange[0]) ?? 0) / 2);
  const trackOuterRadius = trackOuterRadiusProp ? getOuterRadius(trackOuterRadiusProp, (Math.min(ctx.xRange[1], ctx.yRange[0]) ?? 0) / 2) : outerRadius;
  function getInnerRadius(innerRadius2, outerRadius2) {
    if (innerRadius2 == null) {
      return Math.min(...ctx.yRange);
    } else if (innerRadius2 > 1) {
      return innerRadius2;
    } else if (innerRadius2 > 0) {
      return outerRadius2 * innerRadius2;
    } else if (innerRadius2 < 0) {
      return outerRadius2 + innerRadius2;
    } else {
      return innerRadius2;
    }
  }
  const innerRadius = getInnerRadius(innerRadiusProp, outerRadius);
  const trackInnerRadius = trackInnerRadiusProp ? getInnerRadius(trackInnerRadiusProp, trackOuterRadius) : innerRadius;
  const startAngle = startAngleProp ?? degreesToRadians(range2[0]);
  const trackStartAngle = trackStartAngleProp ?? startAngleProp ?? degreesToRadians(range2[0]);
  const trackEndAngle = trackEndAngleProp ?? endAngleProp ?? degreesToRadians(range2[1]);
  const trackCornerRadius = trackCornerRadiusProp ?? cornerRadius;
  const trackPadAngle = trackPadAngleProp ?? padAngle;
  const arcEndAngle = endAngleProp ?? degreesToRadians(scale(motionEndAngle.current));
  const arc$1 = arc().innerRadius(innerRadius).outerRadius(outerRadius).startAngle(startAngle).endAngle(arcEndAngle).cornerRadius(cornerRadius).padAngle(padAngle);
  const trackArc = arc().innerRadius(trackInnerRadius).outerRadius(trackOuterRadius).startAngle(trackStartAngle).endAngle(trackEndAngle).cornerRadius(trackCornerRadius).padAngle(trackPadAngle);
  const angle = ((startAngle ?? 0) + (endAngle ?? 0)) / 2;
  const xOffset = Math.sin(angle) * offset2;
  const yOffset = -Math.cos(angle) * offset2;
  const trackArcCentroid = (() => {
    const centroid = trackArc.centroid();
    return [centroid[0] + xOffset, centroid[1] + yOffset];
  })();
  const boundingBox = trackRef ? trackRef.getBBox() : {};
  const onPointerEnter = (e) => {
    onpointerenter?.(e);
    tooltipContext?.show(e, data);
  };
  const onPointerMove = (e) => {
    onpointermove?.(e);
    tooltipContext?.show(e, data);
  };
  const onPointerLeave = (e) => {
    onpointerleave2?.(e);
    tooltipContext?.hide();
  };
  function getTrackTextProps(position, opts = {}) {
    return createArcTextProps(
      {
        startAngle: () => trackStartAngle,
        endAngle: () => trackEndAngle,
        outerRadius: () => trackOuterRadius + (opts.outerPadding ? opts.outerPadding : 0),
        innerRadius: () => trackInnerRadius,
        cornerRadius: () => trackCornerRadius,
        centroid: () => trackArcCentroid
      },
      opts,
      position
    ).current;
  }
  function getArcTextProps(position, opts = {}) {
    return createArcTextProps(
      {
        startAngle: () => startAngle,
        endAngle: () => arcEndAngle,
        outerRadius: () => outerRadius + (opts.outerPadding ? opts.outerPadding : 0),
        innerRadius: () => innerRadius,
        cornerRadius: () => cornerRadius,
        centroid: () => trackArcCentroid
      },
      opts,
      position
    ).current;
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (track) {
      $$payload2.out.push("<!--[-->");
      Spline($$payload2, spread_props([
        { pathData: trackArc(), stroke: "none" },
        extractLayerProps(track, "arc-track"),
        {
          get pathRef() {
            return trackRef;
          },
          set pathRef($$value) {
            trackRef = $$value;
            $$settled = false;
          }
        }
      ]));
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> `);
    Spline($$payload2, spread_props([
      {
        pathData: arc$1(),
        transform: `translate(${stringify(xOffset)}, ${stringify(yOffset)})`,
        fill,
        fillOpacity,
        stroke,
        "stroke-width": strokeWidth,
        opacity
      },
      restProps,
      {
        class: cls(layerClass("arc-line"), className),
        onpointerenter: onPointerEnter,
        onpointermove: onPointerMove,
        onpointerleave: onPointerLeave,
        ontouchmove: (e) => {
          ontouchmove?.(e);
          if (!tooltipContext) return;
          e.preventDefault();
        },
        get pathRef() {
          return ref;
        },
        set pathRef($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!----> `);
    children?.($$payload2, {
      centroid: trackArcCentroid,
      boundingBox,
      value: motionEndAngle.current,
      getTrackTextProps,
      getArcTextProps
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref: refProp, trackRef: trackRefProp });
  pop();
}
Arc.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
ColorRamp[FILENAME] = "node_modules/layerchart/dist/components/ColorRamp.svelte";
function ColorRamp($$payload, $$props) {
  push(ColorRamp);
  let {
    interpolator,
    steps = 10,
    height = "20px",
    width = "100%",
    ref: refProp = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let href = "";
  $$payload.out.push(`<image${spread_attributes(
    {
      href,
      preserveAspectRatio: "none",
      height,
      width,
      ...extractLayerProps(restProps, "color-ramp")
    },
    null,
    void 0,
    void 0,
    3
  )}>`);
  push_element($$payload, "image", 80, 0);
  $$payload.out.push(`</image>`);
  pop_element();
  bind_props($$props, { ref: refProp });
  pop();
}
ColorRamp.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Legend[FILENAME] = "node_modules/layerchart/dist/components/Legend.svelte";
function Legend($$payload, $$props) {
  push(Legend);
  let {
    scale: scaleProp,
    title = "",
    width = 320,
    height = 10,
    ticks = width / 64,
    tickFormat: tickFormatProp,
    tickValues: tickValuesProp,
    tickFontSize = 10,
    tickLength: tickLengthProp = 4,
    placement,
    orientation = "horizontal",
    onclick,
    onpointerenter,
    onpointerleave: onpointerleave2,
    variant = "ramp",
    classes = {},
    ref: refProp = void 0,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const ctx = getChartContext();
  const scale = scaleProp ?? ctx.cScale;
  const scaleConfig = (() => {
    if (!scale) {
      return {
        xScale: void 0,
        interpolator: void 0,
        swatches: void 0,
        tickLabelOffset: 0,
        tickLine: true,
        tickLength: tickLengthProp,
        tickFormat: tickFormatProp,
        tickValues: tickValuesProp
      };
    } else if (scale.interpolate) {
      const n2 = Math.min(scale.domain().length, scale.range().length);
      const xScale = scale.copy().rangeRound?.(quantize(interpolate(0, width), n2));
      const interpolator = scale.copy().domain(quantize(interpolate(0, 1), n2));
      const _tickFormat = tickFormatProp ?? xScale?.tickFormat?.();
      return {
        xScale,
        interpolator,
        tickFormat: _tickFormat,
        tickLabelOffset: 0,
        tickLine: true,
        tickValues: tickValuesProp,
        tickLength: tickLengthProp,
        swatches: void 0
      };
    } else if (scale.interpolator) {
      const xScale = Object.assign(scale.copy().interpolator(interpolateRound(0, width)), {
        range() {
          return [0, width];
        }
      });
      const interpolator = scale.interpolator();
      let tickValues = tickValuesProp;
      if (!xScale.ticks) {
        if (tickValues === void 0) {
          const n2 = Math.round(ticks + 1);
          tickValues = range(n2).map((i) => quantile(scale.domain(), i / (n2 - 1)));
        }
      }
      const tickFormat = tickFormatProp ?? xScale.tickFormat?.();
      return {
        interpolator,
        tickValues,
        tickFormat,
        swatches: void 0,
        tickLabelOffset: 0,
        tickLine: true,
        tickLength: tickLengthProp,
        xScale
      };
    } else if (scale.invertExtent) {
      const thresholds = scale.thresholds ? scale.thresholds() : (
        // scaleQuantize
        scale.quantiles ? scale.quantiles() : (
          // scaleQuantile
          scale.domain()
        )
      );
      const xScale = scaleLinear().domain([-1, scale.range().length - 1]).rangeRound([0, width]);
      const swatches = scale.range().map((d, i) => {
        return {
          x: xScale(i - 1),
          y: 0,
          width: xScale(i) - xScale(i - 1),
          height,
          fill: d
        };
      });
      const tickValues = range(thresholds.length);
      const tickFormat = (i) => {
        const value = thresholds[i];
        return tickFormatProp ? format(value, tickFormatProp) : value;
      };
      return {
        xScale,
        swatches,
        tickValues,
        tickFormat,
        tickLabelOffset: 0,
        tickLine: true,
        tickLength: tickLengthProp,
        interpolator: void 0
      };
    } else {
      const xScale = scaleBand().domain(scale.domain()).rangeRound([0, width]);
      const swatches = scale.domain().map((d) => {
        return {
          x: xScale(d),
          y: 0,
          width: Math.max(0, xScale.bandwidth() - 1),
          height,
          fill: scale(d)
        };
      });
      const tickValues = scale.domain();
      const tickLabelOffset = xScale.bandwidth() / 2;
      const tickLine = false;
      const tickLength = 0;
      return {
        xScale,
        tickFormat: tickFormatProp,
        tickLabelOffset,
        tickLine,
        tickLength,
        tickValues,
        swatches,
        interpolator: void 0
      };
    }
  })();
  $$payload.out.push(`<div${spread_attributes(
    {
      ...restProps,
      "data-placement": placement,
      class: clsx(cls(
        layerClass("legend-container"),
        "inline-block",
        "z-1",
        // stack above tooltip context layers (band rects, voronoi, ...)
        placement && [
          "absolute",
          {
            "top-left": "top-0 left-0",
            top: "top-0 left-1/2 -translate-x-1/2",
            "top-right": "top-0 right-0",
            left: "top-1/2 left-0 -translate-y-1/2",
            center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            right: "top-1/2 right-0 -translate-y-1/2",
            "bottom-left": "bottom-0 left-0",
            bottom: "bottom-0 left-1/2 -translate-x-1/2",
            "bottom-right": "bottom-0 right-0"
          }[placement]
        ],
        className,
        classes.root
      ))
    },
    null
  )}>`);
  push_element($$payload, "div", 295, 0);
  $$payload.out.push(`<div${attr_class(clsx(cls(layerClass("legend-title"), "text-[10px] font-semibold", classes.title)))}>`);
  push_element($$payload, "div", 321, 2);
  $$payload.out.push(`${escape_html(title)}</div>`);
  pop_element();
  $$payload.out.push(` `);
  if (children) {
    $$payload.out.push("<!--[-->");
    children($$payload, {
      values: scaleConfig.tickValues ?? scaleConfig.xScale?.ticks?.(ticks) ?? [],
      scale
    });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (variant === "ramp") {
      $$payload.out.push("<!--[-->");
      const each_array_1 = ensure_array_like(tickValuesProp ?? scaleConfig.xScale?.ticks?.(ticks) ?? []);
      $$payload.out.push(`<svg${attr("width", width)}${attr("height", height + tickLengthProp + tickFontSize)}${attr("viewBox", `0 0 ${stringify(width)} ${stringify(height + tickLengthProp + tickFontSize)}`)}${attr_class(clsx(cls(layerClass("legend-ramp-svg"), "overflow-visible")))}>`);
      push_element($$payload, "svg", 330, 4);
      $$payload.out.push(`<g${attr_class(clsx(layerClass("legend-ramp-g")))}>`);
      push_element($$payload, "g", 336, 6);
      if (scaleConfig.interpolator) {
        $$payload.out.push("<!--[-->");
        ColorRamp($$payload, {
          width,
          height,
          interpolator: scaleConfig.interpolator,
          class: layerClass("legend-color-ramp")
        });
      } else {
        $$payload.out.push("<!--[!-->");
        if (scaleConfig.swatches) {
          $$payload.out.push("<!--[-->");
          const each_array = ensure_array_like(scaleConfig.swatches);
          $$payload.out.push(`<!--[-->`);
          for (let i = 0, $$length = each_array.length; i < $$length; i++) {
            let swatch = each_array[i];
            $$payload.out.push(`<rect${spread_attributes({ ...extractLayerProps(swatch, "legend-swatch") }, null, void 0, void 0, 3)}>`);
            push_element($$payload, "rect", 346, 12);
            $$payload.out.push(`</rect>`);
            pop_element();
          }
          $$payload.out.push(`<!--]-->`);
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]-->`);
      }
      $$payload.out.push(`<!--]--></g>`);
      pop_element();
      $$payload.out.push(`<g${attr_class(clsx(layerClass("legend-tick-group")))}>`);
      push_element($$payload, "g", 351, 6);
      $$payload.out.push(`<!--[-->`);
      for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
        let tick2 = each_array_1[i];
        $$payload.out.push(`<text text-anchor="middle"${attr("x", scaleConfig.xScale?.(tick2) + scaleConfig.tickLabelOffset)}${attr("y", height + tickLengthProp + tickFontSize)}${attr_class(clsx(cls(layerClass("legend-tick-text"), "text-[10px] fill-surface-content", classes.label)))}${attr_style("", { "font-size": tickFontSize })}>`);
        push_element($$payload, "text", 353, 10);
        $$payload.out.push(`${escape_html(tickFormatProp ? format(tick2, asAny(tickFormatProp)) : tick2)}</text>`);
        pop_element();
        if (scaleConfig.tickLine) {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<line${attr("x1", scaleConfig.xScale?.(tick2))}${attr("y1", 0)}${attr("x2", scaleConfig.xScale?.(tick2))}${attr("y2", height + tickLengthProp)}${attr_class(clsx(cls(layerClass("legend-tick-line"), "stroke-surface-content", classes.tick)))}>`);
          push_element($$payload, "line", 369, 12);
          $$payload.out.push(`</line>`);
          pop_element();
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]-->`);
      }
      $$payload.out.push(`<!--]--></g>`);
      pop_element();
      $$payload.out.push(`</svg>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
      if (variant === "swatches") {
        $$payload.out.push("<!--[-->");
        const each_array_2 = ensure_array_like(scaleConfig.tickValues ?? scaleConfig.xScale?.ticks?.(ticks) ?? []);
        $$payload.out.push(`<div${attr_class(clsx(cls(layerClass("legend-swatch-group"), "flex gap-x-4 gap-y-1", orientation === "vertical" && "flex-col", classes.items)))}>`);
        push_element($$payload, "div", 381, 4);
        $$payload.out.push(`<!--[-->`);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let tick2 = each_array_2[$$index_2];
          const color = scale?.(tick2) ?? "";
          const item = { value: tick2, color };
          $$payload.out.push(`<button${attr_class(clsx(cls(layerClass("legend-swatch-button"), "flex items-center gap-1 truncate", !onclick && "cursor-auto", typeof classes.item === "function" ? classes.item(item) : classes.item)))}>`);
          push_element($$payload, "button", 392, 8);
          $$payload.out.push(`<div${attr_class(clsx(cls(layerClass("legend-swatch"), "h-4 w-4 shrink-0 rounded-full", classes.swatch)))}${attr_style("", { "background-color": color })}>`);
          push_element($$payload, "div", 403, 10);
          $$payload.out.push(`</div>`);
          pop_element();
          $$payload.out.push(` <div${attr_class(clsx(cls(layerClass("legend-swatch-label"), "text-xs text-surface-content truncate whitespace-nowrap", classes.label)))}>`);
          push_element($$payload, "div", 411, 10);
          $$payload.out.push(`${escape_html(tickFormatProp ? format(tick2, asAny(tickFormatProp)) : tick2)}</div>`);
          pop_element();
          $$payload.out.push(`</button>`);
          pop_element();
        }
        $$payload.out.push(`<!--]--></div>`);
        pop_element();
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  bind_props($$props, { ref: refProp });
  pop();
}
Legend.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
TooltipHeader[FILENAME] = "node_modules/layerchart/dist/components/tooltip/TooltipHeader.svelte";
function TooltipHeader($$payload, $$props) {
  push(TooltipHeader);
  let {
    ref: refProp = void 0,
    colorRef: colorRefProp = void 0,
    value,
    format: format$1,
    color,
    classes = { root: "", color: "" },
    props = { root: {}, color: {} },
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      class: clsx(cls(layerClass("tooltip-header"), "font-semibold whitespace-nowrap border-b mb-1 pb-1 flex items-center gap-2", classes.root, props.root?.class, className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 91, 0);
  if (color) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div${attr_class(clsx(cls(layerClass("tooltip-header-color"), "color", "inline-block size-2 rounded-full bg-[var(--color)]", classes.color)))}${attr_style("", { "--color": color })}>`);
    push_element($$payload, "div", 103, 4);
    $$payload.out.push(`</div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (children) {
    $$payload.out.push("<!--[-->");
    children?.($$payload);
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`${escape_html(format$1 ? format(value, asAny(format$1)) : value)}`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  bind_props($$props, { ref: refProp, colorRef: colorRefProp });
  pop();
}
TooltipHeader.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
TooltipItem[FILENAME] = "node_modules/layerchart/dist/components/tooltip/TooltipItem.svelte";
function TooltipItem($$payload, $$props) {
  push(TooltipItem);
  let {
    ref: refProp = void 0,
    labelRef: labelRefProp = void 0,
    valueRef: valueRefProp = void 0,
    colorRef: colorRefProp = void 0,
    label,
    value,
    format: format$1,
    valueAlign = "left",
    color,
    classes = { root: "", label: "", value: "", color: "" },
    props = { root: {}, label: {}, value: {}, color: {} },
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      ...props.root,
      class: clsx(cls(layerClass("tooltip-item-root"), "contents", classes.root, className, props.root?.class)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 130, 0);
  $$payload.out.push(`<div${spread_attributes(
    {
      ...props.label,
      class: clsx(cls(layerClass("tooltip-item-label"), "label", "flex items-center gap-2 whitespace-nowrap", classes.label, props.label?.class))
    },
    null
  )}>`);
  push_element($$payload, "div", 142, 2);
  if (color) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div${spread_attributes(
      {
        ...props.color,
        class: clsx(cls(layerClass("tooltip-item-color"), "color", "inline-block size-2 rounded-full bg-[var(--color)]", classes.color, props.color?.class))
      },
      null,
      void 0,
      { "--color": color }
    )}>`);
    push_element($$payload, "div", 154, 6);
    $$payload.out.push(`</div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (typeof label === "function") {
    $$payload.out.push("<!--[-->");
    label($$payload);
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`${escape_html(label)}`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  $$payload.out.push(` <div${spread_attributes(
    {
      ...props.value,
      class: clsx(cls(
        layerClass("tooltip-item-value"),
        "value",
        "tabular-nums",
        {
          "text-right": valueAlign === "right",
          "text-center": valueAlign === "center"
        },
        classes.value,
        props.value?.class
      ))
    },
    null
  )}>`);
  push_element($$payload, "div", 174, 2);
  if (children) {
    $$payload.out.push("<!--[-->");
    children($$payload);
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`${escape_html(format$1 ? format(value, asAny(format$1)) : value)}`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  bind_props($$props, {
    ref: refProp,
    labelRef: labelRefProp,
    valueRef: valueRefProp,
    colorRef: colorRefProp
  });
  pop();
}
TooltipItem.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
TooltipList[FILENAME] = "node_modules/layerchart/dist/components/tooltip/TooltipList.svelte";
function TooltipList($$payload, $$props) {
  push(TooltipList);
  let {
    ref: refProp = void 0,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      class: clsx(cls(layerClass("tooltip-list"), "grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 items-start", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 22, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref: refProp });
  pop();
}
TooltipList.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
TooltipSeparator[FILENAME] = "node_modules/layerchart/dist/components/tooltip/TooltipSeparator.svelte";
function TooltipSeparator($$payload, $$props) {
  push(TooltipSeparator);
  let {
    ref: refProp = void 0,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      class: clsx(cls(layerClass("tooltip-separator"), "rounded-sm bg-surface-content/20 my-1 col-span-full h-px", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 21, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref: refProp });
  pop();
}
TooltipSeparator.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tooltip[FILENAME] = "node_modules/layerchart/dist/components/tooltip/Tooltip.svelte";
function Tooltip($$payload, $$props) {
  push(Tooltip);
  let {
    anchor = "top-left",
    classes = {},
    contained = "container",
    motion = "spring",
    pointerEvents = false,
    variant = "default",
    x = "pointer",
    xOffset = x === "pointer" ? 10 : 0,
    y = "pointer",
    yOffset = y === "pointer" ? 10 : 0,
    children,
    rootRef: rootRefProp = void 0,
    props = { root: {}, container: {}, content: {} },
    class: className
  } = $$props;
  const ctx = getChartContext();
  const tooltipCtx = getTooltipContext();
  let tooltipWidth = 0;
  let tooltipHeight = 0;
  function alignValue(value, align, additionalOffset, tooltipSize) {
    const alignOffset = align === "center" ? tooltipSize / 2 : align === "end" ? tooltipSize : 0;
    return value + (align === "end" ? -additionalOffset : additionalOffset) - alignOffset;
  }
  const positions = (() => {
    if (!tooltipCtx.data) {
      const tooltipX = run(() => tooltipCtx.x);
      const tooltipY = run(() => tooltipCtx.y);
      return { x: tooltipX, y: tooltipY };
    }
    const xBandOffset = isScaleBand(ctx.xScale) ? ctx.xScale.step() / 2 - ctx.xScale.padding() * ctx.xScale.step() / 2 : 0;
    const xValue = typeof x === "number" ? x : x === "data" ? ctx.xGet(tooltipCtx.data) + ctx.padding.left + xBandOffset : tooltipCtx.x;
    let xAlign = "start";
    switch (anchor) {
      case "top-left":
      case "left":
      case "bottom-left":
        xAlign = "start";
        break;
      case "top":
      case "center":
      case "bottom":
        xAlign = "center";
        break;
      case "top-right":
      case "right":
      case "bottom-right":
        xAlign = "end";
        break;
    }
    const yBandOffset = isScaleBand(ctx.yScale) ? ctx.yScale.step() / 2 - ctx.yScale.padding() * ctx.yScale.step() / 2 : 0;
    const yValue = typeof y === "number" ? y : y === "data" ? ctx.yGet(tooltipCtx.data) + ctx.padding.top + yBandOffset : tooltipCtx.y;
    let yAlign = "start";
    switch (anchor) {
      case "top-left":
      case "top":
      case "top-right":
        yAlign = "start";
        break;
      case "left":
      case "center":
      case "right":
        yAlign = "center";
        break;
      case "bottom-left":
      case "bottom":
      case "bottom-right":
        yAlign = "end";
        break;
    }
    const rect = {
      top: alignValue(yValue, yAlign, yOffset, tooltipHeight),
      left: alignValue(xValue, xAlign, xOffset, tooltipWidth),
      // set below
      bottom: 0,
      right: 0
    };
    rect.bottom = rect.top + tooltipHeight;
    rect.right = rect.left + tooltipWidth;
    if (contained === "container") {
      if (typeof x !== "number") {
        if ((xAlign === "start" || xAlign === "center") && rect.right > ctx.containerWidth) {
          rect.left = alignValue(xValue, "end", xOffset, tooltipWidth);
        }
        if ((xAlign === "end" || xAlign === "center") && rect.left < ctx.padding.left) {
          rect.left = alignValue(xValue, "start", xOffset, tooltipWidth);
        }
      }
      rect.right = rect.left + tooltipWidth;
      if (typeof y !== "number") {
        if ((yAlign === "start" || yAlign === "center") && rect.bottom > ctx.containerHeight) {
          rect.top = alignValue(yValue, "end", yOffset, tooltipHeight);
        }
        if ((yAlign === "end" || yAlign === "center") && rect.top < ctx.padding.top) {
          rect.top = alignValue(yValue, "start", yOffset, tooltipHeight);
        }
      }
      rect.bottom = rect.top + tooltipHeight;
    }
    return { x: rect.left, y: rect.top };
  })();
  const motionX = createMotion(tooltipCtx.x, () => positions.x, motion);
  const motionY = createMotion(tooltipCtx.y, () => positions.y, motion);
  if (tooltipCtx.data) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div${spread_attributes(
      {
        ...props.root,
        class: clsx(cls("root", layerClass("tooltip-root"), classes.root, props.root?.class))
      },
      "svelte-1fmt6",
      { "pointer-events-none": !pointerEvents },
      {
        top: `${stringify(motionY.current)}px`,
        left: `${stringify(motionX.current)}px`
      }
    )}>`);
    push_element($$payload, "div", 360, 2);
    $$payload.out.push(`<div${spread_attributes(
      {
        ...props.container,
        class: clsx(cls(
          layerClass("tooltip-container"),
          variant !== "none" && ["text-sm py-1 px-2 h-full rounded-sm elevation-1"],
          {
            default: [
              "bg-surface-100/90 dark:bg-surface-300/90 backdrop-filter backdrop-blur-[2px] text-surface-content",
              "[&_.label]:text-surface-content/75"
            ],
            invert: [
              "bg-surface-content/90 backdrop-filter backdrop-blur-[2px] text-surface-100 border border-surface-content",
              "[&_.label]:text-surface-100/50"
            ],
            none: ""
          }[variant],
          classes.container,
          props.container?.class,
          className
        ))
      },
      "svelte-1fmt6"
    )}>`);
    push_element($$payload, "div", 377, 4);
    if (children) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div${spread_attributes(
        {
          ...props.content,
          class: clsx(cls(layerClass("tooltip-content"), classes.content))
        },
        "svelte-1fmt6"
      )}>`);
      push_element($$payload, "div", 399, 8);
      children($$payload, { data: tooltipCtx.data, payload: tooltipCtx.payload });
      $$payload.out.push(`<!----></div>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
    pop_element();
    $$payload.out.push(`</div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { rootRef: rootRefProp });
  pop();
}
Tooltip.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Area[FILENAME] = "node_modules/layerchart/dist/components/Area.svelte";
function Area($$payload, $$props) {
  push(Area);
  const ctx = getChartContext();
  const renderCtx = getRenderContext();
  let {
    clipPath,
    curve,
    data,
    defined,
    fill,
    fillOpacity,
    line: line2 = false,
    opacity,
    pathData,
    stroke,
    strokeWidth,
    motion,
    x,
    y0,
    y1,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const xAccessor = x ? accessor(x) : ctx.x;
  const y0Accessor = y0 ? accessor(y0) : (d2) => min(ctx.yDomain);
  const y1Accessor = y1 ? accessor(y1) : ctx.y;
  const xOffset = isScaleBand(ctx.xScale) ? ctx.xScale.bandwidth() / 2 : 0;
  const yOffset = isScaleBand(ctx.yScale) ? ctx.yScale.bandwidth() / 2 : 0;
  const extractedTween = extractTweenConfig(motion);
  const tweenOptions = extractedTween ? {
    type: extractedTween.type,
    options: { interpolate: interpolatePath, ...extractedTween.options }
  } : void 0;
  function defaultPathData() {
    if (!tweenOptions) {
      return "";
    } else if (pathData) {
      return flattenPathData(pathData, Math.min(ctx.yScale(0), ctx.yRange[0]));
    } else if (ctx.config.x) {
      const path2 = ctx.radial ? areaRadial().angle((d2) => ctx.xScale(xAccessor(d2))).innerRadius(() => Math.min(ctx.yScale(0), ctx.yRange[0])).outerRadius(() => Math.min(ctx.yScale(0), ctx.yRange[0])) : area().x((d2) => ctx.xScale(xAccessor(d2)) + xOffset).y0(() => Math.min(ctx.yScale(0), ctx.yRange[0])).y1(() => Math.min(ctx.yScale(0), ctx.yRange[0]));
      path2.defined(defined ?? ((d2) => xAccessor(d2) != null && y1Accessor(d2) != null));
      if (curve) path2.curve(curve);
      return path2(data ?? ctx.data);
    }
  }
  const d = (() => {
    const _path = ctx.radial ? areaRadial().angle((d2) => ctx.xScale(xAccessor(d2))).innerRadius((d2) => ctx.yScale(y0Accessor(d2))).outerRadius((d2) => ctx.yScale(y1Accessor(d2))) : area().x((d2) => {
      const v = xAccessor(d2);
      return ctx.xScale(v) + xOffset;
    }).y0((d2) => {
      let value = max(ctx.yRange);
      if (y0) {
        value = ctx.yScale(y0Accessor(d2));
      } else if (Array.isArray(ctx.config.y) && ctx.config.y[0] === 0) {
        value = ctx.yScale(ctx.y(d2)[0]);
      }
      return value + yOffset;
    }).y1((d2) => {
      let value = max(ctx.yRange);
      if (y1) {
        value = ctx.yScale(y1Accessor(d2));
      } else if (Array.isArray(ctx.config.y) && ctx.config.y[1] === 1) {
        value = ctx.yScale(ctx.y(d2)[1]);
      } else {
        value = ctx.yScale(ctx.y(d2));
      }
      return value + yOffset;
    });
    _path.defined(defined ?? ((d2) => xAccessor(d2) != null && y1Accessor(d2) != null));
    if (curve) _path.curve(curve);
    return pathData ?? _path(data ?? ctx.data) ?? defaultPathData();
  })();
  const tweenState = createMotion(defaultPathData(), () => d, tweenOptions);
  createKey(() => fill);
  createKey(() => stroke);
  if (renderCtx === "canvas") {
    registerCanvasComponent({
      events: {
        click: restProps.onclick,
        pointerenter: restProps.onpointerenter,
        pointermove: restProps.onpointermove,
        pointerleave: restProps.onpointerleave
      }
    });
  }
  if (line2) {
    $$payload.out.push("<!--[-->");
    Spline($$payload, spread_props([
      { data, x, y: y1, curve, defined, motion },
      extractLayerProps(line2, "area-line")
    ]));
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  if (renderCtx === "svg") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<path${spread_attributes(
      {
        d: tweenState.current,
        "clip-path": clipPath,
        fill,
        "fill-opacity": fillOpacity,
        stroke,
        "stroke-width": strokeWidth,
        opacity,
        ...extractLayerProps(restProps, "area-path")
      },
      null,
      void 0,
      void 0,
      3
    )}>`);
    push_element($$payload, "path", 246, 2);
    $$payload.out.push(`</path>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Area.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Line[FILENAME] = "node_modules/layerchart/dist/components/Line.svelte";
function Line($$payload, $$props) {
  push(Line);
  const uid = props_id($$payload);
  let {
    x1,
    initialX1 = x1,
    y1,
    initialY1 = y1,
    x2,
    initialX2 = x2,
    y2,
    initialY2 = y2,
    class: className,
    strokeWidth,
    opacity,
    fill,
    stroke,
    marker,
    markerEnd,
    markerStart,
    markerMid,
    motion,
    fillOpacity,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const markerStartId = markerStart || marker ? createId("marker-start", uid) : "";
  const markerMidId = markerMid || marker ? createId("marker-mid", uid) : "";
  const markerEndId = markerEnd || marker ? createId("marker-end", uid) : "";
  const motionX1 = createMotion(initialX1, () => x1, motion);
  const motionY1 = createMotion(initialY1, () => y1, motion);
  const motionX2 = createMotion(initialX2, () => x2, motion);
  const motionY2 = createMotion(initialY2, () => y2, motion);
  const renderCtx = getRenderContext();
  createKey(() => fill);
  createKey(() => stroke);
  if (renderCtx === "canvas") {
    registerCanvasComponent({
      events: {
        click: restProps.onclick,
        pointerenter: restProps.onpointerenter,
        pointermove: restProps.onpointermove,
        pointerleave: restProps.onpointerleave
      }
    });
  }
  if (renderCtx === "svg") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<line${spread_attributes(
      {
        x1: motionX1.current,
        y1: motionY1.current,
        x2: motionX2.current,
        y2: motionY2.current,
        fill,
        stroke,
        "fill-opacity": fillOpacity,
        "stroke-width": strokeWidth,
        opacity,
        "marker-start": markerStartId ? `url(#${markerStartId})` : void 0,
        "marker-mid": markerMidId ? `url(#${markerMidId})` : void 0,
        "marker-end": markerEndId ? `url(#${markerEndId})` : void 0,
        class: clsx(cls(layerClass("line"), stroke === void 0 && "stroke-surface-content", className)),
        ...restProps
      },
      null,
      void 0,
      void 0,
      3
    )}>`);
    push_element($$payload, "line", 185, 2);
    $$payload.out.push(`</line>`);
    pop_element();
    MarkerWrapper($$payload, { id: markerStartId, marker: markerStart ?? marker });
    $$payload.out.push(`<!---->`);
    MarkerWrapper($$payload, { id: markerMidId, marker: markerMid ?? marker });
    $$payload.out.push(`<!---->`);
    MarkerWrapper($$payload, { id: markerEndId, marker: markerEnd ?? marker });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Line.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Rule[FILENAME] = "node_modules/layerchart/dist/components/Rule.svelte";
function Rule($$payload, $$props) {
  push(Rule);
  let {
    data: dataProp,
    x = false,
    xOffset = 0,
    y = false,
    yOffset = 0,
    stroke: strokeProp,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const ctx = getChartContext();
  const data = chartDataArray(dataProp ?? ctx.data);
  const singleX = typeof x === "number" || x instanceof Date || x === true || x === "$left" || x === "$right" || isScaleBand(ctx.xScale) && ctx.xDomain.includes(x);
  const singleY = typeof y === "number" || y instanceof Date || y === true || y === "$bottom" || y === "$top" || isScaleBand(ctx.yScale) && ctx.yDomain.includes(y);
  const xRangeMinMax = extent(ctx.xRange);
  const yRangeMinMax = extent(ctx.yRange);
  const lines = (() => {
    const result = [];
    if (singleX) {
      const _x = x === true || x === "$left" ? xRangeMinMax[0] : x === "$right" ? xRangeMinMax[1] : ctx.xScale(x) + xOffset;
      result.push({
        x1: _x,
        y1: ctx.yRange[0] || 0,
        x2: _x,
        y2: ctx.yRange[1] || 0,
        axis: "x"
      });
    }
    if (singleY) {
      const _y = y === true || y === "$bottom" ? yRangeMinMax[1] : y === "$top" ? yRangeMinMax[0] : ctx.yScale(y) + yOffset;
      result.push({
        x1: ctx.xRange[0] || 0,
        y1: _y,
        x2: ctx.xRange[1] || 0,
        y2: _y,
        axis: "y"
      });
    }
    if (!singleX && !singleY) {
      const xAccessor = x !== false ? accessor(x) : ctx.x;
      const yAccessor = y !== false ? accessor(y) : ctx.y;
      const xBandOffset = isScaleBand(ctx.xScale) ? ctx.xScale.bandwidth() / 2 : 0;
      const yBandOffset = isScaleBand(ctx.yScale) ? ctx.yScale.bandwidth() / 2 : 0;
      for (const d of data) {
        const xValue = xAccessor(d);
        const yValue = yAccessor(d);
        const x1Value = Array.isArray(xValue) ? xValue[0] : isScaleNumeric(ctx.xScale) ? 0 : xValue;
        const x2Value = Array.isArray(xValue) ? xValue[1] : xValue;
        const y1Value = Array.isArray(yValue) ? yValue[0] : isScaleNumeric(ctx.yScale) ? 0 : yValue;
        const y2Value = Array.isArray(yValue) ? yValue[1] : yValue;
        result.push({
          x1: ctx.xScale(x1Value) + xBandOffset + xOffset,
          y1: ctx.yScale(y1Value) + yBandOffset + yOffset,
          x2: ctx.xScale(x2Value) + xBandOffset + xOffset,
          y2: ctx.yScale(y2Value) + yBandOffset + yOffset,
          axis: Array.isArray(yValue) || isScaleBand(ctx.xScale) ? "x" : "y",
          // TODO: what about single prop like lollipop?
          stroke: strokeProp ?? ctx.config.c ? ctx.cGet(d) : null
          // use color scale, if available
        });
      }
    }
    return result.filter((line2) => {
      return line2.x1 >= xRangeMinMax[0] && line2.x2 <= xRangeMinMax[1] && line2.y1 >= yRangeMinMax[0] && line2.y2 <= yRangeMinMax[1];
    });
  })();
  Group($$payload, {
    class: (
      // $inspect({ lines });
      layerClass("rule-g")
    ),
    children: prevent_snippet_stringification(($$payload2) => {
      const each_array = ensure_array_like(lines);
      $$payload2.out.push(`<!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let line2 = each_array[$$index];
        const stroke = line2.stroke;
        if (ctx.radial) {
          $$payload2.out.push("<!--[-->");
          if (line2.axis === "x") {
            $$payload2.out.push("<!--[-->");
            const [x1, y1] = pointRadial(line2.x1, line2.y1);
            const [x2, y2] = pointRadial(line2.x2, line2.y2);
            Line($$payload2, spread_props([
              restProps,
              {
                x1,
                y1,
                x2,
                y2,
                stroke,
                class: cls(layerClass("rule-x-radial-line"), !stroke && "stroke-surface-content/10", className)
              }
            ]));
          } else {
            $$payload2.out.push("<!--[!-->");
            if (line2.axis === "y") {
              $$payload2.out.push("<!--[-->");
              Circle($$payload2, {
                r: line2.y1,
                stroke,
                class: cls(layerClass("rule-y-radial-circle"), !stroke && "stroke-surface-content/50", "fill-none", className)
              });
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]-->`);
          }
          $$payload2.out.push(`<!--]-->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          Line($$payload2, spread_props([
            restProps,
            {
              x1: line2.x1,
              y1: line2.y1,
              x2: line2.x2,
              y2: line2.y2,
              stroke,
              class: cls(layerClass(line2.axis === "x" ? "rule-x-line" : "rule-y-line"), !stroke && "stroke-surface-content/50", className)
            }
          ]));
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]-->`);
    }),
    $$slots: { default: true }
  });
  pop();
}
Rule.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Text$1[FILENAME] = "node_modules/layerchart/dist/components/Text.svelte";
function getPathLength(pathRef) {
  return 0;
}
function Text$1($$payload, $$props) {
  push(Text$1);
  const uid = props_id($$payload);
  let {
    value,
    x = 0,
    initialX = x,
    y = 0,
    initialY = y,
    dx = 0,
    dy = 0,
    lineHeight = "1em",
    capHeight = "0.71em",
    width,
    scaleToFit = false,
    textAnchor = "start",
    verticalAnchor = "end",
    dominantBaseline = "auto",
    rotate,
    opacity = 1,
    strokeWidth = 0,
    stroke,
    fill,
    fillOpacity,
    motion,
    svgRef: svgRefProp = void 0,
    ref: refProp = void 0,
    class: className,
    svgProps = {},
    truncate = false,
    path: path2,
    pathId = createId("text-path", uid),
    startOffset = "0%",
    transform: transformProp,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const renderCtx = getRenderContext();
  let style = void 0;
  const resolvedWidth = path2 ? getPathLength() : width;
  const defaultTruncateOptions = {
    maxChars: void 0,
    position: "end",
    maxWidth: resolvedWidth
  };
  const truncateConfig = (() => {
    if (typeof truncate === "boolean") {
      if (truncate) return defaultTruncateOptions;
      return false;
    }
    return { ...defaultTruncateOptions, ...truncate };
  })();
  const rawText = value != null ? value.toString().replace(/\\n/g, "\n") : "";
  const textValue = (() => {
    if (!truncateConfig) return rawText;
    return truncateText(rawText, truncateConfig);
  })();
  const spaceWidth = getStringWidth(" ", style) || 0;
  const wordsByLines = (() => {
    const lines = textValue.split("\n");
    return lines.flatMap((line2) => {
      const words = line2.split(/(?:(?!\u00A0+)\s+)/);
      if (width == null) {
        return [{ words }];
      } else {
        return words.reduce(
          (result, item) => {
            const currentLine = result[result.length - 1];
            const itemWidth = getStringWidth(item, style) || 0;
            if (currentLine && (width == null || scaleToFit || (currentLine.width || 0) + itemWidth + spaceWidth < width)) {
              currentLine.words.push(item);
              currentLine.width = currentLine.width || 0;
              currentLine.width += itemWidth + spaceWidth;
            } else {
              const newLine = { words: [item], width: itemWidth };
              result.push(newLine);
            }
            return result;
          },
          []
        );
      }
    });
  })();
  const lineCount = wordsByLines.length;
  function getPixelValue(cssValue) {
    if (typeof cssValue === "number") return cssValue;
    const result = cssValue.match(/([\d.]+)(\D+)/);
    const number = Number(result?.[1]);
    switch (result?.[2]) {
      case "px":
        return number;
      case "em":
      case "rem":
        return number * 16;
      default:
        return 0;
    }
  }
  const startDy = (() => {
    if (verticalAnchor === "start") {
      return getPixelValue(lineHeight);
    } else if (verticalAnchor === "middle") {
      return (lineCount - 1) / 2 * -getPixelValue(lineHeight) + getPixelValue(capHeight) / 2;
    } else {
      return (lineCount - 1) * -getPixelValue(lineHeight) - getPixelValue(capHeight) / 2;
    }
  })();
  const scaleTransform = (() => {
    if (scaleToFit && lineCount > 0 && typeof x == "number" && typeof y == "number" && typeof width == "number") {
      const lineWidth = wordsByLines[0].width || 1;
      const sx = width / lineWidth;
      const sy = sx;
      const originX = x - sx * x;
      const originY = y - sy * y;
      return `matrix(${sx}, 0, 0, ${sy}, ${originX}, ${originY})`;
    } else {
      return "";
    }
  })();
  const rotateTransform = rotate ? `rotate(${rotate}, ${x}, ${y})` : "";
  const transform = transformProp ?? `${scaleTransform} ${rotateTransform}`;
  function isValidXOrY(xOrY) {
    return (
      // number that is not NaN or Infinity
      typeof xOrY === "number" && Number.isFinite(xOrY) || // for percentage
      typeof xOrY === "string"
    );
  }
  const motionX = createMotion(initialX, () => x, motion);
  const motionY = createMotion(initialY, () => y, motion);
  createKey(() => fill);
  createKey(() => stroke);
  if (renderCtx === "canvas") {
    registerCanvasComponent();
  }
  if (renderCtx === "svg") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<svg${spread_attributes(
      {
        x: dx,
        y: dy,
        ...svgProps,
        class: clsx(cls(layerClass("text-svg"), "overflow-visible [paint-order:stroke]", svgProps?.class))
      },
      null,
      void 0,
      void 0,
      3
    )}>`);
    push_element($$payload, "svg", 476, 2);
    if (path2) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<defs>`);
      push_element($$payload, "defs", 484, 6);
      $$payload.out.push(`<!---->`);
      {
        $$payload.out.push(`<path${attr("id", pathId)}${attr("d", path2)}>`);
        push_element($$payload, "path", 486, 10);
        $$payload.out.push(`</path>`);
        pop_element();
      }
      $$payload.out.push(`<!----></defs>`);
      pop_element();
      $$payload.out.push(`<text${spread_attributes(
        {
          dy,
          ...restProps,
          fill,
          "fill-opacity": fillOpacity,
          stroke,
          "stroke-width": strokeWidth,
          opacity,
          transform: transformProp,
          class: clsx(cls(layerClass("text"), fill === void 0 && "fill-surface-content", className))
        },
        null,
        void 0,
        void 0,
        3
      )}>`);
      push_element($$payload, "text", 489, 6);
      $$payload.out.push(`<textPath${attr_style(`text-anchor: ${stringify(textAnchor)};`)}${attr("dominant-baseline", dominantBaseline)}${attr("href", `#${stringify(pathId)}`)}${attr("startOffset", startOffset)}${attr_class(clsx(cls(layerClass("text-path"))))}>`);
      push_element($$payload, "textPath", 501, 8);
      $$payload.out.push(`${escape_html(wordsByLines.map((line2) => line2.words.join(" ")).join())}</textPath>`);
      pop_element();
      $$payload.out.push(`</text>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
      if (isValidXOrY(x) && isValidXOrY(y)) {
        $$payload.out.push("<!--[-->");
        const each_array = ensure_array_like(wordsByLines);
        $$payload.out.push(`<text${spread_attributes(
          {
            x: motionX.current,
            y: motionY.current,
            transform,
            "text-anchor": textAnchor,
            "dominant-baseline": dominantBaseline,
            ...restProps,
            fill,
            "fill-opacity": fillOpacity,
            stroke,
            "stroke-width": strokeWidth,
            opacity,
            class: clsx(cls(layerClass("text"), fill === void 0 && "fill-surface-content", className))
          },
          null,
          void 0,
          void 0,
          3
        )}>`);
        push_element($$payload, "text", 512, 6);
        $$payload.out.push(`<!--[-->`);
        for (let index2 = 0, $$length = each_array.length; index2 < $$length; index2++) {
          let line2 = each_array[index2];
          $$payload.out.push(`<tspan${attr("x", motionX.current)}${attr("dy", index2 === 0 ? startDy : getPixelValue(lineHeight))}${attr_class(clsx(layerClass("text-tspan")))}>`);
          push_element($$payload, "tspan", 528, 10);
          $$payload.out.push(`${escape_html(line2.words.join(" "))}</tspan>`);
          pop_element();
        }
        $$payload.out.push(`<!--]--></text>`);
        pop_element();
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]--></svg>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { svgRef: svgRefProp, ref: refProp });
  pop();
}
Text$1.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function getDurationFormat(duration, options2 = {
  multiline: false
}) {
  const { multiline = false, placement = "bottom" } = options2;
  return function(date, i) {
    let result = "";
    if (+duration >= +new Duration({ duration: { years: 1 } })) {
      result = format(date, "year");
    } else if (+duration >= +new Duration({ duration: { days: 28 } })) {
      const isFirst = i === 0 || +timeYear.floor(date) === +date;
      if (multiline) {
        result = [format(date, "month", { variant: "short" }), isFirst && format(date, "year")];
      } else {
        result = format(date, "month", { variant: "short" }) + (isFirst ? ` '${format(date, "year", { variant: "short" })}` : "");
      }
    } else if (+duration >= +new Duration({ duration: { days: 1 } })) {
      const isFirst = i === 0 || date.getDate() <= duration.days;
      if (multiline) {
        result = [
          format(date, "custom", { custom: DateToken.DayOfMonth_numeric }),
          isFirst && format(date, "month", { variant: "short" })
        ];
      } else {
        result = format(date, "day", { variant: "short" });
      }
    } else if (+duration >= +new Duration({ duration: { hours: 1 } })) {
      const isFirst = i === 0 || +timeDay.floor(date) === +date;
      if (multiline) {
        result = [
          format(date, "custom", { custom: DateToken.Hour_numeric }),
          isFirst && format(date, "day", { variant: "short" })
        ];
      } else {
        result = isFirst ? format(date, "day", { variant: "short" }) : format(date, "custom", { custom: DateToken.Hour_numeric });
      }
    } else if (+duration >= +new Duration({ duration: { minutes: 1 } })) {
      const isFirst = i === 0 || +timeDay.floor(date) === +date;
      if (multiline) {
        result = [
          format(date, "time", { variant: "short" }),
          isFirst && format(date, "day", { variant: "short" })
        ];
      } else {
        result = format(date, "time", { variant: "short" });
      }
    } else if (+duration >= +new Duration({ duration: { seconds: 1 } })) {
      const isFirst = i === 0 || +timeDay.floor(date) === +date;
      result = [
        format(date, "time"),
        multiline && isFirst && format(date, "day", { variant: "short" })
      ];
    } else if (+duration >= +new Duration({ duration: { milliseconds: 1 } })) {
      const isFirst = i === 0 || +timeDay.floor(date) === +date;
      result = [
        format(date, "custom", {
          custom: [
            DateToken.Hour_2Digit,
            DateToken.Minute_2Digit,
            DateToken.Second_2Digit,
            DateToken.MiliSecond_3,
            DateToken.Hour_woAMPM
          ]
        }),
        multiline && isFirst && format(date, "day", { variant: "short" })
      ];
    } else {
      result = date.toString();
    }
    if (Array.isArray(result)) {
      switch (placement) {
        case "top":
          return result.filter(Boolean).reverse().join("\n");
        case "bottom":
          return result.filter(Boolean).join("\n");
        case "left":
          return result.filter(Boolean).reverse().join(" ");
        case "right":
          return result.filter(Boolean).join(" ");
        default:
          return result.filter(Boolean).join("\n");
      }
    } else {
      return result;
    }
  };
}
function autoTickVals(scale, ticks, count2) {
  if (Array.isArray(ticks))
    return ticks;
  if (typeof ticks === "function")
    return ticks(scale) ?? [];
  if (isLiteralObject(ticks) && "interval" in ticks) {
    if (ticks.interval === null || !("ticks" in scale) || typeof scale.ticks !== "function") {
      return [];
    }
    return scale.ticks(ticks.interval);
  }
  if (isScaleBand(scale)) {
    return ticks && typeof ticks === "number" ? scale.domain().filter((_, i) => i % ticks === 0) : scale.domain();
  }
  if (scale.ticks && typeof scale.ticks === "function") {
    return scale.ticks(count2 ?? (typeof ticks === "number" ? ticks : void 0));
  }
  return [];
}
function autoTickFormat(options2) {
  const { scale, ticks, count: count2, formatType, multiline, placement } = options2;
  if (formatType) {
    return (tick2) => format(tick2, formatType);
  }
  if (isScaleTime(scale) && count2) {
    if (isLiteralObject(ticks) && "interval" in ticks && ticks.interval != null) {
      const start = ticks.interval.floor(/* @__PURE__ */ new Date());
      const end = ticks.interval.ceil(/* @__PURE__ */ new Date());
      return getDurationFormat(new Duration({ start, end }), { multiline, placement });
    } else {
      const [start, end] = timeTicks(scale.domain()[0], scale.domain()[1], count2);
      return getDurationFormat(new Duration({ start, end }), { multiline, placement });
    }
  }
  if (scale.tickFormat) {
    return scale.tickFormat(count2);
  }
  return (tick2) => `${tick2}`;
}
Axis[FILENAME] = "node_modules/layerchart/dist/components/Axis.svelte";
function Axis($$payload, $$props) {
  push(Axis);
  let {
    placement,
    label = "",
    labelPlacement = "middle",
    labelProps,
    rule = false,
    grid = false,
    ticks,
    tickSpacing = ["top", "bottom", "angle"].includes(placement) ? 80 : ["left", "right", "radius"].includes(placement) ? 50 : void 0,
    tickMultiline = false,
    tickLength = 4,
    tickMarks = true,
    format: format2,
    tickLabelProps,
    motion,
    transitionIn,
    transitionInParams,
    scale: scaleProp,
    classes = {},
    class: className,
    tickLabel,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const ctx = getChartContext();
  const orientation = placement === "angle" ? "angle" : placement === "radius" ? "radius" : ["top", "bottom"].includes(placement) ? "horizontal" : "vertical";
  const scale = scaleProp ?? (["horizontal", "angle"].includes(orientation) ? ctx.xScale : ctx.yScale);
  const interval = ["horizontal", "angle"].includes(orientation) ? ctx.xInterval : ctx.yInterval;
  const xRangeMinMax = extent(ctx.xRange);
  const yRangeMinMax = extent(ctx.yRange);
  const ctxSize = orientation === "vertical" ? ctx.height : orientation === "horizontal" ? ctx.width : orientation === "radius" ? ctx.height / 2 : orientation === "angle" ? ctx.width : null;
  const tickCount = typeof ticks === "number" ? ticks : tickSpacing && ctxSize ? Math.round(ctxSize / tickSpacing) : void 0;
  const tickVals = (() => {
    let tickVals2 = autoTickVals(scale, ticks, tickCount);
    if (interval != null) {
      tickVals2.pop();
    }
    const formatType = typeof format2 === "object" ? format2?.type : format2;
    if (formatType === "integer") {
      tickVals2 = tickVals2.filter(Number.isInteger);
    } else if (formatType === "year" || formatType === PeriodType.CalendarYear) {
      tickVals2 = tickVals2.filter((val) => +timeYear.floor(val) === +val);
    } else if (formatType === "month" || formatType === PeriodType.Month || formatType === PeriodType.MonthYear) {
      tickVals2 = tickVals2.filter((val) => val.getDate() < 7);
    } else if (formatType === "day" || formatType === PeriodType.Day) {
      tickVals2 = tickVals2.filter((val) => +timeDay.floor(val) === +val);
    } else if (formatType === "hour" || formatType === PeriodType.Hour) {
      tickVals2 = tickVals2.filter((val) => +timeHour.floor(val) === +val);
    } else if (formatType === "minute" || formatType === PeriodType.Minute) {
      tickVals2 = tickVals2.filter((val) => +timeMinute.floor(val) === +val);
    } else if (formatType === "second" || formatType === PeriodType.Second) {
      tickVals2 = tickVals2.filter((val) => +timeSecond.floor(val) === +val);
    } else if (formatType === "millisecond" || formatType === PeriodType.Millisecond) {
      tickVals2 = tickVals2.filter((val) => +timeMillisecond.floor(val) === +val);
    }
    return unique(tickVals2);
  })();
  const tickFormat = autoTickFormat({
    scale,
    ticks,
    count: tickCount,
    formatType: format2,
    multiline: tickMultiline,
    placement
  });
  function getCoords(tick2) {
    switch (placement) {
      case "top":
      case "bottom":
        return {
          x: scale(tick2) + (isScaleBand(scale) ? scale.bandwidth() / 2 : ctx.xInterval ? (scale(ctx.xInterval.offset(tick2)) - scale(tick2)) / 2 : (
            // offset 1/2 width of time interval
            0
          )),
          y: placement === "top" ? yRangeMinMax[0] : yRangeMinMax[1]
        };
      case "left":
      case "right":
        return {
          x: placement === "left" ? xRangeMinMax[0] : xRangeMinMax[1],
          y: scale(tick2) + (isScaleBand(scale) ? scale.bandwidth() / 2 : ctx.yInterval ? (scale(ctx.yInterval.offset(tick2)) - scale(tick2)) / 2 : (
            // offset 1/2 height of time interval
            0
          ))
        };
      case "angle":
        return { x: scale(tick2), y: yRangeMinMax[1] };
      case "radius":
        return {
          x: xRangeMinMax[0],
          y: scale(tick2) + (isScaleBand(scale) ? scale.bandwidth() / 2 : 0)
        };
    }
  }
  function getDefaultTickLabelProps(tick2) {
    switch (placement) {
      case "top":
        return { textAnchor: "middle", verticalAnchor: "end", dy: -tickLength };
      case "bottom":
        return {
          textAnchor: "middle",
          verticalAnchor: "start",
          dy: tickLength
        };
      case "left":
        return { textAnchor: "end", verticalAnchor: "middle", dx: -tickLength };
      case "right":
        return {
          textAnchor: "start",
          verticalAnchor: "middle",
          dx: tickLength
        };
      case "angle":
        const xValue = scale(tick2);
        return {
          textAnchor: xValue === 0 || Math.abs(xValue - Math.PI) < 0.01 || // ~180deg
          Math.abs(xValue - Math.PI * 2) < 0.01 ? (
            // ~360deg
            // ~360deg
            "middle"
          ) : xValue > Math.PI ? "end" : "start",
          verticalAnchor: "middle",
          dx: Math.sin(xValue) * tickLength,
          dy: -Math.cos(xValue) * (tickLength + 4)
          // manually adjusted until Text supports custom styles
        };
      case "radius":
        return { textAnchor: "middle", verticalAnchor: "middle", dx: 2 };
    }
  }
  const resolvedLabelX = (() => {
    if (placement === "left" || orientation === "horizontal" && labelPlacement === "start") {
      return -ctx.padding.left;
    } else if (placement === "right" || orientation === "horizontal" && labelPlacement === "end") {
      return ctx.width + ctx.padding.right;
    }
    return ctx.width / 2;
  })();
  const resolvedLabelY = (() => {
    if (placement === "top" || orientation === "vertical" && labelPlacement === "start") {
      return -ctx.padding.top;
    } else if (orientation === "vertical" && labelPlacement === "middle") {
      return ctx.height / 2;
    } else if (placement === "bottom" || labelPlacement === "end") {
      return ctx.height + ctx.padding.bottom;
    }
    return "0";
  })();
  const resolvedLabelTextAnchor = (() => {
    if (labelPlacement === "middle") {
      return "middle";
    } else if (placement === "right" || orientation === "horizontal" && labelPlacement === "end") {
      return "end";
    }
    return "start";
  })();
  const resolvedLabelVerticalAnchor = (() => {
    if (placement === "top" || orientation === "vertical" && labelPlacement === "start" || placement === "left" && labelPlacement === "middle") {
      return "start";
    }
    return "end";
  })();
  const resolvedLabelProps = {
    value: typeof label === "function" ? "" : label,
    x: resolvedLabelX,
    y: resolvedLabelY,
    textAnchor: resolvedLabelTextAnchor,
    verticalAnchor: resolvedLabelVerticalAnchor,
    rotate: orientation === "vertical" && labelPlacement === "middle" ? -90 : 0,
    // complement 10px text (until Text supports custom styles)
    capHeight: "7px",
    lineHeight: "11px",
    ...labelProps,
    class: cls(layerClass("axis-label"), "text-[10px] stroke-surface-100 [stroke-width:2px] font-light", classes.label, labelProps?.class)
  };
  Group($$payload, spread_props([
    restProps,
    {
      "data-placement": placement,
      class: cls(layerClass("axis"), `placement-${placement}`, classes.root, className),
      children: prevent_snippet_stringification(($$payload2) => {
        const each_array = ensure_array_like(tickVals);
        if (rule !== false) {
          $$payload2.out.push("<!--[-->");
          const ruleProps = extractLayerProps(rule, "axis-rule");
          Rule($$payload2, spread_props([
            {
              x: placement === "left" ? "$left" : placement === "right" ? "$right" : placement === "angle",
              y: placement === "top" ? "$top" : placement === "bottom" ? "$bottom" : placement === "radius",
              motion
            },
            ruleProps,
            {
              class: cls("stroke-surface-content/50", classes.rule, ruleProps?.class)
            }
          ]));
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--> `);
        if (typeof label === "function") {
          $$payload2.out.push("<!--[-->");
          label($$payload2, { props: resolvedLabelProps });
          $$payload2.out.push(`<!---->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          if (label) {
            $$payload2.out.push("<!--[-->");
            Text$1($$payload2, spread_props([resolvedLabelProps]));
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]-->`);
        }
        $$payload2.out.push(`<!--]--> <!--[-->`);
        for (let index2 = 0, $$length = each_array.length; index2 < $$length; index2++) {
          let tick2 = each_array[index2];
          const tickCoords = getCoords(tick2);
          const [radialTickCoordsX, radialTickCoordsY] = pointRadial(tickCoords.x, tickCoords.y);
          const [radialTickMarkCoordsX, radialTickMarkCoordsY] = pointRadial(tickCoords.x, tickCoords.y + tickLength);
          const resolvedTickLabelProps = {
            x: orientation === "angle" ? radialTickCoordsX : tickCoords.x,
            y: orientation === "angle" ? radialTickCoordsY : tickCoords.y,
            value: tickFormat(tick2, index2),
            ...getDefaultTickLabelProps(tick2),
            motion,
            capHeight: "7px",
            lineHeight: "11px",
            ...tickLabelProps,
            class: cls(layerClass("axis-tick-label"), "text-[10px] stroke-surface-100 [stroke-width:2px] font-light", classes.tickLabel, tickLabelProps?.class)
          };
          Group($$payload2, {
            transitionIn,
            transitionInParams,
            class: layerClass("axis-tick-group"),
            children: prevent_snippet_stringification(($$payload3) => {
              if (grid !== false) {
                $$payload3.out.push("<!--[-->");
                const ruleProps = extractLayerProps(grid, "axis-grid");
                Rule($$payload3, spread_props([
                  {
                    x: orientation === "horizontal" || orientation === "angle" ? tick2 : false,
                    y: orientation === "vertical" || orientation === "radius" ? tick2 : false,
                    motion
                  },
                  ruleProps,
                  {
                    class: cls("stroke-surface-content/10", classes.rule, ruleProps?.class)
                  }
                ]));
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]--> `);
              if (tickMarks) {
                $$payload3.out.push("<!--[-->");
                const tickClasses = cls(layerClass("axis-tick"), "stroke-surface-content/50", classes.tick);
                if (orientation === "horizontal") {
                  $$payload3.out.push("<!--[-->");
                  Line($$payload3, {
                    x1: tickCoords.x,
                    y1: tickCoords.y,
                    x2: tickCoords.x,
                    y2: tickCoords.y + (placement === "top" ? -tickLength : tickLength),
                    motion,
                    class: tickClasses
                  });
                } else {
                  $$payload3.out.push("<!--[!-->");
                  if (orientation === "vertical") {
                    $$payload3.out.push("<!--[-->");
                    Line($$payload3, {
                      x1: tickCoords.x,
                      y1: tickCoords.y,
                      x2: tickCoords.x + (placement === "left" ? -tickLength : tickLength),
                      y2: tickCoords.y,
                      motion,
                      class: tickClasses
                    });
                  } else {
                    $$payload3.out.push("<!--[!-->");
                    if (orientation === "angle") {
                      $$payload3.out.push("<!--[-->");
                      Line($$payload3, {
                        x1: radialTickCoordsX,
                        y1: radialTickCoordsY,
                        x2: radialTickMarkCoordsX,
                        y2: radialTickMarkCoordsY,
                        motion,
                        class: tickClasses
                      });
                    } else {
                      $$payload3.out.push("<!--[!-->");
                    }
                    $$payload3.out.push(`<!--]-->`);
                  }
                  $$payload3.out.push(`<!--]-->`);
                }
                $$payload3.out.push(`<!--]-->`);
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]--> `);
              if (tickLabel) {
                $$payload3.out.push("<!--[-->");
                tickLabel($$payload3, { props: resolvedTickLabelProps, index: index2 });
                $$payload3.out.push(`<!---->`);
              } else {
                $$payload3.out.push("<!--[!-->");
                Text$1($$payload3, spread_props([resolvedTickLabelProps]));
              }
              $$payload3.out.push(`<!--]-->`);
            }),
            $$slots: { default: true }
          });
        }
        $$payload2.out.push(`<!--]-->`);
      }),
      $$slots: { default: true }
    }
  ]));
  pop();
}
Axis.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Grid[FILENAME] = "node_modules/layerchart/dist/components/Grid.svelte";
function Grid($$payload, $$props) {
  push(Grid);
  const ctx = getChartContext();
  let {
    x = false,
    y = false,
    xTicks,
    yTicks: yTicksProp,
    bandAlign = "center",
    radialY = "circle",
    motion,
    transitionIn: transitionInProp,
    transitionInParams = { easing: cubicIn },
    classes = {},
    class: className,
    ref: refProp = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let ref = void 0;
  const yTicks = yTicksProp ?? (!isScaleBand(ctx.yScale) ? 4 : void 0);
  const tweenConfig = extractTweenConfig(motion);
  const transitionIn = transitionInProp ?? tweenConfig?.options ? fade : () => ({});
  const xTickVals = autoTickVals(ctx.xScale, xTicks);
  const yTickVals = autoTickVals(ctx.yScale, yTicks);
  const xBandOffset = isScaleBand(ctx.xScale) ? bandAlign === "between" ? -(ctx.xScale.padding() * ctx.xScale.step()) / 2 : (
    // before
    ctx.xScale.step() / 2 - ctx.xScale.padding() * ctx.xScale.step() / 2
  ) : (
    // center
    0
  );
  const yBandOffset = isScaleBand(ctx.yScale) ? bandAlign === "between" ? -(ctx.yScale.padding() * ctx.yScale.step()) / 2 : (
    // before
    ctx.yScale.step() / 2 - ctx.yScale.padding() * ctx.yScale.step() / 2
  ) : (
    // center
    0
  );
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Group($$payload2, spread_props([
      { class: cls(layerClass("grid"), classes.root, className) },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          if (x) {
            $$payload3.out.push("<!--[-->");
            const splineProps = extractLayerProps(x, "grid-x-line");
            Group($$payload3, {
              transitionIn,
              transitionInParams,
              class: layerClass("grid-x"),
              children: prevent_snippet_stringification(($$payload4) => {
                const each_array = ensure_array_like(xTickVals);
                $$payload4.out.push(`<!--[-->`);
                for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                  let x2 = each_array[$$index];
                  if (ctx.radial) {
                    $$payload4.out.push("<!--[-->");
                    const [x1, y1] = pointRadial(ctx.xScale(x2), ctx.yRange[0]);
                    const [x22, y2] = pointRadial(ctx.xScale(x2), ctx.yRange[1]);
                    Line($$payload4, spread_props([
                      { x1, y1, x2: x22, y2, motion: tweenConfig },
                      splineProps,
                      {
                        class: cls(layerClass("grid-x-radial-line"), "stroke-surface-content/10", classes.line, splineProps?.class)
                      }
                    ]));
                  } else {
                    $$payload4.out.push("<!--[!-->");
                    Rule($$payload4, spread_props([
                      { x: x2, xOffset: xBandOffset, motion },
                      splineProps,
                      {
                        class: cls(layerClass("grid-x-rule"), "stroke-surface-content/10", classes.line, splineProps?.class)
                      }
                    ]));
                  }
                  $$payload4.out.push(`<!--]-->`);
                }
                $$payload4.out.push(`<!--]--> `);
                if (isScaleBand(ctx.xScale) && bandAlign === "between" && !ctx.radial && xTickVals.length) {
                  $$payload4.out.push("<!--[-->");
                  Rule($$payload4, spread_props([
                    {
                      x: xTickVals[xTickVals.length - 1],
                      xOffset: ctx.xScale.step() + xBandOffset,
                      motion
                    },
                    splineProps,
                    {
                      class: cls(layerClass("grid-x-end-rule"), "stroke-surface-content/10", classes.line, splineProps?.class)
                    }
                  ]));
                } else {
                  $$payload4.out.push("<!--[!-->");
                }
                $$payload4.out.push(`<!--]-->`);
              }),
              $$slots: { default: true }
            });
          } else {
            $$payload3.out.push("<!--[!-->");
          }
          $$payload3.out.push(`<!--]--> `);
          if (y) {
            $$payload3.out.push("<!--[-->");
            const splineProps = extractLayerProps(y, "grid-y-line");
            Group($$payload3, {
              transitionIn,
              transitionInParams,
              class: layerClass("grid-y"),
              children: prevent_snippet_stringification(($$payload4) => {
                const each_array_1 = ensure_array_like(yTickVals);
                $$payload4.out.push(`<!--[-->`);
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let y2 = each_array_1[$$index_1];
                  if (ctx.radial) {
                    $$payload4.out.push("<!--[-->");
                    if (radialY === "circle") {
                      $$payload4.out.push("<!--[-->");
                      Circle($$payload4, spread_props([
                        { r: ctx.yScale(y2) + yBandOffset, motion },
                        splineProps,
                        {
                          class: cls(layerClass("grid-y-radial-circle"), "fill-none stroke-surface-content/10", classes.line, splineProps?.class)
                        }
                      ]));
                    } else {
                      $$payload4.out.push("<!--[!-->");
                      Spline($$payload4, spread_props([
                        {
                          data: xTickVals.map((x2) => ({ x: x2, y: y2 })),
                          x: "x",
                          y: "y",
                          motion: tweenConfig,
                          curve: curveLinearClosed
                        },
                        splineProps,
                        {
                          class: cls(layerClass("grid-y-radial-line"), "stroke-surface-content/10", classes.line, splineProps?.class)
                        }
                      ]));
                    }
                    $$payload4.out.push(`<!--]-->`);
                  } else {
                    $$payload4.out.push("<!--[!-->");
                    Rule($$payload4, spread_props([
                      { y: y2, yOffset: yBandOffset, motion },
                      splineProps,
                      {
                        class: cls(layerClass("grid-y-rule"), "stroke-surface-content/10", classes.line, splineProps?.class)
                      }
                    ]));
                  }
                  $$payload4.out.push(`<!--]-->`);
                }
                $$payload4.out.push(`<!--]--> `);
                if (isScaleBand(ctx.yScale) && bandAlign === "between" && yTickVals.length) {
                  $$payload4.out.push("<!--[-->");
                  if (ctx.radial) {
                    $$payload4.out.push("<!--[-->");
                    Circle($$payload4, spread_props([
                      {
                        r: ctx.yScale(yTickVals[yTickVals.length - 1]) + ctx.yScale.step() + yBandOffset,
                        motion
                      },
                      splineProps,
                      {
                        class: cls(layerClass("grid-y-radial-circle"), "fill-none stroke-surface-content/10", classes.line, splineProps?.class)
                      }
                    ]));
                  } else {
                    $$payload4.out.push("<!--[!-->");
                    Rule($$payload4, spread_props([
                      {
                        y: yTickVals[yTickVals.length - 1],
                        yOffset: ctx.yScale.step() + yBandOffset,
                        motion
                      },
                      splineProps,
                      {
                        class: cls(layerClass("grid-y-end-rule"), "stroke-surface-content/10", classes.line, splineProps?.class)
                      }
                    ]));
                  }
                  $$payload4.out.push(`<!--]-->`);
                } else {
                  $$payload4.out.push("<!--[!-->");
                }
                $$payload4.out.push(`<!--]-->`);
              }),
              $$slots: { default: true }
            });
          } else {
            $$payload3.out.push("<!--[!-->");
          }
          $$payload3.out.push(`<!--]-->`);
        }),
        $$slots: { default: true }
      }
    ]));
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref: refProp });
  pop();
}
Grid.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function resolveInsets(insets) {
  const all = insets?.all ?? 0;
  const x = insets?.x ?? all;
  const y = insets?.y ?? all;
  const left = insets?.left ?? x;
  const right = insets?.right ?? x;
  const top = insets?.top ?? y;
  const bottom = insets?.bottom ?? y;
  return { left, right, bottom, top };
}
function createDimensionGetter(ctx, getOptions) {
  const options2 = getOptions?.();
  return (item) => {
    const insets = resolveInsets(options2?.insets);
    const xDomainMinMax = ctx.xScale.domain();
    const yDomainMinMax = ctx.yScale.domain();
    const _x = accessor(options2?.x ?? ctx.x);
    const _y = accessor(options2?.y ?? ctx.y);
    const _x1 = accessor(options2?.x1 ?? ctx.x1);
    const _y1 = accessor(options2?.y1 ?? ctx.y1);
    if (isScaleBand(ctx.yScale)) {
      const y = firstValue(ctx.yScale(_y(item)) ?? 0) + (ctx.y1Scale ? ctx.y1Scale(_y1(item)) : 0) + insets.top;
      const height = Math.max(0, ctx.yScale.bandwidth ? (ctx.y1Scale ? ctx.y1Scale.bandwidth?.() ?? 0 : ctx.yScale.bandwidth()) - insets.bottom - insets.top : 0);
      const xValue = _x(item);
      let left = 0;
      let right = 0;
      if (Array.isArray(xValue)) {
        left = min(xValue);
        right = max(xValue);
      } else if (xValue == null) {
        left = 0;
        right = 0;
      } else if (xValue > 0) {
        left = max([0, xDomainMinMax[0]]);
        right = xValue;
      } else {
        left = xValue;
        right = min([0, xDomainMinMax[1]]);
      }
      const x = ctx.xScale(left) + insets.left;
      const width = Math.max(0, ctx.xScale(right) - ctx.xScale(left) - insets.left - insets.right);
      return { x, y, width, height };
    } else if (isScaleBand(ctx.xScale)) {
      const x = firstValue(ctx.xScale(_x(item))) + (ctx.x1Scale ? ctx.x1Scale(_x1(item)) : 0) + insets.left;
      const width = Math.max(0, ctx.xScale.bandwidth ? (ctx.x1Scale ? ctx.x1Scale.bandwidth?.() ?? 0 : ctx.xScale.bandwidth()) - insets.left - insets.right : 0);
      const yValue = _y(item);
      let top = 0;
      let bottom = 0;
      if (Array.isArray(yValue)) {
        top = max(yValue);
        bottom = min(yValue);
      } else if (yValue == null) {
        top = 0;
        bottom = 0;
      } else if (yValue > 0) {
        top = yValue;
        bottom = max([0, yDomainMinMax[0]]);
      } else {
        top = min([0, yDomainMinMax[1]]);
        bottom = yValue;
      }
      if (ctx.yRange[0] < ctx.yRange[1]) {
        [top, bottom] = [bottom, top];
      }
      const y = ctx.yScale(top) + insets.top;
      const height = ctx.yScale(bottom) - ctx.yScale(top) - insets.bottom - insets.top;
      return { x, y, width, height };
    } else if (ctx.xInterval) {
      const xValue = _x(item);
      const start = ctx.xInterval.floor(xValue);
      const end = ctx.xInterval.offset(start);
      const x = ctx.xScale(start) + insets.left;
      const width = ctx.xScale(end) - x - insets.right;
      const yValue = _y(item);
      let top = 0;
      let bottom = 0;
      if (Array.isArray(yValue)) {
        top = max(yValue);
        bottom = min(yValue);
      } else if (yValue == null) {
        top = 0;
        bottom = 0;
      } else if (yValue > 0) {
        top = yValue;
        bottom = max([0, yDomainMinMax[0]]);
      } else {
        top = min([0, yDomainMinMax[1]]);
        bottom = yValue;
      }
      const y = ctx.yScale(top) + insets.top;
      const height = ctx.yScale(bottom) - ctx.yScale(top) - insets.bottom - insets.top;
      return { x, y, width, height };
    } else if (ctx.yInterval) {
      const yValue = _y(item);
      const start = ctx.yInterval.floor(yValue);
      const end = ctx.yInterval.offset(start);
      const y = ctx.yScale(start) + insets.top;
      const height = ctx.yScale(end) - y - insets.bottom;
      const xValue = _x(item);
      let left = 0;
      let right = 0;
      if (Array.isArray(xValue)) {
        left = min(xValue);
        right = max(xValue);
      } else if (xValue == null) {
        left = 0;
        right = 0;
      } else if (xValue > 0) {
        left = max([0, xDomainMinMax[0]]);
        right = xValue;
      } else {
        left = xValue;
        right = min([0, xDomainMinMax[1]]);
      }
      const x = ctx.xScale(left) + insets.left;
      const width = ctx.xScale(right) - x - insets.right;
      return { x, y, width, height };
    }
  };
}
function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
Bar[FILENAME] = "node_modules/layerchart/dist/components/Bar.svelte";
function Bar($$payload, $$props) {
  push(Bar);
  const ctx = getChartContext();
  let {
    data,
    x = ctx.x,
    y = ctx.y,
    x1,
    y1,
    fill,
    fillOpacity,
    stroke: strokeProp = "black",
    strokeWidth = 0,
    opacity,
    radius = 0,
    rounded: roundedProp = "all",
    motion,
    insets,
    initialX,
    initialY,
    initialHeight,
    initialWidth,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const stroke = strokeProp === null || strokeProp === void 0 ? "black" : strokeProp;
  const getDimensions = createDimensionGetter(ctx, () => ({ x, y, x1, y1, insets }));
  const dimensions = getDimensions(data) ?? { x: 0, y: 0, width: 0, height: 0 };
  const isVertical = isScaleBand(ctx.xScale) || isScaleTime(ctx.xScale);
  const valueAccessor = accessor(isVertical ? y : x);
  const value = valueAccessor(data);
  const resolvedValue = Array.isArray(value) ? greatestAbs(value) : value;
  const rounded = roundedProp === "edge" ? isVertical ? resolvedValue >= 0 && ctx.yRange[0] > ctx.yRange[1] ? (
    // not inverted (bottom to top)
    "top"
  ) : "bottom" : resolvedValue >= 0 && ctx.xRange[0] < ctx.xRange[1] ? (
    // not inverted (left to right)
    // not inverted (left to right)
    "right"
  ) : "left" : roundedProp;
  const topLeft = ["all", "top", "left", "top-left"].includes(rounded);
  const topRight = ["all", "top", "right", "top-right"].includes(rounded);
  const bottomLeft = ["all", "bottom", "left", "bottom-left"].includes(rounded);
  const bottomRight = ["all", "bottom", "right", "bottom-right"].includes(rounded);
  const width = dimensions.width;
  const height = dimensions.height;
  const r = Math.min(radius, width / 2, height / 2);
  const diameter = 2 * r;
  const pathData = `M${dimensions.x + r},${dimensions.y} h${width - diameter}
      ${topRight ? `a${r},${r} 0 0 1 ${r},${r}` : `h${r}v${r}`}
      v${height - diameter}
      ${bottomRight ? `a${r},${r} 0 0 1 ${-r},${r}` : `v${r}h${-r}`}
      h${diameter - width}
      ${bottomLeft ? `a${r},${r} 0 0 1 ${-r},${-r}` : `h${-r}v${-r}`}
      v${diameter - height}
      ${topLeft ? `a${r},${r} 0 0 1 ${r},${-r}` : `v${-r}h${r}`}
      z`.split("\n").join("");
  if (ctx.radial) {
    $$payload.out.push("<!--[-->");
    Arc($$payload, spread_props([
      {
        innerRadius: dimensions.y,
        outerRadius: dimensions.y + dimensions.height,
        startAngle: dimensions.x,
        endAngle: dimensions.x + dimensions.width,
        fill,
        fillOpacity,
        stroke,
        strokeWidth,
        opacity,
        cornerRadius: radius
      },
      extractLayerProps(restProps, "bar")
    ]));
  } else {
    $$payload.out.push("<!--[!-->");
    if (rounded === "all" || rounded === "none" || radius === 0) {
      $$payload.out.push("<!--[-->");
      Rect($$payload, spread_props([
        {
          fill,
          fillOpacity,
          stroke,
          strokeWidth,
          opacity,
          rx: rounded === "none" ? 0 : radius,
          motion,
          initialX,
          initialY,
          initialHeight,
          initialWidth
        },
        dimensions,
        extractLayerProps(restProps, "bar")
      ]));
    } else {
      $$payload.out.push("<!--[!-->");
      const tweenMotion = extractTweenConfig(motion);
      Spline($$payload, spread_props([
        {
          pathData,
          fill,
          fillOpacity,
          stroke,
          strokeWidth,
          opacity,
          motion: tweenMotion
        },
        extractLayerProps(restProps, "bar")
      ]));
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Bar.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Points[FILENAME] = "node_modules/layerchart/dist/components/Points.svelte";
function Points($$payload, $$props) {
  push(Points);
  const ctx = getChartContext();
  let {
    data,
    x,
    y,
    r = 5,
    offsetX,
    offsetY,
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    opacity,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  function getOffset(value, offset2, scale) {
    if (typeof offset2 === "function") {
      return offset2(value, ctx);
    } else if (offset2 != null) {
      return offset2;
    } else if (isScaleBand(scale) && !ctx.radial) {
      return scale.bandwidth() / 2;
    } else {
      return 0;
    }
  }
  const xAccessor = x ? accessor(x) : ctx.x;
  const yAccessor = y ? accessor(y) : ctx.y;
  const pointsData = data ?? ctx.data;
  const getPointObject = (xVal, yVal, d) => {
    const scaledX = ctx.xScale(xVal);
    const scaledY = ctx.yScale(yVal);
    const x2 = scaledX + getOffset(scaledX, offsetX, ctx.xScale);
    const y2 = scaledY + getOffset(scaledY, offsetY, ctx.yScale);
    const radialPoint = pointRadial(x2, y2);
    return {
      x: ctx.radial ? radialPoint[0] : x2,
      y: ctx.radial ? radialPoint[1] : y2,
      r: ctx.config.r ? ctx.rGet(d) : r,
      xValue: xVal,
      yValue: yVal,
      data: d
    };
  };
  const points = pointsData.flatMap((d) => {
    const xValue = xAccessor(d);
    const yValue = yAccessor(d);
    if (Array.isArray(xValue)) {
      return xValue.filter(Boolean).map((xVal) => getPointObject(xVal, yValue, d));
    } else if (Array.isArray(yValue)) {
      return yValue.filter(Boolean).map((yVal) => getPointObject(xValue, yVal, d));
    } else if (xValue != null && yValue != null) {
      return getPointObject(xValue, yValue, d);
    }
    return [];
  });
  if (children) {
    $$payload.out.push("<!--[-->");
    children($$payload, { points });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    const each_array = ensure_array_like(points);
    $$payload.out.push(`<!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let point = each_array[$$index];
      Circle($$payload, spread_props([
        {
          cx: point.x,
          cy: point.y,
          r: point.r,
          fill: fill ?? (ctx.config.c ? ctx.cGet(point.data) : null),
          fillOpacity,
          stroke,
          strokeWidth,
          opacity
        },
        extractLayerProps(restProps, "point")
      ]));
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Points.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Labels[FILENAME] = "node_modules/layerchart/dist/components/Labels.svelte";
function Labels($$payload, $$props) {
  push(Labels);
  const ctx = getChartContext();
  let {
    data,
    value,
    x,
    y,
    placement = "outside",
    offset: offset2 = placement === "center" ? 0 : 4,
    format: format$1,
    key: key2 = (_, i) => i,
    children: childrenProp,
    class: className,
    fill,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  function getTextProps(point) {
    const pointValue = isScaleBand(ctx.yScale) ? point.xValue : point.yValue;
    const fillValue = typeof fill === "function" ? accessor(fill)(point.data) : fill;
    const displayValue = value ? accessor(value)(point.data) : isScaleBand(ctx.yScale) ? point.xValue : point.yValue;
    const formattedValue = format(
      displayValue,
      // @ts-expect-error - improve types
      format$1 ?? (value ? void 0 : isScaleBand(ctx.yScale) ? ctx.xScale.tickFormat?.() : ctx.yScale.tickFormat?.())
    );
    if (isScaleBand(ctx.yScale)) {
      if (pointValue < 0) {
        return {
          value: formattedValue,
          fill: fillValue,
          x: point.x + (placement === "outside" ? -offset2 : offset2),
          y: point.y,
          textAnchor: placement === "outside" ? "end" : "start",
          verticalAnchor: "middle",
          capHeight: ".6rem"
        };
      } else {
        return {
          value: formattedValue,
          fill: fillValue,
          x: point.x + (placement === "outside" ? offset2 : -offset2),
          y: point.y,
          textAnchor: placement === "outside" ? "start" : "end",
          verticalAnchor: "middle",
          capHeight: ".6rem"
        };
      }
    } else {
      if (pointValue < 0) {
        return {
          value: formattedValue,
          fill: fillValue,
          x: point.x,
          y: point.y + (placement === "outside" ? offset2 : -offset2),
          capHeight: ".6rem",
          textAnchor: "middle",
          verticalAnchor: placement === "center" ? "middle" : placement === "outside" ? "start" : "end"
        };
      } else {
        return {
          value: formattedValue,
          fill: fillValue,
          x: point.x,
          y: point.y + (placement === "outside" ? -offset2 : offset2),
          capHeight: ".6rem",
          textAnchor: "middle",
          verticalAnchor: placement === "center" ? "middle" : placement === "outside" ? "end" : "start"
        };
      }
    }
  }
  Group($$payload, {
    class: layerClass("labels-g"),
    children: prevent_snippet_stringification(($$payload2) => {
      {
        let children = function($$payload3, { points }) {
          validate_snippet_args($$payload3);
          const each_array = ensure_array_like(points);
          $$payload3.out.push(`<!--[-->`);
          for (let i = 0, $$length = each_array.length; i < $$length; i++) {
            let point = each_array[i];
            const textProps = extractLayerProps(getTextProps(point), "labels-text");
            if (childrenProp) {
              $$payload3.out.push("<!--[-->");
              childrenProp($$payload3, { data: point, textProps });
              $$payload3.out.push(`<!---->`);
            } else {
              $$payload3.out.push("<!--[!-->");
              Text$1($$payload3, spread_props([
                textProps,
                restProps,
                {
                  class: cls(
                    "text-xs",
                    placement === "inside" ? "fill-surface-300 stroke-surface-content" : "fill-surface-content stroke-surface-100",
                    textProps.class,
                    className
                  )
                }
              ]));
            }
            $$payload3.out.push(`<!--]-->`);
          }
          $$payload3.out.push(`<!--]-->`);
        };
        prevent_snippet_stringification(children);
        Points($$payload2, { data, x, y, children, $$slots: { default: true } });
      }
    }),
    $$slots: { default: true }
  });
  pop();
}
Labels.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Bars[FILENAME] = "node_modules/layerchart/dist/components/Bars.svelte";
function Bars($$payload, $$props) {
  push(Bars);
  let {
    fill,
    key: key2 = (_, i) => i,
    data: dataProp,
    onBarClick = () => {
    },
    children,
    radius = 0,
    strokeWidth = 0,
    stroke = "black",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const ctx = getChartContext();
  const data = chartDataArray(dataProp ?? ctx.data);
  Group($$payload, {
    class: layerClass("bars"),
    children: prevent_snippet_stringification(($$payload2) => {
      if (children) {
        $$payload2.out.push("<!--[-->");
        children($$payload2);
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        const each_array = ensure_array_like(data);
        $$payload2.out.push(`<!--[-->`);
        for (let i = 0, $$length = each_array.length; i < $$length; i++) {
          let d = each_array[i];
          Bar($$payload2, spread_props([
            {
              data: d,
              radius,
              strokeWidth,
              stroke,
              fill: fill ?? (ctx.config.c ? ctx.cGet(d) : null),
              onclick: (e) => onBarClick(e, { data: d })
            },
            extractLayerProps(restProps, "bars-bar")
          ]));
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]-->`);
    }),
    $$slots: { default: true }
  });
  pop();
}
Bars.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Pie[FILENAME] = "node_modules/layerchart/dist/components/Pie.svelte";
function Pie($$payload, $$props) {
  push(Pie);
  let {
    data,
    range: range2 = [0, 360],
    startAngle: startAngleProp,
    endAngle: endAngleProp,
    innerRadius,
    outerRadius,
    cornerRadius = 0,
    padAngle = 0,
    motion,
    offset: offset2 = 0,
    tooltipContext,
    sort,
    children
  } = $$props;
  const ctx = getChartContext();
  const endAngle = endAngleProp ?? degreesToRadians(ctx.config.xRange ? max(ctx.xRange) : max(range2));
  const motionEndAngle = createMotion(0, () => endAngle, motion);
  const pie$1 = (() => {
    let _pie = pie().startAngle(startAngleProp ?? degreesToRadians(ctx.config.xRange ? min(ctx.xRange) : min(range2))).endAngle(motionEndAngle.current).padAngle(padAngle).value(ctx.x);
    if (sort === null) {
      _pie = _pie.sort(null);
    } else if (sort) {
      _pie = _pie.sort(sort);
    }
    return _pie;
  })();
  const arcs = pie$1(data ?? (Array.isArray(ctx.data) ? ctx.data : []));
  if (children) {
    $$payload.out.push("<!--[-->");
    children($$payload, { arcs });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    const each_array = ensure_array_like(arcs);
    $$payload.out.push(`<!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let arc2 = each_array[$$index];
      Arc($$payload, {
        class: layerClass("pie-arc"),
        startAngle: arc2.startAngle,
        endAngle: arc2.endAngle,
        padAngle: arc2.padAngle,
        innerRadius,
        outerRadius,
        cornerRadius,
        offset: offset2,
        fill: ctx.config.c ? ctx.cScale?.(ctx.c(arc2.data)) : null,
        data: arc2.data,
        tooltipContext
      });
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Pie.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
MonthPath[FILENAME] = "node_modules/layerchart/dist/components/MonthPath.svelte";
function MonthPath($$payload, $$props) {
  push(MonthPath);
  let {
    date,
    cellSize: cellSizeProp,
    pathRef: pathRefProp = void 0,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let pathRef = void 0;
  const cellSize = Array.isArray(cellSizeProp) ? cellSizeProp : [cellSizeProp, cellSizeProp];
  const startDayOfWeek = date.getDay();
  const startWeek = timeWeek.count(timeYear(date), date);
  const monthEnd = endOfInterval("month", date);
  const endDayOfWeek = monthEnd.getDay();
  const endWeek = timeWeek.count(timeYear(monthEnd), monthEnd);
  const pathData = `
    M${(startWeek + 1) * cellSize[0]},${startDayOfWeek * cellSize[1]}
    H${startWeek * cellSize[0]} V${cellSize[1] * 7}
    H${endWeek * cellSize[0]} V${(endDayOfWeek + 1) * cellSize[1]}
    H${(endWeek + 1) * cellSize[0]} V0
    H${(startWeek + 1) * cellSize[0]}Z
  `;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Spline($$payload2, spread_props([
      {
        pathData,
        fill: "none",
        class: cls(layerClass("month-path"), "stroke-surface-content/20", className)
      },
      restProps,
      {
        get pathRef() {
          return pathRef;
        },
        set pathRef($$value) {
          pathRef = $$value;
          $$settled = false;
        }
      }
    ]));
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { pathRef: pathRefProp });
  pop();
}
MonthPath.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar[FILENAME] = "node_modules/layerchart/dist/components/Calendar.svelte";
function Calendar($$payload, $$props) {
  push(Calendar);
  let {
    end,
    start,
    cellSize: cellSizeProp,
    monthPath = false,
    monthLabel = true,
    tooltipContext: tooltip,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const ctx = getChartContext();
  const yearDays = timeDays(start, end);
  const yearMonths = timeMonths(start, end);
  const yearWeeks = timeWeek.count(start, end);
  const chartCellWidth = ctx.width / (yearWeeks + 1);
  const chartCellHeight = ctx.height / 7;
  const chartCellSize = Math.min(chartCellWidth, chartCellHeight);
  const cellSize = Array.isArray(cellSizeProp) ? cellSizeProp : typeof cellSizeProp === "number" ? [cellSizeProp, cellSizeProp] : [chartCellSize, chartCellSize];
  const dataByDate = ctx.data && ctx.config.x ? index(chartDataArray(ctx.data), (d) => ctx.x(d)) : /* @__PURE__ */ new Map();
  const cells = yearDays.map((date) => {
    const cellData = dataByDate.get(date) ?? { date };
    return {
      x: timeWeek.count(timeYear(date), date) * cellSize[0],
      y: date.getDay() * cellSize[1],
      color: ctx.config.c ? ctx.cGet(cellData) : "transparent",
      data: cellData
    };
  });
  if (children) {
    $$payload.out.push("<!--[-->");
    children($$payload, { cells, cellSize });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    const each_array = ensure_array_like(cells);
    $$payload.out.push(`<!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let cell = each_array[$$index];
      Rect($$payload, spread_props([
        {
          x: cell.x,
          y: cell.y,
          width: cellSize[0],
          height: cellSize[1],
          fill: cell.color,
          onpointermove: (e) => tooltip?.show(e, cell.data),
          onpointerleave: (e) => tooltip?.hide()
        },
        extractLayerProps(restProps, "calendar-cell", "stroke-surface-content/5")
      ]));
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--> `);
  if (monthPath) {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(yearMonths);
    $$payload.out.push(`<!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let date = each_array_1[$$index_1];
      MonthPath($$payload, spread_props([
        { date, cellSize },
        extractLayerProps(monthPath, "calendar-month-path")
      ]));
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (monthLabel) {
    $$payload.out.push("<!--[-->");
    const each_array_2 = ensure_array_like(yearMonths);
    $$payload.out.push(`<!--[-->`);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let date = each_array_2[$$index_2];
      Text$1($$payload, spread_props([
        {
          x: timeWeek.count(timeYear.floor(date), timeWeek.ceil(date)) * cellSize[0],
          y: -4,
          value: format(date, "month", { variant: "short" })
        },
        extractLayerProps(monthLabel, "calendar-month-label", "text-xs")
      ]));
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Calendar.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Hull[FILENAME] = "node_modules/layerchart/dist/components/Hull.svelte";
function Hull($$payload, $$props) {
  push(Hull);
  let {
    data,
    curve = curveLinearClosed,
    classes = {},
    onpointermove,
    onclick,
    onpointerleave: onpointerleave2,
    class: className,
    ref: refProp = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let ref = void 0;
  const ctx = getChartContext();
  const geoCtx = getGeoContext();
  const points = (data ?? ctx.flatData).map((d) => {
    const xValue = ctx.x(d);
    const yValue = ctx.y(d);
    const x = Array.isArray(xValue) ? min(xValue) : xValue;
    const y = Array.isArray(yValue) ? min(yValue) : yValue;
    const point = [x, y];
    point.data = d;
    return point;
  });
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Group($$payload2, spread_props([
      restProps,
      {
        class: cls(layerClass("hull-g"), classes.root, className),
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          if (geoCtx.projection) {
            $$payload3.out.push("<!--[-->");
            const polygon = geoVoronoi().hull(points);
            GeoPath($$payload3, {
              geojson: polygon,
              curve,
              class: cls(layerClass("hull-path"), "fill-transparent", classes.path),
              onclick: (e) => onclick?.(e, { points, polygon }),
              onpointermove: (e) => onpointermove?.(e, { points, polygon }),
              onpointerleave: onpointerleave2
            });
          } else {
            $$payload3.out.push("<!--[!-->");
            const delaunay = Delaunay.from(points);
            const polygon = delaunay.hullPolygon();
            Spline($$payload3, {
              data: polygon,
              x: (d) => d[0],
              y: (d) => d[1],
              curve,
              class: cls(layerClass("hull-class"), "fill-transparent", classes.path),
              onclick: (e) => onclick?.(e, { points, polygon }),
              onpointermove: (e) => onpointermove?.(e, { points, polygon }),
              onpointerleave: onpointerleave2
            });
          }
          $$payload3.out.push(`<!--]-->`);
        }),
        $$slots: { default: true }
      }
    ]));
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref: refProp });
  pop();
}
Hull.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  spread_attributes as $,
  Axis as A,
  Labels as B,
  Context$1 as C,
  Circle as D,
  Group as E,
  FILENAME as F,
  Grid as G,
  Calendar as H,
  Arc as I,
  Hull as J,
  Points as K,
  Legend as L,
  Spline as M,
  Bars as N,
  Area as O,
  Pie as P,
  Chart as Q,
  Rule as R,
  SvelteMap as S,
  Svg as T,
  TooltipHeader as U,
  TooltipList as V,
  TooltipItem as W,
  Tooltip as X,
  html as Y,
  TooltipSeparator as Z,
  attr_style as _,
  page as a,
  Command as a$,
  browser as a0,
  SvelteSet as a1,
  MediaQuery as a2,
  Tooltip_trigger as a3,
  Portal as a4,
  Tooltip_content as a5,
  Tooltip_arrow as a6,
  Tooltip_provider as a7,
  Tooltip$1 as a8,
  mergeProps$1 as a9,
  Calendar_grid as aA,
  Calendar_header as aB,
  Calendar_grid_row as aC,
  Calendar_grid_body as aD,
  Calendar_grid_head as aE,
  Calendar_head_cell as aF,
  Calendar_next_button as aG,
  Calendar_prev_button as aH,
  maybe_selected as aI,
  Calendar_month_select as aJ,
  Calendar_year_select as aK,
  Popover_content as aL,
  Popover_trigger as aM,
  Popover as aN,
  Select_group as aO,
  Select_item as aP,
  Select_scroll_up_button as aQ,
  Select_scroll_down_button as aR,
  Select_content as aS,
  Select_viewport as aT,
  Select_trigger as aU,
  Select as aV,
  validate_void_dynamic_element as aW,
  validate_dynamic_element_tag as aX,
  element as aY,
  Switch as aZ,
  Switch_thumb as a_,
  Separator as aa,
  Dialog_overlay as ab,
  Dialog_content as ac,
  Dialog_close as ad,
  Dialog_title as ae,
  Dialog_description as af,
  Dialog as ag,
  Dropdown_menu_content as ah,
  Menu_group as ai,
  Menu_item as aj,
  Menu_separator as ak,
  Menu_trigger as al,
  Menu_sub_content as am,
  Menu_sub_trigger as an,
  Menu as ao,
  Menu_sub as ap,
  Label$1 as aq,
  Label as ar,
  Field_errors as as,
  Field as at,
  Control as au,
  Toggle_group as av,
  Toggle_group_item as aw,
  Calendar$1 as ax,
  Calendar_cell as ay,
  Calendar_day as az,
  store_mutate as b,
  Command_empty as b0,
  Command_group as b1,
  useId$1 as b2,
  Command_group_heading as b3,
  Command_group_items as b4,
  Command_item as b5,
  Command_input as b6,
  Command_list as b7,
  Command_separator as b8,
  Tabs as b9,
  set_prerendering as bA,
  set_private_env as bB,
  set_public_env as bC,
  set_read_implementation as bD,
  Server as bE,
  command as bF,
  form as bG,
  prerender as bH,
  query as bI,
  Error$1 as bJ,
  Tabs_content as ba,
  Tabs_list as bb,
  Tabs_trigger as bc,
  Radio_group as bd,
  Radio_group_item as be,
  Checkbox as bf,
  Alert_dialog_action as bg,
  Alert_dialog_cancel as bh,
  Alert_dialog_content as bi,
  Alert_dialog as bj,
  onDestroy as bk,
  derived$1 as bl,
  get$2 as bm,
  writable as bn,
  readonly as bo,
  enhance as bp,
  page$2 as bq,
  applyAction as br,
  navigating as bs,
  invalidateAll as bt,
  deserialize as bu,
  options as bv,
  get_hooks as bw,
  set_assets as bx,
  set_building as by,
  set_manifest as bz,
  store_get as c,
  derived as d,
  copy_payload as e,
  assign_payload as f,
  getContext as g,
  pop as h,
  push_element as i,
  attr as j,
  pop_element as k,
  prevent_snippet_stringification as l,
  spread_props as m,
  ensure_array_like as n,
  escape_html as o,
  push as p,
  stringify as q,
  bind_props as r,
  setContext as s,
  attr_class as t,
  unsubscribe_stores as u,
  validate_snippet_args as v,
  clsx as w,
  tick as x,
  inspect as y,
  goto as z
};
