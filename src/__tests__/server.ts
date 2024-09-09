const express = require('express');
const app = express();

let authCode = "";

app.get('/auth', (req, res) => {
  authCode = req.query.code;
  console.log("Authorization code: " + authCode);
  res.send('Authorization code received. You can close this window and go back to the terminal.');
});

const server = app.listen(3000, () => {
  console.log('Server is listening on http://localhost:3000');
});

const getAuthCode = () => authCode

export { server, getAuthCode }