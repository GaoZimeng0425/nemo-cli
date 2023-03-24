type IndexOf<T extends unknown[], U, Record extends 0[] = []> = T extends [
  infer First,
  ...infer Rest
]
  ? Equal<First, U> extends true
    ? Record['length']
    : IndexOf<Rest, U, [...Record, 0]>
  : -1
type LastIndexOf<T extends unknown[], U> = T extends [...infer Rest, infer Last]
  ? Equal<Last, U> extends true
    ? Rest['length']
    : LastIndexOf<Rest, U>
  : -1

type PickReadonly<T> = keyof {
  [key in keyof T as Equal<Pick<T, key>, Required<Pick<T, key>>> extends true ? key : never]: true
}
type PickPartial<T> = keyof {
  [key in keyof T as Equal<Pick<T, key>, Partial<Pick<T, key>>> extends true ? key : never]: true
}
