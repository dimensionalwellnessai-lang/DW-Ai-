import '@testing-library/jest-dom';
import { afterEach } from 'vitest';

// Only run DOM cleanup when we're actually in a DOM environment.
// Server tests run with `environment: 'node'` and would otherwise crash
// when @testing-library/react tries to touch `document`.
afterEach(async () => {
  if (typeof document === 'undefined') return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});
