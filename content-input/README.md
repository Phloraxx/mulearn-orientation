# Private content input

Place organiser-supplied volunteer source photos here before running any optional
pre-event image-generation adapter:

```text
content-input/
  volunteers/
    lion/
      01.jpg
      02.jpg
```

Everything in this directory except this README is gitignored. Raw volunteer
photos must not be committed to the public repository.

The live application never calls an image-generation API. Reviewed outputs
belong in the deployment content bundle described by `content/asset-manifest.json`.
