// API Configuration exports with correct Docker ports

export { default as apiAuth } from './axiosAuth';       // Port 8000 - Django Auth Service
export { default as apiDevices } from './axiosDevices'; // Port 8080 - Spring Boot Device Service  
export { default as apiGalleries } from './axiosGallery'; // Port 8081 - Spring Boot Gallery Service
export { default as apiPersons } from './axiosPersons'; // Port 8082 - Spring Boot Person Service
export { default as createMqttWebSocket } from './socket'; // Port 9001 - MQTT WebSocket

// Service URLs for reference:
export const SERVICE_URLS = {
  AUTH: 'http://localhost:8000',
  DEVICES: 'http://localhost:8080', 
  GALLERY: 'http://localhost:8081',
  PERSONS: 'http://localhost:8082',
  MQTT_WS: 'ws://localhost:9001',
  MQTT_TCP: 'tcp://localhost:1883',
  INFLUXDB: 'http://localhost:8086',
  POSTGRES: 'localhost:5432',
  REDIS: 'localhost:6379'
} as const; 