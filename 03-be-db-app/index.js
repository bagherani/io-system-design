const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://root:example@localhost:27031/usersDB?authSource=admin";

const mockUsers = [
  {
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "engineer",
    age: 36,
    active: true,
    skills: ["math", "mongodb", "systems"],
    certificates: [],
  },
  {
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "developer",
    age: 42,
    active: true,
    skills: ["compilers", "leadership", "mongodb"],
    certificates: [],
  },
  {
    name: "Linus Torvalds",
    email: "linus@example.com",
    role: "maintainer",
    age: 33,
    active: true,
    skills: ["linux", "git", "systems"],
    certificates: [],
  },
  {
    name: "Margaret Hamilton",
    email: "margaret@example.com",
    role: "engineer",
    age: 45,
    active: true,
    skills: ["software", "safety", "systems"],
    certificates: [],
  },
  {
    name: "Katherine Johnson",
    email: "katherine@example.com",
    role: "analyst",
    age: 39,
    active: true,
    skills: ["math", "navigation", "research"],
    certificates: [],
  },
  {
    name: "Barbara Liskov",
    email: "barbara@example.com",
    role: "developer",
    age: 48,
    active: true,
    skills: ["distributed systems", "programming", "mongodb"],
    certificates: [],
  },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findIndexStage = (stage) => {
  if (!stage) return null;
  if (stage.indexName) return stage;
  return findIndexStage(stage.inputStage);
};

const summarizeExplain = (plan) => ({
  winningStage: plan.queryPlanner.winningPlan.stage,
  indexUsed: findIndexStage(plan.queryPlanner.winningPlan)?.indexName || "none",
  totalKeysExamined: plan.executionStats.totalKeysExamined,
  totalDocsExamined: plan.executionStats.totalDocsExamined,
  returnedDocuments: plan.executionStats.nReturned,
});

async function connectWithRetry(client, attempts = 10) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await client.connect();
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      console.log(`MongoDB is starting, retrying connection (${attempt}/${attempts})...`);
      await wait(1000);
    }
  }
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await connectWithRetry(client);

    const db = client.db("usersDB");
    const users = db.collection("users");

    await users.deleteMany({});

    // Seed the collection with a few users so each query has data to show.
    const insertResult = await users.insertMany(mockUsers);
    console.log(`Inserted ${insertResult.insertedCount} users.`);

    // Indexes help MongoDB find matching documents without scanning the whole collection.
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ role: 1 });
    await users.createIndex({ age: 1 });
    await users.createIndex({ skills: 1 });
    console.log("Created indexes on email, role, age, and skills.");

    // A basic read query fetches one user by an indexed email address.
    const queriedUser = await users.findOne({ email: "ada@example.com" });
    console.log("Queried user:", queriedUser);

    // $gt searches for values greater than the number we provide.
    const olderUsers = await users
      .find({ age: { $gt: 40 } }, { projection: { _id: 0, name: 1, age: 1 } })
      .toArray();
    console.log("Users older than 40:", olderUsers);

    // MongoDB can match a simple value inside an array field.
    const mongodbUsers = await users
      .find({ skills: "mongodb" }, { projection: { _id: 0, name: 1, skills: 1 } })
      .toArray();
    console.log("Users with MongoDB skill:", mongodbUsers);

    // $push inserts a new string into the certificates array for every user.
    const certificateResult = await users.updateMany(
      {},
      { $push: { certificates: "MongoDB Basics" } },
    );
    console.log(`Added certificates to ${certificateResult.modifiedCount} users.`);

    // After inserting into the array, we can search by that certificate value.
    const certifiedUsers = await users
      .find(
        { certificates: "MongoDB Basics" },
        { projection: { _id: 0, name: 1, certificates: 1 } },
      )
      .toArray();
    console.log("Users with MongoDB Basics certificate:", certifiedUsers);

    // Aggregation groups users by role and counts how many users each role has.
    const usersByRole = await users
      .aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ])
      .toArray();
    console.log("Users grouped by role:", usersByRole);

    // explain shows the execution plan MongoDB used for a query.
    const ageExplain = await users.find({ age: { $gt: 40 } }).explain("executionStats");
    console.log("Execution plan for age query:", summarizeExplain(ageExplain));

    // Update changes one matching document.
    const updateResult = await users.updateOne(
      { email: "grace@example.com" },
      { $set: { role: "lead developer", active: false } },
    );
    console.log(`Updated ${updateResult.modifiedCount} user.`);

    // Delete removes one matching document from the collection.
    const deleteResult = await users.deleteOne({ email: "linus@example.com" });
    console.log(`Deleted ${deleteResult.deletedCount} user.`);

    // A final read shows the documents left after the CRUD operations.
    const remainingUsers = await users.find({}, { projection: { _id: 0 } }).toArray();
    console.log("Remaining users:", remainingUsers);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
