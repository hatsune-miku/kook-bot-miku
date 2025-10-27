/*
 * @Path          : \kook-bot-cgrelay\src\utils\logging\logger.ts
 * @Created At    : 2024-05-21 16:47:55
 * @Last Modified : 2024-05-22 15:07:32
 * @By            : Guan Zhen (guanzhen@chuanyuapp.com)
 * @Description   : Magic. Don't touch.
 */
import { DateTime } from 'luxon'

import { Env } from '../env/env'

function log(level: string, ...data: any[]) {
  if (!shouldPrintLog(level)) {
    return
  }
  const nowFormatted = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')
  console.log(`[${nowFormatted}] [KBot] [${level}]`, data)
}

export function error(...data: any[]) {
  log('ERROR', data)
}

export function warn(...data: any[]) {
  log('WARN', data)
}

export function info(...data: any[]) {
  log('INFO', data)
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
