import express from 'express';
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';

import authRoutes from './routes/auth.route.js';
import { connectDB } from './lib/db.js';

dotenv.config();
const PORT = process.env.PORT;

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log("server is running " + PORT);
  connectDB();
});