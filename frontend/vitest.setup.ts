import { afterEach } from 'vitest';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);
afterEach(cleanup);
afterEach(() => localStorage.clear());

window.matchMedia = window.matchMedia ?? ((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
}) as MediaQueryList);
