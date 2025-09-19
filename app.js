const express = require("express");
const connectDB = require("./config/connectDB");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const documentRoutes = require("./routes/documents");
const assignmentRoutes = require("./routes/assignments");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse form data (for file uploads)

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/assignments", assignmentRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
