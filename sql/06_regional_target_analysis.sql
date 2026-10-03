-- Regional year-over-year performance
WITH annual AS (
    SELECT region, SUBSTR(order_date, 1, 4) AS sales_year, SUM(net_revenue) AS revenue
    FROM vw_sales_detail GROUP BY region, SUBSTR(order_date, 1, 4)
)
SELECT region,
       ROUND(SUM(CASE WHEN sales_year = '2024' THEN revenue ELSE 0 END), 2) AS revenue_2024,
       ROUND(SUM(CASE WHEN sales_year = '2025' THEN revenue ELSE 0 END), 2) AS revenue_2025,
       ROUND((SUM(CASE WHEN sales_year = '2025' THEN revenue ELSE 0 END) - SUM(CASE WHEN sales_year = '2024' THEN revenue ELSE 0 END))
             / NULLIF(SUM(CASE WHEN sales_year = '2024' THEN revenue ELSE 0 END), 0), 4) AS yoy_growth_pct
FROM annual GROUP BY region ORDER BY yoy_growth_pct DESC;

-- Actual versus target by month and region
WITH actual AS (
    SELECT SUBSTR(v.order_date, 1, 7) || '-01' AS month_start, o.region_id,
           SUM(v.net_revenue) AS actual_revenue, SUM(v.contribution_profit) AS actual_contribution_profit
    FROM vw_sales_detail v JOIN orders o ON o.order_id = v.order_id
    GROUP BY SUBSTR(v.order_date, 1, 7), o.region_id
)
SELECT t.month_start, r.region,
       ROUND(SUM(a.actual_revenue), 2) AS actual_revenue,
       ROUND(SUM(t.revenue_target), 2) AS revenue_target,
       ROUND(SUM(a.actual_revenue) - SUM(t.revenue_target), 2) AS revenue_variance,
       ROUND(SUM(a.actual_revenue) / NULLIF(SUM(t.revenue_target), 0), 4) AS revenue_attainment,
       ROUND(SUM(a.actual_contribution_profit), 2) AS actual_contribution_profit,
       ROUND(SUM(t.contribution_profit_target), 2) AS contribution_profit_target
FROM targets t
JOIN regions r ON r.region_id = t.region_id
LEFT JOIN actual a ON a.month_start = t.month_start AND a.region_id = t.region_id
GROUP BY t.month_start, r.region
ORDER BY t.month_start, r.region;

