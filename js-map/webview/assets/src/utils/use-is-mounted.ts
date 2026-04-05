import { useCallback, useEffect, useRef } from "react";

export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return (): void => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}
