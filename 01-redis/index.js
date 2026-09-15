const express = require("express");
const { createCluster } = require("redis");

const app = express();
app.use(express.json());

// Connect to 3-node Redis cluster
const cluster = createCluster({
  rootNodes: [
    { url: "redis://redis-node-1:6379" },
    { url: "redis://redis-node-2:6379" },
    { url: "redis://redis-node-3:6379" },
  ],
});

// 1. WRITE: When celebrity posts, replicate ID to all 3 keys (key:1, key:2, key:3)
app.post("/celebrity/:id/posts", async (req, res) => {
  const { id } = req.params;
  const postId = req.body.postId || "100";

  // Prepend post-id to the array on all 3 nodes
  await cluster.lPush(`celebrity:${id}:1`, postId);
  await cluster.lPush(`celebrity:${id}:2`, postId);
  await cluster.lPush(`celebrity:${id}:3`, postId);

  res.status(201).json({
    message: "Post pushed to all 3 nodes",
    celebrityId: id,
    postId,
  });
});

// 2. READ: Read from a random replica key to distribute read traffic across nodes
app.get("/celebrity/:id/posts", async (req, res) => {
  const { id } = req.params;

  // Pick random suffix between 1 and 3
  const randomSuffix = Math.floor(Math.random() * 3) + 1;
  const targetKey = `celebrity:${id}:${randomSuffix}`;

  const posts = await cluster.lRange(targetKey, 0, -1);

  res.json({
    celebrityId: id,
    readFromKey: targetKey,
    posts,
  });
});

// 3. INSPECT: Read directly from all 3 keys to verify data consistency
app.get("/celebrity/:id/posts/all", async (req, res) => {
  const { id } = req.params;

  const node1Posts = await cluster.lRange(`celebrity:${id}:1`, 0, -1);
  const node2Posts = await cluster.lRange(`celebrity:${id}:2`, 0, -1);
  const node3Posts = await cluster.lRange(`celebrity:${id}:3`, 0, -1);

  res.json({
    celebrityId: id,
    [`celebrity:${id}:1`]: node1Posts,
    [`celebrity:${id}:2`]: node2Posts,
    [`celebrity:${id}:3`]: node3Posts,
  });
});

async function main() {
  await cluster.connect();
  app.listen(3017, () => {
    console.log("01-redis API running at http://localhost:3017");
  });
}

main().catch(console.error);
