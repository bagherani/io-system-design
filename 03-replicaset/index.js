const express = require("express");
const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/replicaSetDemo?replicaSet=rs0";
const port = Number(process.env.PORT || 3014);

const primaryUri = "mongodb://mongodb-primary:27017/replicaSetDemo";
const secondaryOneUri = "mongodb://mongodb-secondary-1:27017/replicaSetDemo";
const secondaryTwoUri = "mongodb://mongodb-secondary-2:27017/replicaSetDemo";

const writeConcerns = {
  all: { w: 3 },
  majority: { w: "majority" },
  primary: { w: 1 },
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

async function getReplicaSetStatus(db) {
  const status = await db.admin().command({ replSetGetStatus: 1 });

  return status.members.map((member) => ({
    name: member.name,
    role: member.stateStr,
    health: member.health,
  }));
}

async function readAllMembers(primaryClient, secondaryOneClient, secondaryTwoClient) {
  const primaryDb = primaryClient.db("replicaSetDemo");
  const primaryHello = await primaryDb.admin().command({ hello: 1 });
  const primaryPhotos = await primaryDb.collection("photos").find({}).sort({ createdAt: -1 }).toArray();

  const secondaryOneDb = secondaryOneClient.db("replicaSetDemo");
  const secondaryOneHello = await secondaryOneDb.admin().command({ hello: 1 });
  const secondaryOnePhotos = await secondaryOneDb
    .collection("photos")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const secondaryTwoDb = secondaryTwoClient.db("replicaSetDemo");
  const secondaryTwoHello = await secondaryTwoDb.admin().command({ hello: 1 });
  const secondaryTwoPhotos = await secondaryTwoDb
    .collection("photos")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return [
    {
      name: "mongodb-primary:27017",
      role: primaryHello.isWritablePrimary ? "PRIMARY" : "SECONDARY",
      count: primaryPhotos.length,
      photos: primaryPhotos,
    },
    {
      name: "mongodb-secondary-1:27017",
      role: secondaryOneHello.isWritablePrimary ? "PRIMARY" : "SECONDARY",
      count: secondaryOnePhotos.length,
      photos: secondaryOnePhotos,
    },
    {
      name: "mongodb-secondary-2:27017",
      role: secondaryTwoHello.isWritablePrimary ? "PRIMARY" : "SECONDARY",
      count: secondaryTwoPhotos.length,
      photos: secondaryTwoPhotos,
    },
  ];
}

async function main() {
  const client = new MongoClient(uri);
  const primaryClient = new MongoClient(primaryUri, {
    directConnection: true,
    readPreference: "secondaryPreferred",
  });
  const secondaryOneClient = new MongoClient(secondaryOneUri, {
    directConnection: true,
    readPreference: "secondaryPreferred",
  });
  const secondaryTwoClient = new MongoClient(secondaryTwoUri, {
    directConnection: true,
    readPreference: "secondaryPreferred",
  });

  try {
    await connectWithRetry(client);
    await connectWithRetry(primaryClient);
    await connectWithRetry(secondaryOneClient);
    await connectWithRetry(secondaryTwoClient);

    const db = client.db("replicaSetDemo");
    const photos = db.collection("photos");

    const app = express();
    app.use(express.json());

    app.get("/", (request, response) => {
      response.json({
        message: "03-replicaset photo metadata API",
        endpoints: [
          "GET /replica-set/status",
          "POST /photos?writeConcern=all|majority|primary",
          "GET /photos?readMode=all|majority|secondaryPreferred",
          "DELETE /photos",
        ],
      });
    });

    app.get("/replica-set/status", async (request, response, next) => {
      try {
        response.json({ members: await getReplicaSetStatus(db) });
      } catch (error) {
        next(error);
      }
    });

    app.post("/photos", async (request, response, next) => {
      try {
        const body = request.body;
        const writeConcernName = String(request.query.writeConcern || "majority");
        const writeConcern = writeConcerns[writeConcernName];

        if (!writeConcern) {
          response.status(400).json({
            error: "writeConcern must be all, majority, or primary.",
          });
          return;
        }

        const photo = {
          photoId: body.photoId,
          userId: body.userId,
          caption: body.caption,
          mediaUrl: body.mediaUrl,
          createdAt: new Date(),
          writeConcern: writeConcernName,
        };
        const writes = db.collection("photos", { writeConcern });
        const result = await writes.insertOne(photo);

        response.status(201).json({ writeConcern, photo: { _id: result.insertedId, ...photo } });
      } catch (error) {
        next(error);
      }
    });

    app.delete("/photos", async (request, response, next) => {
      try {
        const result = await photos.deleteMany({});
        response.json({ deletedCount: result.deletedCount });
      } catch (error) {
        next(error);
      }
    });

    app.get("/photos", async (request, response, next) => {
      try {
        const readMode = String(request.query.readMode || "majority");
        let readOptions;

        if (readMode === "all") {
          const members = await readAllMembers(
            primaryClient,
            secondaryOneClient,
            secondaryTwoClient,
          );

          response.json({
            readMode,
            note: "Each replica-set member was queried directly.",
            members,
          });
          return;
        } else if (readMode === "majority") {
          readOptions = {
            readConcern: { level: "majority" },
            readPreference: "primary",
          };
        } else if (readMode === "secondaryPreferred") {
          readOptions = {
            readPreference: "secondaryPreferred",
          };
        } else {
          response.status(400).json({
            error: "readMode must be all, majority, or secondaryPreferred.",
          });
          return;
        }

        const reads = db.collection("photos", readOptions);
        const foundPhotos = await reads.find({}).sort({ createdAt: -1 }).limit(20).toArray();

        response.json({
          readMode,
          readConcern: readOptions.readConcern,
          readPreference: readOptions.readPreference,
          count: foundPhotos.length,
          photos: foundPhotos,
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
      console.log(`03-replicaset API listening on http://localhost:${port}`);
    });

    const shutdown = async () => {
      console.log("Shutting down 03-replicaset API...");
      server.close(async () => {
        await client.close();
        await primaryClient.close();
        await secondaryOneClient.close();
        await secondaryTwoClient.close();
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    await client.close();
    await primaryClient.close();
    await secondaryOneClient.close();
    await secondaryTwoClient.close();
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
