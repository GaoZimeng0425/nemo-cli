const { toString, hasOwnProperty } = Object.prototype

const hasOwn = (target: unknown, key: PropertyKey): boolean => hasOwnProperty.call(target, key)
const has = <T extends object, K extends PropertyKey>(target: T, key: K): boolean =>
  Reflect.has(target, key)

const localRegExp = /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
const isLocal = (url: string = window.location.hostname): boolean =>
  url === 'localhost' || url === '[::1]' || url.match(localRegExp) !== null

const isType =
  <T0>(type: string) =>
  <T1 extends T0 = T0>(obj: unknown): obj is T1 =>
    toString.call(obj) === `[object ${type}]`

const isString = isType<string>('String')
const isNumber = isType<number>('Number')
const isBoolean = isType<boolean>('Boolean')
const isNull = isType<null>('Null')
const isUndefined = isType<undefined>('Undefined')

const isError = isType<Error>('Error')

const isPromise = isType<Promise<unknown>>('Promise')
const isPlainObject = isType<Record<string, unknown>>('Object')
const isDate = isType<Date>('Date')
const isSymbol = isType<symbol>('Symbol')
const isSet = isType<Set<unknown>>('Set')
const isMap = isType<Map<unknown, unknown>>('Map')
const isFormData = isType<FormData>('FormData')
const isURLSearchParams = isType<URLSearchParams>('URLSearchParams')

export {
  hasOwn,
  has,
  isString,
  isNumber,
  isBoolean,
  isNull,
  isUndefined,
  isError,
  isPromise,
  isPlainObject,
  isDate,
  isSymbol,
  isSet,
  isMap,
  isFormData,
  isURLSearchParams,
  isLocal
}
