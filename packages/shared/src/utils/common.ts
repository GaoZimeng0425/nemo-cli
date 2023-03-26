export const cached = <Func extends (...args: any[]) => any>(fn: Func) => {
  const map: Map<PropertyKey, ReturnType<Func>> = new Map()
  return (content: PropertyKey): ReturnType<Func> => {
    if (map.has(content)) return map.get(content)!
    const result = fn(content)
    map.set(content, result)
    return result
  }
}

export const sleep = (millisecond: number, controller?: AbortController) => {
  return new Promise((resolve, reject) => {
    controller?.signal.addEventListener('abort', reject)
    setTimeout(resolve, millisecond)
  })
}
