const config = {
  _id: "configrs",
  configsvr: true,
  members: [{ _id: 0, host: "config-server:27019" }],
};

try {
  rs.status();
  print("Config server already initialized.");
} catch (error) {
  print("Initializing config server replica set...");
  rs.initiate(config);
}

for (let attempt = 1; attempt <= 30; attempt += 1) {
  const hello = db.adminCommand({ hello: 1 });

  if (hello.isWritablePrimary) {
    print("Config server is ready.");
    quit(0);
  }

  print(`Waiting for config server election (${attempt}/30)...`);
  sleep(1000);
}

throw new Error("Config server did not become writable in time.");
