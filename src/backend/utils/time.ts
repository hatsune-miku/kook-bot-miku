/**
 * @typedef {Object} NormalizeTimeOptions
 * @property {string} [defaultValue]
 * @property {boolean} [dateOnly] 是否去掉时分部分，默认false
 * @property {boolean} [dateZeroPadding] 日期部分是否补零，默认true
 * @property {string} [hourZeroPadding] 小时部分是否补零，默认true
 * @property {string} [dateSeparator] 日期部分的分隔符，默认'-'
 * @property {string} [timeSeparator] 时间部分的分隔符，默认':'
 */
export interface NormalizeTimeOptions {
  defaultValue?: string
  dateOnly?: boolean
  dateZeroPadding?: boolean
  hourZeroPadding?: boolean
  dateSeparator?: string
  timeSeparator?: string
}

/**
 * 将任意形式的时间格式化成K标准的时间格式：2025-04-11 11:48
 *
 * 支持的时间格式：
 * ```
 * "2006-01-02 15:04:05"
 * "2006/01/02 15:04:05.000"
 * 1681205200000
 * "1681205200000"
 * 1681205200
 * ```
 *
 * @param {any} representation
 * @param {NormalizeTimeOptions} options
 * @return {string}
 */
export function normalizeTime(representation: any, options: NormalizeTimeOptions) {
  const {
    defaultValue,
    dateOnly = false,
    dateZeroPadding = true,
    hourZeroPadding = true,
    dateSeparator = '-',
    timeSeparator = ':',
  } = options
  if (representation === null || representation === undefined) {
    return defaultValue
  }

  if (typeof representation === 'number') {
    const isTimestampLike = representation > 10000
    if (!isTimestampLike) {
      return defaultValue
    }

    const isMillisecondBased = representation > 1e12
    if (!isMillisecondBased) {
      representation *= 1000
    }
  } else if (typeof representation === 'string') {
    representation = representation.trim()
    const isTimestampLike = (representation.length === 10 || representation.length === 13) && !isNaN(representation)
    if (isTimestampLike) {
      return normalizeTime(parseInt(representation), options)
    }
    const parsedTimestamp = Date.parse(representation)
    if (isNaN(parsedTimestamp) || parsedTimestamp < 10000) {
      return defaultValue
    }
    representation = parsedTimestamp
  } else {
    return defaultValue
  }

  const date = new Date(representation)
  const year = date.getFullYear()
  let month: any = date.getMonth() + 1
  let day: any = date.getDate()
  let hour: any = date.getHours()
  let minute: any = date.getMinutes()

  if (dateZeroPadding) {
    month = month.toString().padStart(2, '0')
    day = day.toString().padStart(2, '0')
  }
  if (hourZeroPadding) {
    hour = hour.toString().padStart(2, '0')
  }
  // 分钟当然永远是2位
  minute = minute.toString().padStart(2, '0')

  let result = `${year}${dateSeparator}${month}${dateSeparator}${day}`
  if (!dateOnly) {
    result += ` ${hour}${timeSeparator}${minute}`
  }
  return result
}
