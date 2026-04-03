import { create } from 'zustand';
import { COLORS } from '../constants/theme';

interface ThemeState {
  isDark: boolean;
  colors: typeof COLORS.light;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  colors: COLORS.light,

  toggleTheme: () =>
    set((state) => ({
      isDark: !state.isDark,
      colors: !state.isDark ? COLORS.dark : COLORS.light,
    })),

  setTheme: (dark: boolean) =>
    set({ isDark: dark, colors: dark ? COLORS.dark : COLORS.light }),
}));
