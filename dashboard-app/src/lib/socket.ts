// WebSocket connection for MQTT broker (Mosquitto WebSocket)
const createMqttWebSocket = () => {
  return new WebSocket('ws://localhost:9001');
};

export default createMqttWebSocket;
