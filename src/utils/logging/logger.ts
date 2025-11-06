import { DateTime } from 'luxon'

import { Env } from '../env/env'

function log(level: string, ...data: any[]) {
  if (!shouldPrintLog(level)) {
    return
  }
  const nowFormatted = DateTime.now().toFormat('yyyy/MM/dd HH:mm:ss')
  const flattenProc = (d: any[]) => {
    if (Array.isArray(d)) {
      return d.map(flattenProc).join(' ')
    }
    return d
  }

  const rendered = flattenProc(data)
  console.log(`[${nowFormatted}] ${level}`, rendered)
}

export function error(...data: any[]) {
  log('\x1b[31mERROR\x1b[0m', ...data)
}

export function warn(...data: any[]) {
  log('\x1b[33mWARN\x1b[0m', ...data)
}

export function info(...data: any[]) {
  log('\x1b[32mINFO\x1b[0m', ...data)
}

function getLogLevelQualifier(level: string) {
  switch (level) {
    case 'critical':
      return 4
    case 'error':
      return 3
    case 'warning':
      return 2
    case 'info':
      return 1
    case 'verbose':
    default:
      return 0
  }
}

function shouldPrintLog(level: string) {
  const activeLogLevel = Env.LogLevel
  const activeLogLevelQualifier = getLogLevelQualifier(activeLogLevel)
  const targetLogLevelQualifier = getLogLevelQualifier(level)
  return targetLogLevelQualifier >= activeLogLevelQualifier
}
