/* Native Error types https://mzl.la/2Veh3TR */
const nativeExceptions = [EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError].filter(
  (except) => typeof except === 'function'
)

/* Throw native errors. ref: https://bit.ly/2VsoCGE */
function throwNative(error: unknown) {
  for (const Exception of nativeExceptions) {
    if (error instanceof Exception) throw error
  }
}

const safeAwait = async <T>(promise: Promise<T>): Promise<[error: Error] | [error: undefined, data: T]> => {
  try {
    const data = await promise
    if (data instanceof Error) {
      throwNative(data)
      return [data] as const
    }
    return [undefined, data] as const
  } catch (error: unknown) {
    throwNative(error)
    return [error] as [Error]
  }
}
export default safeAwait
