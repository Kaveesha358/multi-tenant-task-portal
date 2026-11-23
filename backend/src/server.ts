import { config } from "./config";
import app from "./app";

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});