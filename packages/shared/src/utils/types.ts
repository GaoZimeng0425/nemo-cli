export const hasOwn = (target: Record<string, unknown>, key: PropertyKey): boolean => Object.hasOwn(target, key)
export const has = <T extends object, K extends PropertyKey>(target: T, key: K): boolean => Reflect.has(target, key)

const isType =
  <T0>(type: string) =>
  <T1 extends T0 = T0>(obj: unknown): obj is T1 =>
    Object.prototype.toString.call(obj) === `[object ${type}]`

export const isString = isType<string>('String')
export const isNumber = isType<number>('Number')
export const isBoolean = isType<boolean>('Boolean')
export const isNull = isType<null>('Null')
export const isUndefined = isType<undefined>('Undefined')

export const isError = isType<Error>('Error')

export const isPromise = isType<Promise<unknown>>('Promise')
export const isPlainObject = isType<Record<string, unknown>>('Object')
export const isArray = isType<unknown[]>('Array')
export const isDate = isType<Date>('Date')
export const isFunction = isType<AnyFunction>('Function')

export const isSymbol = isType<symbol>('Symbol')
export const isSet = isType<Set<unknown>>('Set')
export const isMap = isType<Map<unknown, unknown>>('Map')
export const isFormData = isType<FormData>('FormData')
export const isURLSearchParams = isType<URLSearchParams>('URLSearchParams')

export const isEmpty = (value: unknown): value is null | undefined | '' | [] | Record<string, never> => {
  if (value == null) return true
  if (isString(value)) return value.trim() === ''
  if (isNumber(value)) return !Number.isFinite(value)
  if (isArray(value)) return value.length === 0
  if (isPlainObject(value)) return Object.keys(value).length === 0
  return false
}

// biome-ignore lint/suspicious/noExplicitAny: need to use any
export type AnyFunction = (...args: any) => any
