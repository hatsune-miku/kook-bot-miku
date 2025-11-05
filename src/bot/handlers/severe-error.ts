import { die } from '../../utils/server/die'

export function handleSevereError(message: string) {
  die(`A severe error occured and bot must exit: ${message}`)
}
