export function basicAssign(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  let prop

  for (prop in source) {
    if (Object.prototype.hasOwnProperty.call(source, prop)) {
      target[prop] = source[prop]
    }
  }

  return target
}
