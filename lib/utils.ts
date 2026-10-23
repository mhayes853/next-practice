export function compactMap<T, V>(
  arr: T[],
  fn: (value: T, index: number, arr: T[]) => V | null | undefined
): V[] {
  const values = [] as V[]
  for (let i = 0; i < arr.length; i++) {
    const value = fn(arr[i], i, arr)
    if (value) values.push(value)
  }
  return values
}
