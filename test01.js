const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Document = require("./models/Document");
await User.create({
  email: "uploader@test.com",
  password: await bcrypt.hash("password", 10),
  role: "UPLOADER",
});
await User.create({
  email: "signer@test.com",
  password: await bcrypt.hash("password", 10),
  role: "SIGNER",
});
await Document.create({
  uploaderId: uploader._id,
  originalUrl: "https://s3.amazonaws.com/test.pdf",
  status: "PENDING",
});
