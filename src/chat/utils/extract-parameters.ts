import { info } from "../../utils/logging/logger"

export function extractParameter(
  parameters: string[],
  subject: string,
  defaultValue: string
): string {
  try {
    return (
      parameters.find((p) => p.startsWith(`${subject}=`))?.split("=")[1] ||
      defaultValue
    )
  } catch {
    return defaultValue
  }
}

export function parseParameterDate(parameter: string) {
  let untilDateParsed: Date
  if (parameter.startsWith("+")) {
    const now = new Date()

    try {
      info(`parameter: ${parameter}`)
      const [value, unit] = parameter.match(/^\+(\d+)([smhd])$/)!.slice(1)
      const valueInt = parseInt(value)
      if (isNaN(valueInt)) {
        return null
      }

      switch (unit) {
        case "s":
          untilDateParsed = new Date(now.getTime() + valueInt * 1000)
          break
        case "m":
          untilDateParsed = new Date(now.getTime() + valueInt * 60 * 1000)
          break
        case "h":
          untilDateParsed = new Date(now.getTime() + valueInt * 60 * 60 * 1000)
          break
      }
    } catch {
      return null
    }
  } else {
    if (parameter.length !== "20070831120000".length) {
      return null
    }

    const year = parseInt(parameter.slice(0, 4))
    const month = parseInt(parameter.slice(4, 6)) - 1
    const day = parseInt(parameter.slice(6, 8))
    const hour = parseInt(parameter.slice(8, 10))
    const minute = parseInt(parameter.slice(10, 12))
    const second = parseInt(parameter.slice(12, 14))
    untilDateParsed = new Date(year, month, day, hour, minute, second)
  }
  return untilDateParsed!
}
