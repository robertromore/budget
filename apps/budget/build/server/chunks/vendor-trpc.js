import { m as memoize, c as createAdapter } from "./vendor-forms.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { toJSONSchema, safeParseAsync } from "zod/v4/core";
const defaultOptions = {
  dateStrategy: "integer",
  pipeStrategy: "output",
  $refStrategy: "none"
};
const zodToJSONSchema$1 = /* @__NO_SIDE_EFFECTS__ */ (...params) => {
  params[1] = typeof params[1] == "object" ? { ...defaultOptions, ...params[1] } : defaultOptions;
  return zodToJsonSchema(...params);
};
async function validate$1(schema, data, errorMap) {
  const result = await schema.safeParseAsync(data, { errorMap });
  if (result.success) {
    return {
      data: result.data,
      success: true
    };
  }
  return {
    issues: result.error.issues.map(({ message, path }) => ({ message, path })),
    success: false
  };
}
function _zod(schema, options) {
  return createAdapter({
    superFormValidationLibrary: "zod",
    validate: async (data) => {
      return validate$1(schema, data, options?.errorMap);
    },
    jsonSchema: options?.jsonSchema ?? /* @__PURE__ */ zodToJSONSchema$1(schema, options?.config),
    defaults: options?.defaults
  });
}
const zod$1 = /* @__PURE__ */ memoize(_zod);
const defaultJSONSchemaOptions = {
  unrepresentable: "any",
  override: (ctx) => {
    const def = ctx.zodSchema._zod.def;
    if (def.type === "date") {
      ctx.jsonSchema.type = "string";
      ctx.jsonSchema.format = "date-time";
    } else if (def.type === "bigint") {
      ctx.jsonSchema.type = "string";
      ctx.jsonSchema.format = "bigint";
    }
  }
};
const zodToJSONSchema = /* @__NO_SIDE_EFFECTS__ */ (schema, options) => {
  return toJSONSchema(schema, { ...defaultJSONSchemaOptions, ...options });
};
async function validate(schema, data, error) {
  const result = await safeParseAsync(schema, data, { error });
  if (result.success) {
    return {
      data: result.data,
      success: true
    };
  }
  return {
    issues: result.error.issues.map(({ message, path }) => ({ message, path })),
    success: false
  };
}
function _zod4(schema, options) {
  return createAdapter({
    superFormValidationLibrary: "zod4",
    validate: async (data) => {
      return validate(schema, data, options?.error);
    },
    jsonSchema: options?.jsonSchema ?? /* @__PURE__ */ zodToJSONSchema(schema, options?.config),
    defaults: options?.defaults
  });
}
function _zod4Client(schema, options) {
  return {
    superFormValidationLibrary: "zod4",
    validate: async (data) => validate(schema, data, options?.error)
  };
}
const zod = /* @__PURE__ */ memoize(_zod4);
const zodClient = /* @__PURE__ */ memoize(_zod4Client);
export {
  zod as a,
  zod$1 as b,
  zodClient as z
};
