-- =============================================================
-- Seed: 20 sample orders for the SmarTech store
-- store_order_seq is recalculated for ALL store orders at the
-- end so the sequence always matches chronological order.
-- =============================================================

DO $$
DECLARE
  v_store_id        INTEGER;
  v_option_ids      INTEGER[];
  v_option_prices   NUMERIC[];
  v_customer_ids    INTEGER[];
  v_cust_names      TEXT[];
  v_cust_phones     TEXT[];

  v_order_id        INTEGER;
  v_customer_id     INTEGER;
  v_customer_name   TEXT;
  v_customer_phone  TEXT;
  v_order_date      TIMESTAMPTZ;
  v_status          VARCHAR(50);
  v_pay_status      VARCHAR(50);
  v_pay_method      VARCHAR(50);
  v_items_total     NUMERIC;
  v_grand_total     NUMERIC;
  v_item_count      INTEGER;
  v_opt_idx         INTEGER;
  v_opt_id          INTEGER;
  v_opt_price       NUMERIC;
  v_qty             INTEGER;
  v_addr            TEXT;

  i INTEGER;
  j INTEGER;

  -- Sample customer data (insert-or-skip by email)
  sample_emails  TEXT[]  := ARRAY[
    'ahmed.rashidi@example.com',
    'fatima.zahra@example.com',
    'mohammed.qahtani@example.com',
    'sara.otaibi@example.com',
    'khalid.harbi@example.com',
    'nora.shamri@example.com',
    'abdullah.ghamdi@example.com',
    'reem.mutairi@example.com',
    'omar.dosari@example.com',
    'hessa.nasser@example.com'
  ];
  sample_firsts  TEXT[]  := ARRAY['Ahmed','Fatima','Mohammed','Sara','Khalid','Nora','Abdullah','Reem','Omar','Hessa'];
  sample_lasts   TEXT[]  := ARRAY['Al-Rashidi','Al-Zahra','Al-Qahtani','Al-Otaibi','Al-Harbi','Al-Shamri','Al-Ghamdi','Al-Mutairi','Al-Dosari','Al-Nasser'];
  sample_phones  TEXT[]  := ARRAY['+966501000001','+966501000002','+966501000003','+966501000004','+966501000005',
                                   '+966501000006','+966501000007','+966501000008','+966501000009','+966501000010'];
  sample_cities  TEXT[]  := ARRAY['Riyadh','Jeddah','Riyadh','Dammam','Riyadh','Jeddah','Medina','Riyadh','Dammam','Jeddah'];
  sample_streets TEXT[]  := ARRAY['King Fahd Road','Palestine Street','Olaya Road','Dhahran Street','Tahlia Street',
                                   'Corniche Road','King Abdulaziz Road','Prince Sultan Road','Gulf Road','Al-Madinah Road'];

  -- Per-order configuration: (days_ago, fulfillment_status, payment_status, payment_method)
  order_days     INTEGER[] := ARRAY[180,170,160,150,140,130,120,110,100,90,80,70,60,50,42,34,27,21,15,10];
  order_statuses TEXT[]    := ARRAY['Delivered','Delivered','Delivered','Delivered','Delivered','Delivered','Delivered',
                                     'Delivered','Shipped','Shipped','Shipped','Packed','Packed','Processing',
                                     'Processing','Processing','Cancelled','Processing','Processing','Processing'];
  pay_statuses   TEXT[]    := ARRAY['Paid','Paid','Paid','Paid','Paid','Paid','Paid','Paid','Paid','Paid',
                                     'Paid','Paid','Paid','Paid','Paid','Paid','Pending','Paid','Pending','Pending'];
  pay_methods    TEXT[]    := ARRAY['card','card','cash_on_delivery','card','card','cash_on_delivery','card','card',
                                     'cash_on_delivery','card','card','cash_on_delivery','card','card','cash_on_delivery',
                                     'card','card','cash_on_delivery','card','card'];
  item_counts    INTEGER[] := ARRAY[3,2,1,3,2,1,3,2,3,2,1,2,3,1,2,3,2,1,2,3];

BEGIN
  -- ── 1. Locate SmarTech store ──────────────────────────────────
  SELECT store_id INTO v_store_id
  FROM stores
  WHERE LOWER(name) LIKE '%smartech%'
     OR LOWER(domain_name) LIKE '%smartech%'
  ORDER BY store_id DESC
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'SmarTech store not found. Verify the store name in the stores table.';
  END IF;

  RAISE NOTICE 'Found SmarTech store: store_id = %', v_store_id;

  -- ── 2. Upsert sample customers ────────────────────────────────
  FOR i IN 1..10 LOOP
    INSERT INTO customers (first_name, last_name, email, phone, password_hash, status)
    VALUES (
      sample_firsts[i],
      sample_lasts[i],
      sample_emails[i],
      sample_phones[i],
      '$2b$10$placeholderHashForSeedData000000000000000000000000000',
      'Active'
    )
    ON CONFLICT (email) DO NOTHING;
  END LOOP;

  -- Collect customer IDs for the 10 sample accounts
  SELECT ARRAY(
    SELECT customer_id FROM customers WHERE email = ANY(sample_emails) ORDER BY customer_id
  ) INTO v_customer_ids;

  SELECT ARRAY(SELECT first_name || ' ' || last_name FROM customers WHERE email = ANY(sample_emails) ORDER BY customer_id)
  INTO v_cust_names;

  SELECT ARRAY(SELECT phone FROM customers WHERE email = ANY(sample_emails) ORDER BY customer_id)
  INTO v_cust_phones;

  -- ── 3. Collect product options from the store ─────────────────
  SELECT
    ARRAY(SELECT po.option_id FROM product_options po
          JOIN products p ON p.product_id = po.product_id
          WHERE p.store_id = v_store_id
          ORDER BY po.option_id
          LIMIT 30),
    ARRAY(SELECT (p.price + COALESCE(po.additional_price, 0))
          FROM product_options po
          JOIN products p ON p.product_id = po.product_id
          WHERE p.store_id = v_store_id
          ORDER BY po.option_id
          LIMIT 30)
  INTO v_option_ids, v_option_prices;

  IF array_length(v_option_ids, 1) IS NULL THEN
    RAISE NOTICE 'No product options found for store %. Orders will have no line items.', v_store_id;
  END IF;

  -- ── 4. Insert 20 orders ───────────────────────────────────────
  FOR i IN 1..20 LOOP
    -- Customer rotation
    v_customer_id    := v_customer_ids[ 1 + ((i - 1) % array_length(v_customer_ids, 1)) ];
    v_customer_name  := v_cust_names[   1 + ((i - 1) % array_length(v_cust_names, 1)) ];
    v_customer_phone := v_cust_phones[  1 + ((i - 1) % array_length(v_cust_phones, 1)) ];

    -- Order date: fixed days ago + random hour offset (0-14 h) for natural spread
    v_order_date := (NOW() - (order_days[i] || ' days')::INTERVAL)
                    + ((random() * 14)::INTEGER || ' hours')::INTERVAL
                    + ((random() * 59)::INTEGER || ' minutes')::INTERVAL;

    v_status      := order_statuses[i];
    v_pay_status  := pay_statuses[i];
    v_pay_method  := pay_methods[i];
    v_item_count  := item_counts[i];
    v_items_total := 0;

    -- Shipping address JSON
    v_addr := json_build_object(
      'full_name', v_customer_name,
      'phone',     v_customer_phone,
      'city',      sample_cities[ 1 + ((i - 1) % 10) ],
      'street',    sample_streets[ 1 + ((i - 1) % 10) ],
      'country',   'SA'
    )::TEXT;

    -- Insert order with placeholder total (updated below)
    INSERT INTO orders (store_id, customer_id, total_amount, status, order_date, store_order_seq, customer_order_seq)
    VALUES (v_store_id, v_customer_id, 0, v_status, v_order_date, 0, 0)
    RETURNING order_id INTO v_order_id;

    -- Insert order items (use real options when available)
    IF array_length(v_option_ids, 1) IS NOT NULL THEN
      FOR j IN 1..v_item_count LOOP
        v_opt_idx   := 1 + ((i + j - 2) % array_length(v_option_ids, 1));
        v_opt_id    := v_option_ids[v_opt_idx];
        v_opt_price := v_option_prices[v_opt_idx];
        v_qty       := 1 + ((i + j) % 3);   -- 1, 2, or 3 units

        INSERT INTO order_items (order_id, option_id, quantity, price)
        VALUES (v_order_id, v_opt_id, v_qty, v_opt_price);

        v_items_total := v_items_total + (v_opt_price * v_qty);
      END LOOP;
    ELSE
      -- Fallback: no options – give the order a synthetic value
      v_items_total := 100 + (i * 25);
    END IF;

    -- Grand total = items × 1.15 VAT, rounded to 2 dp
    v_grand_total := ROUND(v_items_total * 1.15, 2);

    UPDATE orders SET total_amount = v_grand_total WHERE order_id = v_order_id;

    -- Payment record
    INSERT INTO payments (order_id, method, amount, payment_status, created_at)
    VALUES (v_order_id, v_pay_method, v_grand_total, v_pay_status,
            v_order_date + INTERVAL '2 minutes');

    -- Shipment record
    INSERT INTO shipments (order_id, shipping_name, shipping_address, shipping_phone)
    VALUES (v_order_id, v_customer_name, v_addr, v_customer_phone);

  END LOOP;

  -- ── 5. Recalculate store_order_seq for ALL orders in this store ─
  -- Oldest order_date → seq 1, newest → highest number.
  UPDATE orders o
  SET store_order_seq = ranked.new_seq
  FROM (
    SELECT
      order_id,
      ROW_NUMBER() OVER (ORDER BY order_date ASC, order_id ASC) AS new_seq
    FROM orders
    WHERE store_id = v_store_id
  ) ranked
  WHERE o.order_id = ranked.order_id
    AND o.store_id = v_store_id;

  RAISE NOTICE 'Done. 20 orders inserted for store_id=%. store_order_seq recalculated for all orders in the store.', v_store_id;
END;
$$;
