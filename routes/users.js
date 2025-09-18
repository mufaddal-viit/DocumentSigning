const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Document = require("../models/Document");
const Assignment = require("../models/Assignment");
// const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// Get user profile
// Retrieves the authenticated user's details (email, role).
router.get("/me", authMiddleware(["UPLOADER", "SIGNER"]), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile (email or password)
// Allows users to update their email or password.
router.patch(
  "/me",
  authMiddleware(["UPLOADER", "SIGNER"]),
  [
    body("email").optional().isEmail().withMessage("Invalid email address"),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update fields if provided
      let updatedFields = {};
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" });
        }
        updatedFields.email = email;
      }
      if (password) {
        updatedFields.password = await bcrypt.hash(password, 10);
      }

      // Apply updates
      if (Object.keys(updatedFields).length > 0) {
        Object.assign(user, updatedFields);
        await user.save();

        // Bonus: Log to AuditLog
        //     await new AuditLog({
        //       documentId: null, // No document tied to profile update
        //       userId,
        //       action: "PROFILE_UPDATED",
        //       details: `Updated ${Object.keys(updatedFields).join(", ")}`,
        //     }).save();
      }

      res.json({ user: { id: user._id, email: user.email, role: user.role } });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get user's documents or assignments (based on role) associated with the user
router.get(
  "/me/documents",
  authMiddleware(["UPLOADER", "SIGNER"]),
  async (req, res) => {
    try {
      let data = [];
      if (req.user.role === "UPLOADER") {
        // Uploader sees all their documents
        data = await Document.find({ uploaderId: req.user.id })
          .select("originalUrl signedUrl status createdAt")
          .sort({ createdAt: -1 });
      } else {
        // Signer sees their assigned documents
        const assignments = await Assignment.find({
          signerId: req.user.id,
        }).select("documentId");
        const documentIds = assignments.map((a) => a.documentId);
        data = await Document.find({ _id: { $in: documentIds } })
          .select("originalUrl signedUrl status createdAt")
          .sort({ createdAt: -1 });
      }

      res.json({ documents: data });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
