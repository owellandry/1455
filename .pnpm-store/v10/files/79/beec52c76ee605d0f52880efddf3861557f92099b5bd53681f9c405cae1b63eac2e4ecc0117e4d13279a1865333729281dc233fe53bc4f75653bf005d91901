import { getDefaultStore } from 'jotai/vanilla';
import { atomEffect } from './atomEffect.js';
const storeEffects = new WeakMap();
export function observe(effect, store = getDefaultStore()) {
    if (!storeEffects.has(store)) {
        storeEffects.set(store, new Map());
    }
    const effectSubscriptions = storeEffects.get(store);
    let unobserve = effectSubscriptions.get(effect);
    if (!unobserve) {
        const effectAtom = atomEffect(effect);
        let unsubscribe = store.sub(effectAtom, () => { });
        unobserve = () => {
            if (unsubscribe) {
                effectSubscriptions.delete(effect);
                if (effectSubscriptions.size === 0) {
                    storeEffects.delete(store);
                }
                unsubscribe = void unsubscribe();
            }
        };
        effectSubscriptions.set(effect, unobserve);
    }
    return unobserve;
}
//# sourceMappingURL=observe.js.map