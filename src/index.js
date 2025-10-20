const express = require("express");
const cors = require("cors");
const router = require("../functions/api/api");

const HOST = process.env.HOST || "http://127.0.0.1";
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(cors());

app.use("/", router);

app.listen(PORT, () => {
	console.log(`Server is running at ${HOST}:${PORT}`);
});
