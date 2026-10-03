-- Product profitability and operational loss
SELECT product_name, category, brand,
       ROUND(SUM(net_revenue), 2) AS net_revenue,
       ROUND(SUM(gross_profit), 2) AS gross_profit,
       ROUND(SUM(contribution_profit), 2) AS contribution_profit,
       ROUND(SUM(lost_revenue), 2) AS lost_revenue,
       ROUND(SUM(contribution_profit) / NULLIF(SUM(net_revenue), 0), 4) AS contribution_margin_pct
FROM vw_sales_detail
GROUP BY product_id, product_name, category, brand
ORDER BY contribution_profit DESC;

-- Return reasons by category
SELECT category, return_reason, COUNT(DISTINCT order_id) AS returned_orders,
       ROUND(SUM(lost_revenue), 2) AS lost_revenue
FROM vw_sales_detail
WHERE order_status = 'Returned'
GROUP BY category, return_reason
ORDER BY lost_revenue DESC;

-- Discount bands compared on contribution margin
SELECT CASE WHEN discount_pct = 0 THEN '0%'
            WHEN discount_pct <= 0.05 THEN '1-5%'
            WHEN discount_pct <= 0.10 THEN '6-10%'
            WHEN discount_pct <= 0.15 THEN '11-15%'
            ELSE '16-20%' END AS discount_band,
       ROUND(SUM(net_revenue), 2) AS net_revenue,
       ROUND(SUM(contribution_profit), 2) AS contribution_profit,
       ROUND(SUM(contribution_profit) / NULLIF(SUM(net_revenue), 0), 4) AS contribution_margin_pct
FROM vw_sales_detail GROUP BY discount_band ORDER BY MIN(discount_pct);

