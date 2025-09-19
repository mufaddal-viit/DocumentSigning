// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const connectDB = require("./config/connectDB");
// const User = require("./models/User");
// const Document = require("./models/Document");
// const Assignment = require("./models/Assignment");
// require("dotenv").config();

// async function seedDatabase() {
//   try {
//     // Connect to MongoDB
//     await connectDB();

//     // Clear existing data (optional, comment out if you want to keep existing data)
//     await User.deleteMany({});
//     await Document.deleteMany({});
//     await Assignment.deleteMany({});
//     // await AuditLog.deleteMany({});
//     console.log("completed first part");

//     // Create sample users
//     const uploader = await User.create({
//       email: "uploader@test.com",
//       name: "Uploader User", // Add name
//       password: await bcrypt.hash("password123", 10),
//       role: "UPLOADER",
//     });

//     console.log("User done");

//     const signer = await User.create({
//       email: "signer@test.com",
//       name: "Signer User", // Add name
//       password: await bcrypt.hash("password123", 10),
//       role: "SIGNER",
//     });

//     console.log("Users created:", {
//       uploader: uploader.email,
//       signer: signer.email,
//     });

//     // Create sample documents
//     const documents = await Document.create([
//       {
//         uploaderId: uploader._id,
//         originalUrl: `https://${
//           process.env.AWS_S3_BUCKET
//         }.s3.amazonaws.com/pdfs/${uploader._id}/${Date.now()}_sample1.pdf`,
//         status: "PENDING",
//         signatureFields: [
//           { type: "signature", x: 100, y: 100, page: 1 },
//           { type: "name", x: 100, y: 50, page: 1 },
//         ],
//       },
//       {
//         uploaderId: uploader._id,
//         originalUrl: `https://${
//           process.env.AWS_S3_BUCKET
//         }.s3.amazonaws.com/pdfs/${uploader._id}/${Date.now()}_sample2.pdf`,
//         status: "PENDING",
//       },
//     ]);

//     console.log(
//       "Documents created:",
//       documents.map((doc) => doc.originalUrl)
//     );

//     // Create sample assignments
//     const assignment = await Assignment.create({
//       documentId: documents[0]._id,
//       signerId: signer._id,
//     });

//     console.log("Assignment created:", {
//       documentId: assignment.documentId,
//       signerId: assignment.signerId,
//     });

//     // Create sample audit logs
//     // await AuditLog.create([
//     //   {
//     //     documentId: documents[0]._id,
//     //     userId: uploader._id,
//     //     action: "UPLOADED",
//     //     details: "Uploaded sample1.pdf",
//     //   },
//     //   {
//     //     documentId: documents[0]._id,
//     //     userId: uploader._id,
//     //     action: "ASSIGNED",
//     //     details: `Assigned to ${signer.email}`,
//     //   },
//     // ]);

//     // console.log("Audit logs created");

//     console.log("Database seeding completed successfully!");
//   } catch (error) {
//     console.error("Error seeding database:", error.message);
//   } finally {
//     await mongoose.connection.close();
//     console.log("MongoDB connection closed");
//   }
// }

// seedDatabase();


