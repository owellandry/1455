import { ConfigurationKeys } from "protocol";

import { useConfiguration } from "@/hooks/use-configuration";

export function useEnterBehavior(): {
  enterBehavior: "enter" | "cmdIfMultiline";
  setEnterBehavior: (
    behavior: "enter" | "cmdIfMultiline",
  ) => void | Promise<void>;
  isLoading: boolean;
} {
  const {
    data: enterBehavior,
    setData: setEnterBehavior,
    isLoading,
  } = useConfiguration(ConfigurationKeys.COMPOSER_ENTER_BEHAVIOR);

  return {
    enterBehavior: enterBehavior ?? "enter",
    setEnterBehavior,
    isLoading,
  };
}
