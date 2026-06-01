const replicaSetName = process.env.REPLICA_SET_NAME;
const shardHost = process.env.SHARD_HOST;

const config = {
  _id: replicaSetName,
  members: [{ _id: 0, host: shardHost }],
};

try {
  rs.status();
  print(`${replicaSetName} already initialized.`);
} catch (error) {
  print(`Initializing ${replicaSetName}...`);
  rs.initiate(config);
}

for (let attempt = 1; attempt <= 30; attempt += 1) {
  const hello = db.adminCommand({ hello: 1 });

  if (hello.isWritablePrimary) {
    print(`${replicaSetName} is ready.`);
    quit(0);
  }

  print(`Waiting for ${replicaSetName} election (${attempt}/30)...`);
  sleep(1000);
}

throw new Error(`${replicaSetName} did not become writable in time.`);
