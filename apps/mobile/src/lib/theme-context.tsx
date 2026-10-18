import { createContext, useContext } from 'react';
import { theme, type Theme } from './theme';

export const ThemeContext = createContext<Theme>(theme);
export const useTheme = () => useContext(ThemeContext);
