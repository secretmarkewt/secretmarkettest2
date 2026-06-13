const { calculateCommission } = require("./fees");

function assertMoney(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

const hundred = calculateCommission(100);
assertMoney(hundred.itemAmount, 100, "100 item amount");
assertMoney(hundred.buyerFee, 2, "100 buyer fee");
assertMoney(hundred.sellerFee, 4, "100 seller fee");
assertMoney(hundred.buyerTotal, 102, "100 buyer total");
assertMoney(hundred.sellerNet, 96, "100 seller net");
assertMoney(hundred.platformFeeTotal, 6, "100 platform total");

const small = calculateCommission(1);
assertMoney(small.platformFeeTotal, 0.2, "small minimum platform fee");
assertMoney(small.buyerFee, 0.07, "small buyer fee split");
assertMoney(small.sellerFee, 0.13, "small seller fee split");
assertMoney(small.buyerTotal, 1.07, "small buyer total");
assertMoney(small.sellerNet, 0.87, "small seller net");

console.log("fee model OK");
