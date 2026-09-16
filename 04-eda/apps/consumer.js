const { Kafka, logLevel } = require("kafkajs");

const workerName = process.env.HOSTNAME || "consumer";
const topic = process.env.TOPIC || "push-notifications";
const groupId = process.env.GROUP_ID || "notification-workers";
const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

const kafka = new Kafka({
  clientId: workerName,
  brokers,
  logLevel: logLevel.NOTHING,
});

const consumer = kafka.consumer({ groupId });

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log(`${workerName} listening to topic "${topic}" as group "${groupId}"`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      console.log(`${workerName} mock sent push notification to ${event.userId}:`, event);
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
