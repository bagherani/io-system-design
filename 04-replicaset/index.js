const express = require("express");
const http = require("http");
const { MongoClient, ObjectId } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/replicaSetDemo?replicaSet=rs0";
const port = Number(process.env.PORT || 3014);
const dockerSocketPath = process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock";

const writeConcerns = {
  acknowledged: { w: 1 },
  twoNodes: { w: 2 },
  majority: { w: "majority", j: true },
};

const readConcerns = new Set(["local", "majority", "linearizable"]);
const readPreferences = new Set(["primary", "primaryPreferred", "secondary", "secondaryPreferred", "nearest"]);

const mongoHostToContainer = {
  "mongodb-primary:27017": "io-system-design-04-mongodb-primary",
  "mongodb-secondary-1:27017": "io-system-design-04-mongodb-secondary-1",
  "mongodb-secondary-2:27017": "io-system-design-04-mongodb-secondary-2",
};

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

      console.log(`Replica set is starting, retrying connection (${attempt}/${attempts})...`);
      await wait(1000);
    }
  }
}

function logOperationTarget(event) {
  if (["count", "delete", "find", "insert"].includes(event.commandName)) {
    console.log(`${event.commandName} command sent to ${event.address}`);
  }
}

function pickWriteConcern(mode = "majority") {
  return writeConcerns[mode] || writeConcerns.majority;
}

function pickReadConcern(level = "local", readPreference = "secondary") {
  if (level === "linearizable" && readPreference !== "primary") {
    return { readConcern: { level: "linearizable" }, readPreference: "primary" };
  }

  return {
    readConcern: { level: readConcerns.has(level) ? level : "local" },
    readPreference: readPreferences.has(readPreference) ? readPreference : "secondary",
  };
}

function eventIdFromParam(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
}

async function replicaStatus(db) {
  const status = await db.admin().command(
    { replSetGetStatus: 1 },
    { readPreference: "secondaryPreferred" },
  );

  return status.members.map((member) => ({
    name: member.name,
    state: member.stateStr,
    health: member.health,
    uptimeSeconds: member.uptime,
    lastHeartbeatMessage: member.lastHeartbeatMessage || undefined,
  }));
}

async function currentPrimary(db) {
  const hello = await db.admin().command({ hello: 1 }, { readPreference: "secondaryPreferred" });

  return hello.primary || hello.me;
}

async function waitForNewPrimary(db, previousPrimary, attempts = 30) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const primary = await currentPrimary(db);
      if (primary && primary !== previousPrimary) {
        return primary;
      }
    } catch (error) {
      console.log(`Waiting for new primary election (${attempt}/${attempts})...`);
    }

    await wait(1000);
  }

  return null;
}

function stopDockerContainer(containerName) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        socketPath: dockerSocketPath,
        method: "POST",
        path: `/containers/${encodeURIComponent(containerName)}/stop`,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
            return;
          }

          reject(new Error(`Docker returned ${response.statusCode}: ${body}`));
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

async function main() {
  const client = new MongoClient(uri, { monitorCommands: true });
  client.on("commandStarted", logOperationTarget);

  try {
    await connectWithRetry(client);

    const db = client.db("replicaSetDemo");
    const events = db.collection("events");
    console.log("Replica set members:", await replicaStatus(db));

    const app = express();
    app.use(express.json());

    app.get("/", (request, response) => {
      response.json({
        message: "04-replicaset MongoDB read/write concerns API",
        endpoints: [
          "GET /replica-set/status",
          "POST /events?writeConcern=majority",
          "GET /events?readConcern=local&readPreference=secondary",
          "GET /events/:id?readConcern=majority&readPreference=primary",
          "POST /replica-set/stop-primary",
        ],
        writeConcerns: Object.keys(writeConcerns),
        readConcerns: Array.from(readConcerns),
        readPreferences: Array.from(readPreferences),
      });
    });

    app.get("/replica-set/status", async (request, response, next) => {
      try {
        response.json({
          primary: await currentPrimary(db),
          members: await replicaStatus(db),
        });
      } catch (error) {
        next(error);
      }
    });

    app.delete("/events", async (request, response, next) => {
      try {
        const deleteResult = await events.deleteMany({});
        response.json({ deletedCount: deleteResult.deletedCount });
      } catch (error) {
        next(error);
      }
    });

    app.post("/events", async (request, response, next) => {
      try {
        const body = request.body || {};
        const mode = String(request.query.writeConcern || body.writeConcern || "majority");
        const writeConcern = pickWriteConcern(mode);
        const writes = db.collection("events", { writeConcern });
        const event = {
          type: body.type || "practice",
          message: body.message || "Hello from a MongoDB replica set",
          createdAt: new Date(),
          writeConcernMode: mode,
        };

        // Writes always go to the primary; write concern controls acknowledgement.
        const insertResult = await writes.insertOne(event);
        const insertedEvent = await events.findOne({ _id: insertResult.insertedId });

        response.status(201).json({
          writeConcern,
          insertedEvent,
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/events", async (request, response, next) => {
      try {
        const options = pickReadConcern(
          String(request.query.readConcern || "local"),
          String(request.query.readPreference || "secondary"),
        );
        const reads = db.collection("events", options);
        const foundEvents = await reads.find({}).sort({ createdAt: -1 }).limit(20).toArray();

        response.json({
          ...options,
          count: foundEvents.length,
          events: foundEvents,
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/events/:id", async (request, response, next) => {
      try {
        const eventId = eventIdFromParam(request.params.id);
        if (!eventId) {
          response.status(400).json({ error: "Invalid event id." });
          return;
        }

        const options = pickReadConcern(
          String(request.query.readConcern || "majority"),
          String(request.query.readPreference || "primary"),
        );
        const reads = db.collection("events", options);
        const foundEvent = await reads.findOne({ _id: eventId });

        if (!foundEvent) {
          response.status(404).json({ error: "Event not found." });
          return;
        }

        response.json({
          ...options,
          event: foundEvent,
        });
      } catch (error) {
        next(error);
      }
    });

    app.post("/replica-set/stop-primary", async (request, response, next) => {
      try {
        const primary = await currentPrimary(db);
        const containerName = mongoHostToContainer[primary];

        if (!containerName) {
          response.status(500).json({ error: `No Docker container mapping for primary ${primary}.` });
          return;
        }

        await stopDockerContainer(containerName);
        const newPrimary = await waitForNewPrimary(db, primary);

        response.json({
          stoppedPrimary: primary,
          stoppedContainer: containerName,
          newPrimary,
          note: "With two remaining voting members, MongoDB should elect a new primary after a short delay.",
          members: await replicaStatus(db),
        });
      } catch (error) {
        next(error);
      }
    });

    app.use((error, request, response, next) => {
      console.error(error);
      response.status(500).json({ error: error.message || "Something went wrong." });
    });

    const server = app.listen(port, () => {
      console.log(`04-replicaset API listening on http://localhost:${port}`);
    });

    const shutdown = async () => {
      console.log("Shutting down 04-replicaset API...");
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
