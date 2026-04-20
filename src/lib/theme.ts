import { ThemeName } from '../types';
import { getUserState } from './storage';

export const DEFAULT_THEME: ThemeName = 'default';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function getStoredTheme(): ThemeName {
  return getUserState()?.theme ?? DEFAULT_THEME;
}
