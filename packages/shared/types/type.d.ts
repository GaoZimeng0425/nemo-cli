type PrimitivityType = number | string | boolean | bigint | undefined | null | unknown

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type IsNever<T> = Equal<T, never>
type IsAny<T> = Equal<T, any>
type IsTuple<T> = true extends IsAny<T> | IsNever<T>
  ? false
  : T extends readonly [] | readonly [infer _0, ...infer _1]
    ? true
    : false

type AnyFunction<I = any, R = any> = (...args: I[]) => R
type AnyObject<T = any> = Record<PropertyKey, T>
