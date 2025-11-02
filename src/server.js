const express = require("express");
const router = express.Router();

require("dotenv").config();

const { swaggerUi, swaggerSpec } = require("./config/swaggerConfig");

router.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

router.get("/health", async (req, res) => {
  console.log("Nava test routing in running!");

  return res.json({
    status: 200,
    message: "Nava test routing in running!",
  });
});

module.exports = router;
