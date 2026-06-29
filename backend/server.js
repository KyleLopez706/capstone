import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import sequelize from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import Admin from "./models/Admin.js";

// Load environment configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Guardrails (Whitelisting only your React frontend)
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json()); // Allows your server to read incoming JSON data maps

// Mount route modules
app.use("/api/auth", authRoutes);

// Test Endpoint to verify server is alive
app.get("/api/health", (req, res) => {
  res.json({ status: "success", message: "Server is online and working!" });
});

// Database Seeder
async function seedAdmin() {
  try {
    const adminCount = await Admin.count();
    if (adminCount === 0) {
      const defaultUser = process.env.ADMIN_DEFAULT_USER || "admin";
      const defaultPass = process.env.ADMIN_DEFAULT_PASS || "password123";
      
      const hashedPassword = await bcrypt.hash(defaultPass, 10);
      await Admin.create({
        username: defaultUser,
        password: hashedPassword
      });
      console.log(`🌱 Database Seeded: Default admin "${defaultUser}" created.`);
    }
  } catch (error) {
    console.error("❌ Seeding Error: Failed to seed default admin:", error.message);
  }
}

// Test the Live Database Connection Bridge
async function startServer() {
  try {
    // Authenticate verifies if credentials match the local MySQL instance
    await sequelize.authenticate();
    console.log(
      '✅ Success: Successfully connected to the "six_sigma" database.',
    );

    // Sync all defined models to the database (creates tables if they don't exist)
    await sequelize.sync();
    console.log("✅ All models synchronized successfully.");

    // Run professional database seeders
    await seedAdmin();

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
