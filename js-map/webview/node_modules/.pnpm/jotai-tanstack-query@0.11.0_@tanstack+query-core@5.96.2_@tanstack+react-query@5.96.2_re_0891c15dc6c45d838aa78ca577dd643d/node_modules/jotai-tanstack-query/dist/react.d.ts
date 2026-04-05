import * as react from 'react';
import { QueryClientProviderProps } from '@tanstack/react-query';

declare function QueryClientAtomProvider({ client, children, }: QueryClientProviderProps): react.FunctionComponentElement<QueryClientProviderProps>;

export { QueryClientAtomProvider };
