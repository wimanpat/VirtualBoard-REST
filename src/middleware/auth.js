import jwt from "jsonwebtoken";


const JWT_SECRET = process.env.JWT_SECRET;


export function requireAuth(req, res, next) {
const auth = req.headers["authorization"] ||"";
const [type, token] = auth.split(" ");
if (type !== "Bearer" || !token) {
return res.status(401).json({ error: "Missing or invalid Authorization header" });
}
try {
req.user = jwt.verify(token, JWT_SECRET); 
next();
} catch {
return res.status(401).json({ error: "Invalid or expired token" });
}
}


export function requireBoardAccess(req, res, next) {
const boardId = Number(req.params.boardId ?? req.query.boardId ?? req.body.boardId);
if (!boardId) return res.status(400).json({ error: "boardId is required" });
if (!req.user?.boardIds?.includes(boardId)) {
return res.status(403).json({ error: "forbidden: no access to this board" });
}
req.boardId = boardId;
next();
}