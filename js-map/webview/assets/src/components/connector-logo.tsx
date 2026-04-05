import clsx from "clsx";
import type React from "react";
import { cloneElement, useState } from "react";

import { useIsDark } from "@/utils/use-is-dark";

export function ConnectorLogo({
  alt,
  className,
  logoUrl,
  logoDarkUrl,
  fallback,
}: {
  alt: string;
  className?: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  fallback: React.ReactElement<{ className?: string }>;
}): React.ReactElement {
  const isDarkTheme = useIsDark() === true;
  const selectedLogo = selectLogoUrl({
    logoUrl,
    logoDarkUrl,
    isDarkTheme,
  });
  const fallbackWithClassName = cloneElement(fallback, {
    className: clsx(className, fallback.props.className),
  });

  if (selectedLogo.url == null) {
    return fallbackWithClassName;
  }

  return (
    <ConnectorLogoImage
      key={selectedLogo.url}
      alt={alt}
      className={className}
      src={selectedLogo.url}
      fallback={fallbackWithClassName}
    />
  );
}

function selectLogoUrl({
  logoUrl,
  logoDarkUrl,
  isDarkTheme,
}: {
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  isDarkTheme: boolean;
}): { url: string | null } {
  const lightLogoUrl = normalizeLogoUrl(logoUrl);
  const darkLogoUrl = normalizeLogoUrl(logoDarkUrl);

  if (isDarkTheme) {
    if (darkLogoUrl != null) {
      return {
        url: darkLogoUrl,
      };
    }
    return {
      url: lightLogoUrl,
    };
  }

  if (lightLogoUrl != null) {
    return {
      url: lightLogoUrl,
    };
  }

  return {
    url: darkLogoUrl,
  };
}

function normalizeLogoUrl(url: string | null | undefined): string | null {
  const normalizedUrl = url?.trim();
  if (normalizedUrl == null || normalizedUrl.length === 0) {
    return null;
  }
  return normalizedUrl;
}

function ConnectorLogoImage({
  alt,
  className,
  src,
  fallback,
}: {
  alt: string;
  className?: string;
  src: string;
  fallback: React.ReactElement;
}): React.ReactElement {
  const [didFailToLoad, setDidFailToLoad] = useState(false);
  if (didFailToLoad) {
    return fallback;
  }
  return (
    <img
      alt={alt}
      className={className}
      src={src}
      onError={(): void => {
        setDidFailToLoad(true);
      }}
    />
  );
}
