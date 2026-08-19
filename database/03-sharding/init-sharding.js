const admin = db.getSiblingDB("admin");
const appDb = db.getSiblingDB("shardingDemo");
const configDb = db.getSiblingDB("config");
const namespace = "shardingDemo.users";

function runSetupStep(label, command) {
  const result = admin.runCommand(command);

  if (result.ok || result.codeName === "AlreadyInitialized") {
    print(label);
    return result;
  }

  throw new Error(`${label} failed: ${tojson(result)}`);
}

function tryShellStep(label, action) {
  try {
    action();
    print(label);
  } catch (error) {
    print(`${label}: ${error.message}`);
  }
}

function shardExists(name) {
  const result = admin.runCommand({ listShards: 1 });
  return result.shards.some((shard) => shard._id === name);
}

if (!shardExists("countryA")) {
  runSetupStep("Added shard countryA.", {
    addShard: "countryARepl/shard-country-a:27018",
    name: "countryA",
  });
} else {
  print("Shard countryA already exists.");
}

if (!shardExists("countryB")) {
  runSetupStep("Added shard countryB.", {
    addShard: "countryBRepl/shard-country-b:27018",
    name: "countryB",
  });
} else {
  print("Shard countryB already exists.");
}

runSetupStep("Enabled sharding on shardingDemo.", {
  enableSharding: "shardingDemo",
});

appDb.users.createIndex({ country: 1 });

const collectionIsSharded = configDb.collections.findOne({
  _id: namespace,
  dropped: false,
});

if (!collectionIsSharded) {
  runSetupStep("Sharded shardingDemo.users by country.", {
    shardCollection: namespace,
    key: { country: 1 },
  });
} else {
  print("shardingDemo.users is already sharded.");
}

tryShellStep("Split users collection at country M.", () => {
  sh.splitAt(namespace, { country: "M" });
});

tryShellStep("Moved A-L countries to countryA.", () => {
  sh.moveChunk(namespace, { country: "A" }, "countryA");
});

tryShellStep("Moved M-Z countries to countryB.", () => {
  sh.moveChunk(namespace, { country: "N" }, "countryB");
});

sh.status();
