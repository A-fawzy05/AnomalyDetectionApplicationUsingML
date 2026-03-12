const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'gateway-node', brokers: ['kafka:9092'] });
const producer = kafka.producer();

const sendEventToPipeline = async (topic, message) => {
  await producer.connect();
  await producer.send({
    topic: topic, // e.g., 'raw_events'
    messages: [{ value: JSON.stringify(message) }],
  });
};

module.exports = { sendEventToPipeline };