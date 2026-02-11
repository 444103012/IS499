-- 1. Customers Table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Store Owners Table
CREATE TABLE store_owners (
    store_owner_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Admins Table (Platform Admins)
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL, 
    password_hash TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Stores Table
CREATE TABLE stores (
    store_id SERIAL PRIMARY KEY,
    store_owner_id INTEGER REFERENCES store_owners(store_owner_id),
    name VARCHAR(150) NOT NULL,
    domain_name VARCHAR(150),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Products Table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(store_id),
    product_name VARCHAR(200) NOT NULL,
    title VARCHAR(255), 
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active'
);

-- 6. Product Options Table (Variants like Size/Color)
CREATE TABLE product_options (
    option_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    option_name VARCHAR(100), 
    option_value VARCHAR(100), 
    stock_qty INTEGER DEFAULT 0,
    additional_price DECIMAL(10, 2) DEFAULT 0.00
);

-- 7. Carts Table
CREATE TABLE carts (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    status VARCHAR(50) DEFAULT 'Active',
    total_price DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Cart Items Table
CREATE TABLE cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(cart_id),
    option_id INTEGER REFERENCES product_options(option_id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- 9. Orders Table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    store_id INTEGER REFERENCES stores(store_id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Pending',
    total_amount DECIMAL(10, 2) NOT NULL
);

-- 10. Order Items Table
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    option_id INTEGER REFERENCES product_options(option_id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- 11. Shipments Table
CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id), 
    tracking_number VARCHAR(100),
    shipment_status VARCHAR(50),
    shipping_name VARCHAR(150),
    shipping_address TEXT,
    shipping_phone VARCHAR(20),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- 12. Payments Table
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    method VARCHAR(50), 
    amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'Pending',
    provider_ref VARCHAR(100), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Reviews Table
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

-- 14. Subscriptions Table
CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(store_id),
    admin_id INTEGER REFERENCES admins(admin_id),
    plan_type VARCHAR(50), 
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Active'
);

-- 15. Store Admins (Staff)
CREATE TABLE store_admins (
    id SERIAL PRIMARY KEY, 
    admin_id INTEGER REFERENCES admins(admin_id),
    store_id INTEGER REFERENCES stores(store_id),
    order_id INTEGER REFERENCES orders(order_id),
    activity_note TEXT,
    activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);