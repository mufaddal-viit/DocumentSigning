//Assigning a document to a Signer
// listing assignments for a Signer
// retrieving assignment details.

const express = require("express");
const { body, param, validationResult } = require("express-validator");
const Assignment = require("../models/Assignment");
const Document = require("../models/Document");
const User = require("../models/User");
// const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// Create an assignment (Uploader-user assigns a document to a Signer)

//Input: { documentId, signerEmail }.
router.post(
  "/",
  authMiddleware(["UPLOADER"]),
  // Validation middleware array->created using express-validator
  // validating the body of a POST request
  [
    //checks if documentId exists in req.body
    body("documentId").isMongoId().withMessage("Invalid document ID"),
    body("signerEmail").isEmail().withMessage("Invalid email address"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId, signerEmail } = req.body;
      const uploaderId = req.user.id;

      // Verify document exists and belongs to the uploader
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (document.uploaderId.toString() !== uploaderId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You did not upload this document" });
      }
      if (document.status !== "PENDING") {
        return res
          .status(400)
          .json({ message: "Document is not in PENDING status" });
      }

      // Verify signer exists and has SIGNER role
      //searching in users collection that matches both conditions=> email & role:
      const signer = await User.findOne({ email: signerEmail, role: "SIGNER" });
      if (!signer) {
        return res
          .status(404)
          .json({ message: "Signer not found or not a SIGNER" });
      }

      // Check for existing assignment to prevent duplicates
      const existingAssignment = await Assignment.findOne({
        documentId,
        signerId: signer._id,
      });
      if (existingAssignment) {
        return res
          .status(400)
          .json({ message: "Document already assigned to this signer" });
      }

      // Create assignment
      const assignment = new Assignment({
        documentId,
        signerId: signer._id,
      });
      await assignment.save();

      //   await new AuditLog({
      //     documentId,
      //     userId: uploaderId,
      //     action: "ASSIGNED",
      //     details: `Assigned to ${signerEmail}`,
      //   }).save();

      res.status(201).json({ assignment });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get all documents assigned to the authenticated Signer.
router.get("/", authMiddleware(["SIGNER"]), async (req, res) => {
  try {
    //Find all assignments with signerId ===  user.id.
    const assignments = await Assignment.find({ signerId: req.user.id })
      .populate({
        path: "documentId",
        select: "originalUrl status signatureFields createdAt",
        populate: {
          path: "uploaderId",
          select: "email",
        },
      })
      .sort({ createdAt: -1 });

    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific assignment details (optional)
router.get(
  "/:id",
  authMiddleware(["SIGNER", "UPLOADER"]),
  [param("id").isMongoId().withMessage("Invalid assignment ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const assignment = await Assignment.findById(req.params.id).populate({
        path: "documentId",
        select: "originalUrl status signatureFields createdAt",
        populate: {
          path: "uploaderId",
          select: "email",
        },
      });

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Ensure user is either the assigned Signer or the document's Uploader
      const document = await Document.findById(assignment.documentId);
      if (
        assignment.signerId.toString() !== req.user.id &&
        document.uploaderId.toString() !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "Unauthorized: Not assigned or uploader" });
      }

      res.json({ assignment });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
