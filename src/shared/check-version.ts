export function isCurrentCheck(expectedVersion: number, currentVersion: number | undefined, expectedText: string, currentText: string): boolean {
  return expectedVersion === currentVersion && expectedText === currentText;
}
