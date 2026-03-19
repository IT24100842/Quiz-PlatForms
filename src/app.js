const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/health", function health(req, res) {
  res.json({ success: true, message: "Node OTP auth server is running." });
});

app.use("/api/auth", authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
