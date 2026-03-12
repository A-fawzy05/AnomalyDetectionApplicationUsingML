from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
import json

async def consume_events():
    consumer = AIOKafkaConsumer("raw_events", bootstrap_servers='kafka:9092')
    producer = AIOKafkaProducer(bootstrap_servers='kafka:9092')
    await consumer.start()
    await producer.start()
    
    try:
        async for msg in consumer:
            event_data = json.loads(msg.value)
            # Process with EnsembleDetector
            score = detector.calculate_anomaly_score(event_data['seq'], event_data['feats'])
            
            if score > THRESHOLD:
                alert = {"case_id": event_data['case_id'], "score": score, "type": "ML_ANOMALY"}
                await producer.send_and_wait("anomaly_alerts", json.dumps(alert).encode('utf-8'))
    finally:
        await consumer.stop()