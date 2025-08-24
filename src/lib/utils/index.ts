import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

const reSplitAlphaNumeric = /([0-9]+)/gm;

export function compareAlphanumeric(aStr: string, bStr: string) {
  // Split on number groups, but keep the delimiter
  // Then remove falsey split values
  const a = aStr.split(reSplitAlphaNumeric).filter(Boolean);
  const b = bStr.split(reSplitAlphaNumeric).filter(Boolean);

  // While
  while (a.length && b.length) {
    const aa = a.shift()!;
    const bb = b.shift()!;

    const an = Number.parseInt(aa, 10);
    const bn = Number.parseInt(bb, 10);

    const combo = [an, bn].sort();

    // Both are string
    if (Number.isNaN(combo[0]!)) {
      if (aa > bb) {
        return 1;
      }
      if (bb > aa) {
        return -1;
      }
      continue;
    }

    // One is a string, one is a number
    if (Number.isNaN(combo[1]!)) {
      return Number.isNaN(an) ? -1 : 1;
    }

    // Both are numbers
    if (an > bn) {
      return 1;
    }
    if (bn > an) {
      return -1;
    }
  }

  return a.length - b.length;
}

type AnyObject = Record<string, unknown>;

export const without = <T>(array: T[], fn: (element: T) => boolean): [T[], T[]] => {
  const keep: T[] = [];
  const remove: T[] = [];
  array.forEach((value: T) => {
    if (fn(value)) {
      remove.push(value);
    } else {
      keep.push(value);
    }
  });
  array.splice(0, array.length, ...keep);
  return [keep, remove];
};

/**
 * Check if arrays are equal.
 */
export function equalArray(left: unknown[], right: unknown[]) {
  const { length } = left;

  if (length !== right.length) {
    return false;
  }

  for (let index = length; index-- !== 0; ) {
    if (!deeplyEqual(left[index], right[index])) {
      return false;
    }
  }

  return true;
}

/**
 * Check if array buffers are equal.
 */
export function equalArrayBuffer(left: ArrayBufferView, right: ArrayBufferView) {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  const view1 = new DataView(left.buffer);
  const view2 = new DataView(right.buffer);

  let index = left.byteLength;

  while (index--) {
    if (view1.getUint8(index) !== view2.getUint8(index)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if maps are equal.
 */
export function equalMap(left: Map<unknown, unknown>, right: Map<unknown, unknown>) {
  if (left.size !== right.size) {
    return false;
  }

  for (const index of left.entries()) {
    if (!right.has(index[0])) {
      return false;
    }
  }

  for (const index of left.entries()) {
    if (!deeplyEqual(index[1], right.get(index[0]))) {
      return false;
    }
  }

  return true;
}

/**
 * Check if sets are equal.
 */
export function equalSet(left: Set<unknown>, right: Set<unknown>) {
  if (left.size !== right.size) {
    return false;
  }

  for (const index of left.entries()) {
    if (!right.has(index[0])) {
      return false;
    }
  }

  return true;
}

type Primitive = null | undefined | string | number | boolean | symbol | bigint;

/**
 * Checks if the value is of a specified type.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
function isOfType<T extends Primitive | Function>(type: string) {
  // eslint-disable-next-line valid-typeof
  return (value: unknown): value is T => typeof value === type;
}

/**
 * Checks if the value is a JavaScript function.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const isFunction = isOfType<Function>("function");

/**
 * Check if the value is null.
 */
export const isNull = (value: unknown): value is null => {
  return value === null;
};

/**
 * Checks if the input is a regular expression.
 */
export const isRegex = (value: unknown): value is RegExp => {
  return Object.prototype.toString.call(value).slice(8, -1) === "RegExp";
};

/**
 * Checks if the value is an object.
 */
export const isObject = (value: unknown): value is AnyObject => {
  return !isUndefined(value) && !isNull(value) && (isFunction(value) || typeof value === "object");
};

/**
 * Checks if the value is undefined.
 */
export const isUndefined = isOfType<undefined>("undefined");

/**
 * Checks if two values are equal.
 */
export default function deeplyEqual(left: unknown, right: unknown) {
  if (left === right) {
    return true;
  }

  if (left && isObject(left) && right && isObject(right)) {
    if (left.constructor !== right.constructor) {
      return false;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      return equalArray(left, right);
    }

    if (left instanceof Map && right instanceof Map) {
      return equalMap(left, right);
    }

    if (left instanceof Set && right instanceof Set) {
      return equalSet(left, right);
    }

    if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right)) {
      return equalArrayBuffer(left, right);
    }

    if (isRegex(left) && isRegex(right)) {
      return left.source === right.source && left.flags === right.flags;
    }

    if (left.valueOf !== Object.prototype.valueOf) {
      return left.valueOf() === right.valueOf();
    }

    if (left.toString !== Object.prototype.toString) {
      return left.toString() === right.toString();
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (let index = leftKeys.length; index-- !== 0; ) {
      if (!Object.prototype.hasOwnProperty.call(right, leftKeys[index])) {
        return false;
      }
    }

    for (let index = leftKeys.length; index-- !== 0; ) {
      const key = leftKeys[index];

      if (!deeplyEqual(left[key], right[key])) {
        return false;
      }
    }

    return true;
  }

  if (Number.isNaN(left) && Number.isNaN(right)) {
    return true;
  }

  return left === right;
}

export * from "./dates";
