import { QueryClient } from '@tanstack/query-core';
import { atom } from 'jotai/vanilla';

const queryClientAtom = atom(new QueryClient());
if (process.env.NODE_ENV !== 'production') {
    queryClientAtom.debugPrivate = true;
}

export { queryClientAtom };
//# sourceMappingURL=_queryClientAtom.js.map
