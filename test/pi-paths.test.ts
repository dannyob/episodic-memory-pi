import { describe, it, expect } from 'vitest';
import { normalizeProjectName, getPiSessionsDir } from '../src/paths.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Pi paths utilities', () => {
  describe('normalizeProjectName', () => {
    it('should strip leading double-dashes from Pi format', () => {
      const piProject = '--Users-danny-Private-nextcloud-life--';
      const normalized = normalizeProjectName(piProject);
      expect(normalized).toBe('Users-danny-Private-nextcloud-life');
    });

    it('should leave Claude Code format unchanged', () => {
      const claudeProject = '-Users-danny-Private-nextcloud-life';
      const normalized = normalizeProjectName(claudeProject);
      expect(normalized).toBe('-Users-danny-Private-nextcloud-life');
    });

    it('should handle project names without dashes', () => {
      const simpleProject = 'my-project';
      const normalized = normalizeProjectName(simpleProject);
      expect(normalized).toBe('my-project');
    });

    it('should handle empty string', () => {
      expect(normalizeProjectName('')).toBe('');
    });

    it('should handle only double-dashes', () => {
      expect(normalizeProjectName('----')).toBe('');
    });
  });

  describe('getPiSessionsDir', () => {
    it('should return null if Pi is not installed', () => {
      // This test is informational - result depends on whether Pi is installed
      const piDir = getPiSessionsDir();
      
      if (piDir === null) {
        // Pi not installed, that's fine
        expect(piDir).toBeNull();
      } else {
        // Pi is installed, verify it's a valid path
        expect(fs.existsSync(piDir)).toBe(true);
        expect(piDir).toContain('.pi');
        expect(piDir).toContain('sessions');
      }
    });

    it('should return correct path structure when Pi is installed', () => {
      const expectedPath = path.join(os.homedir(), '.pi', 'agent', 'sessions');
      const piDir = getPiSessionsDir();
      
      if (fs.existsSync(expectedPath)) {
        expect(piDir).toBe(expectedPath);
      } else {
        expect(piDir).toBeNull();
      }
    });
  });

  describe('Pi session filename format', () => {
    // Test the UUID extraction from Pi filenames
    it('should recognize Pi filename format with timestamp prefix', () => {
      const piFilename = '2026-02-05T04-32-01-792Z_00bc05fd-499f-436b-ba11-b74149239e93.jsonl';
      const match = piFilename.match(/_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
      
      expect(match).not.toBeNull();
      expect(match![1]).toBe('00bc05fd-499f-436b-ba11-b74149239e93');
    });

    it('should recognize Claude Code filename format (UUID only)', () => {
      const claudeFilename = '00bc05fd-499f-436b-ba11-b74149239e93.jsonl';
      const basename = claudeFilename.replace('.jsonl', '');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(basename);
      
      expect(isUUID).toBe(true);
    });
  });
});
