import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load our hidden environment variables from the .env file
dotenv.config();

// Initialize Sequelize and link it to our six_sigma database variables
const sequelize = new Sequelize(
  process.env.DB_NAME, // 'six_sigma'
  process.env.DB_USER, // 'root'
  process.env.DB_PASSWORD, // '' or your password
  {
    host: process.env.DB_HOST, // '127.0.0.1'
    dialect: "mysql",
    logging: false, // Keeps your terminal clean from long SQL strings
    pool: {
      max: 5, // Maximum number of open connections
      min: 0,
      acquire: 30000, // Maximum time (ms) trying to connect before failing
      idle: 10000, // Time a connection can be idle before closing
    },
  },
);

export default sequelize;
