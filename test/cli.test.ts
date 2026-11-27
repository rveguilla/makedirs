import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], stdin?: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

let tempDir = '';

beforeEach(async () => {
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'makedirs-cli-test-'));
});

afterEach(async () => {
  if (tempDir) {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
});

void describe('makedirs CLI', () => {
  void it('prints the package version with --version', async () => {
    const pkg = JSON.parse(await fsp.readFile(pkgPath, 'utf8')) as {
      version: string;
    };
    const result = await runCli(['--version']);

    assert.equal(result.code, 0);
    assert.equal(result.stdout.trim(), pkg.version);
  });

  void it('creates directories from an inline JSON argument', async () => {
    const dirA = path.join(tempDir, 'inline-a');
    const dirB = path.join(tempDir, 'inline-b', 'nested');
    const payload = JSON.stringify([
      { path: dirA, mode: '0700' },
      { path: dirB },
    ]);

    const result = await runCli([payload]);

    assert.equal(result.code, 0);
    assert.match(
      result.stdout,
      new RegExp(
        `Created ${dirA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(mode=0700\\)`,
      ),
    );
    assert.match(
      result.stdout,
      new RegExp(`Created ${dirB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    );

    const statA = await fsp.stat(dirA);
    const statB = await fsp.stat(dirB);
    assert.equal(statA.isDirectory(), true);
    assert.equal(statB.isDirectory(), true);
    if (process.platform !== 'win32') {
      assert.equal(statA.mode & 0o777, 0o700);
    }
  });

  void it('creates directories from a JSON file using --file', async () => {
    const target = path.join(tempDir, 'from-file');
    const specFile = path.join(tempDir, 'specs.json');
    await fsp.writeFile(
      specFile,
      JSON.stringify([{ path: target, mode: '0750' }]),
      'utf8',
    );

    const result = await runCli(['--file', specFile]);

    assert.equal(result.code, 0);
    const stat = await fsp.stat(target);
    assert.equal(stat.isDirectory(), true);
  });

  void it('creates directories from stdin and respects --quiet', async () => {
    const target = path.join(tempDir, 'from-stdin');
    const payload = JSON.stringify([{ path: target }]);

    const result = await runCli(['--quiet'], payload);

    assert.equal(result.code, 0);
    assert.equal(result.stdout, '');
    const stat = await fsp.stat(target);
    assert.equal(stat.isDirectory(), true);
  });

  void it('exits non-zero on invalid JSON', async () => {
    const result = await runCli(['{not-json}']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Invalid JSON input/);
  });

  void it('exits non-zero when both JSON arg and --file are specified', async () => {
    const result = await runCli(['--file', 'specs.json', '[]']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /not both/);
  });

  void it('exits non-zero when no input is provided', async () => {
    const result = await runCli([], '');

    assert.equal(result.code, 1);
    assert.match(result.stderr, /No input provided/);
  });
});
