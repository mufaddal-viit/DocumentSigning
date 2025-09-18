// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/connectDB");
const User = require("./models/users");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Main async function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Optional: Insert a test user (comment this out after first run)
    const newUser = new User({
      name: "John Doe",
      email: "john@example.com",
      password: "supersecret", // ⚠️ In production, hash this
      role: "UPLOADER",
    });

    await newUser.save();
    console.log("🎉 User inserted:", newUser);

    // Routes
    app.get("/health-check", (req, res) => {
      res.send("Hello, Server running");
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Error starting server:", err);
    process.exit(1);
  }
};

startServer();
