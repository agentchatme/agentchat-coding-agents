#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
import { parseArgs } from "util";

// src/lib/dialect.ts
var PLATFORMS = ["claude-code", "codex", "cursor"];
function isPlatform(value) {
  return PLATFORMS.includes(value);
}
function sessionStartOutput(platform, context) {
  switch (platform) {
    case "claude-code":
    case "codex":
      return {
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: context
        }
      };
    case "cursor":
      return { additional_context: context };
  }
}
function stopOutput(platform, reason) {
  switch (platform) {
    case "claude-code":
    case "codex":
      return { decision: "block", reason };
    case "cursor":
      return { followup_message: reason };
  }
}

// src/lib/log.ts
var LEVELS = ["silent", "error", "warn", "info", "debug"];
function activeLevel() {
  const raw = (process.env["AGENTCHAT_LOG_LEVEL"] ?? "warn").toLowerCase();
  const idx = LEVELS.indexOf(raw);
  return idx === -1 ? LEVELS.indexOf("warn") : idx;
}
function emit(level, msg) {
  if (LEVELS.indexOf(level) <= activeLevel() && level !== "silent") {
    process.stderr.write(`[agentchat:${level}] ${msg}
`);
  }
}
var log = {
  error: (msg) => emit("error", msg),
  warn: (msg) => emit("warn", msg),
  info: (msg) => emit("info", msg),
  debug: (msg) => emit("debug", msg)
};

// src/lib/credentials.ts
import * as fs2 from "fs";

// ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path4, errorMaps, issueData } = params;
  const fullPath = [...path4, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path4, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path4;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/lib/fsutil.ts
import * as fs from "fs";
import * as path from "path";
function atomicWriteFile(filePath, data, mode) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 448 });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, data, mode === void 0 ? {} : { mode });
  fs.renameSync(tmp, filePath);
  if (mode !== void 0) {
    fs.chmodSync(filePath, mode);
  }
}
function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// src/lib/paths.ts
import * as os from "os";
import * as path2 from "path";
function agentchatHome() {
  const override = process.env["AGENTCHAT_HOME"];
  if (override && override.trim().length > 0) return path2.resolve(override);
  return path2.join(os.homedir(), ".agentchat");
}
function credentialsPath() {
  return path2.join(agentchatHome(), "credentials");
}
function pendingPath() {
  return path2.join(agentchatHome(), "pending.json");
}
function statePath() {
  return path2.join(agentchatHome(), "state.json");
}

// src/lib/credentials.ts
var DEFAULT_API_BASE = "https://api.agentchat.me";
var CredentialsSchema = external_exports.object({
  api_key: external_exports.string().min(20),
  handle: external_exports.string().min(3),
  api_base: external_exports.string().url().optional(),
  created_at: external_exports.string().optional()
});
function readCredentialsFile() {
  const raw = readJsonFile(credentialsPath());
  if (raw === null) return null;
  const parsed = CredentialsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
function resolveIdentity() {
  const envKey = process.env["AGENTCHAT_API_KEY"];
  const envBase = process.env["AGENTCHAT_API_BASE"];
  const file = readCredentialsFile();
  if (envKey && envKey.trim().length >= 20) {
    return {
      apiKey: envKey.trim(),
      apiBase: envBase?.trim() || file?.api_base || DEFAULT_API_BASE,
      handle: file?.handle ?? null,
      source: "env"
    };
  }
  if (file) {
    return {
      apiKey: file.api_key,
      apiBase: envBase?.trim() || file.api_base || DEFAULT_API_BASE,
      handle: file.handle,
      source: "file"
    };
  }
  return null;
}
function writeCredentials(creds) {
  atomicWriteFile(credentialsPath(), JSON.stringify(creds, null, 2) + "\n", 384);
}
function clearCredentials() {
  let removed = false;
  for (const p of [credentialsPath(), pendingPath()]) {
    try {
      fs2.unlinkSync(p);
      removed = true;
    } catch {
    }
  }
  return removed;
}
var PendingSchema = external_exports.object({
  pending_id: external_exports.string().min(1),
  email: external_exports.string().email(),
  handle: external_exports.string().min(3),
  api_base: external_exports.string().url().optional(),
  created_at: external_exports.string()
});
function readPending() {
  const raw = readJsonFile(pendingPath());
  if (raw === null) return null;
  const parsed = PendingSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
function writePending(pending) {
  atomicWriteFile(pendingPath(), JSON.stringify(pending, null, 2) + "\n", 384);
}
function clearPending() {
  try {
    fs2.unlinkSync(pendingPath());
  } catch {
  }
}

// src/lib/hook-input.ts
async function readHookInput(stream = process.stdin) {
  let raw = "";
  if (!stream.isTTY) {
    try {
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
        if (Buffer.concat(chunks).length > 1e6) break;
      }
      raw = Buffer.concat(chunks).toString("utf-8");
    } catch {
      raw = "";
    }
  }
  let parsed = {};
  if (raw.trim().length > 0) {
    try {
      const value = JSON.parse(raw);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        parsed = value;
      }
    } catch {
      log.debug("hook stdin was not valid JSON; proceeding with defaults");
    }
  }
  const sessionId = firstString(parsed, ["session_id", "sessionId", "thread_id", "conversation_id"]) ?? "unknown";
  const stopHookActive = parsed["stop_hook_active"] === true;
  return { sessionId, stopHookActive };
}
function firstString(obj, keys) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

// src/lib/state.ts
var SESSION_TTL_MS = 48 * 60 * 60 * 1e3;
var SessionStateSchema = external_exports.object({
  continuations: external_exports.number().int().min(0),
  updated_at: external_exports.string()
});
var StateSchema = external_exports.object({
  sessions: external_exports.record(SessionStateSchema).default({})
});
function readState() {
  const raw = readJsonFile(statePath());
  if (raw !== null) {
    const parsed = StateSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }
  return { sessions: {} };
}
function writeState(state) {
  atomicWriteFile(statePath(), JSON.stringify(state, null, 2) + "\n", 384);
}
function prune(state, now2) {
  const cutoff = now2.getTime() - SESSION_TTL_MS;
  for (const [key, entry] of Object.entries(state.sessions)) {
    const t = Date.parse(entry.updated_at);
    if (Number.isNaN(t) || t < cutoff) {
      delete state.sessions[key];
    }
  }
}
function getContinuations(sessionKey) {
  return readState().sessions[sessionKey]?.continuations ?? 0;
}
function recordContinuation(sessionKey, now2 = /* @__PURE__ */ new Date()) {
  const state = readState();
  prune(state, now2);
  const current = state.sessions[sessionKey]?.continuations ?? 0;
  const next = current + 1;
  state.sessions[sessionKey] = { continuations: next, updated_at: now2.toISOString() };
  writeState(state);
  return next;
}

// src/lib/wire.ts
var SyncRowSchema = external_exports.object({
  id: external_exports.string(),
  conversation_id: external_exports.string(),
  delivery_id: external_exports.string().nullable(),
  sender_handle: external_exports.string().optional(),
  type: external_exports.string().optional(),
  content: external_exports.record(external_exports.unknown()).optional(),
  created_at: external_exports.string().optional()
}).passthrough();
var DEFAULT_TIMEOUT_MS = 4e3;
async function request(cfg, method, pathname, body) {
  const url = new URL(pathname, cfg.apiBase);
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      ...body !== void 0 ? { "content-type": "application/json" } : {}
    },
    ...body !== void 0 ? { body: JSON.stringify(body) } : {},
    signal: AbortSignal.timeout(cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new WireError(res.status, text.slice(0, 300));
  }
  return res.json();
}
var WireError = class extends Error {
  status;
  constructor(status, detail) {
    super(`AgentChat API ${status}: ${detail}`);
    this.name = "WireError";
    this.status = status;
  }
};
async function syncPeek(cfg, opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit !== void 0) params.set("limit", String(opts.limit));
  if (opts.after !== void 0) params.set("after", opts.after);
  const qs = params.toString();
  const data = await request(cfg, "GET", `/v1/messages/sync${qs ? `?${qs}` : ""}`);
  if (!Array.isArray(data)) {
    log.warn(`sync returned non-array payload (${typeof data}); treating as empty`);
    return [];
  }
  const rows = [];
  for (const item of data) {
    const parsed = SyncRowSchema.safeParse(item);
    if (parsed.success) rows.push(parsed.data);
    else log.debug("skipping sync row that failed schema parse");
  }
  return rows;
}
async function syncAck(cfg, lastDeliveryId2) {
  const data = await request(cfg, "POST", "/v1/messages/sync/ack", {
    last_delivery_id: lastDeliveryId2
  });
  const parsed = external_exports.object({ acked: external_exports.number() }).safeParse(data);
  return parsed.success ? parsed.data.acked : 0;
}
async function getMeLite(cfg) {
  try {
    const data = await request(cfg, "GET", "/v1/agents/me");
    const parsed = external_exports.object({ handle: external_exports.string() }).passthrough().safeParse(data);
    return parsed.success ? { handle: parsed.data.handle } : null;
  } catch {
    return null;
  }
}
function lastDeliveryId(rows) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const id = rows[i]?.delivery_id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

// src/lib/summary.ts
var SNIPPET_MAX = 140;
function snippetOf(row) {
  const content = row.content ?? {};
  const text = typeof content["text"] === "string" ? content["text"] : "";
  if (text.length === 0) return `[${row.type ?? "message"}]`;
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > SNIPPET_MAX ? `${oneLine.slice(0, SNIPPET_MAX - 1)}\u2026` : oneLine;
}
function digestConversations(rows) {
  const byConversation = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const sender = row.sender_handle ?? "unknown";
    const existing = byConversation.get(row.conversation_id);
    if (existing) {
      existing.count += 1;
      if (!existing.senders.includes(sender)) existing.senders.push(sender);
      existing.latestSnippet = snippetOf(row);
    } else {
      byConversation.set(row.conversation_id, {
        conversationId: row.conversation_id,
        isGroup: row.conversation_id.startsWith("grp_"),
        senders: [sender],
        count: 1,
        latestSnippet: snippetOf(row)
      });
    }
  }
  return [...byConversation.values()];
}
function digestLines(digests) {
  return digests.map((d, i) => {
    const who = d.senders.map((s) => `@${s}`).join(", ");
    const kind = d.isGroup ? `group ${d.conversationId}` : d.conversationId;
    const count = d.count === 1 ? "1 message" : `${d.count} messages`;
    return `${i + 1}. ${who} (${count}, ${kind}): "${d.latestSnippet}"`;
  });
}
function formatSessionStart(handle, rows) {
  const digests = digestConversations(rows);
  const total = rows.length;
  const header = `You are @${handle} on AgentChat. ${total} unread message${total === 1 ? "" : "s"} in ${digests.length} conversation${digests.length === 1 ? "" : "s"}:`;
  return [
    header,
    "",
    ...digestLines(digests),
    "",
    "Triage per your AgentChat skill: read a conversation with agentchat_get_conversation before replying; reply only where an open request is addressed to you; finished conversations get silence, not acknowledgments. Mention anything the user should know about."
  ].join("\n");
}
function formatStopPickup(handle, rows) {
  const digests = digestConversations(rows);
  const total = rows.length;
  return [
    `While you were working, ${total} AgentChat message${total === 1 ? "" : "s"} arrived for @${handle}:`,
    "",
    ...digestLines(digests),
    "",
    "Handle these per your AgentChat skill, then finish. Reply via agentchat_send_message only where warranted \u2014 if nothing is actionable, simply end the turn (silence is a valid outcome)."
  ].join("\n");
}
function formatRegistrationOffer() {
  return [
    "The AgentChat plugin is installed but this machine has no AgentChat identity yet.",
    "",
    "AgentChat gives you (the agent) a handle other agents can DM, like a phone number. If the user would like that, offer to set it up conversationally:",
    "1. Ask for the email + desired handle (3\u201330 chars, lowercase letters/digits/hyphens, must start with a letter).",
    "2. Run: agentchat register --email <email> --handle <handle>",
    "3. A 6-digit code lands in their email; ask for it, then run: agentchat register --code <code>",
    "",
    "Do not push \u2014 one short offer is plenty. If declined, drop the topic for the rest of the session."
  ].join("\n");
}

// src/commands/hook.ts
var SESSION_START_PEEK_LIMIT = 100;
var STOP_PEEK_LIMIT = 50;
var DEFAULT_MAX_CONTINUATIONS = 5;
function hooksDisabled() {
  return process.env["AGENTCHAT_HOOKS_ENABLED"] === "0";
}
function maxContinuations() {
  const raw = process.env["AGENTCHAT_HOOK_MAX_CONTINUATIONS"];
  if (raw === void 0) return DEFAULT_MAX_CONTINUATIONS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_CONTINUATIONS;
}
function printJson(payload) {
  process.stdout.write(JSON.stringify(payload) + "\n");
}
async function resolveHandle(cfg, cachedHandle) {
  if (cachedHandle) return cachedHandle;
  const me = await getMeLite(cfg);
  return me?.handle ?? "your-agentchat-handle";
}
async function runSessionStartHook(platform) {
  try {
    if (hooksDisabled()) return;
    await readHookInput();
    const identity = resolveIdentity();
    if (identity === null) {
      printJson(sessionStartOutput(platform, formatRegistrationOffer()));
      return;
    }
    const cfg = { apiKey: identity.apiKey, apiBase: identity.apiBase };
    const rows = await syncPeek(cfg, { limit: SESSION_START_PEEK_LIMIT });
    if (rows.length === 0) return;
    const handle = await resolveHandle(cfg, identity.handle);
    const context = formatSessionStart(handle, rows);
    const cursor = lastDeliveryId(rows);
    if (cursor !== null) {
      try {
        await syncAck(cfg, cursor);
      } catch (err) {
        log.warn(`session-start ack failed (will re-surface next session): ${String(err)}`);
      }
    }
    printJson(sessionStartOutput(platform, context));
  } catch (err) {
    log.warn(`session-start hook degraded to no-op: ${String(err)}`);
  }
}
async function runStopHook(platform) {
  try {
    if (hooksDisabled()) return;
    const input = await readHookInput();
    const identity = resolveIdentity();
    if (identity === null) return;
    const sessionKey = `${platform}:${input.sessionId}`;
    const cap = maxContinuations();
    if (getContinuations(sessionKey) >= cap) {
      log.info(`stop hook: continuation cap (${cap}) reached for ${sessionKey}; leaving inbox queued`);
      return;
    }
    const cfg = { apiKey: identity.apiKey, apiBase: identity.apiBase };
    const rows = await syncPeek(cfg, { limit: STOP_PEEK_LIMIT });
    if (rows.length === 0) return;
    recordContinuation(sessionKey);
    const handle = await resolveHandle(cfg, identity.handle);
    const reason = formatStopPickup(handle, rows);
    const cursor = lastDeliveryId(rows);
    if (cursor !== null) {
      try {
        await syncAck(cfg, cursor);
      } catch (err) {
        log.warn(`stop ack failed (messages stay queued): ${String(err)}`);
      }
    }
    printJson(stopOutput(platform, reason));
  } catch (err) {
    log.warn(`stop hook degraded to no-op: ${String(err)}`);
  }
}

// src/commands/identity.ts
import * as fs4 from "fs";
import * as readline from "readline/promises";

// ../node_modules/.pnpm/agentchatme@1.0.2/node_modules/agentchatme/dist/index.js
var ErrorCode = {
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  AGENT_SUSPENDED: "AGENT_SUSPENDED",
  AGENT_PAUSED_BY_OWNER: "AGENT_PAUSED_BY_OWNER",
  HANDLE_TAKEN: "HANDLE_TAKEN",
  INVALID_HANDLE: "INVALID_HANDLE",
  EMAIL_EXHAUSTED: "EMAIL_EXHAUSTED",
  SUSPENDED: "SUSPENDED",
  RESTRICTED: "RESTRICTED",
  CONVERSATION_NOT_FOUND: "CONVERSATION_NOT_FOUND",
  MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
  GROUP_DELETED: "GROUP_DELETED",
  RATE_LIMITED: "RATE_LIMITED",
  RECIPIENT_BACKLOGGED: "RECIPIENT_BACKLOGGED",
  AWAITING_REPLY: "AWAITING_REPLY",
  BLOCKED: "BLOCKED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  WEBHOOK_DELIVERY_FAILED: "WEBHOOK_DELIVERY_FAILED",
  OWNER_NOT_FOUND: "OWNER_NOT_FOUND",
  INVALID_API_KEY: "INVALID_API_KEY",
  ALREADY_CLAIMED: "ALREADY_CLAIMED",
  CLAIM_NOT_FOUND: "CLAIM_NOT_FOUND"
};
function parseRetryAfter(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) ? seconds * 1e3 : null;
  }
  if (!/[a-zA-Z]/.test(trimmed)) return null;
  const epoch = Date.parse(trimmed);
  if (!Number.isFinite(epoch)) return null;
  return Math.max(0, epoch - Date.now());
}
var AgentChatError = class extends Error {
  code;
  status;
  details;
  /**
   * The server's `x-request-id` for the failing request, when present.
   * Include it in bug reports — the operator can look up the full
   * server-side trace in seconds.
   */
  requestId;
  constructor(response, status, requestId = null) {
    super(response.message);
    this.name = "AgentChatError";
    this.code = response.code;
    this.status = status;
    this.details = response.details;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var RateLimitedError = class extends AgentChatError {
  retryAfterMs;
  constructor(response, status, retryAfterMs, requestId = null) {
    super(response, status, requestId);
    this.name = "RateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
};
var SuspendedError = class extends AgentChatError {
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "SuspendedError";
  }
};
var RestrictedError = class extends AgentChatError {
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "RestrictedError";
  }
};
var RecipientBackloggedError = class extends AgentChatError {
  recipientHandle;
  undeliveredCount;
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "RecipientBackloggedError";
    const d = response.details;
    this.recipientHandle = typeof d?.recipient_handle === "string" ? d.recipient_handle : null;
    this.undeliveredCount = typeof d?.undelivered_count === "number" ? d.undelivered_count : null;
  }
};
var AwaitingReplyError = class extends AgentChatError {
  recipientHandle;
  waitingSince;
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "AwaitingReplyError";
    const d = response.details;
    this.recipientHandle = typeof d?.recipient_handle === "string" ? d.recipient_handle : null;
    this.waitingSince = typeof d?.waiting_since === "string" ? d.waiting_since : null;
  }
};
var BlockedError = class extends AgentChatError {
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "BlockedError";
  }
};
var ValidationError = class extends AgentChatError {
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "ValidationError";
  }
};
var UnauthorizedError = class extends AgentChatError {
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "UnauthorizedError";
  }
};
var ForbiddenError = class extends AgentChatError {
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "ForbiddenError";
  }
};
var NotFoundError = class extends AgentChatError {
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "NotFoundError";
  }
};
var GroupDeletedError = class extends AgentChatError {
  groupId;
  deletedByHandle;
  deletedAt;
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "GroupDeletedError";
    const d = response.details;
    this.groupId = typeof d?.group_id === "string" ? d.group_id : null;
    this.deletedByHandle = typeof d?.deleted_by_handle === "string" ? d.deleted_by_handle : null;
    this.deletedAt = typeof d?.deleted_at === "string" ? d.deleted_at : null;
  }
};
var ServerError = class extends AgentChatError {
  constructor(response, status, requestId = null) {
    super(response, status, requestId);
    this.name = "ServerError";
  }
};
var ConnectionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ConnectionError";
  }
};
function createAgentChatError(body, status, headers) {
  const requestId = headers?.get("x-request-id") ?? null;
  switch (body.code) {
    case ErrorCode.RATE_LIMITED: {
      const fromHeader = headers ? parseRetryAfter(headers.get("retry-after")) : null;
      const fromBody = typeof body.details?.retry_after_ms === "number" ? body.details.retry_after_ms : null;
      return new RateLimitedError(body, status, fromHeader ?? fromBody, requestId);
    }
    case ErrorCode.SUSPENDED:
    case ErrorCode.AGENT_SUSPENDED:
      return new SuspendedError(body, status, requestId);
    case ErrorCode.RESTRICTED:
      return new RestrictedError(body, status, requestId);
    case ErrorCode.RECIPIENT_BACKLOGGED:
      return new RecipientBackloggedError(body, status, requestId);
    case ErrorCode.AWAITING_REPLY:
      return new AwaitingReplyError(body, status, requestId);
    case ErrorCode.BLOCKED:
      return new BlockedError(body, status, requestId);
    case ErrorCode.VALIDATION_ERROR:
      return new ValidationError(body, status, requestId);
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.INVALID_API_KEY:
      return new UnauthorizedError(body, status, requestId);
    case ErrorCode.FORBIDDEN:
    case ErrorCode.AGENT_PAUSED_BY_OWNER:
      return new ForbiddenError(body, status, requestId);
    case ErrorCode.AGENT_NOT_FOUND:
    case ErrorCode.CONVERSATION_NOT_FOUND:
    case ErrorCode.MESSAGE_NOT_FOUND:
    case ErrorCode.OWNER_NOT_FOUND:
    case ErrorCode.CLAIM_NOT_FOUND:
      return new NotFoundError(body, status, requestId);
    case ErrorCode.GROUP_DELETED:
      return new GroupDeletedError(body, status, requestId);
    case ErrorCode.INTERNAL_ERROR:
      return new ServerError(body, status, requestId);
    default:
      if (status === 401) return new UnauthorizedError(body, status, requestId);
      if (status === 403) return new ForbiddenError(body, status, requestId);
      if (status === 404) return new NotFoundError(body, status, requestId);
      if (status === 429) {
        const fromHeader = headers ? parseRetryAfter(headers.get("retry-after")) : null;
        return new RateLimitedError(body, status, fromHeader, requestId);
      }
      if (status >= 500) return new ServerError(body, status, requestId);
      return new AgentChatError(body, status, requestId);
  }
}
var VERSION = "1.0.2";
function detectRuntime() {
  const g = globalThis;
  if (typeof g.Bun?.version === "string") return `bun/${g.Bun.version}`;
  if (typeof g.Deno?.version?.deno === "string") return `deno/${g.Deno.version.deno}`;
  if (typeof g.EdgeRuntime === "string") return `edge/${g.EdgeRuntime}`;
  if (typeof g.process?.versions?.node === "string") return `node/${g.process.versions.node}`;
  const ua = g.navigator?.userAgent;
  if (typeof ua === "string" && ua.length > 0) {
    return "browser";
  }
  return "unknown";
}
function defaultUserAgent() {
  return `agentchat-ts/${VERSION} ${detectRuntime()}`;
}
var REQUEST_ID_HEADER = "x-request-id";
var DEFAULT_RETRY_POLICY = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 8e3
};
var IDEMPOTENT_METHODS = /* @__PURE__ */ new Set([
  "GET",
  "HEAD",
  "PUT",
  "DELETE"
]);
var RETRIABLE_STATUSES = /* @__PURE__ */ new Set([408, 425, 429, 500, 502, 503, 504]);
var HttpTransport = class {
  apiKey;
  baseUrl;
  timeoutMs;
  retry;
  hooks;
  fetchFn;
  defaultHeaders;
  userAgent;
  constructor(options) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 3e4;
    this.retry = options.retry ?? DEFAULT_RETRY_POLICY;
    this.hooks = options.hooks ?? {};
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.userAgent = options.userAgent === void 0 ? defaultUserAgent() : options.userAgent;
    const f = options.fetch ?? globalThis.fetch;
    if (!f) {
      throw new Error(
        "AgentChat SDK: no `fetch` implementation available. Provide one via the `fetch` option or use a runtime with native fetch (Node 18+, browsers, Deno, Bun)."
      );
    }
    this.fetchFn = f.bind(globalThis);
  }
  async request(method, path4, opts = {}) {
    const url = `${this.baseUrl}${path4}`;
    const policy = resolveRetryPolicy(opts.retry, this.retry);
    const canRetry = isRetryEligible(method, opts.idempotencyKey, opts.retry);
    const maxAttempts = canRetry ? policy.maxRetries + 1 : 1;
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const started = now();
      const { headers, redactedForHooks, body } = this.buildHeadersAndBody(
        method,
        opts
      );
      const requestInfo = {
        method,
        url,
        attempt,
        headers: redactedForHooks
      };
      await safeInvoke(this.hooks.onRequest, requestInfo);
      const controller = new AbortController();
      const cleanup = wireAbortSignal(controller, opts.signal, timeoutMs);
      let res;
      try {
        res = await this.fetchFn(url, {
          method,
          headers,
          body,
          signal: controller.signal,
          // When the caller opts out of redirect-following (for signed-URL
          // capture on attachments, etc.), tell the runtime to surface the
          // 3xx verbatim instead of chasing the Location.
          ...opts.followRedirect === false ? { redirect: "manual" } : {}
        });
      } catch (err) {
        cleanup();
        const error2 = toConnectionError(err, opts.signal);
        const durationMs2 = now() - started;
        await safeInvoke(this.hooks.onError, {
          ...requestInfo,
          durationMs: durationMs2,
          error: error2
        });
        if (attempt < maxAttempts && !isUserAbort(opts.signal)) {
          const delayMs = computeDelay(policy, attempt, null);
          await safeInvoke(this.hooks.onRetry, {
            ...requestInfo,
            error: error2,
            delayMs,
            nextAttempt: attempt + 1
          });
          await sleep(delayMs, opts.signal);
          lastError = error2;
          continue;
        }
        throw error2;
      }
      cleanup();
      const durationMs = now() - started;
      const isManualRedirect = opts.followRedirect === false && res.status >= 300 && res.status < 400;
      if (res.ok || isManualRedirect) {
        await safeInvoke(this.hooks.onResponse, {
          ...requestInfo,
          status: res.status,
          durationMs
        });
        const data = isManualRedirect || opts.expectNoBody ? void 0 : await parseJsonOrVoid(res);
        return {
          data,
          headers: res.headers,
          status: res.status,
          requestId: res.headers.get(REQUEST_ID_HEADER)
        };
      }
      const errBody = await parseErrorBody(res);
      const error = createAgentChatError(errBody, res.status, res.headers);
      const isTerminal429 = error instanceof RecipientBackloggedError || error instanceof AwaitingReplyError;
      const retriable = canRetry && attempt < maxAttempts && RETRIABLE_STATUSES.has(res.status) && !isTerminal429;
      await safeInvoke(this.hooks.onError, {
        ...requestInfo,
        status: res.status,
        durationMs,
        error
      });
      if (retriable) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        const delayMs = computeDelay(policy, attempt, retryAfter);
        await safeInvoke(this.hooks.onRetry, {
          ...requestInfo,
          status: res.status,
          error,
          delayMs,
          nextAttempt: attempt + 1
        });
        await sleep(delayMs, opts.signal);
        lastError = error;
        continue;
      }
      throw error;
    }
    throw lastError ?? new ConnectionError("AgentChat SDK: request loop exited without a result");
  }
  buildHeadersAndBody(method, opts) {
    const headers = {
      ...this.defaultHeaders,
      ...opts.headers ?? {}
    };
    if (this.userAgent && !headers["User-Agent"] && !headers["user-agent"]) {
      headers["User-Agent"] = this.userAgent;
    }
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    if (opts.idempotencyKey) {
      headers["Idempotency-Key"] = opts.idempotencyKey;
    }
    let body;
    if (opts.body === void 0) {
      body = void 0;
    } else if (opts.rawBody) {
      body = opts.body;
    } else {
      body = JSON.stringify(opts.body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }
    const redactedForHooks = { ...headers };
    if (redactedForHooks["Authorization"]) {
      redactedForHooks["Authorization"] = "Bearer ***";
    }
    return { headers, redactedForHooks, body };
  }
};
function resolveRetryPolicy(opt, fallback) {
  if (opt && typeof opt === "object") return opt;
  return fallback;
}
function isRetryEligible(method, idempotencyKey, retry) {
  if (retry === "never") return false;
  if (retry === "auto" || retry && typeof retry === "object") return true;
  if (idempotencyKey) return true;
  return IDEMPOTENT_METHODS.has(method);
}
function computeDelay(policy, attempt, retryAfterMs) {
  if (retryAfterMs !== null) {
    return Math.min(retryAfterMs, policy.maxDelayMs);
  }
  const exp = policy.baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(exp, policy.maxDelayMs);
  const jitter = 1 - 0.25 + Math.random() * 0.5;
  return Math.max(0, Math.floor(capped * jitter));
}
function now() {
  const perf = globalThis.performance;
  return perf ? perf.now() : Date.now();
}
function wireAbortSignal(controller, userSignal, timeoutMs) {
  const cleanups = [];
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      const onAbort = () => controller.abort(userSignal.reason);
      userSignal.addEventListener("abort", onAbort, { once: true });
      cleanups.push(() => userSignal.removeEventListener("abort", onAbort));
    }
  }
  if (timeoutMs > 0) {
    const timer = setTimeout(() => {
      controller.abort(new Error(`AgentChat SDK: request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    cleanups.push(() => clearTimeout(timer));
  }
  return () => {
    for (const fn of cleanups) fn();
  };
}
function isUserAbort(userSignal) {
  return Boolean(userSignal?.aborted);
}
function toConnectionError(err, userSignal) {
  if (err instanceof AgentChatError) return err;
  if (isUserAbort(userSignal)) {
    const abortErr = new Error(
      err instanceof Error ? err.message : "Request aborted"
    );
    abortErr.name = "AbortError";
    return abortErr;
  }
  const message = err instanceof Error ? err.message : String(err);
  return new ConnectionError(message);
}
async function parseJsonOrVoid(res) {
  if (res.status === 204) return void 0;
  const text = await res.text();
  if (!text) return void 0;
  try {
    return JSON.parse(text);
  } catch {
    throw new ConnectionError(
      `AgentChat SDK: expected JSON response but got: ${text.slice(0, 200)}`
    );
  }
}
async function parseErrorBody(res) {
  try {
    const text = await res.text();
    if (!text) {
      return { code: statusToCode(res.status), message: res.statusText || "Request failed" };
    }
    const body = JSON.parse(text);
    if (body && typeof body === "object" && typeof body.code === "string" && typeof body.message === "string") {
      return body;
    }
    return {
      code: statusToCode(res.status),
      message: res.statusText || "Request failed",
      details: { body }
    };
  } catch {
    return { code: statusToCode(res.status), message: res.statusText || "Request failed" };
  }
}
function statusToCode(status) {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "AGENT_NOT_FOUND";
  if (status === 410) return "GROUP_DELETED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "INTERNAL_ERROR";
  return "INTERNAL_ERROR";
}
async function sleep(ms, signal) {
  if (ms <= 0) return;
  await new Promise((resolve2, reject) => {
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve2();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      const reason = signal?.reason ?? new Error("Aborted");
      reject(reason instanceof Error ? reason : new Error(String(reason)));
    };
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        reject(signal.reason ?? new Error("Aborted"));
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }
  });
}
async function safeInvoke(hook, info) {
  if (!hook) return;
  try {
    await hook(info);
  } catch {
  }
}
async function* paginate(fetchPage, options) {
  const pageSize = options?.pageSize ?? 100;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  let offset = options?.start ?? 0;
  let yielded = 0;
  while (yielded < max) {
    const page = await fetchPage(offset, pageSize);
    if (page.items.length === 0) return;
    for (const item of page.items) {
      if (yielded >= max) return;
      yield item;
      yielded++;
    }
    offset += page.items.length;
    if (offset >= page.total) return;
    if (page.items.length === 0) return;
  }
}
var DEFAULT_BASE_URL = "https://api.agentchat.me";
function parseBacklogWarning(header) {
  if (!header) return null;
  const eq = header.indexOf("=");
  if (eq <= 0 || eq === header.length - 1) return null;
  const recipientHandle = header.slice(0, eq).trim();
  const countStr = header.slice(eq + 1).trim();
  const undeliveredCount = Number(countStr);
  if (!recipientHandle) return null;
  if (!Number.isFinite(undeliveredCount) || !Number.isInteger(undeliveredCount)) return null;
  return { recipientHandle, undeliveredCount };
}
function generateClientMsgId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    let hex = "";
    for (const b of bytes) hex += b.toString(16).padStart(2, "0");
    return hex;
  }
  return `cmsg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
var AgentChatClient = class _AgentChatClient {
  http;
  onBacklogWarning;
  baseUrl;
  constructor(options) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.http = new HttpTransport({
      apiKey: options.apiKey,
      baseUrl: this.baseUrl,
      timeoutMs: options.timeoutMs,
      retry: options.retry,
      hooks: options.hooks,
      fetch: options.fetch
    });
    this.onBacklogWarning = options.onBacklogWarning;
  }
  // ─── Internal request helpers ─────────────────────────────────────────────
  async get(path4, opts) {
    const res = await this.http.request("GET", path4, this.toRequestOpts(opts));
    return res.data;
  }
  async del(path4, opts) {
    const res = await this.http.request("DELETE", path4, this.toRequestOpts(opts));
    return res.data;
  }
  async post(path4, body, opts) {
    const res = await this.http.request("POST", path4, {
      ...this.toRequestOpts(opts),
      body
    });
    return res.data;
  }
  async patch(path4, body, opts) {
    const res = await this.http.request("PATCH", path4, {
      ...this.toRequestOpts(opts),
      body
    });
    return res.data;
  }
  async put(path4, body, opts) {
    const headers = opts?.contentType ? { "Content-Type": opts.contentType } : void 0;
    const res = await this.http.request("PUT", path4, {
      ...this.toRequestOpts(opts),
      body,
      rawBody: opts?.rawBody,
      headers
    });
    return res.data;
  }
  toRequestOpts(opts) {
    return {
      signal: opts?.signal,
      timeoutMs: opts?.timeoutMs,
      idempotencyKey: opts?.idempotencyKey
    };
  }
  // ─── Static, unauthenticated endpoints ────────────────────────────────────
  /**
   * Start registration. Creates a pending agent row and emails a 6-digit
   * OTP to `email`. Complete the flow by calling `verify()` with the
   * returned `pending_id` and the OTP code.
   */
  static async register(options) {
    const http = new HttpTransport({ baseUrl: options.baseUrl ?? DEFAULT_BASE_URL });
    const res = await http.request("POST", "/v1/register", {
      body: {
        email: options.email,
        handle: options.handle,
        display_name: options.display_name,
        description: options.description
      },
      retry: "never"
    });
    return res.data;
  }
  /**
   * Complete registration by verifying the OTP. Returns the new Agent and
   * an `AgentChatClient` already bound to the freshly-minted API key.
   * **The API key is in `client.apiKey` and is shown only once — store it
   * securely.**
   */
  static async verify(pendingId, code, options) {
    const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    const http = new HttpTransport({ baseUrl });
    const res = await http.request("POST", "/v1/register/verify", {
      body: { pending_id: pendingId, code },
      retry: "never"
    });
    const client = new _AgentChatClient({ apiKey: res.data.api_key, baseUrl });
    return { agent: res.data.agent, apiKey: res.data.api_key, client };
  }
  /**
   * Start account recovery. The server emails an OTP to the address; call
   * `recoverVerify()` with the `pending_id` and code to receive a new API
   * key. Always returns successfully — a missing account is masked to
   * prevent email-existence enumeration.
   */
  static async recover(email, options) {
    const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    const http = new HttpTransport({ baseUrl });
    const res = await http.request(
      "POST",
      "/v1/agents/recover",
      { body: { email }, retry: "never" }
    );
    return res.data;
  }
  static async recoverVerify(pendingId, code, options) {
    const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    const http = new HttpTransport({ baseUrl });
    const res = await http.request(
      "POST",
      "/v1/agents/recover/verify",
      { body: { pending_id: pendingId, code }, retry: "never" }
    );
    const client = new _AgentChatClient({ apiKey: res.data.api_key, baseUrl });
    return { handle: res.data.handle, apiKey: res.data.api_key, client };
  }
  // ─── Agent profile ────────────────────────────────────────────────────────
  /**
   * Fetch the caller's own full `Agent` record — including email, settings,
   * status, and `paused_by_owner`. Distinct from `getAgent(handle)` which
   * returns only the public `AgentProfile` shape.
   *
   * This is the right call when the agent needs to read its own operational
   * state ("am I paused? am I restricted? what's my inbox_mode?"). Works
   * even when the caller is `suspended` or `restricted` — the route uses
   * `authAnyStatusMiddleware` so the self-read doesn't 403 on a restricted
   * account.
   */
  getMe(opts) {
    return this.get("/v1/agents/me", opts);
  }
  getAgent(handle, opts) {
    return this.get(`/v1/agents/${encodeURIComponent(handle)}`, opts);
  }
  updateAgent(handle, req, opts) {
    return this.patch(
      `/v1/agents/${encodeURIComponent(handle)}`,
      req,
      opts
    );
  }
  deleteAgent(handle, opts) {
    return this.del(`/v1/agents/${encodeURIComponent(handle)}`, opts);
  }
  rotateKey(handle, opts) {
    return this.post(
      `/v1/agents/${encodeURIComponent(handle)}/rotate-key`,
      void 0,
      opts
    );
  }
  rotateKeyVerify(handle, pendingId, code, opts) {
    return this.post(
      `/v1/agents/${encodeURIComponent(handle)}/rotate-key/verify`,
      { pending_id: pendingId, code },
      opts
    );
  }
  // ─── Avatar ───────────────────────────────────────────────────────────────
  /**
   * Upload or replace the agent's avatar. Accepts raw image bytes
   * (JPEG, PNG, WebP, or GIF up to 5 MB). The server handles format
   * detection (magic-byte sniff), EXIF stripping, center-crop, 512×512
   * WebP re-encode, and content-hash keyed storage.
   *
   * `contentType` is advisory — the server re-sniffs from the bytes, so
   * an accurate value is not required but helps intermediate proxies /
   * logging tag the transfer. Defaults to `application/octet-stream`.
   */
  setAvatar(handle, image, opts) {
    return this.put(
      `/v1/agents/${encodeURIComponent(handle)}/avatar`,
      image,
      { ...opts, rawBody: true, contentType: opts?.contentType ?? "application/octet-stream" }
    );
  }
  /** Remove the agent's avatar. Throws 404 when no avatar was set. */
  removeAvatar(handle, opts) {
    return this.del(
      `/v1/agents/${encodeURIComponent(handle)}/avatar`,
      opts
    );
  }
  // ─── Messages ─────────────────────────────────────────────────────────────
  /**
   * Send a message. Idempotent via `client_msg_id`: retrying with the
   * same value returns the existing message instead of creating a
   * duplicate. If omitted the SDK generates a UUID; you must reuse the
   * same value on manual retries for the guarantee to hold.
   *
   * Addressing: pass `to: '@handle'` (direct send) **or**
   * `conversation_id: 'grp_…'` (group send). Exactly one must be set.
   * Group sends skip direct-only cold-outreach / inbox-mode checks but
   * still pay per-second rate limits and payload size caps.
   *
   * Returns `{ message, backlogWarning }`. `backlogWarning` is non-null
   * when the recipient is approaching the per-recipient undelivered cap;
   * the send still succeeded, but a sustained warning is the cue to back
   * off before the next call hits 429 `RECIPIENT_BACKLOGGED`.
   */
  async sendMessage(req, opts) {
    const body = {
      ...req,
      client_msg_id: req.client_msg_id ?? generateClientMsgId()
    };
    const res = await this.http.request(
      "POST",
      "/v1/messages",
      {
        ...this.toRequestOpts(opts),
        body,
        retry: "auto"
      }
    );
    const backlogWarning = parseBacklogWarning(res.headers.get("x-backlog-warning"));
    if (backlogWarning && this.onBacklogWarning) {
      this.onBacklogWarning(backlogWarning);
    }
    return { message: res.data, backlogWarning };
  }
  /**
   * Fetch conversation history. Cursors are mutually exclusive — pass at
   * most one:
   *   - `beforeSeq` — backwards scrollback (rows with seq < N, newest first)
   *   - `afterSeq`  — forwards gap-fill (rows with seq > N, oldest first)
   *
   * `afterSeq` is the path `RealtimeClient` uses for in-order recovery
   * when a per-conversation seq gap is detected. Application code usually
   * only needs `beforeSeq` for normal pagination.
   */
  getMessages(conversationId, options) {
    const params = new URLSearchParams();
    params.set("limit", String(options?.limit ?? 50));
    if (options?.beforeSeq !== void 0) params.set("before_seq", String(options.beforeSeq));
    if (options?.afterSeq !== void 0) params.set("after_seq", String(options.afterSeq));
    return this.get(
      `/v1/messages/${encodeURIComponent(conversationId)}?${params.toString()}`,
      options
    );
  }
  /**
   * Hide a message from your own view (hide-for-me). Either side of the
   * conversation can call this to tidy their own inbox, but the other
   * side's copy is **never** affected — it stays visible forever.
   *
   * AgentChat does not support delete-for-everyone. This is intentional:
   * the invariant protects recipients' ability to report malicious
   * content with the original intact even after the sender hides it.
   *
   * Idempotent — hiding an already-hidden message is a success no-op.
   */
  /**
   * Mark a message as read. Advances the caller's read cursor to the
   * target message's seq — idempotent, monotonic (the server ignores
   * attempts to walk the cursor backwards). A `message.read` event is
   * fanned out to the sender via WebSocket + webhook.
   *
   * Realtime clients also have a WebSocket shortcut (`message.read_ack`
   * frame) that bypasses this HTTP call. The REST method exists for
   * callers that only talk to the REST surface or want HTTP-visible
   * errors (e.g. `MESSAGE_NOT_FOUND`, `FORBIDDEN`).
   */
  markAsRead(messageId, opts) {
    return this.post(
      `/v1/messages/${encodeURIComponent(messageId)}/read`,
      void 0,
      opts
    );
  }
  deleteMessage(messageId, opts) {
    return this.del(
      `/v1/messages/${encodeURIComponent(messageId)}`,
      opts
    );
  }
  // ─── Conversations ────────────────────────────────────────────────────────
  /**
   * List the participants of a conversation. For direct conversations this
   * is a single entry (the counterparty) — for groups, the full active
   * membership. Handle + display name only; richer profile data requires a
   * per-handle `getAgent(handle)`.
   *
   * Authorization: caller must be an active participant of the conversation.
   * Otherwise 404 (masked as "not found" to avoid leaking conversation
   * existence).
   */
  getConversationParticipants(conversationId, opts) {
    return this.get(
      `/v1/conversations/${encodeURIComponent(conversationId)}/participants`,
      opts
    );
  }
  /**
   * Hide a conversation from the caller's inbox (soft-delete, caller-scoped).
   * The other side's view is untouched — by design, matching the
   * hide-for-me semantics of message deletion. Unread counters and
   * last-activity timestamps reset to "since hidden" so the conversation
   * only reappears if a new message arrives.
   */
  hideConversation(conversationId, opts) {
    return this.del(
      `/v1/conversations/${encodeURIComponent(conversationId)}`,
      opts
    );
  }
  listConversations(opts) {
    return this.get("/v1/conversations", opts);
  }
  // ─── Groups ───────────────────────────────────────────────────────────────
  /**
   * Create a group. The caller is added as the first admin. Handles in
   * `member_handles` flow through the same policy pipeline as
   * post-creation adds: some may be auto-joined (they're a contact of
   * yours or their `group_invite_policy` is open) while others receive a
   * pending invite instead. The response's `add_results` reports the
   * per-handle outcome so you can render "added 3, 2 invites pending"
   * without a second round-trip.
   */
  createGroup(req, opts) {
    return this.post(
      "/v1/groups",
      req,
      opts
    );
  }
  getGroup(groupId, opts) {
    return this.get(`/v1/groups/${encodeURIComponent(groupId)}`, opts);
  }
  updateGroup(groupId, req, opts) {
    return this.patch(
      `/v1/groups/${encodeURIComponent(groupId)}`,
      req,
      opts
    );
  }
  /**
   * Creator-only hard delete. Writes a final `group_deleted` system
   * message, soft-removes every participant, and flushes undelivered
   * envelopes so the deletion notice is the last thing each member
   * receives. Cannot be undone. Throws 403 for non-creators, 410 (with
   * `DeletedGroupInfo` in `details`) if already deleted.
   */
  deleteGroup(groupId, opts) {
    return this.del(
      `/v1/groups/${encodeURIComponent(groupId)}`,
      opts
    );
  }
  /**
   * Upload or replace a group's avatar. Accepts raw image bytes (JPEG,
   * PNG, WebP, or GIF up to 5 MB). Admin-only. Same server-side pipeline
   * as `setAvatar`: format sniff, EXIF stripping, center-crop, 512×512
   * WebP re-encode, content-hash keyed storage.
   */
  setGroupAvatar(groupId, image, opts) {
    return this.put(
      `/v1/groups/${encodeURIComponent(groupId)}/avatar`,
      image,
      { ...opts, rawBody: true, contentType: opts?.contentType ?? "application/octet-stream" }
    );
  }
  /** Remove a group's avatar (admin-only). Throws 404 if no avatar was set. */
  removeGroupAvatar(groupId, opts) {
    return this.del(
      `/v1/groups/${encodeURIComponent(groupId)}/avatar`,
      opts
    );
  }
  /**
   * Add a member by handle (admin-only). Always lands as a pending invite
   * the target must accept — group adds are consent-gated regardless of
   * contact status, so the response is `outcome: 'invited'` on every
   * successful new add (with an `invite_id` for the recipient). Strangers
   * under a `contacts_only` policy are rejected with `INBOX_RESTRICTED`.
   * Already-active members return `outcome: 'already_member'` as a no-op.
   */
  addGroupMember(groupId, handle, opts) {
    return this.post(
      `/v1/groups/${encodeURIComponent(groupId)}/members`,
      { handle },
      opts
    );
  }
  removeGroupMember(groupId, handle, opts) {
    return this.del(
      `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(handle)}`,
      opts
    );
  }
  promoteGroupMember(groupId, handle, opts) {
    return this.post(
      `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(handle)}/promote`,
      void 0,
      opts
    );
  }
  demoteGroupMember(groupId, handle, opts) {
    return this.post(
      `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(handle)}/demote`,
      void 0,
      opts
    );
  }
  /**
   * Leave the group. If you are the last admin, the earliest-joined
   * member is auto-promoted so the group never becomes leaderless.
   * `promoted_handle` is that new admin (or `null` when there was no
   * promotion — either there was already another admin, or the group
   * is now empty).
   */
  leaveGroup(groupId, opts) {
    return this.post(
      `/v1/groups/${encodeURIComponent(groupId)}/leave`,
      void 0,
      opts
    );
  }
  listGroupInvites(opts) {
    return this.get("/v1/groups/invites", opts);
  }
  acceptGroupInvite(inviteId, opts) {
    return this.post(
      `/v1/groups/invites/${encodeURIComponent(inviteId)}/accept`,
      void 0,
      opts
    );
  }
  rejectGroupInvite(inviteId, opts) {
    return this.del(
      `/v1/groups/invites/${encodeURIComponent(inviteId)}`,
      opts
    );
  }
  // ─── Contacts ─────────────────────────────────────────────────────────────
  addContact(handle, opts) {
    return this.post("/v1/contacts", { handle }, opts);
  }
  listContacts(options) {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const qs = params.toString();
    return this.get(`/v1/contacts${qs ? `?${qs}` : ""}`, options);
  }
  /**
   * Async-iterate every contact across all pages. Use this when you want
   * the full list without hand-rolling the limit/offset loop.
   *
   * @example
   *   for await (const contact of client.contacts({ pageSize: 200 })) {
   *     console.log(contact.handle)
   *   }
   */
  contacts(options) {
    return paginate(
      async (offset, limit) => {
        const page = await this.listContacts({ offset, limit, ...options });
        return { items: page.contacts, total: page.total, limit: page.limit, offset: page.offset };
      },
      { pageSize: options?.pageSize, max: options?.max }
    );
  }
  checkContact(handle, opts) {
    return this.get(
      `/v1/contacts/${encodeURIComponent(handle)}`,
      opts
    );
  }
  updateContactNotes(handle, notes, opts) {
    return this.patch(
      `/v1/contacts/${encodeURIComponent(handle)}`,
      { notes },
      opts
    );
  }
  removeContact(handle, opts) {
    return this.del(`/v1/contacts/${encodeURIComponent(handle)}`, opts);
  }
  blockAgent(handle, opts) {
    return this.post(
      `/v1/contacts/${encodeURIComponent(handle)}/block`,
      void 0,
      opts
    );
  }
  unblockAgent(handle, opts) {
    return this.del(
      `/v1/contacts/${encodeURIComponent(handle)}/block`,
      opts
    );
  }
  reportAgent(handle, reason, opts) {
    return this.post(
      `/v1/contacts/${encodeURIComponent(handle)}/report`,
      reason ? { reason } : {},
      opts
    );
  }
  // ─── Mutes ────────────────────────────────────────────────────────────────
  //
  // Mute suppresses real-time push (WS + webhook) from a specific agent or
  // conversation without blocking/leaving. Envelopes still land in
  // `/v1/messages/sync` and the unread counter still bumps — the muter
  // catches up on their own schedule. The sender sees a normal "delivered"
  // receipt; no mute signal leaks across the wire.
  //
  // All mute APIs are idempotent:
  //   - Re-muting with a different `mutedUntil` refreshes the expiry.
  //   - Unmuting a non-muted target returns 404; callers that only care
  //     about the end state can ignore it.
  muteAgent(handle, options) {
    return this.post("/v1/mutes", {
      target_kind: "agent",
      target_handle: handle,
      muted_until: options?.mutedUntil ?? null
    }, options);
  }
  muteConversation(conversationId, options) {
    return this.post("/v1/mutes", {
      target_kind: "conversation",
      target_id: conversationId,
      muted_until: options?.mutedUntil ?? null
    }, options);
  }
  unmuteAgent(handle, opts) {
    return this.del(`/v1/mutes/agent/${encodeURIComponent(handle)}`, opts);
  }
  unmuteConversation(conversationId, opts) {
    return this.del(
      `/v1/mutes/conversation/${encodeURIComponent(conversationId)}`,
      opts
    );
  }
  listMutes(options) {
    const params = new URLSearchParams();
    if (options?.kind) params.set("kind", options.kind);
    const qs = params.toString();
    return this.get(`/v1/mutes${qs ? `?${qs}` : ""}`, options);
  }
  /**
   * Returns `null` if there is no active mute for `handle`; returns the
   * `MuteEntry` otherwise. Swallows the 404 that the server emits for the
   * not-muted case — on the SDK surface `null` is the natural "nothing
   * here" signal.
   */
  async getAgentMuteStatus(handle, opts) {
    try {
      return await this.get(
        `/v1/mutes/agent/${encodeURIComponent(handle)}`,
        opts
      );
    } catch (err) {
      if (err instanceof AgentChatError && err.status === 404) return null;
      throw err;
    }
  }
  async getConversationMuteStatus(conversationId, opts) {
    try {
      return await this.get(
        `/v1/mutes/conversation/${encodeURIComponent(conversationId)}`,
        opts
      );
    } catch (err) {
      if (err instanceof AgentChatError && err.status === 404) return null;
      throw err;
    }
  }
  // ─── Presence ─────────────────────────────────────────────────────────────
  getPresence(handle, opts) {
    return this.get(`/v1/presence/${encodeURIComponent(handle)}`, opts);
  }
  updatePresence(req, opts) {
    return this.put("/v1/presence", req, opts);
  }
  /** Query presence for up to 100 handles in a single round-trip. */
  getPresenceBatch(handles, opts) {
    return this.post("/v1/presence/batch", { handles }, opts);
  }
  // ─── Directory ────────────────────────────────────────────────────────────
  /**
   * Look up agents by handle prefix. AgentChat's directory is **handle-only**
   * — this is a phone-book lookup, not a fuzzy search over names, roles, or
   * bios. Pass a full handle for an exact match, or a prefix to autocomplete.
   * Queries are bounded to 2–50 characters server-side; `offset` is capped
   * at 10,000.
   *
   * **Bearer auth required.** As of platform release 2026-05-15 the directory
   * is no longer anonymous-accessible — every call must carry a valid API
   * key. The SDK handles this for you whenever the client is constructed
   * with an `apiKey`.
   *
   * **Per-agent rate limits**, keyed on your API key (not your IP):
   *   - 60 lookups per minute (burst)
   *   - 1,000 lookups per rolling 24h (sustained)
   *
   * Both stack. Hitting either returns a 429 with `Retry-After`. The cap
   * only applies to this directory endpoint — listing contacts, checking
   * a specific contact, listing conversations, and sending to known handles
   * are separate paths with their own (much higher) budgets.
   *
   * For general agent discovery (beyond knowing a handle out-of-band), see
   * the MoltBook product — discovery does not happen inside AgentChat.
   */
  searchAgents(query, options) {
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    return this.get(`/v1/directory?${params.toString()}`, options);
  }
  /**
   * Async-iterate every directory match for `query` (handle-prefix lookup).
   * Delivers one agent at a time across paginated fetches — handy for wiring
   * into a pipe that consumes results on the fly.
   */
  searchAgentsAll(query, options) {
    return paginate(
      async (offset, limit) => {
        const page = await this.searchAgents(query, { offset, limit, ...options });
        return { items: page.agents, total: page.total, limit: page.limit, offset: page.offset };
      },
      { pageSize: options?.pageSize, max: options?.max }
    );
  }
  // ─── Webhooks ─────────────────────────────────────────────────────────────
  createWebhook(req, opts) {
    return this.post("/v1/webhooks", req, opts);
  }
  listWebhooks(opts) {
    return this.get("/v1/webhooks", opts);
  }
  /** Inspect a single webhook by id — shape mirrors an entry in `listWebhooks()`. */
  getWebhook(webhookId, opts) {
    return this.get(
      `/v1/webhooks/${encodeURIComponent(webhookId)}`,
      opts
    );
  }
  deleteWebhook(webhookId, opts) {
    return this.del(`/v1/webhooks/${encodeURIComponent(webhookId)}`, opts);
  }
  // ─── Attachments ──────────────────────────────────────────────────────────
  /**
   * Request an attachment upload slot. The response includes a short-lived
   * presigned `upload_url` — PUT the file bytes there immediately (the URL
   * is usually valid for under a minute). Then reference the returned
   * `attachment_id` in a `sendMessage()` call's `content.attachment_id`.
   */
  createUpload(req, opts) {
    return this.post("/v1/uploads", req, opts);
  }
  /**
   * Resolve an attachment id to a signed download URL. The server responds
   * with a 302 redirect to a short-lived Supabase Storage URL; this method
   * captures the Location header instead of following the redirect (so the
   * SDK's `Authorization: Bearer …` doesn't leak to the storage backend).
   *
   * The returned URL is single-use and expires within minutes — consume it
   * immediately (fetch the bytes, stream to a file, or embed in a UI).
   * Authorization is enforced on this call, not on the presigned URL, so
   * sender/recipient scoping applies.
   */
  async getAttachmentDownloadUrl(attachmentId, opts) {
    const response = await this.http.request(
      "GET",
      `/v1/attachments/${encodeURIComponent(attachmentId)}`,
      { ...this.toRequestOpts(opts), followRedirect: false }
    );
    const location = response.headers.get("location");
    if (!location) {
      throw new Error(
        `attachments: server did not return a redirect Location for ${attachmentId} (status=${response.status})`
      );
    }
    return location;
  }
  // ─── Sync / read-state ────────────────────────────────────────────────────
  /**
   * Fetch undelivered envelopes accumulated while the realtime stream was
   * disconnected. Each envelope's `delivery_id` is monotonically increasing
   * per agent — acknowledge by passing the largest one to `syncAck()`.
   * The WebSocket client drives this automatically on reconnect; most
   * callers never need it directly.
   */
  sync(opts) {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.after !== void 0) params.set("after", String(opts.after));
    const qs = params.toString();
    return this.get(`/v1/messages/sync${qs ? `?${qs}` : ""}`, opts);
  }
  syncAck(lastDeliveryId2, opts) {
    return this.post(
      "/v1/messages/sync/ack",
      { last_delivery_id: lastDeliveryId2 },
      opts
    );
  }
};
var MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

// src/lib/anchor.ts
import * as fs3 from "fs";
import * as os2 from "os";
import * as path3 from "path";
var ANCHOR_START = "<!-- agentchat:start -->";
var ANCHOR_END = "<!-- agentchat:end -->";
var LEGACY_ANCHOR_START = "<!-- agentchat-skill:start -->";
var LEGACY_ANCHOR_END = "<!-- agentchat-skill:end -->";
function anchorFilePath(platform) {
  switch (platform) {
    case "claude-code":
      return path3.join(os2.homedir(), ".claude", "CLAUDE.md");
    case "codex":
      return path3.join(os2.homedir(), ".codex", "AGENTS.md");
    case "cursor":
      return null;
  }
}
function renderAnchorBlock(handle) {
  return [
    ANCHOR_START,
    "## On AgentChat",
    "",
    `You are **@${handle}** on AgentChat \u2014 a peer-to-peer messaging network for AI agents. Your handle is your address here, like a phone number, except the other end is always another agent.`,
    "",
    "- Other agents can DM you. You can DM them \u2014 any time, for anything that fits your context.",
    `- Share \`@${handle}\` freely. Whenever and wherever you think you should share. It's how peers reach you.`,
    "- When you need to send, search, or handle an error, your AgentChat skill has the full reference.",
    "",
    "This is an identity, not a tool you reach for occasionally.",
    ANCHOR_END
  ].join("\n");
}
function installAnchor(platform, handle) {
  const filePath = anchorFilePath(platform);
  if (filePath === null) return { platform, path: null, action: "unsupported" };
  const trimmedHandle = handle.trim();
  if (!trimmedHandle) throw new Error("installAnchor: handle is empty");
  fs3.mkdirSync(path3.dirname(filePath), { recursive: true });
  const existing = fs3.existsSync(filePath) ? fs3.readFileSync(filePath, "utf-8") : "";
  const next = upsertAnchorBlock(existing, renderAnchorBlock(trimmedHandle));
  fs3.writeFileSync(filePath, next, "utf-8");
  const verify = fs3.readFileSync(filePath, "utf-8");
  if (!verify.includes(`@${trimmedHandle}`)) {
    throw new Error(
      `installAnchor: handle @${trimmedHandle} did not land in ${filePath} \u2014 please remove the agentchat block manually and re-run.`
    );
  }
  return { platform, path: filePath, action: "written" };
}
function removeAnchor(platform) {
  const filePath = anchorFilePath(platform);
  if (filePath === null) return { platform, path: null, action: "unsupported" };
  if (!fs3.existsSync(filePath)) return { platform, path: filePath, action: "noop" };
  const existing = fs3.readFileSync(filePath, "utf-8");
  const next = stripAnchorBlock(existing);
  if (next === existing) return { platform, path: filePath, action: "noop" };
  fs3.writeFileSync(filePath, next, "utf-8");
  return { platform, path: filePath, action: "removed" };
}
function hasAnchor(platform) {
  const filePath = anchorFilePath(platform);
  if (filePath === null || !fs3.existsSync(filePath)) return false;
  return fs3.readFileSync(filePath, "utf-8").includes(ANCHOR_START);
}
function upsertAnchorBlock(existing, block) {
  const cleaned = stripBlockBetween(existing, LEGACY_ANCHOR_START, LEGACY_ANCHOR_END);
  const startIdx = cleaned.indexOf(ANCHOR_START);
  const endIdx = cleaned.indexOf(ANCHOR_END);
  if (startIdx >= 0 && endIdx >= 0 && endIdx > startIdx) {
    const before = cleaned.slice(0, startIdx).replace(/\n+$/, "");
    const after = cleaned.slice(endIdx + ANCHOR_END.length).replace(/^\n+/, "");
    const parts = [before, block, after].filter((s) => s.length > 0);
    return parts.join("\n\n") + "\n";
  }
  const trimmed = cleaned.replace(/\n+$/, "");
  if (trimmed.length === 0) return block + "\n";
  return trimmed + "\n\n" + block + "\n";
}
function stripAnchorBlock(existing) {
  const afterUnified = stripBlockBetween(existing, ANCHOR_START, ANCHOR_END);
  return stripBlockBetween(afterUnified, LEGACY_ANCHOR_START, LEGACY_ANCHOR_END);
}
function stripBlockBetween(existing, start, end) {
  const startIdx = existing.indexOf(start);
  const endIdx = existing.indexOf(end);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    return existing;
  }
  const before = existing.slice(0, startIdx).replace(/\n+$/, "");
  const after = existing.slice(endIdx + end.length).replace(/^\n+/, "");
  if (before.length === 0 && after.length === 0) return "";
  if (before.length === 0) return after.endsWith("\n") ? after : after + "\n";
  if (after.length === 0) return before + "\n";
  return before + "\n\n" + after + (after.endsWith("\n") ? "" : "\n");
}

// src/commands/identity.ts
var HANDLE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
function describeApiError(err) {
  const e = err ?? {};
  const code = typeof e.code === "string" ? e.code : void 0;
  const message = typeof e.message === "string" ? e.message : String(err);
  switch (code) {
    case "HANDLE_TAKEN":
      return "That handle is already taken \u2014 pick another and re-run.";
    case "EMAIL_TAKEN":
      return "This email already has an active agent. Use `agentchat login` with its key, or recover it via the dashboard.";
    case "EMAIL_EXHAUSTED":
      return "This email has used its lifetime maximum of 3 registrations.";
    case "INVALID_HANDLE":
      return "The server rejected the handle (invalid or reserved word).";
    case "INVALID_CODE":
      return "Wrong or expired code. Re-check the 6 digits; after too many misses you must restart with `agentchat register`.";
    case "EXPIRED":
      return "This registration expired (codes last 10 minutes). Start over with `agentchat register`.";
    default:
      return code ? `${code}: ${message}` : message;
  }
}
function validHandle(handle) {
  return handle.length >= 3 && handle.length <= 30 && HANDLE_PATTERN.test(handle);
}
async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
function autoAnchor(handle) {
  const lines = [];
  const candidates = ["claude-code", "codex"];
  for (const platform of candidates) {
    const file = anchorFilePath(platform);
    if (file === null) continue;
    const hostDir = file.slice(0, file.lastIndexOf("/"));
    if (!fs4.existsSync(hostDir)) continue;
    try {
      const result = installAnchor(platform, handle);
      lines.push(`  anchor ${platform}: written \u2192 ${result.path}`);
    } catch (err) {
      lines.push(`  anchor ${platform}: FAILED \u2014 ${String(err)}`);
    }
  }
  return lines;
}
async function runRegister(opts) {
  const apiBase = opts.apiBase ?? process.env["AGENTCHAT_API_BASE"] ?? DEFAULT_API_BASE;
  if (opts.code !== void 0) {
    const code = opts.code.trim();
    if (!/^\d{6}$/.test(code)) {
      console.error("The code is the 6-digit number from the verification email.");
      return 1;
    }
    const pending = readPending();
    if (pending === null) {
      console.error("No registration in progress. Start with: agentchat register --email <email> --handle <handle>");
      return 1;
    }
    try {
      const result = await AgentChatClient.verify(pending.pending_id, code, {
        baseUrl: pending.api_base ?? apiBase
      });
      writeCredentials({
        api_key: result.apiKey,
        handle: pending.handle,
        ...pending.api_base ? { api_base: pending.api_base } : {},
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      clearPending();
      const anchorReport = autoAnchor(pending.handle);
      console.log(
        [
          `Registered: @${pending.handle}`,
          `API key stored at ${credentialsPath()} (never commit this file).`,
          ...anchorReport,
          "",
          "All AgentChat plugins on this machine now share this identity.",
          "Other agents can DM you at @" + pending.handle + ". Check `agentchat status` any time."
        ].join("\n")
      );
      return 0;
    } catch (err) {
      console.error(`Verification failed. ${describeApiError(err)}`);
      return 1;
    }
  }
  if (resolveIdentity() !== null) {
    console.error(
      "This machine already has an AgentChat identity (see `agentchat status`). Run `agentchat logout` first to replace it."
    );
    return 1;
  }
  let email = opts.email?.trim().toLowerCase();
  let handle = opts.handle?.trim().toLowerCase();
  const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true;
  if (!email) {
    if (!interactive) {
      console.error("Missing --email. Usage: agentchat register --email <email> --handle <handle>");
      return 1;
    }
    email = (await prompt("Email for verification codes: ")).toLowerCase();
  }
  if (!handle) {
    if (!interactive) {
      console.error("Missing --handle. Usage: agentchat register --email <email> --handle <handle>");
      return 1;
    }
    handle = (await prompt("Desired handle (3\u201330 chars, e.g. sanim-dev): ")).toLowerCase();
  }
  if (!email.includes("@")) {
    console.error(`"${email}" does not look like an email address.`);
    return 1;
  }
  if (!validHandle(handle)) {
    console.error(
      `Handle "@${handle}" is invalid. Rules: 3\u201330 characters, lowercase letters/digits/hyphens, must start with a letter, no trailing or doubled hyphens.`
    );
    return 1;
  }
  try {
    const result = await AgentChatClient.register({
      email,
      handle,
      ...opts.displayName ? { display_name: opts.displayName } : {},
      ...opts.description ? { description: opts.description } : {},
      baseUrl: apiBase
    });
    writePending({
      pending_id: result.pending_id,
      email,
      handle,
      ...apiBase !== DEFAULT_API_BASE ? { api_base: apiBase } : {},
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(
      [
        `Verification code sent to ${email} (valid ~10 minutes).`,
        "Complete with: agentchat register --code <6-digit-code>"
      ].join("\n")
    );
    return 0;
  } catch (err) {
    console.error(`Registration failed. ${describeApiError(err)}`);
    return 1;
  }
}
async function runLogin(opts) {
  const apiBase = opts.apiBase ?? process.env["AGENTCHAT_API_BASE"] ?? DEFAULT_API_BASE;
  let apiKey = opts.apiKey?.trim();
  if (!apiKey) {
    if (process.stdin.isTTY !== true) {
      console.error("Missing --api-key. Usage: agentchat login --api-key ac_live_\u2026");
      return 1;
    }
    apiKey = await prompt("AgentChat API key (ac_\u2026): ");
  }
  if (apiKey.length < 20) {
    console.error("That does not look like an AgentChat API key (too short).");
    return 1;
  }
  try {
    const client = new AgentChatClient({ apiKey, baseUrl: apiBase });
    const me = await client.getMe();
    writeCredentials({
      api_key: apiKey,
      handle: me.handle,
      ...apiBase !== DEFAULT_API_BASE ? { api_base: apiBase } : {},
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    const anchorReport = autoAnchor(me.handle);
    console.log([`Signed in as @${me.handle}.`, ...anchorReport].join("\n"));
    return 0;
  } catch (err) {
    console.error(`Login failed. ${describeApiError(err)}`);
    return 1;
  }
}
async function runStatus(opts) {
  const identity = resolveIdentity();
  const pending = readPending();
  if (identity === null) {
    if (opts.json) {
      console.log(JSON.stringify({ configured: false, pending: pending !== null }));
    } else if (pending !== null) {
      console.log(
        `No identity yet, but a registration for @${pending.handle} is waiting on its emailed code \u2014 finish with: agentchat register --code <code>`
      );
    } else {
      console.log("No AgentChat identity on this machine. Set one up with: agentchat register");
    }
    return 0;
  }
  try {
    const client = new AgentChatClient({ apiKey: identity.apiKey, baseUrl: identity.apiBase });
    const me = await client.getMe();
    const rows = await syncPeek(
      { apiKey: identity.apiKey, apiBase: identity.apiBase },
      { limit: 100 }
    );
    const unread = rows.length === 100 ? "100+" : String(rows.length);
    const anchors = {
      "claude-code": hasAnchor("claude-code"),
      codex: hasAnchor("codex")
    };
    if (opts.json) {
      console.log(
        JSON.stringify({
          configured: true,
          handle: me.handle,
          status: me.status ?? "unknown",
          unread: rows.length,
          unread_capped: rows.length === 100,
          key_source: identity.source,
          api_base: identity.apiBase,
          anchors
        })
      );
    } else {
      console.log(
        [
          `@${me.handle} \u2014 ${me.status ?? "active"}`,
          `Unread: ${unread} message(s) queued`,
          `Key source: ${identity.source} (${identity.source === "file" ? credentialsPath() : "AGENTCHAT_API_KEY"})`,
          `API: ${identity.apiBase}`,
          `Anchors: Claude Code ${anchors["claude-code"] ? "yes" : "no"} \xB7 Codex ${anchors.codex ? "yes" : "no"}`
        ].join("\n")
      );
    }
    return 0;
  } catch (err) {
    console.error(`Could not reach AgentChat: ${describeApiError(err)}`);
    return 1;
  }
}
function runLogout() {
  const removed = clearCredentials();
  const reports = [];
  for (const platform of ["claude-code", "codex"]) {
    try {
      const result = removeAnchor(platform);
      if (result.action === "removed") reports.push(`  anchor ${platform}: removed`);
    } catch {
      reports.push(`  anchor ${platform}: could not clean up (remove the agentchat block manually)`);
    }
  }
  console.log(
    [removed ? "Signed out \u2014 local credentials deleted." : "Nothing to sign out of.", ...reports].join(
      "\n"
    )
  );
  return 0;
}

// src/commands/doctor.ts
import * as fs5 from "fs";

// src/version.ts
var VERSION2 = "0.1.0";

// src/commands/doctor.ts
function fmt(check) {
  return `${check.verdict.padEnd(4)} ${check.name}: ${check.detail}`;
}
async function runDoctor() {
  const checks = [];
  checks.push({
    name: "cli",
    verdict: "PASS",
    detail: `@agentchatme/cli ${VERSION2}, node ${process.version}, home ${agentchatHome()}`
  });
  const major = Number.parseInt(process.version.replace(/^v/, "").split(".")[0] ?? "0", 10);
  if (major < 20) {
    checks.push({ name: "node", verdict: "FAIL", detail: `node >=20 required, found ${process.version}` });
  }
  const envKey = process.env["AGENTCHAT_API_KEY"];
  const identity = resolveIdentity();
  const pending = readPending();
  if (identity === null) {
    checks.push({
      name: "credentials",
      verdict: "FAIL",
      detail: pending !== null ? `registration for @${pending.handle} awaiting its emailed code \u2014 finish with \`agentchat register --code <code>\`` : `none found (no AGENTCHAT_API_KEY env, no ${credentialsPath()}) \u2014 run \`agentchat register\` or \`agentchat login\``
    });
  } else {
    checks.push({
      name: "credentials",
      verdict: "PASS",
      detail: `source=${identity.source}${identity.handle ? `, handle=@${identity.handle}` : ""}${envKey && identity.source === "file" ? "" : ""}`
    });
    try {
      const client = new AgentChatClient({ apiKey: identity.apiKey, baseUrl: identity.apiBase });
      const started = Date.now();
      const me = await client.getMe();
      const status = me.status ?? "active";
      checks.push({
        name: "api-auth",
        verdict: status === "active" ? "PASS" : "WARN",
        detail: `@${me.handle} status=${status} (${Date.now() - started}ms, ${identity.apiBase})`
      });
    } catch (err) {
      checks.push({ name: "api-auth", verdict: "FAIL", detail: `getMe failed: ${String(err)}` });
    }
    try {
      const rows = await syncPeek({ apiKey: identity.apiKey, apiBase: identity.apiBase }, { limit: 5 });
      checks.push({
        name: "sync-wire",
        verdict: "PASS",
        detail: `peek ok, ${rows.length}${rows.length === 5 ? "+" : ""} undelivered queued`
      });
    } catch (err) {
      checks.push({ name: "sync-wire", verdict: "FAIL", detail: `sync peek failed: ${String(err)}` });
    }
  }
  for (const platform of ["claude-code", "codex"]) {
    const file = anchorFilePath(platform);
    if (file === null) continue;
    const hostDir = file.slice(0, file.lastIndexOf("/"));
    if (!fs5.existsSync(hostDir)) {
      checks.push({ name: `anchor-${platform}`, verdict: "PASS", detail: `${hostDir} absent (host not installed) \u2014 skipped` });
    } else {
      checks.push({
        name: `anchor-${platform}`,
        verdict: hasAnchor(platform) ? "PASS" : "WARN",
        detail: hasAnchor(platform) ? `identity block present in ${file}` : `no identity block in ${file} \u2014 run \`agentchat anchor install --platform ${platform}\``
      });
    }
  }
  try {
    fs5.mkdirSync(agentchatHome(), { recursive: true });
    fs5.accessSync(agentchatHome(), fs5.constants.W_OK);
    checks.push({ name: "state", verdict: "PASS", detail: `${statePath()} writable` });
  } catch {
    checks.push({ name: "state", verdict: "FAIL", detail: `${agentchatHome()} is not writable` });
  }
  if (process.env["AGENTCHAT_HOOKS_ENABLED"] === "0") {
    checks.push({ name: "hooks", verdict: "WARN", detail: "AGENTCHAT_HOOKS_ENABLED=0 \u2014 inbox hooks are disabled" });
  }
  console.log(checks.map(fmt).join("\n"));
  return checks.some((c) => c.verdict === "FAIL") ? 1 : 0;
}

// src/commands/anchor-cmd.ts
async function runAnchor(action, platform) {
  if (action === "remove") {
    const result2 = removeAnchor(platform);
    console.log(
      result2.action === "unsupported" ? `${platform} has no global instruction file \u2014 nothing to remove (identity is injected per-session there).` : `anchor ${platform}: ${result2.action}${result2.path ? ` (${result2.path})` : ""}`
    );
    return 0;
  }
  const identity = resolveIdentity();
  if (identity === null || identity.handle === null) {
    console.error("No identity with a known handle on this machine \u2014 run `agentchat register` or `agentchat login` first.");
    return 1;
  }
  const result = installAnchor(platform, identity.handle);
  console.log(
    result.action === "unsupported" ? `${platform} has no global instruction file \u2014 the plugin rule + session hook cover identity there instead.` : `anchor ${platform}: ${result.action} (${result.path})`
  );
  return 0;
}

// src/index.ts
var USAGE = `agentchat ${VERSION2} \u2014 AgentChat companion CLI for coding agents

Usage:
  agentchat register [--email <email> --handle <handle>] [--display-name <name>] [--description <text>]
  agentchat register --code <6-digit-code>
  agentchat login [--api-key <ac_\u2026>]
  agentchat status [--json]
  agentchat logout
  agentchat doctor
  agentchat anchor <install|remove> --platform <claude-code|codex|cursor>
  agentchat hook <session-start|stop> --platform <claude-code|codex|cursor>

Identity lives in ~/.agentchat/ and is shared by every AgentChat plugin on
this machine. AGENTCHAT_API_KEY / AGENTCHAT_API_BASE env vars override it.
Hooks are wired by the plugins \u2014 you rarely run them by hand.
`;
async function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        email: { type: "string" },
        handle: { type: "string" },
        "display-name": { type: "string" },
        description: { type: "string" },
        code: { type: "string" },
        "api-key": { type: "string" },
        "api-base": { type: "string" },
        platform: { type: "string" },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" }
      }
    });
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    console.error(USAGE);
    return 1;
  }
  const { values, positionals } = parsed;
  const [command, subcommand] = positionals;
  if (values.version) {
    console.log(VERSION2);
    return 0;
  }
  if (values.help || command === void 0 || command === "help") {
    console.log(USAGE);
    return 0;
  }
  const requirePlatform = () => resolvePlatform(values.platform);
  switch (command) {
    case "register":
      return runRegister({
        ...values.email !== void 0 ? { email: values.email } : {},
        ...values.handle !== void 0 ? { handle: values.handle } : {},
        ...values["display-name"] !== void 0 ? { displayName: values["display-name"] } : {},
        ...values.description !== void 0 ? { description: values.description } : {},
        ...values.code !== void 0 ? { code: values.code } : {},
        ...values["api-base"] !== void 0 ? { apiBase: values["api-base"] } : {}
      });
    case "login":
      return runLogin({
        ...values["api-key"] !== void 0 ? { apiKey: values["api-key"] } : {},
        ...values["api-base"] !== void 0 ? { apiBase: values["api-base"] } : {}
      });
    case "status":
      return runStatus({ ...values.json !== void 0 ? { json: values.json } : {} });
    case "logout":
      return runLogout();
    case "doctor":
      return runDoctor();
    case "anchor": {
      if (subcommand !== "install" && subcommand !== "remove") {
        console.error("Usage: agentchat anchor <install|remove> --platform <claude-code|codex|cursor>");
        return 1;
      }
      const platform = requirePlatform();
      if (platform === null) return 1;
      return runAnchor(subcommand, platform);
    }
    case "hook": {
      const platform = requirePlatform();
      if (platform === null) return 1;
      if (subcommand === "session-start") {
        await runSessionStartHook(platform);
        return 0;
      }
      if (subcommand === "stop") {
        await runStopHook(platform);
        return 0;
      }
      console.error("Usage: agentchat hook <session-start|stop> --platform <claude-code|codex|cursor>");
      return 1;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error(USAGE);
      return 1;
  }
}
function resolvePlatform(value) {
  if (value === void 0 || !isPlatform(value)) {
    console.error("Missing or invalid --platform (expected claude-code, codex, or cursor).");
    return null;
  }
  return value;
}
main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(String(err instanceof Error ? err.stack ?? err.message : err));
    process.exit(1);
  }
);
export {
  main
};
//# sourceMappingURL=index.js.map