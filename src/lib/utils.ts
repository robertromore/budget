import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type FlyAndScaleParams = {
  y?: number;
  x?: number;
  start?: number;
  duration?: number;
};

export const flyAndScale = (
  node: Element,
  params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig => {
  const style = getComputedStyle(node);
  const transform = style.transform === 'none' ? '' : style.transform;

  const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
    const [minA, maxA] = scaleA;
    const [minB, maxB] = scaleB;

    const percentage = (valueA - minA) / (maxA - minA);
    const valueB = percentage * (maxB - minB) + minB;

    return valueB;
  };

  const styleToString = (style: Record<string, number | string | undefined>): string => {
    return Object.keys(style).reduce((str, key) => {
      if (style[key] === undefined) return str;
      return `${str}${key}:${style[key]};`;
    }, '');
  };

  return {
    duration: params.duration ?? 200,
    delay: 0,
    css: (t) => {
      const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
      const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
      const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

      return styleToString({
        transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        opacity: t
      });
    },
    easing: cubicOut
  };
};

export const reSplitAlphaNumeric = /([0-9]+)/gm;

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

export type AnyObject = Record<string, unknown>;

export const keyBy = <T extends AnyObject>(
  collection: T[] | Record<string, T>,
  key: keyof T | null | undefined
): Record<string, T> => {
  const isArray = Array.isArray(collection);
  const entries = isArray ? (collection as T[]) : Object.values(collection as Record<string, T>);
  return entries.reduce(
    (result, item) => {
      const keyValue = key ? item[key] : item;
      return { ...result, [String(keyValue)]: item };
    },
    {} as Record<string, T>
  );
};

export const without = <T>(array: T[], fn: (element: T) => boolean): T[] => {
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
  return remove;
};

/**
 * Merges objects together while keeping their getters alive.
 * Taken from SolidJS: {@link https://github.com/solidjs/solid/blob/24abc825c0996fd2bc8c1de1491efe9a7e743aff/packages/solid/src/server/rendering.ts#L82-L115}
 * */
export function mergeObjects<T>(source: T): T;
export function mergeObjects<T, U>(source: T, source1: U): T & U;
export function mergeObjects<T, U, V>(source: T, source1: U, source2: V): T & U & V;
export function mergeObjects<T, U, V, W>(
  source: T,
  source1: U,
  source2: V,
  source3: W
): T & U & V & W;
export function mergeObjects(...sources: any): any {
  const target = {};
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    if (typeof source === 'function') source = source();
    if (source) {
      const descriptors = Object.getOwnPropertyDescriptors(source);
      for (const key in descriptors) {
        if (key in target) continue;
        Object.defineProperty(target, key, {
          enumerable: true,
          get() {
            for (let i = sources.length - 1; i >= 0; i--) {
              let v,
                s = sources[i];
              if (typeof s === 'function') s = s();
              v = (s || {})[key];
              if (v !== undefined) return v;
            }
          }
        });
      }
    }
  }
  return target;
}
