const path = require("path");
const dotenv = require("dotenv");
const envPath = process.env.SECRET_ENV_PATH || path.resolve(__dirname, ".env");
dotenv.config({ path: envPath });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD in the backend environment before running this script.");
  if (ADMIN_PASSWORD.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  await mongoose.connect(MONGO_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await User.findOneAndUpdate(
    { email },
    { name: ADMIN_NAME || "Platform Administrator", email, password, role: "admin", status: "approved" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Administrator account provisioned for ${admin.email}. Sign in through the normal login page.`);
  await mongoose.disconnect();
}
createAdmin().catch(async (error) => {
  console.error("Unable to provision administrator:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
