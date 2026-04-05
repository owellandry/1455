export function shouldShowIdeContextIndicator(
  isAutoContextOn: boolean,
  isIdeContextConnected: boolean,
): boolean {
  return isAutoContextOn && isIdeContextConnected;
}
