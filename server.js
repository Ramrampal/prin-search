// server.js
const express = require("express");
const app = express();
const PORT = 3000;

// Serve a simple homepage
app.get("/", (req, res) => {
  res.send("<h1>🚀 Welcome to Prin Search</h1><p>Your AI Hub is running!</p>");
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Prin Search running at http://localhost:${PORT}`);
});
