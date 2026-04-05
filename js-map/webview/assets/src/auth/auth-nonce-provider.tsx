import React, { type ReactNode, useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { AuthNonceContext } from "./auth-nonce-context";

/**
 * Provides React context that allows children to reset the auth nonce.
 * The auth nonce keys the entire React tree and should reset any time the user changes.
 * This will ensure that no state (react, jotai, tanstack query, etc.) persists across users.
 */
export function AuthNonceProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [nonce, setNonce] = useState<string>(generateNonce());
  const updateNonce = useCallback(() => {
    setNonce(generateNonce());
  }, [setNonce]);
  return (
    <AuthNonceContext.Provider value={updateNonce}>
      <React.Fragment key={nonce}>{children}</React.Fragment>
    </AuthNonceContext.Provider>
  );
}

function generateNonce(): string {
  return uuidv4();
}
