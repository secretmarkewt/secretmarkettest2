function productById(id) {
  const { products } = window.SECMARKET_DATA;
  return products.find((product) => String(product.id) === String(id)) || products[0];
}

function orderById(id) {
  const { demoOrders } = window.SECMARKET_DATA;
  return demoOrders.find((orderItem) => String(orderItem.id) === String(id)) || demoOrders[0];
}

function paymentByOrderId(id) {
  const { demoPayments } = window.SECMARKET_DATA;
  return demoPayments.find((paymentItem) => String(paymentItem.order) === String(id)) || demoPayments[0];
}

function paymentById(id) {
  const { demoPayments } = window.SECMARKET_DATA;
  return demoPayments.find((paymentItem) => paymentItem.id === id || String(paymentItem.order) === String(id)) || demoPayments[0];
}

function disputeById(id) {
  const { demoDisputes } = window.SECMARKET_DATA;
  return demoDisputes.find((dispute) => String(dispute.id) === String(id)) || demoDisputes[0];
}

function ticketById(id) {
  const { demoTickets } = window.SECMARKET_DATA;
  return demoTickets.find((ticket) => String(ticket.id).toLowerCase() === String(id).toLowerCase()) || demoTickets[0];
}

function withdrawalById(id) {
  const { demoWithdrawals } = window.SECMARKET_DATA;
  return demoWithdrawals.find((withdrawalItem) => String(withdrawalItem.id).toLowerCase() === String(id).toLowerCase()) || demoWithdrawals[0];
}
