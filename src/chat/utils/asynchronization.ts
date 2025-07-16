export async function until(condition: () => Promise<boolean>) {
  const result = await condition()
  if (result) {
    return
  }
  await until(condition)
}
