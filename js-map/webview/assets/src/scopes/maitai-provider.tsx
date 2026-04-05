import { useQueryClient } from "@tanstack/react-query";
import { MaitaiProvider as CoreMaitaiProvider } from "maitai";
import type React from "react";

export function MaitaiProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const queryClient = useQueryClient();

  return (
    <CoreMaitaiProvider queryClient={queryClient}>
      {children}
    </CoreMaitaiProvider>
  );
}
