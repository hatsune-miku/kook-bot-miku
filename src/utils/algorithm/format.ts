export function formatNumber(number: number): string {
  if (number < 1000) {
    return number.toString()
  } else if (number < 10000) {
    return (number / 1000).toFixed(1) + 'k'
  } else if (number < 1000000) {
    return (number / 10000).toFixed(1) + 'w'
  } else {
    return (number / 1000000).toFixed(1) + 'M'
  }
}
