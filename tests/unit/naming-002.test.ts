import { describe, expect, it } from 'vitest';
import {
  assertPathWithinLimit,
  buildStandardName,
  conflictKey,
  MAX_DISTINGUISHING_TEXT_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PATH_LENGTH,
} from '@/lib/naming';
import { InvalidPathError } from '@/lib/storage/port';

/**
 * The naming rule as feature 002 changed it.
 *
 * Feature 001's assertions still live in naming.test.ts and must keep passing
 * unchanged — that is what proves the fourth part is genuinely optional and
 * that no file already in Dropbox became inconsistent (FR-002).
 */

const BASE = { quest: 'Onboarding', mission: 'Welcome', stage: 'Rough cut' };

describe('the fourth name part', () => {
  it('appends the distinguishing text with the same separator', () => {
    expect(
      buildStandardName({ ...BASE, originalName: 'clip.mp4', distinguishingText: 'take 2' }),
    ).toBe('Onboarding_Welcome_Rough cut_take 2.mp4');
  });

  it('produces feature 001 exact name when there is no text', () => {
    const withNothing = buildStandardName({ ...BASE, originalName: 'clip.mp4' });
    const withUndefined = buildStandardName({
      ...BASE,
      originalName: 'clip.mp4',
      distinguishingText: undefined,
    });
    const withNull = buildStandardName({
      ...BASE,
      originalName: 'clip.mp4',
      distinguishingText: null,
    });
    const withEmpty = buildStandardName({
      ...BASE,
      originalName: 'clip.mp4',
      distinguishingText: '   ',
    });

    // All four must be identical, or a file uploaded before this feature would
    // stop matching one uploaded after it.
    for (const name of [withNothing, withUndefined, withNull, withEmpty]) {
      expect(name).toBe('Onboarding_Welcome_Rough cut.mp4');
    }
  });

  it('trims the text before using it', () => {
    expect(
      buildStandardName({ ...BASE, originalName: 'clip.mp4', distinguishingText: '  take 2  ' }),
    ).toBe('Onboarding_Welcome_Rough cut_take 2.mp4');
  });

  it('allows a text containing spaces and hyphens', () => {
    expect(
      buildStandardName({
        ...BASE,
        originalName: 'clip.mp4',
        distinguishingText: 'wide angle - v2',
      }),
    ).toBe('Onboarding_Welcome_Rough cut_wide angle - v2.mp4');
  });

  it.each(['a/b', 'a:b', 'a?b', 'a*b', 'a|b', 'a"b'])('refuses a text containing %s', (text) => {
    expect(() =>
      buildStandardName({ ...BASE, originalName: 'clip.mp4', distinguishingText: text }),
    ).toThrow(InvalidPathError);
  });

  it('refuses a text longer than its own limit', () => {
    const tooLong = 'a'.repeat(MAX_DISTINGUISHING_TEXT_LENGTH + 1);
    expect(() =>
      buildStandardName({ ...BASE, originalName: 'clip.mp4', distinguishingText: tooLong }),
    ).toThrow(InvalidPathError);

    const atLimit = 'a'.repeat(MAX_DISTINGUISHING_TEXT_LENGTH);
    expect(() =>
      buildStandardName({ ...BASE, originalName: 'clip.mp4', distinguishingText: atLimit }),
    ).not.toThrow();
  });
});

describe('the assembled-name limit', () => {
  it('accepts four parts that would not have fitted under the old 120 cap', () => {
    // Feature 001 capped the assembled name at 120. Four parts still blow
    // past that, so the raise to MAX_NAME_LENGTH remains load-bearing --
    // even now that '_' joins cost two characters less than ' - ' did.
    const part = 'a'.repeat(38);
    const name = buildStandardName({
      quest: part,
      mission: part,
      stage: part,
      originalName: 'clip.mp4',
      distinguishingText: 'take 2',
    });

    expect(name.length).toBeGreaterThan(120);
    expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });

  it('refuses an assembled name over the limit', () => {
    const part = 'a'.repeat(60);
    expect(() =>
      buildStandardName({
        quest: part,
        mission: part,
        stage: part,
        originalName: 'clip.mp4',
        distinguishingText: 'b'.repeat(60),
      }),
    ).toThrow(InvalidPathError);
  });
});

describe('the full-path limit', () => {
  it('accepts a realistic path', () => {
    const path =
      '/Mission Quest Academy/App Vault Folder/03 Ready for editing/Onboarding/Welcome/Onboarding_Welcome_Rough cut_take 2.mp4';
    expect(path.length).toBeLessThan(MAX_PATH_LENGTH);
    expect(() => assertPathWithinLimit(path)).not.toThrow();
  });

  it('refuses a path over the limit and says by how much', () => {
    const path = `/${'a'.repeat(MAX_PATH_LENGTH)}`;
    let message = '';
    try {
      assertPathWithinLimit(path, 'a name');
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(String(MAX_PATH_LENGTH));
    // The uploader must be told what to shorten, not just that it is too long.
    expect(message).toContain('Shorten');
  });

  it('accepts a path exactly at the limit', () => {
    expect(() => assertPathWithinLimit('a'.repeat(MAX_PATH_LENGTH))).not.toThrow();
  });
});

describe('conflictKey', () => {
  const file = { stageId: 1, originalName: 'clip.mp4' };

  it('treats texts differing only by case or spacing as one', () => {
    const a = conflictKey({ ...file, distinguishingText: 'Take 1' });
    const b = conflictKey({ ...file, distinguishingText: '  take 1  ' });
    expect(a).toBe(b);
  });

  it('separates different texts', () => {
    expect(conflictKey({ ...file, distinguishingText: 'take 1' })).not.toBe(
      conflictKey({ ...file, distinguishingText: 'take 2' }),
    );
  });

  it('separates different stages', () => {
    expect(conflictKey({ ...file, stageId: 1 })).not.toBe(conflictKey({ ...file, stageId: 2 }));
  });

  it('separates different extensions, because the names differ', () => {
    expect(conflictKey({ stageId: 1, originalName: 'a.mp4' })).not.toBe(
      conflictKey({ stageId: 1, originalName: 'a.mov' }),
    );
  });

  it('treats a missing text and an empty one as the same', () => {
    expect(conflictKey(file)).toBe(conflictKey({ ...file, distinguishingText: '' }));
    expect(conflictKey(file)).toBe(conflictKey({ ...file, distinguishingText: '   ' }));
  });

  it('cannot be fooled by a text containing the separator', () => {
    // The separator is a forbidden character in names, so it cannot appear in a
    // real text — but the key must be unambiguous regardless.
    const a = conflictKey({ stageId: 1, distinguishingText: 'a', originalName: 'x.mp4' });
    const b = conflictKey({ stageId: 1, distinguishingText: 'a|mp4', originalName: 'x' });
    expect(a).not.toBe(b);
  });
});
