import type { ReactElement } from "react";
import { Navigate } from "react-router";

import { AuthedLayout } from "./authed-layout";
import { useAuth } from "./use-auth";

/** Auth guard component. Use inside routes like:
 * <Route element={<AuthedRoute/>}>
 *   <Route path="/protected" element={<ProtectedPage/>} />
 * </Route>
 */
export function AuthedRoute(): ReactElement {
  const { authMethod, requiresAuth, isLoading } = useAuth();

  if (isLoading) {
    // We shouldn't be in a "loading" state for more than a frame
    // with the current implementation, but if the initialization
    // code path becomes more expensive in the future, we may want
    // to show a loading indicator at some point.
    return <></>;
  }

  // If we're logged in or don't require any login, allow the page to render.
  if (authMethod || !requiresAuth) {
    return <AuthedLayout />;
  }

  return <Navigate to="/login" replace />;
}
