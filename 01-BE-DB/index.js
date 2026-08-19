const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config({ path: __dirname + "/.env.local" });

const uri =
  process.env.DB_URI;
const port = Number(process.env.PORT);

const mockUsers = require("./mock.users.json");

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

function userFilterFromQuery(query) {
  const filter = {};

  if (query.email) filter.email = query.email;
  if (query.role) filter.role = query.role;
  if (query.skill) filter.skills = query.skill;
  if (query.active) filter.active = query.active === "true";
  if (query.minAge) filter.age = { $gte: Number(query.minAge) };

  return filter;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function userIdFromParam(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await connectWithRetry(client);
    console.log("Connected to MongoDB.");

    const db = client.db("usersDB");
    const users = db.collection("users");

    await users.deleteMany({});

    // Seed the collection with a few users so each query has data to show.
    const insertResult = await users.insertMany(mockUsers);
    console.log(`Inserted ${insertResult.insertedCount} users.`);

    // Keep only a couple of indexes so the lesson can compare indexed queries with scans.
    await users.dropIndexes();
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ role: 1 });
    console.log("Created indexes on email and role.");

    const app = express();
    app.use(express.json());

    app.get("/", (request, response) => {
      response.json({
        message: "01-BE-DB MongoDB CRUD API",
        endpoints: [
          "GET /users",
          "GET /users/search/scan?q=ada",
          "POST /users",
          "PATCH /users/:id",
          "DELETE /users/:id",
        ],
      });
    });

    app.get("/users", async (request, response, next) => {
      try {
        const filter = userFilterFromQuery(request.query);
        const foundUsers = await users.find(filter).sort({ name: 1 }).toArray();
        console.log("Found users:", { filter, count: foundUsers.length });

        if (filter.email || filter.role) {
          const explain = await users.find(filter).sort({ name: 1 }).explain("executionStats");
          console.log("Indexed query execution plan:", summarizeExplain(explain));
        }

        response.json(foundUsers);
      } catch (error) {
        next(error);
      }
    });

    app.get("/users/search/scan", async (request, response, next) => {
      try {
        const search = String(request.query.q || "");
        const filter = search
          ? { name: { $regex: escapeRegExp(search), $options: "i" } }
          : {};
        const foundUsers = await users.find(filter).toArray();
        const explain = await users.find(filter).explain("executionStats");
        const summary = summarizeExplain(explain);

        console.log("Collection scan search:", {
          field: "name",
          search,
          count: foundUsers.length,
          explain: summary,
        });

        response.json({
          note: "This searches the unindexed name field, so MongoDB scans documents instead of using an app-created index.",
          search,
          explain: summary,
          users: foundUsers,
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/users/explain/age", async (request, response, next) => {
      try {
        const minAge = Number(request.query.minAge || 40);
        const ageExplain = await users.find({ age: { $gt: minAge } }).explain("executionStats");
        const summary = summarizeExplain(ageExplain);
        console.log("Execution plan for age query:", summary);
        response.json(summary);
      } catch (error) {
        next(error);
      }
    });

    app.get("/users/:id", async (request, response, next) => {
      try {
        const userId = userIdFromParam(request.params.id);
        if (!userId) {
          response.status(400).json({ error: "Invalid user id." });
          return;
        }

        const foundUser = await users.findOne({ _id: userId });
        console.log("Found user by id:", { id: request.params.id, found: Boolean(foundUser) });

        if (!foundUser) {
          response.status(404).json({ error: "User not found." });
          return;
        }

        response.json(foundUser);
      } catch (error) {
        next(error);
      }
    });

    app.post("/users", async (request, response, next) => {
      try {
        const user = request.body;
        const insertResult = await users.insertOne(user);
        const insertedUser = await users.findOne({ _id: insertResult.insertedId });
        console.log("Inserted user:", insertedUser);
        response.status(201).json(insertedUser);
      } catch (error) {
        next(error);
      }
    });

    app.patch("/users/:id", async (request, response, next) => {
      try {
        const userId = userIdFromParam(request.params.id);
        if (!userId) {
          response.status(400).json({ error: "Invalid user id." });
          return;
        }

        const updates = request.body;
        if (Object.keys(updates).length === 0) {
          response.status(400).json({ error: "Request body must include fields to update." });
          return;
        }

        const updateResult = await users.updateOne({ _id: userId }, { $set: updates });
        console.log("Updated user:", {
          id: request.params.id,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          updates,
        });

        if (updateResult.matchedCount === 0) {
          response.status(404).json({ error: "User not found." });
          return;
        }

        const updatedUser = await users.findOne({ _id: userId });
        response.json(updatedUser);
      } catch (error) {
        next(error);
      }
    });

    app.delete("/users/:id", async (request, response, next) => {
      try {
        const userId = userIdFromParam(request.params.id);
        if (!userId) {
          response.status(400).json({ error: "Invalid user id." });
          return;
        }

        const deleteResult = await users.deleteOne({ _id: userId });
        console.log("Deleted user:", {
          id: request.params.id,
          deletedCount: deleteResult.deletedCount,
        });

        if (deleteResult.deletedCount === 0) {
          response.status(404).json({ error: "User not found." });
          return;
        }

        response.json({ deletedCount: deleteResult.deletedCount });
      } catch (error) {
        next(error);
      }
    });

    app.use((error, request, response, next) => {
      console.error(error);
      response.status(500).json({ error: "Something went wrong." });
    });

    const server = app.listen(port, () => {
      console.log(`01-BE-DB API listening on http://localhost:${port}`);
    });

    const shutdown = async () => {
      console.log("Shutting down 01-BE-DB API...");
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
