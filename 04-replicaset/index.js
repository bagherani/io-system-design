const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/replicaSetDemo?replicaSet=rs0";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Try changing these values, then run `npm run 04-replicaset` again.
const writeConcern = { w: "majority", j: true };
// const writeConcern = { w: 1 };
// const writeConcern = { w: 2 };

const readConcern = { level: "local" };
// const readConcern = { level: "majority" };
// const readConcern = { level: "linearizable" }; // Use only with readPreference = "primary".

const readPreference = "secondary";
// const readPreference = "primary";
// const readPreference = "secondaryPreferred";
// const readPreference = "nearest";

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
  if (["delete", "find", "insert"].includes(event.commandName)) {
    console.log(`${event.commandName} command sent to ${event.address}`);
  }
}

async function main() {
  const client = new MongoClient(uri, { monitorCommands: true });
  client.on("commandStarted", logOperationTarget);

  try {
    await connectWithRetry(client);

    const db = client.db("replicaSetDemo");
    const status = await db.admin().command({ replSetGetStatus: 1 });
    console.log(
      "Replica set members:",
      status.members.map((member) => ({
        name: member.name,
        state: member.stateStr,
      })),
    );

    const writes = db.collection("events", { writeConcern });
    const secondaryReads = db.collection("events", {
      readConcern,
      readPreference,
    });

    await writes.deleteMany({});

    // Writes always go to the primary. The write concern controls how much
    // acknowledgement we wait for before MongoDB considers the write successful.
    const insertResult = await writes.insertOne({
      type: "practice",
      message: "Hello from a MongoDB replica set",
      createdAt: new Date(),
    });
    console.log("Inserted event with write concern:", {
      insertedId: insertResult.insertedId,
      writeConcern,
    });

    // Reads can be routed to secondaries. The read concern controls what version
    // of data is acceptable for this read.
    const eventFromSecondary = await secondaryReads.findOne(
      { _id: insertResult.insertedId },
      { projection: { _id: 0, message: 1, createdAt: 1 } },
    );
    console.log("Read event with read concern and preference:", {
      readConcern,
      readPreference,
      event: eventFromSecondary,
    });

    const eventCount = await secondaryReads.countDocuments({});
    console.log(`Secondary read counted ${eventCount} event(s).`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
