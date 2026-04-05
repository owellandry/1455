import type { Atom, Getter, Setter } from 'jotai/vanilla';
export type GetterWithPeek = Getter & {
    peek: Getter;
};
export type SetterWithRecurse = Setter & {
    recurse: Setter;
};
type Cleanup = () => void;
export type Effect = (get: GetterWithPeek, set: SetterWithRecurse) => void | Cleanup;
export declare function atomEffect(effect: Effect): Atom<void> & {
    effect: Effect;
};
export {};
//# sourceMappingURL=atomEffect.d.ts.map