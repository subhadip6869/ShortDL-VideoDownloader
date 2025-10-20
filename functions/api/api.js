const express = require("express");
const youtube = require("./youtube");

const router = express.Router();

router.use("/youtube", youtube);

module.exports = router;
