const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_EVIDENCE_DIR = path.join(process.cwd(), "data", "evidence");
const ALLOWED_TARGETS = new Set(["ticket", "dispute", "order"]);

function evidenceDir() {
  return process.env.SECMARKET_EVIDENCE_DIR || DEFAULT_EVIDENCE_DIR;
}

function safeFileName(value) {
  const base = path.basename(String(value || "evidence.bin"));
  return base.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "evidence.bin";
}

function decodeBase64(value) {
  const raw = String(value || "");
  const [, dataUrlPayload] = raw.match(/^data:[^;]+;base64,(.+)$/) || [];
  return Buffer.from(dataUrlPayload || raw, "base64");
}

function targetCollection(targetType) {
  if (targetType === "ticket") return "tickets";
  if (targetType === "dispute") return "disputes";
  return "orders";
}

function orderForTarget(store, targetType, target) {
  if (!target) return null;
  if (targetType === "order") return target;
  if (target.orderId) return store.find("orders", target.orderId);
  return null;
}

function ownsTarget(store, auth, targetType, targetId) {
  if (!auth?.user) return false;
  if (auth.user.role === "admin") return true;
  if (!ALLOWED_TARGETS.has(targetType)) return false;

  const target = store.find(targetCollection(targetType), targetId);
  if (!target) return false;
  const order = orderForTarget(store, targetType, target);
  if (targetType === "ticket" && target.userId === auth.user.id) return true;
  if (targetType === "dispute" && (target.buyerId === auth.user.id || target.sellerId === auth.user.id)) return true;
  return order?.buyerId === auth.user.id || order?.sellerId === auth.user.id;
}

function validateEvidencePayload(payload = {}) {
  const targetType = String(payload.targetType || "").trim().toLowerCase();
  const targetId = String(payload.targetId || "").trim();
  const fileName = safeFileName(payload.fileName);
  const contentBase64 = String(payload.contentBase64 || "");
  const maxBytes = Number(process.env.SECMARKET_EVIDENCE_MAX_BYTES || 5 * 1024 * 1024);
  const errors = [];
  if (!ALLOWED_TARGETS.has(targetType)) errors.push("target_type_invalid");
  if (!targetId) errors.push("target_id_required");
  if (!contentBase64) errors.push("content_required");
  const buffer = contentBase64 ? decodeBase64(contentBase64) : Buffer.alloc(0);
  if (buffer.length <= 0) errors.push("content_empty");
  if (buffer.length > maxBytes) errors.push("file_too_large");
  return { ok: errors.length === 0, errors, targetType, targetId, fileName, buffer, maxBytes };
}

function createEvidence(store, payload = {}, auth) {
  const validation = validateEvidencePayload(payload);
  if (!validation.ok) return { error: "invalid_evidence", errors: validation.errors };
  if (!ownsTarget(store, auth, validation.targetType, validation.targetId)) return { error: "target_not_found" };

  const id = `ev-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const extension = path.extname(validation.fileName).slice(0, 16);
  const diskName = `${id}${extension}`;
  const directory = evidenceDir();
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, diskName);
  fs.writeFileSync(filePath, validation.buffer);
  const sha256 = crypto.createHash("sha256").update(validation.buffer).digest("hex");

  const item = store.create("evidence", {
    id,
    targetType: validation.targetType,
    targetId: validation.targetId,
    userId: auth.user.id,
    fileName: validation.fileName,
    mimeType: String(payload.mimeType || "application/octet-stream").slice(0, 120),
    size: validation.buffer.length,
    sha256,
    storage: "local",
    storageKey: diskName,
    status: "stored",
    _actorId: auth.user.id,
  });

  return { evidence: item };
}

module.exports = {
  DEFAULT_EVIDENCE_DIR,
  createEvidence,
  ownsTarget,
  validateEvidencePayload,
};
