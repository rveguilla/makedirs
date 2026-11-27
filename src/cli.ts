#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import { makedirs, validateDirSpecList, type DirSpec } from './makedirs.js';

interface CliOptions {
  file?: string;
  quiet?: boolean;
}

function getPackageVersion(): string {
  const pkgUrl = new URL('../package.json', import.meta.url);
  const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8')) as { version?: string };
  return pkg.version ?? '0.0.0';
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(
      typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer),
    );
  }
  return Buffer.concat(chunks).toString('utf8');
}

function formatSpecSummary(spec: DirSpec): string {
  const details: string[] = [];
  if (spec.mode !== undefined) {
    details.push(`mode=${String(spec.mode)}`);
  }
  if (spec.uid !== undefined) {
    details.push(`uid=${spec.uid}`);
  }
  if (spec.gid !== undefined) {
    details.push(`gid=${spec.gid}`);
  }
  return details.length > 0
    ? `Created ${spec.path} (${details.join(', ')})`
    : `Created ${spec.path}`;
}

async function resolveJsonInput(
  jsonArg: string | undefined,
  fileOption: string | undefined,
): Promise<string> {
  if (jsonArg !== undefined && fileOption !== undefined) {
    throw new Error('Specify either a JSON argument or --file, not both.');
  }

  if (fileOption !== undefined) {
    return readFile(fileOption, 'utf8');
  }

  if (jsonArg !== undefined) {
    return jsonArg;
  }

  if (!process.stdin.isTTY) {
    const stdinContent = (await readStdin()).trim();
    if (stdinContent.length > 0) {
      return stdinContent;
    }
  }

  throw new Error(
    'No input provided. Pass a JSON string argument, --file <path>, or pipe JSON via stdin.',
  );
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('makedirs')
    .description(
      'Create directories (with optional permissions and ownership) from a declarative JSON specification.',
    )
    .version(getPackageVersion())
    .argument(
      '[json]',
      'JSON array of directory specs (reads from stdin if omitted and --file is not set)',
    )
    .option('-f, --file <path>', 'read JSON specification from a file')
    .option('-q, --quiet', 'suppress output logs', false)
    .action(async (jsonArg: string | undefined, options: CliOptions) => {
      const rawJson = await resolveJsonInput(jsonArg, options.file);

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJson);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid JSON input: ${message}`, { cause: error });
      }

      const specs = validateDirSpecList(parsed);
      await makedirs(specs);

      if (!options.quiet) {
        for (const spec of specs) {
          console.log(formatSpecSummary(spec));
        }
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
