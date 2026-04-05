import { createElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { queryClientAtom } from './_queryClientAtom.js';

const HydrateAtoms = ({ client, children })=>{
    useHydrateAtoms([
        [
            queryClientAtom,
            client
        ]
    ]);
    return children;
};
function QueryClientAtomProvider({ client, children }) {
    return createElement(QueryClientProvider, {
        client
    }, createElement(Provider, null, createElement(HydrateAtoms, {
        client
    }, children)));
}

export { QueryClientAtomProvider };
//# sourceMappingURL=react.js.map
