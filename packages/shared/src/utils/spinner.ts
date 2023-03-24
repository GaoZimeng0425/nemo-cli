import instance from 'ora'

const BASE_OPTIONS = {
  timeout: 10000
}

export const ora = (message = 'start', options?: typeof BASE_OPTIONS) => {
  const spinner = instance(message)
  // const map: Record<PropertyKey, () => void> = {
  //   start: () => {
  //     spinner.start()
  //     return spinner
  //   }
  // }
  // const target = new Proxy(spinner, {
  //   get(target, p, receiver) {
  //     if (map[p]) {
  //       return map[p]
  //     }
  //     return Reflect.get(target, p, receiver)
  //   },
  //   set(target, p, newValue, receiver) {
  //     throw Error("don't set anything")
  //   }
  // })

  return spinner
}
