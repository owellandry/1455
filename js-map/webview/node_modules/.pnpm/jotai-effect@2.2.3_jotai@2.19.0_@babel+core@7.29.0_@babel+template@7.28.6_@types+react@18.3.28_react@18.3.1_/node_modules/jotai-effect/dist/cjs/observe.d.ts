import { getDefaultStore } from 'jotai/vanilla';
import type { Effect } from './atomEffect.js';
type Store = ReturnType<typeof getDefaultStore>;
type Unobserve = () => void;
export declare function observe(effect: Effect, store?: Store): Unobserve;
export {};
//# sourceMappingURL=observe.d.ts.map