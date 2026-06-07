const express = require("express");
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

async function publish(topic, event) {
  await producer.send({
    topic,
    messages: [{ key: event.id, value: JSON.stringify(event) }],
  });
}

app.get("/", (req, res) => {
  res.json({
    lesson: "08-eda",
    routes: {
      createOrder: "GET /order/:id",
      reportIncident: "GET /incident/:id",
    },
  });
});

app.get("/order/:id", async (req, res, next) => {
  try {
    const event = {
      id: req.params.id,
      type: "order.created",
      createdAt: new Date().toISOString(),
    };

    await publish("orders", event);

    res.status(202).json({
      status: "published",
      topic: "orders",
      event,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/incident/:id", async (req, res, next) => {
  try {
    const event = {
      id: req.params.id,
      type: "incident.reported",
      createdAt: new Date().toISOString(),
    };

    await publish("incidents", event);

    res.status(202).json({
      status: "published",
      topic: "incidents",
      event,
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
    console.log(`EDA ingress running at http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
