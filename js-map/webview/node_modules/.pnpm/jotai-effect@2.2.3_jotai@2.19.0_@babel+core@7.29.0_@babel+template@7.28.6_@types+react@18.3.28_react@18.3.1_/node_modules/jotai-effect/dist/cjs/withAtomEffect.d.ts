import type { Atom } from 'jotai/vanilla';
import type { Effect } from './atomEffect.js';
export declare function withAtomEffect<T extends Atom<unknown>>(targetAtom: T, effect: Effect): T & {
    effect: Effect;
};
//# sourceMappingURL=withAtomEffect.d.ts.map