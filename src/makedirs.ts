import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';

export interface DirSpec {
  /** Directory path to create (including missing parent directories). */
  path: string;
  /** Optional permissions mode (e.g., `"0700"` or `0o700`). */
  mode?: fs.Mode;
  /** Optional numeric user ID for directory ownership. */
  uid?: number;
  /** Optional numeric group ID for directory ownership. */
  gid?: number;
}

export interface MakedirsFn {
  (dirSpecList: readonly DirSpec[]): Promise<void>;
  sync: (dirSpecList: readonly DirSpec[]) => void;
}

const OCTAL_MODE_PATTERN = /^[0-7]{3,4}$/;

function isValidMode(mode: unknown): mode is fs.Mode {
  if (typeof mode === 'number') {
    return Number.isInteger(mode) && mode >= 0;
  }
  if (typeof mode === 'string') {
    return OCTAL_MODE_PATTERN.test(mode);
  }
  return false;
}

function isValidId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Validates and normalizes an unknown value into a list of `DirSpec` entries.
 * Throws a `TypeError` if the input or any entry is invalid.
 */
export function validateDirSpecList(input: unknown): DirSpec[] {
  if (!Array.isArray(input)) {
    throw new TypeError('Expected an array of directory specifications.');
  }

  return input.map((item: unknown, index: number): DirSpec => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new TypeError(`Entry at index ${index} must be an object.`);
    }

    const record = item as Record<string, unknown>;
    if (
      typeof record['path'] !== 'string' ||
      record['path'].trim().length === 0
    ) {
      throw new TypeError(
        `Entry at index ${index} must have a non-empty string "path".`,
      );
    }

    const spec: DirSpec = { path: record['path'] };

    if (record['mode'] !== undefined) {
      if (!isValidMode(record['mode'])) {
        throw new TypeError(
          `Entry at index ${index} has invalid "mode": expected a non-negative integer or 3-4 digit octal string.`,
        );
      }
      spec.mode = record['mode'];
    }

    if (record['uid'] !== undefined) {
      if (!isValidId(record['uid'])) {
        throw new TypeError(
          `Entry at index ${index} has invalid "uid": expected a non-negative integer.`,
        );
      }
      spec.uid = record['uid'];
    }

    if (record['gid'] !== undefined) {
      if (!isValidId(record['gid'])) {
        throw new TypeError(
          `Entry at index ${index} has invalid "gid": expected a non-negative integer.`,
        );
      }
      spec.gid = record['gid'];
    }

    return spec;
  });
}

/**
 * Synchronously creates directories and applies optional permissions and ownership.
 */
export function makedirsSync(dirSpecList: readonly DirSpec[]): void {
  const specs = validateDirSpecList(dirSpecList);

  for (const spec of specs) {
    fs.mkdirSync(spec.path, { recursive: true });

    if (spec.mode !== undefined) {
      fs.chmodSync(spec.path, spec.mode);
    }

    if (spec.uid !== undefined || spec.gid !== undefined) {
      let uid = spec.uid;
      let gid = spec.gid;
      if (uid === undefined || gid === undefined) {
        const stats = fs.statSync(spec.path);
        uid ??= stats.uid;
        gid ??= stats.gid;
      }
      fs.chownSync(spec.path, uid, gid);
    }
  }
}

/**
 * Asynchronously creates directories and applies optional permissions and ownership.
 */
async function makedirsAsync(dirSpecList: readonly DirSpec[]): Promise<void> {
  const specs = validateDirSpecList(dirSpecList);

  for (const spec of specs) {
    await fsp.mkdir(spec.path, { recursive: true });

    if (spec.mode !== undefined) {
      await fsp.chmod(spec.path, spec.mode);
    }

    if (spec.uid !== undefined || spec.gid !== undefined) {
      let uid = spec.uid;
      let gid = spec.gid;
      if (uid === undefined || gid === undefined) {
        const stats = await fsp.stat(spec.path);
        uid ??= stats.uid;
        gid ??= stats.gid;
      }
      await fsp.chown(spec.path, uid, gid);
    }
  }
}

/**
 * Creates directories from a declarative list of specifications.
 * Call directly for async (`Promise<void>`), or use `makedirs.sync(...)` for synchronous execution.
 */
export const makedirs: MakedirsFn = Object.assign(makedirsAsync, {
  sync: makedirsSync,
});

export default makedirs;
