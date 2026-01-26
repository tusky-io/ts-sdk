# Express Tusky SDK Starter

A minimal starter project to showcase Tusky SDK inside an Express.js server.

## Requirements

- Node.js `>=20.x`
- npm or yarn
- Tusky API key (https://app.tusky.io/account/api-keys)

## Features

- `/files` upload endpoint
- `/files/:id` download endpoint
- `/status` health endpoint
- upload & download test script

## Running the server

Create a `.env` file in the project root directory with your Tusky API key:

```env
TUSKY_API_KEY=your_tusky_api_key
```

```
yarn install
yarn build
yarn start
```

## Testing the server
Once the server is running you can run test script from the project root directory:
```
node ./__tests__/upload.js
```
