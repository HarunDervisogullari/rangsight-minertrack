import axios from "axios";

const apiGalleries = axios.create({
  baseURL: "http://localhost:8081/api",
});

export default apiGalleries;
