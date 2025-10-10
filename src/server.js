import express from "express";
import dotenv from "dotenv";
import cors from "cors";


dotenv.config();

const app = express();
const RAW = (process.env.ALLOWED_ORIGINS || "").trim();
const ORIGINS = RAW
  ? RAW.split(",").map(s => s.trim().replace(/\/$/, "")).filter(Boolean)
  : ["https://virtualboard-frontend.onrender.com","http://localhost:5173"];

// CORS – tillåt frontend + Authorization-header
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                
    cb(null, ORIGINS.includes(origin));
  },
  methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

// Preflight
app.options("*", cors({
  origin: ORIGINS,
  methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

app.use(express.json());

// Health
app.get("/health", (_req,res)=>res.json({ok:true}));


app.use((req,res)=>res.status(404).json({error:"not found"}));

app.use((err,_req,res,_next)=>{
  console.error("REST API error:", err);
  res.status(500).json({error:"internal server error"});
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log("REST API listening on", PORT);
  console.log("Allowed origins:", ORIGINS.join(", "));
});
