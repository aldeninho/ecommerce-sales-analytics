# Power BI implementation guide

## Import and model

Import the six files from `data/raw`: `orders.csv`, `order_items.csv`, `customers.csv`, `products.csv`, `regions.csv`, and `targets.csv`. Import `data/processed/customer_rfm.csv` and `data/processed/cohort_retention.csv` for the customer pages.

Create and mark this table as the model's date table:

```DAX
Date =
ADDCOLUMNS(
    CALENDAR(DATE(2024, 1, 1), DATE(2025, 12, 31)),
    "Year", YEAR([Date]),
    "Month Number", MONTH([Date]),
    "Month", FORMAT([Date], "MMM"),
    "Year Month", FORMAT([Date], "YYYY-MM"),
    "Quarter", "Q" & FORMAT([Date], "Q")
)
```

Relationships:

- `Date[Date]` 1 → * `orders[order_date]`
- `Date[Date]` 1 → * `targets[month_start]`
- `customers[customer_id]` 1 → * `orders[customer_id]`
- `regions[region_id]` 1 → * `orders[region_id]`
- `regions[region_id]` 1 → * `targets[region_id]`
- `orders[order_id]` 1 → * `order_items[order_id]`
- `products[product_id]` 1 → * `order_items[product_id]`
- `customers[customer_id]` 1 → 1 `customer_rfm[customer_id]`

Use single-direction filtering from dimensions to facts. Confirm that the target table filters by both Date and Region before designing visuals. Hide technical keys after validation.

## Page 1: Executive overview

- KPI cards: Net Revenue, Revenue Attainment %, Contribution Profit, Contribution Margin %, Completed Orders, and AOV.
- Line chart: Year Month by Net Revenue and Revenue Target. Put MoM Growth and Rolling 3M Revenue in the tooltip.
- Sorted bar chart: Category by Contribution Profit.
- Regional table: Net Revenue, Revenue Attainment %, YoY Growth %, and Regional Status.
- Status distribution: completed, returned, and cancelled orders.
- Slicers: Date, Region, Segment, Category, and Acquisition Channel.

## Page 2: Product and customer performance

- Matrix: Category → Subcategory → Product with Net Revenue, Contribution Profit, Contribution Margin %, and Lost Revenue.
- Bar chart: top 10 products by Contribution Profit.
- Bar chart: RFM Segment by customer count and Monetary Value.
- Customer table: name, RFM Segment, revenue, frequency, recency, and rank.
- Acquisition Channel comparison: customers, revenue, contribution profit, and repeat purchase rate.
- Drill-through target: individual customer purchase history.

## Page 3: Regional and operational risk

- Clustered bars: actual revenue versus target by Region.
- Line chart: monthly Net Revenue by Region.
- Lost Revenue by Category and Order Status.
- Return Reason by lost revenue.
- Late versus on-time delivery return rate.
- Drill-through table: Order ID, date, promised delivery, actual delivery, customer, product, status, reason, and Lost Revenue.

## Page 4: Retention and cohorts

- Cohort heatmap: Cohort Month as rows, Month Number as columns, Retention Rate as values.
- Cards: Repeat Purchase Rate, Repeat Customers, and Distinct Customers.
- Trend: new versus returning customer revenue by month.
- RFM segment distribution and revenue contribution.

## Hidden validation page

Add cards or a compact matrix for:

- raw order count and distinct order count
- order-item count
- minimum and maximum order date
- orphan order and product keys
- SQL versus Power BI Net Revenue
- SQL versus Power BI Contribution Profit
- target row count
- blank status, price, cost, and discount fields

Do not publish the report until the SQL and Power BI totals reconcile exactly.

## Interaction and presentation

- Import `theme.json` and use a 16:9 canvas.
- Use red only for losses, failed targets, returns, cancellations, and negative growth.
- Add a Reset Filters bookmark and button on every visible page.
- Synchronize Date and Region slicers across all relevant pages.
- Create a report-page tooltip for KPI definitions and another for monthly performance.
- Add dynamic titles that reflect the selected date and region.
- Format chart currency in USD using $K or $M; keep detailed tables at two decimals.
- Create a mobile layout for the Executive Overview after desktop layout is complete.

## Validation order

1. Confirm relationship cardinality and filter direction.
2. Compare Net Revenue, Contribution Profit, orders, returns, and cancellations with `outputs/data_quality_checks.json`.
3. Compare monthly values with the Excel QA workbook.
4. Test slicers individually and in combination.
5. Test drill-through, bookmarks, tooltips, and mobile layout.
6. Export screenshots only after all checks pass.

