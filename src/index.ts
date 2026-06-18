import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3001;
const app = createApp();

app.listen(port, "0.0.0.0", () => {
  console.log(`Suarabumi API running at http://127.0.0.1:${port}`);
});
