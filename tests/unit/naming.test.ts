import { describe, expect, it } from 'vitest';
import {
  buildFolderPath,
  buildStandardName,
  extractExtension,
  isValidSegment,
  joinPath,
  normalizeFolderPath,
  normalizeName,
  rebaseUnderStatus,
} from '@/lib/naming';
import { InvalidPathError } from '@/lib/storage/port';

/**
 * The naming rules carry SC-001: 100% of stored files must match
 * `[Quest] - [Mission] - [Stage].[ext]` at the computed path, with zero
 * deviations. These are the assertions behind that claim.
 */

describe('buildStandardName', () => {
  it('joins the three parts with "_" and keeps the extension', () => {
    expect(
      buildStandardName({
        quest: 'Onboarding',
        mission: 'Welcome',
        stage: 'Rough cut',
        originalName: 'final_v3.mp4',
      }),
    ).toBe('Onboarding_Welcome_Rough cut.mp4');
  });

  it('lower-cases the extension but never the name parts', () => {
    expect(
      buildStandardName({
        quest: 'Onboarding',
        mission: 'Welcome',
        stage: 'Final',
        originalName: 'CLIP.MOV',
      }),
    ).toBe('Onboarding_Welcome_Final.mov');
  });

  it('keeps only the last extension for a multi-dot file name', () => {
    expect(
      buildStandardName({
        quest: 'Q',
        mission: 'M',
        stage: 'S',
        originalName: 'archive.tar.mp4',
      }),
    ).toBe('Q_M_S.mp4');
  });

  it('allows spaces and hyphens inside the parts', () => {
    // The separator is "_", so spaces AND hyphens inside a part must survive
    // untouched — only the joins between parts change.
    expect(
      buildStandardName({
        quest: 'Product tour',
        mission: 'Dashboard - beta',
        stage: 'Rough cut 2',
        originalName: 'a.mp4',
      }),
    ).toBe('Product tour_Dashboard - beta_Rough cut 2.mp4');
  });

  it('trims surrounding whitespace from each part', () => {
    expect(
      buildStandardName({
        quest: '  Onboarding  ',
        mission: ' Welcome ',
        stage: ' Final ',
        originalName: 'a.mp4',
      }),
    ).toBe('Onboarding_Welcome_Final.mp4');
  });

  it('produces a name without a dot when the original had no extension', () => {
    expect(
      buildStandardName({ quest: 'Q', mission: 'M', stage: 'S', originalName: 'noext' }),
    ).toBe('Q_M_S');
  });

  it.each(['bad/name', 'bad\\name', 'bad:name', 'bad?name', 'bad*name', 'bad|name', 'bad"name'])(
    'refuses a part containing %s',
    (bad) => {
      expect(() =>
        buildStandardName({ quest: bad, mission: 'M', stage: 'S', originalName: 'a.mp4' }),
      ).toThrow(InvalidPathError);
    },
  );

  it('refuses an empty part', () => {
    expect(() =>
      buildStandardName({ quest: '   ', mission: 'M', stage: 'S', originalName: 'a.mp4' }),
    ).toThrow(InvalidPathError);
  });

  it('refuses a path traversal attempt', () => {
    expect(() =>
      buildStandardName({ quest: '..', mission: 'M', stage: 'S', originalName: 'a.mp4' }),
    ).toThrow(InvalidPathError);
  });
});

describe('extractExtension', () => {
  it.each([
    ['video.mp4', 'mp4'],
    ['video.MOV', 'mov'],
    ['no-extension', ''],
    ['trailing.', ''],
    ['.hidden', ''],
    ['C:\\folder\\clip.mkv', 'mkv'],
    ['/tmp/clip.webm', 'webm'],
  ])('%s -> "%s"', (input, expected) => {
    expect(extractExtension(input)).toBe(expected);
  });
});

describe('normalizeName', () => {
  it('trims and lower-cases, matching the generated database column', () => {
    // FR-008: this must agree with LOWER(TRIM(name)) in MySQL, or counterpart
    // matching across statuses would find nothing.
    expect(normalizeName('  Marketing  ')).toBe('marketing');
    expect(normalizeName('MARKETING')).toBe('marketing');
  });
});

describe('normalizeFolderPath', () => {
  it.each([
    ['01 Pending', '/01 Pending'],
    ['/01 Pending/', '/01 Pending'],
    ['//01//Pending//', '/01/Pending'],
    ['\\01 Pending', '/01 Pending'],
    ['/', ''],
    ['', ''],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeFolderPath(input)).toBe(expected);
  });
});

describe('buildFolderPath', () => {
  it('assembles /[Status]/[Quest]/[Mission]', () => {
    expect(
      buildFolderPath({
        statusPath: '/01 Pending',
        questPath: '/Onboarding',
        missionPath: '/Welcome',
      }),
    ).toBe('/01 Pending/Onboarding/Welcome');
  });

  it('tolerates parts written without leading slashes', () => {
    expect(
      buildFolderPath({ statusPath: '01 Pending', questPath: 'Onboarding', missionPath: 'Welcome' }),
    ).toBe('/01 Pending/Onboarding/Welcome');
  });

  it('stays relative to the app folder when no root is configured', () => {
    // An App-folder Dropbox app already scopes every path (research.md R-002).
    expect(
      buildFolderPath({
        rootPath: '',
        statusPath: '/01 Pending',
        questPath: '/Q',
        missionPath: '/M',
      }),
    ).toBe('/01 Pending/Q/M');
  });

  it('prefixes a configured root for a Full Dropbox app', () => {
    expect(
      buildFolderPath({
        rootPath: '/Apps/Vault',
        statusPath: '/01 Pending',
        questPath: '/Q',
        missionPath: '/M',
      }),
    ).toBe('/Apps/Vault/01 Pending/Q/M');
  });
});

describe('rebaseUnderStatus', () => {
  it('carries the Quest and Mission segments to another status root', () => {
    // This is the path half of FR-036's counterpart resolution.
    expect(rebaseUnderStatus('/03 Approved', '/Onboarding', '/Welcome')).toBe(
      '/03 Approved/Onboarding/Welcome',
    );
  });
});

describe('joinPath', () => {
  it('joins a folder and a file name', () => {
    expect(joinPath('/01 Pending/Q/M', 'Q - M - S.mp4')).toBe('/01 Pending/Q/M/Q - M - S.mp4');
  });
});

describe('isValidSegment', () => {
  it.each(['Onboarding', 'Product tour', 'Rough cut - v2', '01 Pending', 'Q&A'])(
    'accepts %s',
    (name) => expect(isValidSegment(name)).toBe(true),
  );

  it('accepts a name with surrounding whitespace, which is trimmed', () => {
    // Trimming rather than refusing: every consumer trims too, so " Onboarding "
    // and "Onboarding" must not be two different Quests.
    expect(isValidSegment(' ends with space ')).toBe(true);
  });

  it.each(['', '   ', '.', '..', 'ends with dot.', 'a/b'])('rejects %s', (name) =>
    expect(isValidSegment(name)).toBe(false),
  );

  it('rejects a name longer than 120 characters', () => {
    expect(isValidSegment('a'.repeat(121))).toBe(false);
    expect(isValidSegment('a'.repeat(120))).toBe(true);
  });
});

describe('asciiHeader (Dropbox-API-Arg encoding)', () => {
  it('leaves plain ASCII untouched', async () => {
    const { asciiHeader } = await import('@/lib/uploads/client-uploader');
    expect(asciiHeader({ path: '/01 Pending/Quest - Mission - Stage.mp4' })).toBe(
      '{"path":"/01 Pending/Quest - Mission - Stage.mp4"}',
    );
  });

  it('escapes accented characters, which Dropbox rejects raw in a header', async () => {
    // A Spanish or French file name is entirely ordinary; the header would be
    // rejected outright without this.
    const { asciiHeader } = await import('@/lib/uploads/client-uploader');
    const encoded = asciiHeader({ path: '/Misión - Diseño - Versión.mp4' });

    // The header must be pure ASCII, carrying the accents as escape sequences.
    expect(encoded).not.toMatch(/[^\x00-\x7f]/);
    expect(encoded).toContain(String.raw`\u00f3`);
    expect(encoded).toContain(String.raw`\u00f1`);

    // And it must still parse back to the original path.
    expect(JSON.parse(encoded)).toEqual({ path: '/Misi\u00f3n - Dise\u00f1o - Versi\u00f3n.mp4' });
  });

  it('escapes characters outside the basic plane too', async () => {
    const { asciiHeader } = await import('@/lib/uploads/client-uploader');
    expect(asciiHeader({ name: 'clip\u2014final.mp4' })).not.toMatch(/[^\x00-\x7f]/);
  });
});
