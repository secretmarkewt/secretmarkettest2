const SECMARKET_VALIDATION_RULES = {
  email: "должен быть похож на user@example.com",
  amount: "число больше 0, максимум 2 знака после точки",
  network: "одно из значений: TRC20, TON, BEP20",
  txHash: "минимум 8 символов, без пробелов",
  status: "должен входить в список статусов модели",
  required: "поле не должно быть пустым",
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidAmount(value) {
  return /^\d+(\.\d{1,2})?$/.test(String(value).trim()) && Number(value) > 0;
}

function isValidNetwork(value) {
  return ["TRC20", "TON", "BEP20"].includes(String(value).trim());
}

function isValidTxHash(value) {
  return /^[A-Za-z0-9_:-]{8,}$/.test(String(value).trim());
}

function isRequired(value) {
  return String(value ?? "").trim().length > 0;
}

function normalizePromoCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function promoCodeByCode(value) {
  const code = normalizePromoCode(value);
  if (!code) return null;
  return window.SECMARKET_DATA?.promoCodes?.find((promo) => promo.code === code && promo.status === "active") || null;
}

function validatePromoCode(value, role = "") {
  const code = normalizePromoCode(value);
  if (!code) return { ok: true, code: "", promo: null };
  const promo = promoCodeByCode(code);
  if (!promo) return { ok: false, code, error: "promo_not_found" };
  if (promo.role !== "any" && role && promo.role !== role) return { ok: false, code, promo, error: "promo_role_mismatch" };
  return { ok: true, code, promo };
}

function validateStatus(modelName, status) {
  const model = window.SECMARKET_MODELS?.[modelName];
  if (!model?.statuses) return true;
  return model.statuses.includes(status);
}

function validatePaymentDraft(payment) {
  const checks = [
    ["amount", isValidAmount(payment.amount)],
    ["network", isValidNetwork(payment.network)],
    ["txHash", isValidTxHash(payment.txHash || payment.tx)],
  ];
  return {
    ok: checks.every(([, ok]) => ok),
    errors: checks.filter(([, ok]) => !ok).map(([field]) => field),
  };
}

window.SECMARKET_VALIDATION_RULES = SECMARKET_VALIDATION_RULES;
window.SECMARKET_VALIDATORS = {
  isRequired,
  isValidAmount,
  isValidEmail,
  isValidNetwork,
  isValidTxHash,
  normalizePromoCode,
  promoCodeByCode,
  validatePromoCode,
  validatePaymentDraft,
  validateStatus,
};
