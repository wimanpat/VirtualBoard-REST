import "express-async-errors";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import notesRoutes from "./routes/notes.routes.js";

dotenv.config();
const app = express();

const RAW = process.env.FRONTEND_ORIGIN || "*";
const FRONTEND_ORIGIN = RAW.replace(/\/$/, "");

app.use(cors({
  origin(origin, cb) {
    if (!origin || FRONTEND_ORIGIN === "*") return cb(null, true);
    const norm = origin.replace(/\/$/, "");
    if (norm === FRONTEND_ORIGIN) return cb(null, true);
    return cb(new Error("CORS not allowed"), false);
  },
  methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));
app.options("*", cors());

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/notes", notesRoutes);

app.use((req, res) => res.status(404).json({ error: "not found" }));

app.use((err, req, res, next) => {
  if (err?.code === "P2002") return res.status(409).json({ error: "duplicate key" });
  console.error("Server error:", err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Boards API listening on ${PORT}`);
  if (FRONTEND_ORIGIN !== "*") console.log(`CORS: ${FRONTEND_ORIGIN}`);
});
