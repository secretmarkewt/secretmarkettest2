function productById(id) {
  const { products } = window.SECMARKET_DATA;
  const liveProduct = liveItems("products").find((product) => String(product.id) === String(id));
  if (liveProduct) return normalizeCatalogProduct(liveProduct);
  return products.find((product) => String(product.id) === String(id)) || products[0];
}

function orderById(id) {
  const { demoOrders } = window.SECMARKET_DATA;
  const liveOrder = liveItems("orders").find((orderItem) => String(orderItem.id) === String(id));
  if (liveOrder) {
    return {
      id: liveOrder.id,
      product: `Product #${liveOrder.productId}`,
      seller: liveOrder.sellerId,
      buyer: liveOrder.buyerId,
      amount: Number(liveOrder.amount || 0),
      itemAmount: Number(liveOrder.itemAmount ?? liveOrder.amount ?? 0),
      buyerFee: Number(liveOrder.buyerFee ?? checkoutCommission(liveOrder).buyerFee),
      sellerFee: Number(liveOrder.sellerFee ?? checkoutCommission(liveOrder).sellerFee),
      platformFeeTotal: Number(liveOrder.platformFeeTotal ?? checkoutCommission(liveOrder).platformFeeTotal),
      buyerTotal: Number(liveOrder.buyerTotal ?? checkoutCommission(liveOrder).buyerTotal),
      sellerNet: Number(liveOrder.sellerNet ?? checkoutCommission(liveOrder).sellerNet),
      payment: statusLabel(liveOrder.paymentStatus),
      order: statusLabel(liveOrder.status),
      delivery: "Автовыдача",
    };
  }
  return demoOrders.find((orderItem) => String(orderItem.id) === String(id)) || demoOrders[0];
}

function paymentByOrderId(id) {
  const { demoPayments } = window.SECMARKET_DATA;
  const livePayment = liveItems("payments").find((paymentItem) => String(paymentItem.orderId) === String(id));
  if (livePayment) return normalizeLivePayment(livePayment);
  return demoPayments.find((paymentItem) => String(paymentItem.order) === String(id)) || demoPayments[0];
}

function normalizeLiveOrder(orderItem) {
  const product = productById(orderItem.productId);
  return {
    id: orderItem.id,
    product: product?.title || `Product #${orderItem.productId}`,
    seller: orderItem.sellerId,
    buyer: orderItem.buyerId,
    amount: Number(orderItem.amount || 0),
    itemAmount: Number(orderItem.itemAmount ?? orderItem.amount ?? 0),
    buyerFee: Number(orderItem.buyerFee ?? checkoutCommission(orderItem).buyerFee),
    sellerFee: Number(orderItem.sellerFee ?? checkoutCommission(orderItem).sellerFee),
    platformFeeTotal: Number(orderItem.platformFeeTotal ?? checkoutCommission(orderItem).platformFeeTotal),
    buyerTotal: Number(orderItem.buyerTotal ?? checkoutCommission(orderItem).buyerTotal),
    sellerNet: Number(orderItem.sellerNet ?? checkoutCommission(orderItem).sellerNet),
    payment: statusLabel(orderItem.paymentStatus),
    order: statusLabel(orderItem.status),
    delivery: product?.type || "Автовыдача",
  };
}

function deliveryByOrderId(id) {
  return liveItems("deliveries").find((delivery) => String(delivery.orderId) === String(id)) || null;
}

function paymentById(id) {
  const { demoPayments } = window.SECMARKET_DATA;
  const livePayment = liveItems("payments").find((paymentItem) => paymentItem.id === id || String(paymentItem.orderId) === String(id));
  if (livePayment) return normalizeLivePayment(livePayment);
  return demoPayments.find((paymentItem) => paymentItem.id === id || String(paymentItem.order) === String(id)) || demoPayments[0];
}

function normalizeLivePayment(paymentItem) {
  return {
    id: paymentItem.id,
    order: paymentItem.orderId,
    amount: Number(paymentItem.amount || 0),
    coin: paymentItem.coin || "USDT",
    network: paymentItem.network || "TRC20",
    status: paymentItem.status,
    confirmations: String(paymentItem.confirmations ?? 0),
    tx: paymentItem.txHash || "",
  };
}

function disputeById(id) {
  const { demoDisputes } = window.SECMARKET_DATA;
  const liveDispute = liveItems("disputes").find((dispute) => String(dispute.id) === String(id));
  if (liveDispute) return normalizeLiveDispute(liveDispute);
  return demoDisputes.find((dispute) => String(dispute.id) === String(id)) || demoDisputes[0];
}

function normalizeLiveDispute(dispute) {
  const orderItem = orderById(dispute.orderId);
  const paymentItem = paymentByOrderId(dispute.orderId);
  return {
    id: dispute.id,
    order: dispute.orderId,
    buyer: dispute.buyerId,
    seller: dispute.sellerId,
    reason: dispute.reason || "Спор по заказу",
    status: statusLabel(dispute.status),
    refund: dispute.refundAmount ? `${dispute.refundAmount} USDT` : "решение не принято",
    payment: paymentItem.id,
    product: orderItem.product,
  };
}

function ticketById(id) {
  const { demoTickets } = window.SECMARKET_DATA;
  const liveTicket = liveItems("tickets").find((ticket) => String(ticket.id).toLowerCase() === String(id).toLowerCase());
  if (liveTicket) return normalizeLiveTicket(liveTicket);
  return demoTickets.find((ticket) => String(ticket.id).toLowerCase() === String(id).toLowerCase()) || demoTickets[0];
}

function normalizeLiveTicket(ticket) {
  return {
    id: ticket.id,
    topic: ticket.topic || "Обращение в поддержку",
    order: ticket.orderId || ticket.order || "general",
    status: statusLabel(ticket.status),
    rawStatus: ticket.status || "open",
    contact: ticket.contact || "",
    description: ticket.description || ticket.message || "",
    userId: ticket.userId || ticket.buyerId || "guest",
    createdAt: ticket.createdAt || ticket.created_at || "",
  };
}

function withdrawalById(id) {
  const { demoWithdrawals } = window.SECMARKET_DATA;
  const liveWithdrawal = liveItems("withdrawals").find((withdrawalItem) => String(withdrawalItem.id).toLowerCase() === String(id).toLowerCase());
  if (liveWithdrawal) {
    return {
      id: liveWithdrawal.id,
      seller: liveWithdrawal.sellerId,
      amount: Number(liveWithdrawal.amount || 0),
      coin: liveWithdrawal.coin || "USDT",
      grossAmount: Number(liveWithdrawal.grossAmount || liveWithdrawal.amount || 0),
      networkFee: Number(liveWithdrawal.networkFee || 0),
      netAmount: Number(liveWithdrawal.netAmount || liveWithdrawal.amount || 0),
      network: liveWithdrawal.network || "TRC20",
      address: liveWithdrawal.address || "",
      status: liveWithdrawal.status,
      tx: liveWithdrawal.txHash || "",
      risk: liveWithdrawal.riskNote || "",
    };
  }
  return demoWithdrawals.find((withdrawalItem) => String(withdrawalItem.id).toLowerCase() === String(id).toLowerCase()) || demoWithdrawals[0];
}
