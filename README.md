# How to contribute to our documentation

We welcome all changes to FuseML.
Don't hesitate to send an issue or submit a PR to our documentation.

## MkDocs

The documentation is generated using MkDocs. For full documentation on how to
use MkDocs, please go to the [MkDocs website](https://www.mkdocs.org/)

We are using the [material theme from squidfunk](https://squidfunk.github.io/mkdocs-material/)

## How to generate/render docs for live edition

Simply run:

```
docker run --rm -it -p 8000:8000 -v ${PWD}:/docs squidfunk/mkdocs-material
```

## How to build the final docs outside a docker container

```
pip install --user mkdocs-material
mkdocs build
```

## Where can I see the production documentation?

The generated builds are stored in the gh-pages branch.
They are built and publish through github actions.

You can find our production documentation [live on https://fuseml.github.io/docs](https://fuseml.github.io/docs)
