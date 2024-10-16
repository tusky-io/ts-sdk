const express = require('express');

let server: any;

export const startServer = () => {
  const app = express();

  let authCode = "";

  app.get('/auth', (req, res) => {
    authCode = req.query.code;
    console.log("Authorization code: " + authCode);
    res.send('Authorization code received. You can close this window and go back to the terminal.');
  });

  server = app.listen(3000, () => {
    console.log('Server is listening on http://localhost:3000');
  });

  const getAuthCode = () => authCode;

  return { server, getAuthCode };
};

export const stopServer = () => {
  if (server) {
    server.close(() => {
      console.log('Server stopped.');
    });
  }
};