/**
 * 日志级别
 */
export const LogLevels = {
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
  Silent: 'silent',
} as const

export type LogLevel = (typeof LogLevels)[keyof typeof LogLevels]

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

/**
 * 日志处理函数
 */
export interface LogHandler {
  (level: LogLevel, prefix: string, ...args: any[]): void
}

/**
 * Logger 配置
 */
export interface LoggerConfig {
  level?: LogLevel
  prefix?: string
  handler?: LogHandler
}

/**
 * Logger 接口
 */
export interface Logger {
  debug(...args: any[]): void
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}

function defaultHandler(level: LogLevel, prefix: string, ...args: any[]): void {
  const tag = prefix ? `[${prefix}]` : ''
  const timestamp = new Date().toISOString()
  const header = `${timestamp} ${tag} [${level.toUpperCase()}]`

  switch (level) {
    case 'debug':
      console.debug(header, ...args)
      break
    case 'info':
      console.info(header, ...args)
      break
    case 'warn':
      console.warn(header, ...args)
      break
    case 'error':
      console.error(header, ...args)
      break
  }
}

/**
 * 创建 Logger 实例
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  const level = config.level ?? 'info'
  const prefix = config.prefix ?? 'kook-sdk'
  const handler = config.handler ?? defaultHandler

  function shouldLog(targetLevel: LogLevel): boolean {
    return levelPriority[targetLevel] >= levelPriority[level]
  }

  return {
    debug(...args: any[]) {
      if (shouldLog('debug')) {
        handler('debug', prefix, ...args)
      }
    },
    info(...args: any[]) {
      if (shouldLog('info')) {
        handler('info', prefix, ...args)
      }
    },
    warn(...args: any[]) {
      if (shouldLog('warn')) {
        handler('warn', prefix, ...args)
      }
    },
    error(...args: any[]) {
      if (shouldLog('error')) {
        handler('error', prefix, ...args)
      }
    },
  }
}
