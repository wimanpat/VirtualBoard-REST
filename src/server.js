
import "express-async-errors";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);
app.options("*", cors());

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

import notesRoutes from "./routes/notes.routes.js";

app.use("/api/notes", notesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use((err, req, res, next) => {

  if (err?.code === "P2002") {
    return res.status(409).json({ error: "duplicate key" });
  }
  console.error("Server error:", err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Boards API listening on port ${PORT}`);
  if (FRONTEND_ORIGIN !== "*") {
    console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
  }
});
