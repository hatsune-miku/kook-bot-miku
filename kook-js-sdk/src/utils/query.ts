/**
 * 将对象转换为 URL 查询字符串
 *
 * @example queryFromObject({ a: 1, b: 'hello' }) => 'a=1&b=hello'
 */
export function queryFromObject(obj: Record<string, any>): string {
  return Object.keys(obj)
    .filter((key) => obj[key] !== undefined && obj[key] !== null)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&')
}
