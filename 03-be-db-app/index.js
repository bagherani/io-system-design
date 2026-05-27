const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://root:example@localhost:27031/usersDB?authSource=admin";

const mockUsers = [
  {
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "engineer",
    active: true,
  },
  {
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "developer",
    active: true,
  },
  {
    name: "Linus Torvalds",
    email: "linus@example.com",
    role: "maintainer",
    active: true,
  },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const insertResult = await users.insertMany(mockUsers);
    console.log(`Inserted ${insertResult.insertedCount} users.`);

    const queriedUser = await users.findOne({ email: "ada@example.com" });
    console.log("Queried user:", queriedUser);

    const updateResult = await users.updateOne(
      { email: "grace@example.com" },
      { $set: { role: "lead developer", active: false } },
    );
    console.log(`Updated ${updateResult.modifiedCount} user.`);

    const deleteResult = await users.deleteOne({ email: "linus@example.com" });
    console.log(`Deleted ${deleteResult.deletedCount} user.`);

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
