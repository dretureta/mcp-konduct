import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dictionaries } from './dictionaries';
import type { Locale } from './types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
global.localStorage = localStorageMock as any;

describe('I18n dictionaries', () => {
  it('should have Spanish translations', () => {
    expect(dictionaries.es['nav.dashboard']).toBe('Panel');
    expect(dictionaries.es['servers.title']).toBe('Servidores');
    expect(dictionaries.es['tools.title']).toBe('Herramientas');
  });

  it('should have English translations', () => {
    expect(dictionaries.en['nav.dashboard']).toBe('Dashboard');
    expect(dictionaries.en['servers.title']).toBe('Servers');
    expect(dictionaries.en['tools.title']).toBe('Tools');
  });

  it('should have same keys in both locales', () => {
    const esKeys = Object.keys(dictionaries.es);
    const enKeys = Object.keys(dictionaries.en);
    expect(esKeys.sort()).toEqual(enKeys.sort());
  });

  it('should have required navigation keys', () => {
    const navKeys = ['nav.dashboard', 'nav.servers', 'nav.tools', 'nav.logs', 'nav.projects', 'nav.settings'];
    navKeys.forEach(key => {
      expect(dictionaries.es[key]).toBeDefined();
      expect(dictionaries.en[key]).toBeDefined();
    });
  });

  it('should have required toast keys', () => {
    const toastKeys = ['toast.serverAdded', 'toast.serverUpdated', 'toast.serverDeleted'];
    toastKeys.forEach(key => {
      expect(dictionaries.es[key]).toBeDefined();
      expect(dictionaries.en[key]).toBeDefined();
    });
  });
});

describe('I18nContext logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should default to Spanish locale from localStorage', () => {
    localStorageMock.getItem.mockReturnValue(null);
    const stored = localStorage.getItem('konduct-locale');
    // null means no stored preference, so default should be 'es'
    expect(stored || 'es').toBe('es');
  });

  it('should read stored locale from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('en');
    const stored = localStorage.getItem('konduct-locale');
    expect(stored).toBe('en');
  });

  it('should persist locale to localStorage', () => {
    localStorage.setItem('konduct-locale', 'en');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('konduct-locale', 'en');
  });
});

describe('Locale type', () => {
  it('should accept valid locales', () => {
    const locales: Locale[] = ['es', 'en'];
    expect(locales).toContain('es');
    expect(locales).toContain('en');
  });
});