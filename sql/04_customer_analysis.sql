-- RFM segmentation as of 2026-01-01
WITH customer_metrics AS (
    SELECT customer_id, customer_name, segment, acquisition_channel,
           CAST(julianday('2026-01-01') - julianday(MAX(order_date)) AS INTEGER) AS recency_days,
           COUNT(DISTINCT order_id) AS frequency,
           SUM(net_revenue) AS monetary_value
    FROM vw_sales_detail
    WHERE order_status = 'Completed'
    GROUP BY customer_id, customer_name, segment, acquisition_channel
), scored AS (
    SELECT *,
           6 - NTILE(5) OVER (ORDER BY recency_days) AS r_score,
           NTILE(5) OVER (ORDER BY frequency) AS f_score,
           NTILE(5) OVER (ORDER BY monetary_value) AS m_score
    FROM customer_metrics
)
SELECT *,
       CASE WHEN (r_score + f_score + m_score) / 3.0 >= 4.4 THEN 'Champions'
            WHEN r_score >= 4 AND f_score >= 3 THEN 'Loyal'
            WHEN r_score <= 2 AND f_score >= 3 THEN 'At Risk'
            WHEN r_score <= 2 THEN 'Hibernating'
            ELSE 'Potential Loyalist' END AS rfm_segment
FROM scored
ORDER BY monetary_value DESC;

-- Repeat purchase rate
WITH order_counts AS (
    SELECT customer_id, COUNT(DISTINCT order_id) AS completed_orders
    FROM vw_sales_detail WHERE order_status = 'Completed' GROUP BY customer_id
)
SELECT ROUND(1.0 * SUM(CASE WHEN completed_orders > 1 THEN 1 ELSE 0 END) / COUNT(*), 4) AS repeat_purchase_rate
FROM order_counts;

-- Acquisition channel performance
SELECT acquisition_channel, COUNT(DISTINCT customer_id) AS customers,
       ROUND(SUM(net_revenue), 2) AS net_revenue,
       ROUND(SUM(contribution_profit), 2) AS contribution_profit
FROM vw_sales_detail GROUP BY acquisition_channel ORDER BY net_revenue DESC;

