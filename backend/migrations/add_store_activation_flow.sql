
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid';

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS store_activation_attempts (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL,
  payment_method VARCHAR(100),
  amount_sar DECIMAL(10, 2),
  transaction_ref VARCHAR(255),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_stores_store_id_payment_status
  ON stores (store_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_store_id_paid_date
  ON subscriptions (store_id, paid_date);

CREATE INDEX IF NOT EXISTS idx_activation_attempts_store_attempted_at
  ON store_activation_attempts (store_id, attempted_at DESC);

COMMENT ON COLUMN stores.payment_status IS 'unpaid | paid | payment_failed';
COMMENT ON COLUMN subscriptions.paid_date IS 'Timestamp when subscription became paid/activated first time';
COMMENT ON TABLE store_activation_attempts IS 'Tracks store go-live activation and payment attempts';
