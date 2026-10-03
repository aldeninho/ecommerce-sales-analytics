from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "ecommerce_analytics.sqlite"

if DB_PATH.exists():
    DB_PATH.unlink()

connection = sqlite3.connect(DB_PATH)
connection.executescript((ROOT / "sql" / "01_schema.sql").read_text(encoding="utf-8"))

loads = [
    ("regions", "regions.csv"),
    ("customers", "customers.csv"),
    ("products", "products.csv"),
    ("orders", "orders.csv"),
    ("order_items", "order_items.csv"),
    ("targets", "targets.csv"),
]
for table, filename in loads:
    with (ROOT / "data" / "raw" / filename).open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        headers = next(reader)
        placeholders = ",".join("?" for _ in headers)
        connection.executemany(f"INSERT INTO {table} VALUES ({placeholders})", reader)

checks = {
    "regions": connection.execute("SELECT COUNT(*) FROM regions").fetchone()[0],
    "customers": connection.execute("SELECT COUNT(*) FROM customers").fetchone()[0],
    "products": connection.execute("SELECT COUNT(*) FROM products").fetchone()[0],
    "orders": connection.execute("SELECT COUNT(*) FROM orders").fetchone()[0],
    "order_items": connection.execute("SELECT COUNT(*) FROM order_items").fetchone()[0],
    "targets": connection.execute("SELECT COUNT(*) FROM targets").fetchone()[0],
    "orphan_order_items": connection.execute("SELECT COUNT(*) FROM order_items oi LEFT JOIN orders o ON o.order_id = oi.order_id WHERE o.order_id IS NULL").fetchone()[0],
    "duplicate_order_ids": connection.execute("SELECT COUNT(*) - COUNT(DISTINCT order_id) FROM orders").fetchone()[0],
    "invalid_discounts": connection.execute("SELECT COUNT(*) FROM order_items WHERE discount_pct < 0 OR discount_pct > 1").fetchone()[0],
}

kpis = connection.execute("""
SELECT
    ROUND(SUM(net_revenue), 2),
    COUNT(DISTINCT order_id),
    ROUND(SUM(gross_profit), 2),
    ROUND(SUM(lost_revenue), 2),
    ROUND(SUM(contribution_profit), 2)
FROM vw_sales_detail
""").fetchone()
checks.update({"net_revenue": kpis[0], "orders_in_view": kpis[1], "gross_profit": kpis[2], "lost_revenue": kpis[3], "contribution_profit": kpis[4]})

def rows(sql: str):
    cursor = connection.execute(sql)
    columns = [item[0] for item in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

analysis = {
    "executive": rows("""
        SELECT ROUND(SUM(net_revenue), 2) AS net_revenue,
               COUNT(DISTINCT CASE WHEN order_status = 'Completed' THEN order_id END) AS completed_orders,
               ROUND(SUM(net_revenue) / COUNT(DISTINCT CASE WHEN order_status = 'Completed' THEN order_id END), 2) AS aov,
               ROUND(SUM(gross_profit), 2) AS gross_profit,
               ROUND(100.0 * SUM(gross_profit) / SUM(net_revenue), 2) AS gross_margin_pct,
               ROUND(SUM(contribution_profit), 2) AS contribution_profit,
               ROUND(100.0 * SUM(contribution_profit) / SUM(net_revenue), 2) AS contribution_margin_pct,
               ROUND(100.0 * COUNT(DISTINCT CASE WHEN order_status = 'Returned' THEN order_id END) / COUNT(DISTINCT order_id), 2) AS return_rate_pct,
               ROUND(100.0 * COUNT(DISTINCT CASE WHEN order_status = 'Cancelled' THEN order_id END) / COUNT(DISTINCT order_id), 2) AS cancellation_rate_pct,
               ROUND(SUM(lost_revenue), 2) AS lost_revenue
        FROM vw_sales_detail
    """)[0],
    "category": rows("""
        SELECT category, ROUND(SUM(net_revenue), 2) AS net_revenue,
               ROUND(100.0 * SUM(net_revenue) / SUM(SUM(net_revenue)) OVER (), 2) AS revenue_share_pct,
               ROUND(SUM(contribution_profit), 2) AS contribution_profit,
               ROUND(SUM(lost_revenue), 2) AS lost_revenue,
               ROUND(100.0 * SUM(lost_revenue) / SUM(booked_revenue), 2) AS lost_revenue_rate_pct
        FROM vw_sales_detail GROUP BY category ORDER BY net_revenue DESC
    """),
    "region_yoy": rows("""
        WITH a AS (
          SELECT region, SUBSTR(order_date,1,4) AS y, SUM(net_revenue) AS rev
          FROM vw_sales_detail GROUP BY region, SUBSTR(order_date,1,4)
        )
        SELECT region,
               ROUND(SUM(CASE WHEN y='2024' THEN rev ELSE 0 END),2) AS revenue_2024,
               ROUND(SUM(CASE WHEN y='2025' THEN rev ELSE 0 END),2) AS revenue_2025,
               ROUND(100.0 * (SUM(CASE WHEN y='2025' THEN rev ELSE 0 END)-SUM(CASE WHEN y='2024' THEN rev ELSE 0 END)) / SUM(CASE WHEN y='2024' THEN rev ELSE 0 END),2) AS yoy_growth_pct
        FROM a GROUP BY region ORDER BY yoy_growth_pct DESC
    """),
    "monthly_extremes": rows("""
        WITH m AS (
          SELECT SUBSTR(order_date,1,7) AS month, SUM(net_revenue) AS revenue
          FROM vw_sales_detail GROUP BY SUBSTR(order_date,1,7)
        ), x AS (
          SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS prior_revenue FROM m
        )
        SELECT month, ROUND(revenue,2) AS revenue,
               ROUND(100.0*(revenue-prior_revenue)/prior_revenue,2) AS mom_growth_pct
        FROM x WHERE prior_revenue IS NOT NULL ORDER BY mom_growth_pct
    """),
    "top_customers": rows("""
        WITH c AS (
          SELECT customer_id, customer_name, segment, SUM(net_revenue) AS revenue
          FROM vw_sales_detail GROUP BY customer_id, customer_name, segment
        )
        SELECT customer_id, customer_name, segment, ROUND(revenue,2) AS revenue,
               ROUND(100.0*revenue/SUM(revenue) OVER (),2) AS revenue_share_pct
        FROM c ORDER BY revenue DESC LIMIT 10
    """),
    "top_products": rows("""
        SELECT product_name, category, ROUND(SUM(net_revenue),2) AS net_revenue,
               ROUND(SUM(contribution_profit),2) AS contribution_profit,
               ROUND(SUM(lost_revenue),2) AS lost_revenue
        FROM vw_sales_detail GROUP BY product_id, product_name, category
        ORDER BY net_revenue DESC LIMIT 10
    """),
    "target_attainment": rows("""
        WITH actual AS (
          SELECT SUBSTR(v.order_date,1,7) || '-01' AS month_start, o.region_id,
                 SUM(v.net_revenue) AS revenue, SUM(v.contribution_profit) AS contribution_profit
          FROM vw_sales_detail v JOIN orders o ON o.order_id = v.order_id
          GROUP BY SUBSTR(v.order_date,1,7), o.region_id
        )
        SELECT ROUND(SUM(a.revenue),2) AS actual_revenue,
               ROUND(SUM(t.revenue_target),2) AS revenue_target,
               ROUND(100.0*SUM(a.revenue)/SUM(t.revenue_target),2) AS revenue_attainment_pct,
               ROUND(SUM(a.contribution_profit),2) AS actual_contribution_profit,
               ROUND(SUM(t.contribution_profit_target),2) AS contribution_profit_target,
               ROUND(100.0*SUM(a.contribution_profit)/SUM(t.contribution_profit_target),2) AS contribution_attainment_pct
        FROM targets t LEFT JOIN actual a ON a.month_start=t.month_start AND a.region_id=t.region_id
    """)[0],
    "delivery_return_rate": rows("""
        SELECT CASE WHEN delivery_days_late > 0 THEN 'Late' ELSE 'On time' END AS delivery_status,
               COUNT(DISTINCT order_id) AS orders,
               ROUND(100.0*COUNT(DISTINCT CASE WHEN order_status='Returned' THEN order_id END)/COUNT(DISTINCT order_id),2) AS return_rate_pct
        FROM vw_sales_detail WHERE order_status <> 'Cancelled' GROUP BY delivery_status
    """),
    "return_reasons": rows("""
        SELECT return_reason, COUNT(DISTINCT order_id) AS returned_orders, ROUND(SUM(lost_revenue),2) AS lost_revenue
        FROM vw_sales_detail WHERE order_status='Returned' GROUP BY return_reason ORDER BY lost_revenue DESC
    """),
}

# Parse and execute every portfolio query once so syntax problems fail the build.
for query_file in sorted((ROOT / "sql").glob("0[2-7]_*.sql")):
    connection.executescript(query_file.read_text(encoding="utf-8"))

connection.commit()
connection.close()
(ROOT / "outputs" / "data_quality_checks.json").write_text(json.dumps(checks, indent=2), encoding="utf-8")
(ROOT / "outputs" / "analysis_results.json").write_text(json.dumps(analysis, indent=2), encoding="utf-8")
print(json.dumps(checks, indent=2))
