"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observe = observe;
const vanilla_1 = require("jotai/vanilla");
const atomEffect_1 = require("./atomEffect.js");
const storeEffects = new WeakMap();
function observe(effect, store = (0, vanilla_1.getDefaultStore)()) {
    if (!storeEffects.has(store)) {
        storeEffects.set(store, new Map());
    }
    const effectSubscriptions = storeEffects.get(store);
    let unobserve = effectSubscriptions.get(effect);
    if (!unobserve) {
        const effectAtom = (0, atomEffect_1.atomEffect)(effect);
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