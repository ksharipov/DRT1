-- NexTrade AI Reporting Assistant — Database Schema
-- DuckDB dialect
-- For local DBeaver access: connect to data/database.ddb

CREATE TABLE IF NOT EXISTS vendors (
    id            VARCHAR PRIMARY KEY,
    company_name  VARCHAR NOT NULL,
    contact_email VARCHAR NOT NULL,
    status        VARCHAR NOT NULL DEFAULT 'active',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id          VARCHAR PRIMARY KEY,
    email       VARCHAR NOT NULL,
    region      VARCHAR NOT NULL,
    signup_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id          VARCHAR PRIMARY KEY,
    vendor_id   VARCHAR NOT NULL REFERENCES vendors(id),
    sku         VARCHAR NOT NULL,
    name        VARCHAR NOT NULL,
    category    VARCHAR NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id           VARCHAR PRIMARY KEY,
    customer_id  VARCHAR NOT NULL REFERENCES customers(id),
    order_date   TIMESTAMP NOT NULL,
    status       VARCHAR NOT NULL,   -- 'pending' | 'shipped' | 'delivered' | 'cancelled'
    total_amount DECIMAL(10,2) NOT NULL,
    shipped_at   TIMESTAMP,
    delivered_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id         VARCHAR PRIMARY KEY,
    order_id   VARCHAR NOT NULL REFERENCES orders(id),
    product_id VARCHAR NOT NULL REFERENCES products(id),
    quantity   INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_cancellations (
    id              VARCHAR PRIMARY KEY,
    order_id        VARCHAR NOT NULL UNIQUE REFERENCES orders(id),
    reason_category VARCHAR,
    detailed_reason TEXT,
    cancelled_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for vendor isolation and common query patterns
CREATE INDEX IF NOT EXISTS idx_products_vendor_id     ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id     ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date      ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
