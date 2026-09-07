import { InvalidPathError } from '@/lib/storage/port';

/**
 * The naming and routing rules — the heart of the product's guarantee.
 *
 * Every file gets `[Quest] - [Mission] - [Stage].[ext]`, or
 * `[Quest] - [Mission] - [Stage] - [Distinguishing text].[ext]` when a text is
 * given, at `/[Status]/[Quest]/[Mission]/`. All of it is computed server-side;
 * the uploader supplies the text as a value but never the assembled name
 * (SC-001, FR-003).
 *
 * The distinguishing text is OPTIONAL. A file without one is named exactly as
 * feature 001 named it, which is what keeps every file already in Dropbox valid
 * and every existing habit working (FR-002).
 */

/** Separator between name parts. Exact, including the spaces. */
const PART_SEPARATOR = ' - ';

/**
 * Length limits.
 *
 * The binding constraint is the FULL PATH, not the file name: Dropbox requires
 * paths under 260 characters, and this deployment's root already consumes about
 * 90 of them before a file name starts. A name that fits can still produce a
 * path that does not.
 *
 * `MAX_NAME` was 120 before this feature. Three parts of 35 characters plus
 * separators already reached 111, so four parts did not fit and legitimate
 * names would have been refused with a message nobody could act on.
 */
export const MAX_PART_LENGTH = 120;
export const MAX_DISTINGUISHING_TEXT_LENGTH = 80;
export const MAX_NAME_LENGTH = 200;
/** Five characters of margin under Dropbox's 260. */
export const MAX_PATH_LENGTH = 255;

/**
 * Separator for composite conflict keys. A pipe is in the forbidden character
 * set for names, so it can never appear inside a part — which makes the key
 * unambiguous by construction rather than by hoping parts stay tidy.
 */
const SEPARATOR = '|';

/**
 * Characters Dropbox rejects in a file or folder name.
 *
 * Spaces and hyphens are deliberately NOT here — the standard name is built
 * from them. Validation runs when a taxonomy entry is written rather than at
 * upload time (FR-022), so a bad name is caught by the Admin who typed it.
 */
const FORBIDDEN = /[\\/:?*<>"|]/;

/** Control characters, written as escapes so this file stays plain ASCII. */
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/** Dropbox rejects names that end in a dot or a space. */
const TRAILING_JUNK = /[. ]$/;

export function assertValidSegment(
  segment: string,
  label = 'segment',
  maxLength = MAX_PART_LENGTH,
): void {
  const trimmed = segment.trim();
  if (trimmed.length === 0) {
    throw new InvalidPathError(segment, `${label} cannot be empty`);
  }
  if (trimmed.length > maxLength) {
    throw new InvalidPathError(segment, `${label} cannot exceed ${maxLength} characters`);
  }
  if (FORBIDDEN.test(trimmed)) {
    throw new InvalidPathError(segment, `${label} cannot contain \\ / : ? * < > " |`);
  }
  if (CONTROL_CHARS.test(trimmed)) {
    throw new InvalidPathError(segment, `${label} cannot contain control characters`);
  }
  if (TRAILING_JUNK.test(trimmed)) {
    throw new InvalidPathError(segment, `${label} cannot end with a dot or a space`);
  }
  if (trimmed === '.' || trimmed === '..') {
    throw new InvalidPathError(segment, `${label} cannot be a path traversal`);
  }
}

export function isValidSegment(segment: string): boolean {
  try {
    assertValidSegment(segment);
    return true;
  } catch {
    return false;
  }
}

/** Trimmed, lower-cased. Mirrors the `name_normalized` generated column (FR-008). */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The extension of the original file, lower-cased, without the dot.
 * Returns '' for a file with no extension.
 */
export function extractExtension(originalName: string): string {
  const base = originalName.trim().replace(/^.*[\\/]/, '');
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

export interface StandardNameParts {
  quest: string;
  mission: string;
  stage: string;
  originalName: string;
  /**
   * Optional. Present, it becomes a fourth part and is what tells apart files
   * that share a Quest, Mission and Stage. Absent, the name is exactly what
   * feature 001 produced (FR-002).
   */
  distinguishingText?: string | null;
}

/**
 * `[Quest] - [Mission] - [Stage].[ext]`, or
 * `[Quest] - [Mission] - [Stage] - [Text].[ext]` when a distinguishing text is
 * given, preserving the original extension.
 *
 * Throws InvalidPathError if any part cannot form a valid name, or if the
 * assembled name is too long.
 */
export function buildStandardName({
  quest,
  mission,
  stage,
  originalName,
  distinguishingText,
}: StandardNameParts): string {
  assertValidSegment(quest, 'Quest name');
  assertValidSegment(mission, 'Mission name');
  assertValidSegment(stage, 'Stage name');

  const parts = [quest.trim(), mission.trim(), stage.trim()];

  const text = distinguishingText?.trim();
  if (text) {
    assertValidSegment(text, 'Distinguishing text', MAX_DISTINGUISHING_TEXT_LENGTH);
    parts.push(text);
  }

  const stem = parts.join(PART_SEPARATOR);
  const extension = extractExtension(originalName);
  const name = extension ? `${stem}.${extension}` : stem;

  // The assembled name is itself a path segment, but a longer one than any of
  // its parts — four parts cannot fit inside a single part's limit.
  assertValidSegment(name, 'File name', MAX_NAME_LENGTH);
  return name;
}

/**
 * What makes two files "the same file" for conflict purposes.
 *
 * Case and surrounding whitespace are normalized, so "Take 1", "take 1" and
 * " take 1 " are one thing. Without this they each pass the conflict check and
 * then collide at the provider, or produce near-identical files — exactly the
 * disorder this product exists to prevent (FR-005).
 *
 * The ORIGINAL text is what appears in the file name; this is only ever used
 * for comparison.
 */
export function conflictKey(parts: {
  stageId: number;
  distinguishingText?: string | null;
  originalName: string;
}): string {
  return [
    parts.stageId,
    normalizeName(parts.distinguishingText ?? ''),
    extractExtension(parts.originalName),
  ].join(SEPARATOR);
}

/** Normalizes one path: leading slash, no trailing slash, no doubled slashes. */
export function normalizeFolderPath(path: string): string {
  const cleaned = path.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '');
  if (cleaned === '' || cleaned === '/') return '';
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

export interface FolderPathParts {
  /** Empty for an App-folder Dropbox app — paths are already relative to it. */
  rootPath?: string;
  statusPath: string;
  questPath: string;
  missionPath: string;
}

/**
 * `/[Status]/[Quest]/[Mission]/` — assembled from the stored folder paths.
 * The stored Dropbox *path* governs routing; the stored URL never does.
 */
export function buildFolderPath({
  rootPath = '',
  statusPath,
  questPath,
  missionPath,
}: FolderPathParts): string {
  const joined = [rootPath, statusPath, questPath, missionPath]
    .map((part) => normalizeFolderPath(part))
    .filter((part) => part !== '')
    .join('');

  const result = normalizeFolderPath(joined);
  if (result === '') {
    throw new InvalidPathError(joined, 'resolved folder path is empty');
  }
  return result;
}

/**
 * Refuses a full path the provider will not accept.
 *
 * This is the limit that actually binds. Dropbox requires paths under 260
 * characters, and a deployment whose root is a nested team folder can consume
 * ninety of them before a file name begins — so a name that passes every other
 * check can still produce a path that does not.
 *
 * Feature 001 never checked this at all, which meant an over-long path failed
 * at Dropbox AFTER a multi-gigabyte transfer. Checking it where the destination
 * is computed moves that failure to before the first byte moves.
 */
export function assertPathWithinLimit(fullPath: string, fileName?: string): void {
  if (fullPath.length <= MAX_PATH_LENGTH) return;

  const over = fullPath.length - MAX_PATH_LENGTH;
  const hint = fileName
    ? ` Shorten the distinguishing text or the stage name by at least ${over} characters.`
    : ' Shorten the quest, mission or folder names.';

  throw new InvalidPathError(
    fullPath,
    `the full Dropbox path is ${fullPath.length} characters, ${over} over the ${MAX_PATH_LENGTH} limit.${hint}`,
  );
}

/** Joins a folder path and a file name into a full provider path. */
export function joinPath(folderPath: string, fileName: string): string {
  return `${normalizeFolderPath(folderPath)}/${fileName}`;
}

/**
 * The folder path for a counterpart under a different Approval Status: the same
 * Quest and Mission segments, rebased onto the target status root (FR-036).
 */
export function rebaseUnderStatus(
  targetStatusPath: string,
  questPath: string,
  missionPath: string,
  rootPath = '',
): string {
  return buildFolderPath({
    rootPath,
    statusPath: targetStatusPath,
    questPath,
    missionPath,
  });
}

/** A folder segment derived from a display name, for auto-created counterparts. */
export function segmentFromName(name: string): string {
  const trimmed = name.trim();
  assertValidSegment(trimmed, 'Name');
  return `/${trimmed}`;
}
