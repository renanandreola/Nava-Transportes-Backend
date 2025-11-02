const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const allowedOrigins = ["http://localhost:3001", process.env.FRONTEND_URL];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// const database_init = require("./src/database/mongodb");

// database_init();

app.use("/nava", require("./src/server"));

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Listen on port: " + port);
});
