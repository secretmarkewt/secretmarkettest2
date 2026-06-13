(function feeModule(globalScope) {
  const FEE_RATE_BUYER = 0.02;
  const FEE_RATE_SELLER = 0.04;
  const MIN_PLATFORM_FEE_TOTAL = 0.2;

  function roundMoney(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function calculateCommission(value) {
    const itemAmount = roundMoney(value);
    const totalRate = FEE_RATE_BUYER + FEE_RATE_SELLER;
    const platformFeeTotal = roundMoney(Math.max(itemAmount * totalRate, MIN_PLATFORM_FEE_TOTAL));
    const buyerFee = roundMoney(platformFeeTotal * (FEE_RATE_BUYER / totalRate));
    const sellerFee = roundMoney(platformFeeTotal - buyerFee);

    return {
      itemAmount,
      buyerFee,
      sellerFee,
      platformFeeTotal,
      buyerTotal: roundMoney(itemAmount + buyerFee),
      sellerNet: roundMoney(itemAmount - sellerFee),
      feeRateBuyer: FEE_RATE_BUYER,
      feeRateSeller: FEE_RATE_SELLER,
    };
  }

  const api = {
    calculateCommission,
    roundMoney,
    FEE_RATE_BUYER,
    FEE_RATE_SELLER,
    MIN_PLATFORM_FEE_TOTAL,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.SECMARKET_FEES = api;
})(typeof window !== "undefined" ? window : globalThis);
