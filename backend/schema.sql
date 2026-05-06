
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    preferred_lang VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    saved_address JSONB
);


CREATE TABLE store_owners (
    store_owner_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    setup_step INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL, 
    password_hash TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



CREATE TABLE stores (
    store_id SERIAL PRIMARY KEY,
    store_owner_id INTEGER REFERENCES store_owners(store_owner_id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    domain_name VARCHAR(150),
    logo VARCHAR(255),
    store_type VARCHAR(100),        
    description TEXT,     
    theme VARCHAR(50) DEFAULT 'Default',           
    status VARCHAR(50) DEFAULT 'Pending',
    status_before_suspension VARCHAR(50),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS payment_providers (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(store_id) ON DELETE CASCADE,
    provider_name VARCHAR(100),
    credentials JSONB
);


CREATE TABLE IF NOT EXISTS shipping_providers (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(store_id) ON DELETE CASCADE,
    carrier_name VARCHAR(100),
    credentials JSONB
);





CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(store_id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    title VARCHAR(255), 
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    images JSONB DEFAULT '[]'
);



CREATE TABLE product_options (
    option_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    option_name VARCHAR(100), 
    option_value VARCHAR(100), 
    stock_qty INTEGER DEFAULT 0,
    additional_price DECIMAL(10, 2) DEFAULT 0.00,
    images JSONB DEFAULT '[]'
);


CREATE TABLE carts (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Active',
    total_price DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(cart_id) ON DELETE CASCADE,
    option_id INTEGER REFERENCES product_options(option_id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    store_id INTEGER REFERENCES stores(store_id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    store_order_seq INTEGER,
    customer_order_seq INTEGER
);


CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    option_id INTEGER REFERENCES product_options(option_id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);


CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    shipping_provider_id INTEGER REFERENCES shipping_providers(id) ON DELETE SET NULL,
    tracking_number VARCHAR(100),
    shipment_status VARCHAR(50),
    shipping_name VARCHAR(150),
    shipping_address TEXT,
    shipping_phone VARCHAR(20),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);


CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    payment_provider_id INTEGER REFERENCES payment_providers(id) ON DELETE SET NULL,
    method VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'Pending',
    provider_ref VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    store_id INTEGER REFERENCES stores(store_id),
    product_id INTEGER REFERENCES products(product_id),
    admin_id INTEGER REFERENCES admins(admin_id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_order_requests (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    action_type VARCHAR(20) NOT NULL,
    payload JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(store_id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES admins(admin_id),
    plan_type VARCHAR(50), 
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Active',
    paid_date TIMESTAMP WITH TIME ZONE
);

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


CREATE TABLE store_admins (
    id SERIAL PRIMARY KEY, 
    admin_id INTEGER REFERENCES admins(admin_id),
    store_id INTEGER REFERENCES stores(store_id),
    order_id INTEGER REFERENCES orders(order_id),
    activity_note TEXT,
    activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);







ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';






ALTER TABLE product_options ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS saved_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_order_seq INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_order_seq INTEGER;

CREATE INDEX IF NOT EXISTS idx_stores_store_id_payment_status
  ON stores (store_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_store_id_paid_date
  ON subscriptions (store_id, paid_date);