PRAGMA foreign_keys = ON;

CREATE TABLE regions (
    region_id TEXT PRIMARY KEY,
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    market TEXT NOT NULL
);

CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    segment TEXT NOT NULL,
    signup_date TEXT NOT NULL,
    region_id TEXT NOT NULL REFERENCES regions(region_id),
    acquisition_channel TEXT NOT NULL
);

CREATE TABLE products (
    product_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    brand TEXT NOT NULL,
    unit_price REAL NOT NULL CHECK (unit_price > 0),
    unit_cost REAL NOT NULL CHECK (unit_cost > 0)
);

CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    order_date TEXT NOT NULL,
    ship_date TEXT,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    region_id TEXT NOT NULL REFERENCES regions(region_id),
    order_status TEXT NOT NULL CHECK (order_status IN ('Completed', 'Returned', 'Cancelled')),
    payment_method TEXT NOT NULL,
    shipping_mode TEXT NOT NULL,
    promised_delivery_date TEXT,
    actual_delivery_date TEXT,
    shipping_cost REAL NOT NULL CHECK (shipping_cost >= 0),
    campaign_id TEXT NOT NULL,
    cancellation_reason TEXT
);

CREATE TABLE order_items (
    order_item_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(order_id),
    product_id TEXT NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price > 0),
    unit_cost REAL NOT NULL CHECK (unit_cost > 0),
    discount_pct REAL NOT NULL CHECK (discount_pct BETWEEN 0 AND 1),
    return_reason TEXT,
    stockout_flag INTEGER NOT NULL CHECK (stockout_flag IN (0, 1))
);

CREATE TABLE targets (
    month_start TEXT NOT NULL,
    region_id TEXT NOT NULL REFERENCES regions(region_id),
    revenue_target REAL NOT NULL,
    contribution_profit_target REAL NOT NULL,
    return_rate_target REAL NOT NULL,
    cancellation_rate_target REAL NOT NULL,
    PRIMARY KEY (month_start, region_id)
);

CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE VIEW vw_sales_detail AS
SELECT
    o.order_id,
    o.order_date,
    o.customer_id,
    c.customer_name,
    c.segment,
    c.acquisition_channel,
    r.region,
    r.market,
    o.order_status,
    o.cancellation_reason,
    o.shipping_cost,
    o.campaign_id,
    o.promised_delivery_date,
    o.actual_delivery_date,
    p.product_id,
    p.product_name,
    p.category,
    p.subcategory,
    p.brand,
    oi.quantity,
    oi.unit_price,
    oi.unit_cost,
    oi.discount_pct,
    oi.return_reason,
    oi.stockout_flag,
    oi.quantity * oi.unit_price AS gross_sales,
    oi.quantity * oi.unit_price * oi.discount_pct AS discount_amount,
    oi.quantity * oi.unit_price * (1 - oi.discount_pct) AS booked_revenue,
    CASE WHEN o.order_status = 'Completed'
         THEN oi.quantity * oi.unit_price * (1 - oi.discount_pct)
         ELSE 0 END AS net_revenue,
    CASE WHEN o.order_status IN ('Returned', 'Cancelled')
         THEN oi.quantity * oi.unit_price * (1 - oi.discount_pct)
         ELSE 0 END AS lost_revenue,
    CASE WHEN o.order_status = 'Completed'
         THEN oi.quantity * oi.unit_cost
         ELSE 0 END AS cogs,
    CASE WHEN o.order_status = 'Completed'
         THEN oi.quantity * (oi.unit_price * (1 - oi.discount_pct) - oi.unit_cost)
         ELSE 0 END AS gross_profit,
    o.shipping_cost / (SELECT COUNT(*) FROM order_items oi2 WHERE oi2.order_id = o.order_id) AS allocated_shipping_cost,
    CASE WHEN o.order_status = 'Returned' THEN oi.quantity * oi.unit_cost * 0.15
         WHEN o.order_status = 'Cancelled' THEN 2.5 / (SELECT COUNT(*) FROM order_items oi3 WHERE oi3.order_id = o.order_id)
         ELSE 0 END AS processing_cost,
    CASE WHEN o.order_status = 'Completed'
         THEN oi.quantity * (oi.unit_price * (1 - oi.discount_pct) - oi.unit_cost)
         ELSE 0 END
      - o.shipping_cost / (SELECT COUNT(*) FROM order_items oi4 WHERE oi4.order_id = o.order_id)
      - CASE WHEN o.order_status = 'Returned' THEN oi.quantity * oi.unit_cost * 0.15
             WHEN o.order_status = 'Cancelled' THEN 2.5 / (SELECT COUNT(*) FROM order_items oi5 WHERE oi5.order_id = o.order_id)
             ELSE 0 END AS contribution_profit,
    CASE WHEN o.actual_delivery_date IS NOT NULL AND o.promised_delivery_date IS NOT NULL
         THEN MAX(0, CAST(julianday(o.actual_delivery_date) - julianday(o.promised_delivery_date) AS INTEGER))
         ELSE 0 END AS delivery_days_late
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN customers c ON c.customer_id = o.customer_id
JOIN products p ON p.product_id = oi.product_id
JOIN regions r ON r.region_id = o.region_id;
