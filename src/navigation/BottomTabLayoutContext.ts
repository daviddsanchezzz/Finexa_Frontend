import { createContext } from 'react';

// Custom tab bar is absolutely positioned. Consumers reserve its measured
// height rather than guessing a fixed offset or counting safe areas twice.
export const BottomTabLayoutContext = createContext(0);
