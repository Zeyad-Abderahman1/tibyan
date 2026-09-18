import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { resolveRuntimePaths } from '../electron/runtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Task 17: Windows Packaging Verification & Runtime Path Isolation Suite', () => {
  const originalEnv = process.env.TIBYAN_APP_DATA_DIR;

  beforeEach(() => {
    delete process.env.TIBYAN_APP_DATA_DIR;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.TIBYAN_APP_DATA_DIR = originalEnv;
    } else {
      delete process.env.TIBYAN_APP_DATA_DIR;
    }
  });

  describe('1. Runtime Test-Data Isolation & Path Resolution', () => {
    it('honors process.env.TIBYAN_APP_DATA_DIR when customAppDataDir is not explicitly passed', () => {
      const customPath = path.resolve(__dirname, '../.test-isolated-appdata');
      process.env.TIBYAN_APP_DATA_DIR = customPath;

      const paths = resolveRuntimePaths();
      expect(paths.appDataDir).toBe(customPath);
      expect(paths.systemDbPath).toBe(path.join(customPath, 'data', 'system', 'tibyan-system.sqlite'));
      expect(paths.academicYearsDbDir).toBe(path.join(customPath, 'data', 'academic-years'));
      expect(paths.mediaRootDir).toBe(path.join(customPath, 'media'));
      expect(paths.backupRootDir).toBe(path.join(customPath, 'backups'));
    });

    it('prioritizes explicitly passed customAppDataDir over process.env.TIBYAN_APP_DATA_DIR', () => {
      const envPath = path.resolve(__dirname, '../.test-env-appdata');
      const explicitPath = path.resolve(__dirname, '../.test-explicit-appdata');
      process.env.TIBYAN_APP_DATA_DIR = envPath;

      const paths = resolveRuntimePaths(explicitPath);
      expect(paths.appDataDir).toBe(explicitPath);
    });

    it('uses :memory: for systemDbPath when inMemory is true regardless of base directory', () => {
      const paths = resolveRuntimePaths(undefined, true);
      expect(paths.systemDbPath).toBe(':memory:');
    });
  });

  describe('2. Electron Builder Packaging Configuration', () => {
    const builderConfigPath = path.resolve(__dirname, '../electron-builder.json5');

    it('verifies electron-builder.json5 exists and contains required production packaging rules', () => {
      expect(fs.existsSync(builderConfigPath)).toBe(true);
      const rawContent = fs.readFileSync(builderConfigPath, 'utf8');

      expect(rawContent).toContain('"appId": "com.tibyan.desktop"');
      expect(rawContent).toContain('"productName": "تِبيان"');
      expect(rawContent).toContain('"asar": true');
      expect(rawContent).toContain('"win"');
      expect(rawContent).toContain('"nsis"');
      expect(rawContent).toContain('"asarUnpack"');
      expect(rawContent).toMatch(/\*\*\/\*\.node/);
    });

    it('verifies package.json contains better-sqlite3 in production dependencies for packaging', () => {
      const pkgPath = path.resolve(__dirname, '../package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.dependencies).toBeDefined();
      expect(pkg.dependencies['better-sqlite3']).toBe('12.11.1');
    });
  });

  describe('3. Production Asset Integrity', () => {
    it('verifies official logo asset exists and preserves exact SHA-256 hash', () => {
      const logoPath = path.resolve(__dirname, '../../../packages/design-system/src/assets/tibyan-official-logo.png');
      expect(fs.existsSync(logoPath)).toBe(true);

      const buffer = fs.readFileSync(logoPath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();

      expect(hash).toBe('66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749');
    });

    it('verifies offline fonts are bundled into production dist directory', () => {
      const distAssetsDir = path.resolve(__dirname, '../dist/assets');
      if (fs.existsSync(distAssetsDir)) {
        const files = fs.readdirSync(distAssetsDir);
        const hasCairo = files.some((f) => f.startsWith('cairo-') && (f.endsWith('.woff') || f.endsWith('.woff2')));
        const hasInter = files.some((f) => f.startsWith('inter-') && (f.endsWith('.woff') || f.endsWith('.woff2')));
        expect(hasCairo).toBe(true);
        expect(hasInter).toBe(true);
      }
    });
  });
});
