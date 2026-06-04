const express = require("express");
const { createCluster } = require("redis");

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 3017);
const redisNodes = (process.env.REDIS_CLUSTER_NODES || "redis-node-1:6379,redis-node-2:6379,redis-node-3:6379")
  .split(",")
  .map((node) => node.trim())
  .filter(Boolean);

const cluster = createCluster({
  rootNodes: redisNodes.map((node) => ({ url: `redis://${node}` })),
});

function likeKeys(id) {
  return [1, 2, 3].map((counter) => `like:${id}:${counter}`);
}

function pickCounter() {
  return Math.floor(Math.random() * 3) + 1;
}

async function getCounters(id) {
  const keys = likeKeys(id);
  const values = await Promise.all(keys.map((key) => cluster.get(key)));
  const counters = keys.map((key, index) => ({
    key,
    value: Number(values[index] || 0),
  }));

  return {
    counters,
    total: counters.reduce((sum, counter) => sum + counter.value, 0),
  };
}

app.get("/", (req, res) => {
  res.json({
    lesson: "07-caching",
    routes: {
      getLikes: "GET /like/:id",
      addLike: "POST /like/:id",
    },
  });
});

app.get("/like/:id", async (req, res, next) => {
  try {
    const likes = await getCounters(req.params.id);

    res.json({
      id: req.params.id,
      ...likes,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/like/:id", async (req, res, next) => {
  try {
    const counter = pickCounter();
    const key = `like:${req.params.id}:${counter}`;
    const value = await cluster.incr(key);
    const likes = await getCounters(req.params.id);

    res.status(201).json({
      id: req.params.id,
      incremented: {
        key,
        value,
      },
      ...likes,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "Could not read or update likes.",
    detail: error.message,
  });
});

async function main() {
  cluster.on("error", (error) => {
    console.error("Redis cluster error:", error.message);
  });

  await cluster.connect();

  app.listen(port, () => {
    console.log(`Caching likes API running at http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
