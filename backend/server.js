import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/database.js";

// Load environment configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Guardrails (Whitelisting only your React frontend)
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json()); // Allows your server to read incoming JSON data maps

// Test Endpoint to verify server is alive
app.get("/api/health", (req, res) => {
  res.json({ status: "success", message: "Server is online and working!" });
});

// Test the Live Database Connection Bridge
async function startServer() {
  try {
    // Authenticate verifies if credentials match the local MySQL instance
    await sequelize.authenticate();
    console.log(
      '✅ Success: Successfully connected to the "six_sigma" database.',
    );

    // Boot up the network listener port
    app.listen(PORT, () => {
      console.log(`🚀 Server is listening dynamically on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "❌ Error: Unable to link with the database instance:",
      error.message,
    );
    console.log(
      '👉 Make sure your MySQL Server/DBeaver is running and the database "six_sigma" exists.',
    );
  }
}

startServer();
