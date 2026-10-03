# Data dictionary and KPI definitions

The project uses deterministic synthetic data for portfolio demonstration. Currency is USD.

## Tables

- `regions`: eight city-level sales territories grouped into four regions.
- `customers`: customer identity, segment, signup date, acquisition channel, and home territory.
- `products`: product hierarchy, brand, standard selling price, and unit cost.
- `orders`: one row per order with customer, status, campaign, promised and actual delivery dates, shipping cost, and cancellation reason.
- `order_items`: one row per product within an order, including price, cost, quantity, discount, return reason, and stock-out indicator.
- `targets`: monthly revenue, contribution-profit, return-rate, and cancellation-rate targets by territory.
- `sales_fact`: denormalized analysis extract created from the star-schema files.
- `customer_rfm`: one row per purchasing customer with recency, frequency, monetary value, scores, and segment.
- `cohort_retention`: long-format customer retention by first-purchase cohort and month number.

## KPI definitions

- **Gross Sales:** quantity × unit price before discount for all orders.
- **Booked Revenue:** Gross Sales − Discount Amount.
- **Net Revenue:** Booked Revenue for completed orders. Returned and cancelled orders contribute zero.
- **Lost Revenue:** Booked Revenue removed because an order was returned or cancelled.
- **COGS:** quantity × unit cost for completed orders.
- **Gross Profit:** Net Revenue − COGS.
- **Gross Margin %:** Gross Profit ÷ Net Revenue.
- **Contribution Profit:** Gross Profit − allocated shipping cost − return/cancellation processing cost.
- **Contribution Margin %:** Contribution Profit ÷ Net Revenue.
- **Average Order Value:** Net Revenue ÷ completed orders.
- **Return Rate:** returned orders ÷ all orders.
- **Cancellation Rate:** cancelled orders ÷ all orders.
- **MoM Revenue Growth %:** (current month Net Revenue − prior month Net Revenue) ÷ prior month Net Revenue.
- **Revenue Attainment %:** Net Revenue ÷ Revenue Target.
- **Repeat Purchase Rate:** customers with more than one completed order ÷ customers with a completed order.
- **Cohort Month:** month of a customer's first completed purchase.
- **RFM Segment:** behavioral grouping derived from recency, completed-order frequency, and monetary-value quintiles.

Targets, shipping costs, processing costs, return reasons, cancellation reasons, and acquisition channels are synthetic assumptions created for analytical practice. They do not represent an actual company.
