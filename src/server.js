import express from "express";
import "express-async-errors"; // fångar async-fel automatiskt
import cors from "cors";
import dotenv from "dotenv";
import notesRoutes from "./routes/notes.routes.js";


dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());


app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/notes", notesRoutes);


// Central error handler
app.use((err, req, res, next) => {
if (err.code === "P2002") return res.status(409).json({ error: "duplicate key" });
console.error(err);
res.status(500).json({ error: "internal server error" });
});


const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`Boards API listening on port ${PORT}`));