-- Reassign store_order_seq for all orders so that the sequence within each
-- store increases chronologically (oldest order gets the lowest number).
-- Tiebreaker: order_id ASC (insertion order) when two orders share the same timestamp.

WITH ranked AS (
  SELECT
    o.order_id,
    ROW_NUMBER() OVER (
      PARTITION BY o.store_id
      ORDER BY o.order_date ASC, o.order_id ASC
    ) AS new_seq
  FROM orders o
)
UPDATE orders
SET store_order_seq = ranked.new_seq
FROM ranked
WHERE orders.order_id = ranked.order_id;
