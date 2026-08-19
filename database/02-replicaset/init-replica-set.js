const config = {
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-primary:27017", priority: 2 },
    { _id: 1, host: "mongodb-secondary-1:27017", priority: 1 },
    { _id: 2, host: "mongodb-secondary-2:27017", priority: 1 },
  ],
};

try {
  rs.status();
  print("Replica set already initialized.");
} catch (error) {
  print("Initializing replica set rs0...");
  rs.initiate(config);
}

for (let attempt = 1; attempt <= 30; attempt += 1) {
  const hello = db.adminCommand({ hello: 1 });

  if (hello.isWritablePrimary) {
    print(`Replica set is ready. Primary is ${hello.me}.`);
    quit(0);
  }

  print(`Waiting for primary election (${attempt}/30)...`);
  sleep(1000);
}

throw new Error("Replica set did not elect a primary in time.");
