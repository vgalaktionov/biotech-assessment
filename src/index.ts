import api from "./api";
import { migrate } from "./db";

const port = process.env.PORT || 5000;

migrate();

api.listen(port);
console.debug(`Server listening on port ${port}`);
