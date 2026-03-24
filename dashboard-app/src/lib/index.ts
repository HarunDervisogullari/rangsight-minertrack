import axios from "axios";

// API Configuration exports with correct Docker ports

export const apiAuth = axios.create({
  baseURL: "http://localhost:8000/api",
});

export const apiDevices = axios.create({
  baseURL: "http://localhost:8080/api",
});

export const apiGallery = axios.create({
  baseURL: "http://localhost:8081/api",
});

export const apiGalleries = apiGallery;

export const apiPersons = axios.create({
  baseURL: "http://localhost:8082/api",
});

export { default as createMqttWebSocket } from "./socket"; // Port 9001 - MQTT WebSocket

// Service URLs for reference:
export const SERVICE_URLS = {
  AUTH: "http://localhost:8000",
  DEVICES: "http://localhost:8080",
  GALLERY: "http://localhost:8081",
  PERSONS: "http://localhost:8082",
  MQTT_WS: "ws://localhost:9001",
  MQTT_TCP: "tcp://localhost:1883",
  INFLUXDB: "http://localhost:8086",
  POSTGRES: "localhost:5432",
  REDIS: "localhost:6379",
} as const;
