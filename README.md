# makedirs
Node.js library and cli utility for creating directories (with corresponding ownership and permissions) based on a declarative specification (JSON input).


Example (CLI):

```bash
makedirs '[{ "path": "/tmp/some/dir, "mode":"0700", "uid":1000, "gid":1000 }, { "path": "/tmp/another/dir", "mode":"0700", "uid":1000, "gid":1000 }]'
``` 

