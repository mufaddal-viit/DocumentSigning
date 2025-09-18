const mongoose = require("mongoose");

const DocumentSchema = mongoose.Schema(
  {
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    originalUrl: {
      type: String,
      required: true,
    },
    signedUrl: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "SIGNED", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
    signatureFields: [
      {
        type: {
          type: String,
        },
        x: Number,
        y: Number,
        page: Number,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// index
DocumentSchema.index({ uploaderId: 1 });
DocumentSchema.index({ status: 1 });
module.exports = mongoose.model("Document", DocumentSchema);
