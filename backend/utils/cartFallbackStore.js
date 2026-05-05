const fallbackCarts = new Map();

function cloneItems(items) {
  return JSON.parse(JSON.stringify(Array.isArray(items) ? items : []));
}

function getFallbackCart(customerId) {
  return cloneItems(fallbackCarts.get(String(customerId)) || []);
}

function setFallbackCart(customerId, items) {
  fallbackCarts.set(String(customerId), cloneItems(items));
}

module.exports = {
  getFallbackCart,
  setFallbackCart,
};

