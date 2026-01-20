import {createContext, useContext} from 'react';

export type SanityColorTheme = {
  background: string;
  text: string;
};

const ColorThemeContext = createContext<SanityColorTheme | null | undefined>(
  null,
);
export const ColorTheme = ColorThemeContext.Provider;

export const useColorTheme = () => useContext(ColorThemeContext);
