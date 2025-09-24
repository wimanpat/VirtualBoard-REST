import express from "express";
import { prisma } from "../db.js";
import { requireAuth, requireBoardAccess } from "../middleware/auth.js";


const router = express.Router();


// GET /api/notes?boardId=1
router.get("/", requireAuth, requireBoardAccess, async (req, res) => {
const notes = await prisma.note.findMany({
where: { boardId: req.boardId },
orderBy: { zIndex: "asc" },
});
res.json({ notes });
});


// GET /api/notes/changes?boardId=1&since=ISO_DATE
router.get("/changes", requireAuth, requireBoardAccess, async (req, res) => {
const since = req.query.since ? new Date(String(req.query.since)) : null;
const where = since ? { boardId: req.boardId, updatedAt: { gt: since } } : { boardId: req.boardId };
const notes = await prisma.note.findMany({ where, orderBy: { updatedAt: "asc" } });
res.json({ notes });
});


// POST /api/notes { boardId, content, ... }
router.post("/", requireAuth, requireBoardAccess, async (req, res) => {
const { content, color, x, y, width, height, zIndex } = req.body ?? {};
if (!req.boardId || content === undefined) return res.status(400).json({ error: "boardId and content are required" });


const note = await prisma.note.create({
data: {
boardId: req.boardId,
authorId: req.user.userId,
content,
color: color ?? "yellow",
x: x ?? 100,
y: y ?? 100,
width: width ?? 200,
height: height ?? 200,
zIndex: zIndex ?? 1,
},
});
res.status(201).json({ note });
});
// PATCH /api/notes/:id
router.patch("/:id", requireAuth, async (req, res) => {
const id = Number(req.params.id);
if (!id) return res.status(400).json({ error: "invalid id" });


const existing = await prisma.note.findUnique({ where: { id } });
if (!existing) return res.status(404).json({ error: "not found" });
if (!req.user?.boardIds?.includes(existing.boardId)) return res.status(403).json({ error: "forbidden" });


const note = await prisma.note.update({ where: { id }, data: req.body });
res.json({ note });
});


// DELETE /api/notes/:id
router.delete("/:id", requireAuth, async (req, res) => {
const id = Number(req.params.id);
if (!id) return res.status(400).json({ error: "invalid id" });


const existing = await prisma.note.findUnique({ where: { id } });
if (!existing) return res.status(404).json({ error: "not found" });
if (!req.user?.boardIds?.includes(existing.boardId)) return res.status(403).json({ error: "forbidden" });


await prisma.note.delete({ where: { id } });
res.status(204).send();
});


export default router;