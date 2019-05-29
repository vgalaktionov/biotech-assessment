import api from "./api";

const port = process.env.PORT || 5000;

api.listen(port);

console.debug(`Server listening on port ${port}`);
