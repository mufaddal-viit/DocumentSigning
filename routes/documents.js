const express = require("express");
const { body, param, validationResult } = require("express-validator");
const AWS = require("aws-sdk");
const { PDFDocument } = require("pdf-lib");
const multer = require("multer");
const Document = require("../models/Document");
const Assignment = require("../models/Assignment");
const User = require("../models/User");
// const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// Configure AWS S3
const { s3, bucket } = require("../config/s3");
// // const s3 = new AWS.S3({
// //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
// //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Upload a PDF (Uploader only)
router.post(
  "/upload",
  authMiddleware(["UPLOADER"]),
  upload.single("file"), // Middleware to handle `multipart/form-data` uploads

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const uploaderId = req.user.id;

      //  Parse signatureFields (from multipart/form-data it's a string)
      let signatureFields = [];
      if (req.body.signatureFields) {
        try {
          signatureFields = JSON.parse(req.body.signatureFields);
        } catch (err) {
          return res
            .status(400)
            .json({ message: "Invalid signatureFields format. Must be JSON." });
        }
      }

      //  Upload to S3
      const params = {
        Bucket: bucket,
        Key: `pdfs/${Date.now()}_${req.file.originalname}`,
        Body: req.file.buffer,
        ContentType: "application/pdf",
      };
      const { Location } = await s3.upload(params).promise();

      //  Save document metadata
      const document = new Document({
        uploaderId,
        originalUrl: Location,
        signatureFields: signatureFields || [],
        status: "PENDING",
      });
      await document.save();

      //  Optional AuditLog
      /*
      await new AuditLog({
        documentId: document._id,
        userId: uploaderId,
        action: "UPLOADED",
        details: `Uploaded PDF: ${req.file.originalname}`,
      }).save();
      */

      res.status(201).json({ document });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// List documents (Uploader: all their documents; Signer: assigned documents)
router.get("/", authMiddleware(["UPLOADER", "SIGNER"]), async (req, res) => {
  try {
    let documents = [];
    if (req.user.role === "UPLOADER") {
      // Uploader sees all their documents
      documents = await Document.find({ uploaderId: req.user.id }).sort({
        createdAt: -1,
      });
    } else {
      // Signer sees documents assigned to them
      const assignments = await Assignment.find({
        signerId: req.user.id,
      }).select("documentId");
      const documentIds = assignments.map((a) => a.documentId);
      documents = await Document.find({ _id: { $in: documentIds } }).sort({
        createdAt: -1,
      });
    }

    res.json({ documents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// View a specific document (Uploader or assigned Signer)
router.get(
  "/:id",
  authMiddleware(["UPLOADER", "SIGNER"]),
  // [param("id").isMongoId().withMessage("Invalid document ID")],
  async (req, res) => {
    try {
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({ errors: errors.array() });
      // }

      const document = await Document.findById(req.params.id).populate(
        "uploaderId",
        "email"
      );
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check authorization
      if (
        req.user.role === "UPLOADER" &&
        document.uploaderId._id.toString() !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "Unauthorized: Not your document" });
      }
      if (req.user.role === "SIGNER") {
        const assignment = await Assignment.findOne({
          documentId: req.params.id,
          signerId: req.user.id,
        });
        if (!assignment) {
          return res
            .status(403)
            .json({ message: "Unauthorized: Not assigned to you" });
        }
      }

      res.json({ document });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Sign a document (Signer only)
// Allows Signers to submit a signed PDF with signature, name, email, and date.
router.post("/:id/sign", authMiddleware(["SIGNER"]), async (req, res) => {
  try {
    const { signature, name, email, date } = req.body;
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (document.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Document is not in PENDING status" });
    }

    // Verify Signer is assigned
    const assignment = await Assignment.findOne({
      documentId: req.params.id,
      signerId: req.user.id,
    });
    if (!assignment) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Not assigned to you" });
    }

    // Fetch original PDF from S3
    const s3Params = {
      Bucket: bucket,
      Key: document.originalUrl.split("/").pop(),
    };
    const { Body } = await s3.getObject(s3Params).promise();

    // Embed signature and fields using pdf-lib
    const pdfDoc = await PDFDocument.load(Body);
    const page = pdfDoc.getPage(0); // Assume signature on first page or use signatureFields
    const signatureImage = await pdfDoc.embedPng(
      Buffer.from(signature, "base64")
    );
    page.drawImage(signatureImage, {
      x: 100,
      y: 100,
      width: 100,
      height: 50,
    });
    page.drawText(name, { x: 100, y: 50 });
    page.drawText(email, { x: 100, y: 30 });
    page.drawText(date, { x: 100, y: 10 });
    const pdfBytes = await pdfDoc.save();

    // Upload signed PDF to S3
    const signedKey = `signed/${Date.now()}_${s3Params.Key}`;
    const uploadParams = {
      Bucket: bucket,
      Key: signedKey,
      Body: pdfBytes,
      ContentType: "application/pdf",
    };
    const { Location } = await s3.upload(uploadParams).promise();

    // Update document and assignment
    document.signedUrl = Location;
    document.status = "SIGNED";
    await document.save();

    assignment.signedAt = new Date();
    await assignment.save();

    // Bonus: Log to AuditLog
    // await new AuditLog({
    //   documentId: req.params.id,
    //   userId: req.user.id,
    //   action: "SIGNED",
    //   details: `Signed by ${email}`,
    // }).save();

    res.json({ document });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify or reject a signed document (Uploader only)
// Allows Uploaders to accept or reject a signed document.
router.patch(
  "/:id/verify",
  authMiddleware(["UPLOADER"]),
  [
    param("id").isMongoId().withMessage("Invalid document ID"),
    body("action").isIn(["ACCEPT", "REJECT"]).withMessage("Invalid action"),
    body("reason").optional().isString().withMessage("Reason must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { action, reason } = req.body;
      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (document.uploaderId.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized: Not your document" });
      }
      if (document.status !== "SIGNED") {
        return res
          .status(400)
          .json({ message: "Document is not in SIGNED status" });
      }

      // Update status
      document.status = action === "ACCEPT" ? "VERIFIED" : "REJECTED";
      await document.save();

      // Bonus: Log to AuditLog
      // await new AuditLog({
      //   documentId: req.params.id,
      //   userId: req.user.id,
      //   action: action === "ACCEPT" ? "VERIFIED" : "REJECTED",
      //   details: reason || `${action} by uploader`,
      // }).save();

      res.json({ document });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
