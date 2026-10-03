import fs from "node:fs/promises";
import path from "node:path";
import { instance } from "@viz-js/viz";

const dot = `digraph G {
  graph [rankdir=LR, bgcolor="#F8FAFC", pad=0.4, nodesep=0.5, ranksep=1.0, fontname="Arial"];
  node [shape=record, fontname="Arial", fontsize=11, style="filled,rounded", fillcolor="#FFFFFF", color="#0F766E", penwidth=1.4];
  edge [color="#64748B", fontname="Arial", fontsize=10, arrowsize=0.7];

  orders  [label="{orders|order_id (PK)\\lorder_date\\lorder_status\\lregion_id (FK)\\lcustomer_id (FK)\\l}", fillcolor="#F0FDFA"];
  order_items [label="{order_items|order_item_id (PK)\\lorder_id (FK)\\lproduct_id (FK)\\lquantity, price, cost\\ldiscount, return_reason\\l}", fillcolor="#F0FDFA"];
  customers [label="{customers|customer_id (PK)\\lcustomer_name\\lsegment\\lregion_id (FK)\\lacquisition_channel\\l}"];
  products [label="{products|product_id (PK)\\lproduct_name\\lcategory / subcategory\\lbrand, unit_price, unit_cost\\l}"];
  regions  [label="{regions|region_id (PK)\\lregion, city\\lstate, market\\l}"];
  targets  [label="{targets|month_start + region_id (PK)\\lrevenue_target\\lcontribution_profit_target\\lreturn/cancellation targets\\l}"];
  sales_fact [label="{sales_fact (view/extract)|one row per order line\\lrevenue, COGS, profit\\lshipping, delivery_days_late\\l}", fillcolor="#FEF9C3", color="#CA8A04"];
  customer_rfm [label="{customer_rfm|one row per customer\\lrecency, frequency, monetary\\lr/f/m scores, segment\\l}", fillcolor="#FEF9C3", color="#CA8A04"];
  cohort_retention [label="{cohort_retention|one row per cohort-month\\lactive_customers, retention_rate\\l}", fillcolor="#FEF9C3", color="#CA8A04"];

  customers -> orders [label="1 : N"];
  regions -> orders [label="1 : N"];
  regions -> customers [label="1 : N", style=dashed];
  orders -> order_items [label="1 : N"];
  products -> order_items [label="1 : N"];
  regions -> targets [label="1 : N"];
  orders -> sales_fact [style=dashed, color="#CA8A04", label="denormalize"];
  order_items -> sales_fact [style=dashed, color="#CA8A04"];
  customers -> customer_rfm [style=dashed, color="#CA8A04"];
  customers -> cohort_retention [style=dashed, color="#CA8A04"];
}`;

const viz = await instance();
const rendered = viz.render({ format: "svg", engine: "dot", source: dot });
const svg = typeof rendered === "string" ? rendered : rendered.output;
const out = path.join(path.resolve("."), "docs", "data_model.svg");
await fs.writeFile(out, svg, "utf8");
console.log("wrote", out);
