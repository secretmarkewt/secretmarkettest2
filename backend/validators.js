const { models, resourceModels } = require("./models");

function validateStatus(resource, status) {
  const modelName = resourceModels[resource];
  const allowed = models[modelName]?.statuses || [];
  return allowed.length === 0 || allowed.includes(status);
}

function validateCreate(resource, payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) errors.push("payload must be an object");
  if ((resource === "payments" || resource === "withdrawals") && payload?.network && !["TRC20", "TON", "BEP20"].includes(payload.network)) errors.push("network must be TRC20, TON or BEP20");
  if (resource === "tickets" && !String(payload?.topic || "").trim()) errors.push("topic is required");
  if (resource === "tickets" && !String(payload?.description || payload?.message || "").trim()) errors.push("description is required");
  if (payload?.amount !== undefined && !(Number(payload.amount) > 0)) errors.push("amount must be greater than 0");
  if (resource === "withdrawals" && !String(payload?.address || "").trim()) errors.push("address is required");
  if (resource === "withdrawals" && payload?.networkFee !== undefined && Number(payload.networkFee) < 0) errors.push("networkFee must be 0 or greater");
  if (resource === "withdrawals" && payload?.networkFee !== undefined && Number(payload.networkFee) >= Number(payload.grossAmount || payload.amount || 0)) errors.push("networkFee must be lower than amount");
  if (payload?.status && !validateStatus(resource, payload.status)) errors.push("status is not allowed for this resource");
  return { ok: errors.length === 0, errors };
}

function validatePatch(resource, payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) errors.push("payload must be an object");
  if (payload?.status && !validateStatus(resource, payload.status)) errors.push("status is not allowed for this resource");
  return { ok: errors.length === 0, errors };
}

module.exports = { validateCreate, validatePatch, validateStatus };
