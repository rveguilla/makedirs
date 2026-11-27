import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import makedirs, {
  makedirsSync,
  validateDirSpecList,
  type DirSpec,
} from '../src/makedirs.ts';

let tempDir = '';

beforeEach(async () => {
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'makedirs-test-'));
});

afterEach(async () => {
  if (tempDir) {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
});

void describe('validateDirSpecList', () => {
  void it('accepts valid specs with optional fields', () => {
    const specs = validateDirSpecList([
      { path: '/tmp/a' },
      { path: '/tmp/b', mode: '0700', uid: 1000, gid: 1000 },
      { path: '/tmp/c', mode: 0o755 },
    ]);

    assert.deepEqual(specs, [
      { path: '/tmp/a' },
      { path: '/tmp/b', mode: '0700', uid: 1000, gid: 1000 },
      { path: '/tmp/c', mode: 0o755 },
    ]);
  });

  void it('rejects non-array input', () => {
    assert.throws(() => validateDirSpecList({ path: '/tmp/a' }), TypeError);
    assert.throws(() => validateDirSpecList('not-an-array'), TypeError);
  });

  void it('rejects invalid entries and properties', () => {
    assert.throws(() => validateDirSpecList([null]), TypeError);
    assert.throws(() => validateDirSpecList([{}]), TypeError);
    assert.throws(() => validateDirSpecList([{ path: '   ' }]), TypeError);
    assert.throws(
      () => validateDirSpecList([{ path: '/tmp/a', mode: 'invalid' }]),
      TypeError,
    );
    assert.throws(
      () => validateDirSpecList([{ path: '/tmp/a', mode: -1 }]),
      TypeError,
    );
    assert.throws(
      () => validateDirSpecList([{ path: '/tmp/a', uid: -5 }]),
      TypeError,
    );
    assert.throws(
      () => validateDirSpecList([{ path: '/tmp/a', gid: 1.5 }]),
      TypeError,
    );
  });
});

void describe('makedirs (async)', () => {
  void it('creates nested directories with string and numeric modes', async () => {
    const dirA = path.join(tempDir, 'nested', 'dir-a');
    const dirB = path.join(tempDir, 'nested', 'dir-b');

    await makedirs([
      { path: dirA, mode: '0700' },
      { path: dirB, mode: 0o750 },
    ]);

    const statA = await fsp.stat(dirA);
    const statB = await fsp.stat(dirB);

    assert.equal(statA.isDirectory(), true);
    assert.equal(statB.isDirectory(), true);
    if (process.platform !== 'win32') {
      assert.equal(statA.mode & 0o777, 0o700);
      assert.equal(statB.mode & 0o777, 0o750);
    }
  });

  void it('creates directories when optional fields are omitted', async () => {
    const target = path.join(tempDir, 'plain', 'dir');

    await makedirs([{ path: target }]);

    const stat = await fsp.stat(target);
    assert.equal(stat.isDirectory(), true);
  });

  void it('applies uid and gid when provided (both or partial)', async () => {
    const uid = process.getuid?.();
    const gid = process.getgid?.();
    if (uid === undefined || gid === undefined) {
      return;
    }

    const dirBoth = path.join(tempDir, 'own-both');
    const dirUidOnly = path.join(tempDir, 'own-uid');
    const dirGidOnly = path.join(tempDir, 'own-gid');

    await makedirs([
      { path: dirBoth, uid, gid },
      { path: dirUidOnly, uid },
      { path: dirGidOnly, gid },
    ]);

    for (const dir of [dirBoth, dirUidOnly, dirGidOnly]) {
      const stat = await fsp.stat(dir);
      assert.equal(stat.uid, uid);
      assert.equal(stat.gid, gid);
    }
  });

  void it('is idempotent for existing directories', async () => {
    const target = path.join(tempDir, 'existing');
    await makedirs([{ path: target, mode: '0755' }]);
    await makedirs([{ path: target, mode: '0700' }]);

    const stat = await fsp.stat(target);
    assert.equal(stat.isDirectory(), true);
    if (process.platform !== 'win32') {
      assert.equal(stat.mode & 0o777, 0o700);
    }
  });

  void it('validates all entries before creating any directories', async () => {
    const dirA = path.join(tempDir, 'should-not-exist');
    const invalidSpecs = [{ path: dirA }, { path: '' }] as unknown as DirSpec[];

    await assert.rejects(() => makedirs(invalidSpecs), TypeError);
    assert.equal(fs.existsSync(dirA), false);
  });
});

void describe('makedirsSync / makedirs.sync', () => {
  void it('creates directories synchronously via both exports', () => {
    const dirA = path.join(tempDir, 'sync-a', 'child');
    const dirB = path.join(tempDir, 'sync-b', 'child');

    makedirs.sync([{ path: dirA, mode: '0700' }]);
    makedirsSync([{ path: dirB, mode: 0o750 }]);

    const statA = fs.statSync(dirA);
    const statB = fs.statSync(dirB);
    assert.equal(statA.isDirectory(), true);
    assert.equal(statB.isDirectory(), true);
    if (process.platform !== 'win32') {
      assert.equal(statA.mode & 0o777, 0o700);
      assert.equal(statB.mode & 0o777, 0o750);
    }
  });

  void it('validates all entries before creating any directories synchronously', () => {
    const dirA = path.join(tempDir, 'sync-should-not-exist');
    const invalidSpecs = [
      { path: dirA },
      { path: '/tmp/x', uid: -1 },
    ] as unknown as DirSpec[];

    assert.throws(() => makedirsSync(invalidSpecs), TypeError);
    assert.equal(fs.existsSync(dirA), false);
  });
});
