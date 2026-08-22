require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Issue = require("../../src/models/issue");
const User = require("../../src/models/User");
const issuesData = require("./issue.json");

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  // WARNING: This deletes all existing issues and users.
  await Issue.deleteMany({});
  await User.deleteMany({});

  await Issue.insertMany(issuesData);

  const [
    citizenHash,
    authorityHash,
    princeHash,
    arkenduHash,
    architHash,
  ] = await Promise.all([
    bcrypt.hash("Citizen@123", 12),
    bcrypt.hash("Authority@123", 12),
    bcrypt.hash("Prince8899", 12),
    bcrypt.hash("Arka8145", 12),
    bcrypt.hash("Archit123", 12),
  ]);

  await User.create([
    {
      name: "Demo Citizen",
      email: "citizen@civicpulse.local",
      passwordHash: citizenHash,
      role: "citizen",
    },
    {
      name: "Authority",
      email: "authority@civic-pulse.com",
      passwordHash: authorityHash,
      role: "authority",
    },
    {
      name: "Prince Kumar Gupta",
      email: "princegupta@civic-pulse.com",
      passwordHash: princeHash,
      role: "authority",
    },
    {
      name: "Arkendu Kundu",
      email: "arkendukundu@civic-pulse.com",
      passwordHash: arkenduHash,
      role: "authority",
    },
    {
      name: "Archit Pande",
      email: "architpande@civic-pulse.com",
      passwordHash: architHash,
      role: "authority",
    },
  ]);

  console.log("Database seeded successfully.");
  console.log("Created 1 citizen account and 4 authority accounts.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });