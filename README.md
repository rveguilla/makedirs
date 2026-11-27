# makedirs

Node.js library and CLI utility for bulk creation of directories (with optional permissions and ownership) from a declarative JSON specification.

## Requirements

- Node.js `>= 22.18.0`

## Installation

```bash
npm install makedirs
```

Or install globally to use the CLI directly:

```bash
npm install -g makedirs
```

## CLI Usage

```bash
# Inline JSON argument
makedirs '[{"path": "/tmp/some/dir", "mode": "0700", "uid": 1000, "gid": 1000}, {"path": "/tmp/another/dir", "mode": "0755"}]'

# Read specification from a file
makedirs --file ./dirs.json

# Pipe JSON via stdin (suppress logs with --quiet)
cat ./dirs.json | makedirs --quiet
```

Run `makedirs --help` to see all available options.

## Programmatic API

```ts
import makedirs, { makedirsSync, type DirSpec } from 'makedirs';

const specs: DirSpec[] = [
  { path: '/tmp/some/dir', mode: '0700', uid: 1000, gid: 1000 },
  { path: '/tmp/another/dir', mode: 0o755 },
];

// Asynchronous (recommended)
await makedirs(specs);

// Synchronous
makedirs.sync(specs);
// or
makedirsSync(specs);
```

### `DirSpec`

| Field  | Type               | Required | Description                                                               |
| ------ | ------------------ | -------- | ------------------------------------------------------------------------- |
| `path` | `string`           | Yes      | Directory path to create (missing parent directories are created as well) |
| `mode` | `string \| number` | No       | Permissions mode (e.g., `"0700"` or `0o700`), applied via `chmod`         |
| `uid`  | `number`           | No       | Numeric user ID for ownership, applied via `chown`                        |
| `gid`  | `number`           | No       | Numeric group ID for ownership, applied via `chown`                       |

## Development

```bash
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
```

## License

[Apache-2.0](./LICENSE)
