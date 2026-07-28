# Generated runtime assets

Approved content is installed under this directory:

```text
generated-assets/
  meme-references/
    lion/
      pose-01.webp
      ...
      pose-15.webp
  mysteries/
    lion/
      source.webp
      tiles/
        00.webp
        ...
        27.webp
      private-layout.json
```

There must be 15 meme references per team: 14 unique pair references and one
trio reference. Set `asset-manifest.json` to `"mode": "approved"` only after
human review and `pnpm content:validate` pass.

The Docker build copies the complete `content/` directory to `/content`. Dokploy
may instead mount a reviewed content directory read-only at `/content`.
