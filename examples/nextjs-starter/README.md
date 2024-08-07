# Enoki <> Carmella SDK starter

This example was bootsrapped from: https://github.com/sui-foundation/enoki-example-app. \
This is a simple, one-page app that showcases Enoki login & Carmella SDK usage.

## Running the app locally

Ensure the `.env.local` file is set up with your Enoki API key and Google Auth Provider client id, then run:

```
// login to AWS to fetch private repository: @akord/carmella-sdk
yarn aws-login
yarn install
yarn dev
```