function parseKey(item = {}) {
  if (item.productId) {
    return { productId: Number(item.productId), variantId: item.variantId != null ? Number(item.variantId) : null };
  }
  const key = String(item.key || '');
  const [p, v] = key.includes('_') ? key.split('_') : [key, null];
  return { productId: Number(p), variantId: v != null ? Number(v) : null };
}

function computeTotals(items = []) {
  return items.reduce(
    (acc, it) => {
      acc.items += Number(it.quantity || 0);
      acc.grand += Number(it.subtotal || (it.unitPrice || 0) * (it.quantity || 0));
      return acc;
    },
    { items: 0, grand: 0 }
  );
}

async function revalidateCartItems(items, deps) {
  const { validateProductAndVariant } = deps;
  const nextItems = [];
  const warnings = [];

  for (const current of Array.isArray(items) ? items : []) {
    const { productId, variantId } = parseKey(current);
    if (!Number.isFinite(productId) || productId <= 0) continue;

    const requestedQty = Math.max(1, Number(current.quantity || 1));
    const valid = await validateProductAndVariant(productId, variantId, requestedQty);

    if (valid?.error) {
      if (valid.error === 'OUT_OF_STOCK' && Number(valid.available || 0) > 0) {
        const adjustedQty = Number(valid.available);
        const adjusted = {
          ...current,
          quantity: adjustedQty,
          unitPrice: Number(current.unitPrice || 0),
          subtotal: Number(current.unitPrice || 0) * adjustedQty,
        };
        nextItems.push(adjusted);
        warnings.push({
          key: current.key,
          code: 'QTY_ADJUSTED',
          message: `Quantity adjusted to ${adjustedQty} due to stock change.`,
          available: adjustedQty,
        });
      } else {
        warnings.push({
          key: current.key,
          code: 'ITEM_UNAVAILABLE',
          message: 'Item removed because it is no longer available.',
        });
      }
      continue;
    }

    const unitPrice = Number(valid.unitPrice || 0);
    const normalized = {
      ...current,
      title: current.title || valid.product.product_name || valid.product.title || 'Product',
      image: current.image || valid.product.image || (valid.product.images && valid.product.images[0]) || null,
      quantity: requestedQty,
      unitPrice,
      subtotal: unitPrice * requestedQty,
    };

    if (Number(current.unitPrice || 0) !== unitPrice) {
      warnings.push({
        key: current.key,
        code: 'PRICE_CHANGED',
        message: 'Price changed and cart totals were updated.',
      });
    }
    nextItems.push(normalized);
  }

  return {
    items: nextItems,
    warnings,
    totals: computeTotals(nextItems),
    changed: warnings.length > 0,
  };
}

async function mergeGuestCartItems(existingItems, guestItems, deps) {
  const { validateProductAndVariant, getAvailableStock } = deps;
  const items = Array.isArray(existingItems) ? [...existingItems] : [];
  const warnings = [];

  for (const g of Array.isArray(guestItems) ? guestItems : []) {
    const productId = g.productId;
    const variantId = g.variantId ?? null;
    const qty = Math.max(1, parseInt(g.quantity, 10) || 1);
    const key = variantId ? `${productId}_${variantId}` : String(productId);
    const valid = await validateProductAndVariant(productId, variantId, qty);
    if (valid?.error) continue;
    const unitPrice = Number(valid.unitPrice || 0);
    const existing = items.find((i) => i.key === key);
    const stock = await getAvailableStock(productId, variantId);

    if (existing) {
      const newQty = Number(existing.quantity || 0) + qty;
      existing.quantity = Math.min(newQty, stock);
      existing.unitPrice = unitPrice;
      existing.subtotal = unitPrice * existing.quantity;
      if (newQty > stock) {
        warnings.push({ key, code: 'MERGE_QTY_ADJUSTED', available: stock, message: `Merged quantity adjusted to ${stock} due to stock limits.` });
      }
    } else {
      const resolvedQty = Math.min(qty, stock);
      const added = {
        key,
        productId: parseInt(productId, 10),
        title: g.title || valid.product.product_name,
        image: g.image || valid.product.image || (valid.product.images && valid.product.images[0]) || null,
        variantId: variantId ? parseInt(variantId, 10) : null,
        options: g.options || null,
        unitPrice,
        quantity: resolvedQty,
        subtotal: unitPrice * resolvedQty,
      };
      items.push(added);
      if (qty > stock) {
        warnings.push({ key, code: 'MERGE_QTY_ADJUSTED', available: stock, message: `Merged quantity adjusted to ${stock} due to stock limits.` });
      }
    }
  }

  return { items, warnings, totals: computeTotals(items) };
}

module.exports = {
  computeTotals,
  mergeGuestCartItems,
  parseKey,
  revalidateCartItems,
};

