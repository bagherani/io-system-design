const express = require("express");
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://mongos:27017/shardingDemo";
const port = Number(process.env.PORT || 3015);

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

function userFilterFromQuery(query) {
  const filter = {};

  if (query.country) filter.country = String(query.country);
  if (query.role) filter.role = String(query.role);
  if (query.email) filter.email = String(query.email);

  return filter;
}

async function seedUsers(users) {
  await users.deleteMany({});
  const insertResult = await users.insertMany(usersSeed);
  return insertResult.insertedCount;
}

async function usersByCountry(users) {
  return users
    .aggregate([
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
}

async function shardDistribution(users) {
  const shardStats = await users.aggregate([{ $collStats: { storageStats: {} } }]).toArray();

  return shardStats.map((stat) => ({
    shard: stat.shard,
    count: stat.storageStats.count,
    storageSize: stat.storageStats.storageSize,
  }));
}

async function explainQuery(users, filter) {
  const explain = await users.find(filter).explain("executionStats");

  return {
    filter,
    shardsVisited: summarizeShardsFromExplain(explain),
    executionStats: {
      returnedDocuments: explain.executionStats?.nReturned,
      totalKeysExamined: explain.executionStats?.totalKeysExamined,
      totalDocsExamined: explain.executionStats?.totalDocsExamined,
    },
  };
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await connectWithRetry(client);

    const db = client.db("shardingDemo");
    const users = db.collection("users");

    const insertedCount = await seedUsers(users);
    console.log(`Inserted ${insertedCount} users through mongos.`);
    console.log("Users by country:", await usersByCountry(users));
    console.log("Documents stored per shard:", await shardDistribution(users));
    console.log("Query with shard key country:", await explainQuery(users, { country: "Germany" }));
    console.log("Query without shard key:", await explainQuery(users, { role: "engineer" }));

    const app = express();
    app.use(express.json());

    app.get("/", (request, response) => {
      response.json({
        message: "05-sharding MongoDB API",
        shardKey: { country: 1 },
        endpoints: [
          "GET /cluster/shards",
          "GET /users",
          "POST /users",
          "POST /users/seed",
          "GET /users/distribution",
          "GET /users/by-country/:country",
          "GET /users/by-role/:role",
          "GET /users/explain?country=Germany",
          "GET /users/explain?role=engineer",
        ],
      });
    });

    app.get("/cluster/shards", async (request, response, next) => {
      try {
        const result = await db.admin().command({ listShards: 1 });
        response.json(result.shards);
      } catch (error) {
        next(error);
      }
    });

    app.post("/users/seed", async (request, response, next) => {
      try {
        const count = await seedUsers(users);
        response.json({
          insertedCount: count,
          distribution: await shardDistribution(users),
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/users", async (request, response, next) => {
      try {
        const filter = userFilterFromQuery(request.query);
        const foundUsers = await users.find(filter).sort({ country: 1, name: 1 }).toArray();

        response.json({
          filter,
          count: foundUsers.length,
          users: foundUsers,
        });
      } catch (error) {
        next(error);
      }
    });

    app.post("/users", async (request, response, next) => {
      try {
        const user = request.body || {};

        if (!user.name || !user.email || !user.country || !user.role) {
          response.status(400).json({
            error: "User must include name, email, country, and role.",
          });
          return;
        }

        const insertResult = await users.insertOne(user);
        const insertedUser = await users.findOne({ _id: insertResult.insertedId });

        response.status(201).json({
          note: "mongos routes this write to the shard responsible for the user's country.",
          user: insertedUser,
          distribution: await shardDistribution(users),
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/users/distribution", async (request, response, next) => {
      try {
        response.json({
          shardKey: { country: 1 },
          splitPoint: { country: "M" },
          byCountry: await usersByCountry(users),
          byShard: await shardDistribution(users),
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/users/by-country/:country", async (request, response, next) => {
      try {
        const filter = { country: request.params.country };
        const foundUsers = await users.find(filter).sort({ name: 1 }).toArray();
        const explain = await explainQuery(users, filter);

        response.json({
          note: "This includes the shard key, so mongos can target the matching country shard.",
          ...explain,
          users: foundUsers,
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/users/by-role/:role", async (request, response, next) => {
      try {
        const filter = { role: request.params.role };
        const foundUsers = await users.find(filter).sort({ country: 1, name: 1 }).toArray();
        const explain = await explainQuery(users, filter);

        response.json({
          note: "This does not include the shard key, so mongos sends the query to every shard.",
          ...explain,
          users: foundUsers,
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/users/explain", async (request, response, next) => {
      try {
        const filter = userFilterFromQuery(request.query);

        if (Object.keys(filter).length === 0) {
          response.status(400).json({
            error: "Add a query filter, for example ?country=Germany or ?role=engineer.",
          });
          return;
        }

        response.json(await explainQuery(users, filter));
      } catch (error) {
        next(error);
      }
    });

    app.use((error, request, response, next) => {
      console.error(error);
      response.status(500).json({ error: error.message || "Something went wrong." });
    });

    const server = app.listen(port, () => {
      console.log(`05-sharding API listening on http://localhost:${port}`);
    });

    const shutdown = async () => {
      console.log("Shutting down 05-sharding API...");
      server.close(async () => {
        await client.close();
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    await client.close();
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
