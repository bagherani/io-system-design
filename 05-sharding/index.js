const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://mongos:27017/shardingDemo";

const usersSeed = [
  { name: "Ada Lovelace", email: "ada@example.com", country: "United Kingdom", role: "engineer" },
  { name: "Grace Hopper", email: "grace@example.com", country: "United States", role: "developer" },
  { name: "Linus Torvalds", email: "linus@example.com", country: "Finland", role: "maintainer" },
  { name: "Margaret Hamilton", email: "margaret@example.com", country: "United States", role: "engineer" },
  { name: "Katherine Johnson", email: "katherine@example.com", country: "United States", role: "analyst" },
  { name: "Barbara Liskov", email: "barbara@example.com", country: "Canada", role: "developer" },
  { name: "Konrad Zuse", email: "konrad@example.com", country: "Germany", role: "engineer" },
  { name: "Satoshi Nakamoto", email: "satoshi@example.com", country: "Japan", role: "architect" },
  { name: "Tosin Ajayi", email: "tosin@example.com", country: "Nigeria", role: "engineer" },
  { name: "Ana Silva", email: "ana@example.com", country: "Brazil", role: "developer" },
  { name: "Ingrid Andersson", email: "ingrid@example.com", country: "Sweden", role: "designer" },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(client, attempts = 20) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await client.connect();
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      console.log(`Sharded cluster is starting, retrying connection (${attempt}/${attempts})...`);
      await wait(1000);
    }
  }
}

function collectShardNames(value, names = new Set()) {
  if (!value || typeof value !== "object") {
    return names;
  }

  if (typeof value.shardName === "string") {
    names.add(value.shardName);
  }

  if (typeof value.shard === "string") {
    names.add(value.shard);
  }

  for (const child of Object.values(value)) {
    collectShardNames(child, names);
  }

  return names;
}

function summarizeShardsFromExplain(explain) {
  const shards = [...collectShardNames(explain)];
  return shards.length ? shards : ["No shard names found in explain output"];
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await connectWithRetry(client);

    const db = client.db("shardingDemo");
    const users = db.collection("users");

    await users.deleteMany({});

    // The setup script shards this collection by { country: 1 }.
    // Queries that include country can target one shard instead of all shards.
    const insertResult = await users.insertMany(usersSeed);
    console.log(`Inserted ${insertResult.insertedCount} users through mongos.`);

    const countries = await users
      .aggregate([
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    console.log("Users by country:", countries);

    const shardStats = await users.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
    console.log(
      "Documents stored per shard:",
      shardStats.map((stat) => ({
        shard: stat.shard,
        count: stat.storageStats.count,
      })),
    );

    const targetedExplain = await users.find({ country: "Germany" }).explain("executionStats");
    console.log("Query with shard key country only visits:", summarizeShardsFromExplain(targetedExplain));

    const scatterGatherExplain = await users.find({ role: "engineer" }).explain("executionStats");
    console.log(
      "Query without shard key must ask:",
      summarizeShardsFromExplain(scatterGatherExplain),
    );

    const germanUsers = await users
      .find({ country: "Germany" }, { projection: { _id: 0, name: 1, country: 1, role: 1 } })
      .toArray();
    console.log("Users from Germany:", germanUsers);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
