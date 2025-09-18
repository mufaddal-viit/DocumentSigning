const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      required: true,
    },
    role: {
      type: String,
      enum: ["UPLOADER", "SIGNER"],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model("User", userSchema);
