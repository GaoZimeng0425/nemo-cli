type PrimitivityType = number | string | boolean | bigint | undefined | null | unknown

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false

type IsNever<T> = Equal<T, never>
type IsAny<T> = Equal<T, any>
type IsTuple<T> = true extends IsAny<T> | IsNever<T>
  ? false
  : T extends readonly [] | readonly [infer _0, ...infer _1]
  ? true
  : false

type AnyFunction = (...args: any[]) => any
type AnyObject<T = any> = Record<PropertyKey, T>

type UnionToIntersection<T> = (T extends unknown ? (arg: T) => void : never) extends (
  arg: infer Arg
) => void
  ? Arg
  : never

type IntersectionToUnion<T> = (T extends unknown ? (arg: infer Arg) => void : never) extends (
  arg: T
) => void
  ? Arg
  : never
