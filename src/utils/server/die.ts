import { KResponseExt } from '../krequest/types'

export function die(reason: string): never {
  console.error(reason)
  console.error('Exiting...')
  process.exit(1)
}

export function successOrDie(res: KResponseExt<any>, reason?: string) {
  reason ||= '请求失败'
  if (!res.success) {
    die(reason)
  }
}
