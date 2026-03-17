Vendored from `https://github.com/ash-project/ash_typescript`

Base version:
- Hex package: `0.15.3`
- Upstream tag target for subtree sync: `v0.15.3`

Why this is vendored:
- this app is dogfooding local `ash_typescript` changes before upstreaming
- the generated RPC metadata seam is needed by the local sync plugin work

Local patches currently included:
- generic runtime `GeneratedRpcResourceMeta` types in generated TS output
- generated per-resource runtime metadata like `memeResourceMeta`
- shared field-const formatter reuse for typed queries + metadata generation

Suggested subtree setup once the current work is committed:

```bash
git remote add ash-typescript-upstream https://github.com/ash-project/ash_typescript.git
git subtree add --prefix=vendor/ash_typescript ash-typescript-upstream v0.15.3 --squash
```

Suggested update flow later:

```bash
git fetch ash-typescript-upstream --tags
git subtree pull --prefix=vendor/ash_typescript ash-typescript-upstream <tag-or-branch> --squash
```

Helper script:

```bash
./scripts/vendor-ash-typescript-subtree.sh v0.15.3
```

Notes:
- `mix.exs` points `:ash_typescript` at `vendor/ash_typescript`
- do not edit `deps/ash_typescript`; that copy is ignored and disposable
