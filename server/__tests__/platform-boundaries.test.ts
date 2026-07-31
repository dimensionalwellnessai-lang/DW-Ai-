import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../..');

function collectFiles(dir: string, extensions = new Set(['.ts', '.tsx'])): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath, extensions);
    }

    return extensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

describe('platform boundary guardrails', () => {
  it('shared modules stay free of mobile runtime imports', () => {
    const sharedFiles = collectFiles(path.join(repoRoot, 'shared'));
    const offenders = sharedFiles.filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return /from ['"](?:react-native|expo|expo-router|@sentry\/react-native)/.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it('mobile source does not import web client modules', () => {
    const mobileFiles = collectFiles(path.join(repoRoot, 'apps/mobile/src'));
    const offenders = mobileFiles.filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return /from ['"](?:@web\/|(?:\.\.\/)+(?:client|server)\/)/.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
