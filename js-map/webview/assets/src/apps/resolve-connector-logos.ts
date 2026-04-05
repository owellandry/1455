import { WebFetchWrapper } from "@/web-fetch-wrapper";

const CONNECTOR_LOGO_URL_PREFIX = "connectors://";
const CONNECTOR_LOGO_THEME_LIGHT = "light";
const CONNECTOR_LOGO_THEME_DARK = "dark";

export type ConnectorLogoRequest = {
  connectorId: string;
  theme: "light" | "dark";
};

export function getConnectorLogoRequestFromLogoUrl(
  logoUrl: string | null | undefined,
): ConnectorLogoRequest | null {
  const normalizedLogoUrl = logoUrl?.trim();
  if (normalizedLogoUrl == null) {
    return null;
  }
  if (normalizedLogoUrl.length === 0) {
    return null;
  }
  if (!normalizedLogoUrl.startsWith(CONNECTOR_LOGO_URL_PREFIX)) {
    return null;
  }

  const schemeLessUrl = normalizedLogoUrl.slice(
    CONNECTOR_LOGO_URL_PREFIX.length,
  );
  const path = schemeLessUrl.split(/[?#]/u)[0] ?? "";
  const connectorId = (path.split("/")[0] ?? "").trim();
  if (connectorId.length === 0) {
    return null;
  }

  const query = schemeLessUrl.split("?")[1]?.split("#")[0] ?? "";
  const themeParam = new URLSearchParams(query).get("theme")?.toLowerCase();
  const theme =
    themeParam === CONNECTOR_LOGO_THEME_DARK
      ? CONNECTOR_LOGO_THEME_DARK
      : CONNECTOR_LOGO_THEME_LIGHT;
  return {
    connectorId,
    theme,
  };
}

export function getConnectorLogoRequestCacheKey({
  connectorId,
  theme,
}: ConnectorLogoRequest): string {
  return `${connectorId}:${theme}`;
}

export async function fetchConnectorLogoDataUrl({
  connectorId,
  theme,
}: ConnectorLogoRequest): Promise<string> {
  const response = await WebFetchWrapper.getInstance().get<{
    base64: string;
    contentType: string;
  }>(`/aip/connectors/${encodeURIComponent(connectorId)}/logo?theme=${theme}`);
  return `data:${response.body.contentType};base64,${response.body.base64}`;
}
