-- Source integrity checks. Every issue_count should be zero.
SELECT 'duplicate_order_ids' AS check_name, COUNT(*) - COUNT(DISTINCT order_id) AS issue_count FROM orders
UNION ALL
SELECT 'orphan_order_items', COUNT(*) FROM order_items oi LEFT JOIN orders o ON o.order_id = oi.order_id WHERE o.order_id IS NULL
UNION ALL
SELECT 'invalid_product_keys', COUNT(*) FROM order_items oi LEFT JOIN products p ON p.product_id = oi.product_id WHERE p.product_id IS NULL
UNION ALL
SELECT 'invalid_discounts', COUNT(*) FROM order_items WHERE discount_pct < 0 OR discount_pct > 1
UNION ALL
SELECT 'completed_orders_without_delivery_date', COUNT(*) FROM orders WHERE order_status = 'Completed' AND actual_delivery_date IS NULL;

