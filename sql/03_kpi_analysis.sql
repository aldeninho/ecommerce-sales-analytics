-- Executive KPIs
SELECT
    ROUND(SUM(net_revenue), 2) AS net_revenue,
    COUNT(DISTINCT order_id) AS total_orders,
    COUNT(DISTINCT CASE WHEN order_status = 'Completed' THEN order_id END) AS completed_orders,
    ROUND(SUM(net_revenue) / COUNT(DISTINCT CASE WHEN order_status = 'Completed' THEN order_id END), 2) AS average_order_value,
    ROUND(SUM(gross_profit), 2) AS gross_profit,
    ROUND(SUM(contribution_profit), 2) AS contribution_profit,
    ROUND(SUM(contribution_profit) / NULLIF(SUM(net_revenue), 0), 4) AS contribution_margin_pct,
    ROUND(SUM(lost_revenue), 2) AS lost_revenue,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN order_status = 'Returned' THEN order_id END) / COUNT(DISTINCT order_id), 2) AS return_rate_pct,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN order_status = 'Cancelled' THEN order_id END) / COUNT(DISTINCT order_id), 2) AS cancellation_rate_pct
FROM vw_sales_detail;

-- Monthly revenue, rolling three-month average, and MoM growth
WITH monthly AS (
    SELECT SUBSTR(order_date, 1, 7) AS month,
           SUM(net_revenue) AS net_revenue,
           SUM(contribution_profit) AS contribution_profit
    FROM vw_sales_detail
    GROUP BY SUBSTR(order_date, 1, 7)
), compared AS (
    SELECT *, LAG(net_revenue) OVER (ORDER BY month) AS prior_revenue,
           AVG(net_revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3m_revenue
    FROM monthly
)
SELECT month, ROUND(net_revenue, 2) AS net_revenue,
       ROUND(contribution_profit, 2) AS contribution_profit,
       ROUND(rolling_3m_revenue, 2) AS rolling_3m_revenue,
       ROUND((net_revenue - prior_revenue) / NULLIF(prior_revenue, 0), 4) AS mom_growth_pct
FROM compared ORDER BY month;

