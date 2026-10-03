-- Customer cohort retention by first completed-order month
WITH activity AS (
    SELECT customer_id, SUBSTR(order_date, 1, 7) AS activity_month
    FROM vw_sales_detail WHERE order_status = 'Completed'
    GROUP BY customer_id, SUBSTR(order_date, 1, 7)
), cohorts AS (
    SELECT customer_id, MIN(activity_month) AS cohort_month FROM activity GROUP BY customer_id
), retention AS (
    SELECT c.cohort_month, a.activity_month,
           (CAST(SUBSTR(a.activity_month,1,4) AS INTEGER) - CAST(SUBSTR(c.cohort_month,1,4) AS INTEGER)) * 12
           + CAST(SUBSTR(a.activity_month,6,2) AS INTEGER) - CAST(SUBSTR(c.cohort_month,6,2) AS INTEGER) AS month_number,
           COUNT(DISTINCT a.customer_id) AS active_customers
    FROM activity a JOIN cohorts c ON c.customer_id = a.customer_id
    GROUP BY c.cohort_month, a.activity_month
), cohort_sizes AS (
    SELECT cohort_month, COUNT(*) AS cohort_size FROM cohorts GROUP BY cohort_month
)
SELECT r.cohort_month, r.month_number, r.active_customers, s.cohort_size,
       ROUND(1.0 * r.active_customers / s.cohort_size, 4) AS retention_rate
FROM retention r JOIN cohort_sizes s ON s.cohort_month = r.cohort_month
ORDER BY r.cohort_month, r.month_number;

-- Late delivery relationship with returns
SELECT CASE WHEN delivery_days_late > 0 THEN 'Late' ELSE 'On time' END AS delivery_status,
       COUNT(DISTINCT order_id) AS orders,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN order_status = 'Returned' THEN order_id END) / COUNT(DISTINCT order_id), 2) AS return_rate_pct,
       ROUND(AVG(delivery_days_late), 2) AS average_days_late
FROM vw_sales_detail
WHERE order_status <> 'Cancelled'
GROUP BY delivery_status;

