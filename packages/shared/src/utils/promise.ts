export const tryPromise = async <T>(promise: Promise<T>) => {
  try {
    const result = await promise
    return [null, result] as [never, T]
  } catch (err) {
    return [err, null] as [any, T]
  }
}
