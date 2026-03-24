import axios from "axios";

const apiPersons = axios.create({
  baseURL: "http://localhost:8082/api",
});

export default apiPersons;
