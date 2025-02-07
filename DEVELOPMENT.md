# Development Guide

This document provides guidelines for setting up the development environment, testing, and contributing to the project.

## Setup

Install dependencies & compile the project:

```bash
yarn install
yarn build
```

## Testing

To run all tests:

```bash
yarn test
```

To run test groups:

```bash
yarn test:user

yarn test:vault

yarn test:vault:private
```

To run single test file with direct log output:

```bash
node --inspect node_modules/.bin/jest --selectProjects "public vault tests" --testPathPattern src/__tests__/vault/folder.test.ts
```

```bash
node --inspect node_modules/.bin/jest --selectProjects "encrypted vault tests" --testPathPattern src/__tests__/vault/folder.test.ts
```

## Contributing

Please use [semantic commit messages](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716)

## Generate docs

```bash
yarn build:dev

node generate-docs.js
```
