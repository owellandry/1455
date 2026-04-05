"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.atomEffect = atomEffect;
const vanilla_1 = require("jotai/vanilla");
const internals_1 = require("jotai/vanilla/internals");
const env_1 = require("./env.js");
function atomEffect(effect) {
    const refAtom = (0, vanilla_1.atom)(() => []);
    const effectAtom = (0, vanilla_1.atom)(function effectAtomRead(get) {
        const [dependencies, atomState, mountedMap] = get(refAtom);
        if (mountedMap.has(effectAtom)) {
            dependencies.forEach(get);
            ++atomState.n;
        }
    });
    effectAtom.effect = effect;
    effectAtom.INTERNAL_onInit = (store) => {
        const deps = new Set();
        let inProgress = 0;
        let isRecursing = false;
        let hasChanged = false;
        let fromCleanup = false;
        let runCleanup;
        function runEffect() {
            if (inProgress) {
                return;
            }
            deps.clear();
            let isSync = true;
            const getter = (a) => {
                var _a;
                if (fromCleanup) {
                    return store.get(a);
                }
                if (a === effectAtom) {
                    const aState = ensureAtomState(store, a);
                    if (!(0, internals_1.INTERNAL_isAtomStateInitialized)(aState)) {
                        if ((0, internals_1.INTERNAL_hasInitialValue)(a)) {
                            setAtomStateValueOrPromise(store, a, a.init);
                        }
                        else {
                            // NOTE invalid derived atoms can reach here
                            throw new Error('no atom init');
                        }
                    }
                    return (0, internals_1.INTERNAL_returnAtomValue)(aState);
                }
                // a !== atom
                const aState = readAtomState(store, a);
                try {
                    return (0, internals_1.INTERNAL_returnAtomValue)(aState);
                }
                finally {
                    atomState.d.set(a, aState.n);
                    (_a = mountedMap.get(a)) === null || _a === void 0 ? void 0 : _a.t.add(effectAtom);
                    if (isSync) {
                        deps.add(a);
                    }
                    else {
                        if (mountedMap.has(a)) {
                            mountDependencies(store, effectAtom);
                            recomputeInvalidatedAtoms(store);
                            flushCallbacks(store);
                        }
                    }
                }
            };
            getter.peek = store.get;
            const setter = (a, ...args) => {
                var _a;
                const aState = ensureAtomState(store, a);
                try {
                    ++inProgress;
                    if (a === effectAtom) {
                        if (!(0, internals_1.INTERNAL_hasInitialValue)(a)) {
                            // NOTE technically possible but restricted as it may cause bugs
                            throw new Error('atom not writable');
                        }
                        const prevEpochNumber = aState.n;
                        const v = args[0];
                        setAtomStateValueOrPromise(store, a, v);
                        mountDependencies(store, a);
                        if (prevEpochNumber !== aState.n) {
                            changedAtoms.add(a);
                            (_a = storeHooks.c) === null || _a === void 0 ? void 0 : _a.call(storeHooks, a);
                            invalidateDependents(store, a);
                        }
                        return undefined;
                    }
                    else {
                        return writeAtomState(store, a, ...args);
                    }
                }
                finally {
                    if (!isSync) {
                        recomputeInvalidatedAtoms(store);
                        flushCallbacks(store);
                    }
                    --inProgress;
                }
            };
            setter.recurse = (a, ...args) => {
                if (fromCleanup) {
                    if ((0, env_1.isDev)()) {
                        throw new Error('set.recurse is not allowed in cleanup');
                    }
                    return undefined;
                }
                try {
                    isRecursing = true;
                    mountDependencies(store, effectAtom);
                    return setter(a, ...args);
                }
                finally {
                    recomputeInvalidatedAtoms(store);
                    isRecursing = false;
                    if (hasChanged) {
                        hasChanged = false;
                        runEffect();
                    }
                }
            };
            try {
                runCleanup === null || runCleanup === void 0 ? void 0 : runCleanup();
                const cleanup = effectAtom.effect(getter, setter);
                if (typeof cleanup !== 'function') {
                    return;
                }
                runCleanup = () => {
                    if (inProgress) {
                        return;
                    }
                    try {
                        isSync = true;
                        fromCleanup = true;
                        return cleanup();
                    }
                    finally {
                        isSync = false;
                        fromCleanup = false;
                        runCleanup = undefined;
                    }
                };
            }
            finally {
                isSync = false;
                deps.forEach((depAtom) => {
                    atomState.d.set(depAtom, ensureAtomState(store, depAtom).n);
                });
                mountDependencies(store, effectAtom);
                recomputeInvalidatedAtoms(store);
            }
        }
        const buildingBlocks = (0, internals_1.INTERNAL_getBuildingBlocksRev2)(store);
        const mountedMap = buildingBlocks[1];
        const changedAtoms = buildingBlocks[3];
        const storeHooks = (0, internals_1.INTERNAL_initializeStoreHooksRev2)(buildingBlocks[6]);
        const ensureAtomState = buildingBlocks[11];
        const flushCallbacks = buildingBlocks[12];
        const recomputeInvalidatedAtoms = buildingBlocks[13];
        const readAtomState = buildingBlocks[14];
        const invalidateDependents = buildingBlocks[15];
        const writeAtomState = buildingBlocks[16];
        const mountDependencies = buildingBlocks[17];
        const setAtomStateValueOrPromise = buildingBlocks[20];
        const atomEffectChannel = ensureAtomEffectChannel(store, storeHooks);
        const atomState = ensureAtomState(store, effectAtom);
        // initialize atomState
        atomState.v = undefined;
        Object.assign(store.get(refAtom), [deps, atomState, mountedMap]);
        storeHooks.c.add(effectAtom, function atomOnChange() {
            ;
            changedAtoms.delete(effectAtom);
        });
        storeHooks.m.add(effectAtom, function atomOnMount() {
            // mounted
            atomEffectChannel.add(runEffect);
            if (runCleanup) {
                atomEffectChannel.delete(runCleanup);
            }
        });
        storeHooks.u.add(effectAtom, function atomOnUnmount() {
            // unmounted
            atomEffectChannel.delete(runEffect);
            if (runCleanup) {
                atomEffectChannel.add(runCleanup);
            }
        });
        storeHooks.c.add(effectAtom, function atomOnUpdate() {
            // changed
            if (isRecursing) {
                hasChanged = true;
            }
            else {
                atomEffectChannel.add(runEffect);
            }
        });
    };
    if ((0, env_1.isDev)()) {
        Object.defineProperty(refAtom, 'debugLabel', {
            get: () => effectAtom.debugLabel ? `${effectAtom.debugLabel}:ref` : undefined,
            configurable: true,
            enumerable: true,
        });
        refAtom.debugPrivate = true;
    }
    return effectAtom;
}
const atomEffectChannelStoreMap = new WeakMap();
function ensureAtomEffectChannel(store, storeHooks) {
    let atomEffectChannel = atomEffectChannelStoreMap.get(store);
    if (!atomEffectChannel) {
        atomEffectChannel = new Set();
        atomEffectChannelStoreMap.set(store, atomEffectChannel);
        storeHooks.f.add(function storeOnFlush() {
            // flush
            for (const fn of atomEffectChannel) {
                atomEffectChannel.delete(fn);
                fn();
            }
        });
    }
    return atomEffectChannel;
}
//# sourceMappingURL=atomEffect.js.map