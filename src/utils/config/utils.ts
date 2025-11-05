import path from 'path'

export function createUid(): string {
  return crypto.randomUUID()
}

export function getExternalPath(subject: string) {
  return path.join(process.cwd(), subject)
}

export function getExternalConfigPath() {
  return getExternalPath('config')
}

export function getExternalPluginsPath() {
  return getExternalPath('plugins')
}
