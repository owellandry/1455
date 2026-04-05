import { createContext } from "react";

export const AuthNonceContext = createContext<(() => void) | null>(null);
