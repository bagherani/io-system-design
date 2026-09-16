const express = require("express");
const { randomUUID } = require("node:crypto");
const { Kafka, logLevel } = require("kafkajs");

const app = express();
const port = Number(process.env.PORT || 3018);
const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

const kafka = new Kafka({
  clientId: "eda-ingress",
  brokers,
  logLevel: logLevel.NOTHING,
});

const producer = kafka.producer();

app.use(express.json());

async function publishDeliveryEvents(notification) {
  const messages = [];

  for (const userId of notification.userIds) {
    const event = {
      notificationId: notification.id,
      userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt,
    };

    messages.push({ key: userId, value: JSON.stringify(event) });
  }

  await producer.send({
    topic: "push-notifications",
    messages,
  });
}

app.post("/send", async (req, res, next) => {
  try {
    const notification = {
      id: randomUUID(),
      userIds: req.body.userIds,
      type: req.body.type,
      title: req.body.title,
      body: req.body.body,
      createdAt: new Date().toISOString(),
    };

    await publishDeliveryEvents(notification);

    res.status(202).json({
      eventCount: notification.userIds.length,
      notification,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "Could not publish the event.",
    detail: error.message,
  });
});

async function main() {
  await producer.connect();

  app.listen(port, () => {
    console.log(`Notification producer running at http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
