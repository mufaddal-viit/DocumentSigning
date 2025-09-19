const mongoose = require("mongoose");
const AssignmentSchema = mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    signerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    signedAt: {
      type: Date, // Null until signed
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

AssignmentSchema.index({ signerId: 1 });

// Compound index on documentId and signerId for uniqueness (one signer per document):

AssignmentSchema.index({ documentId: 1, signerId: 1 }, { unique: true });

module.exports = mongoose.model("Assignment", AssignmentSchema);
