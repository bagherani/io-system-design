const { Kafka, logLevel } = require("kafkajs");

const serviceName = process.env.SERVICE_NAME || "consumer";
const topic = process.env.TOPIC || "orders";
const groupId = process.env.GROUP_ID || serviceName;
const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

const kafka = new Kafka({
  clientId: serviceName,
  brokers,
  logLevel: logLevel.NOTHING,
});

const consumer = kafka.consumer({ groupId });

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log(`${serviceName} listening to topic "${topic}" as group "${groupId}"`);

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log(`${serviceName} received:`, event);

      // Kafka acknowledges work by committing the next offset after processing.
      await consumer.commitOffsets([
        {
          topic,
          partition,
          offset: (BigInt(message.offset) + 1n).toString(),
        },
      ]);
      console.log(`${serviceName} acknowledged offset ${message.offset}`);
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
