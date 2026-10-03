import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(".");
const rawDir = path.join(root, "data", "raw");
const processedDir = path.join(root, "data", "processed");
const outputDir = path.join(root, "outputs");
await Promise.all([rawDir, processedDir, outputDir].map((d) => fs.mkdir(d, { recursive: true })));

let seed = 20261003;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function pick(items, weights = null) {
  if (!weights) return items[Math.floor(random() * items.length)];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items.at(-1);
}
function round2(n) { return Math.round(n * 100) / 100; }
function isoDate(d) { return d.toISOString().slice(0, 10); }
function csvEscape(v) {
  const s = v instanceof Date ? isoDate(v) : String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}
async function writeCsv(filename, rows) {
  const content = rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
  await fs.writeFile(path.join(rawDir, filename), content, "utf8");
}

const regionRows = [
  ["R01", "North", "New York", "NY", "Northeast"],
  ["R02", "North", "Boston", "MA", "Northeast"],
  ["R03", "South", "Atlanta", "GA", "Southeast"],
  ["R04", "South", "Dallas", "TX", "Southwest"],
  ["R05", "West", "Los Angeles", "CA", "Pacific"],
  ["R06", "West", "Seattle", "WA", "Pacific Northwest"],
  ["R07", "Central", "Chicago", "IL", "Midwest"],
  ["R08", "Central", "Denver", "CO", "Mountain"],
];

const categoryDefs = [
  ["Electronics", ["Audio", "Computing", "Accessories"], 55, 420, 0.66],
  ["Furniture", ["Office Furniture", "Living Room", "Storage"], 80, 650, 0.61],
  ["Office Supplies", ["Paper", "Writing", "Organization"], 6, 90, 0.57],
  ["Home & Kitchen", ["Kitchen", "Decor", "Appliances"], 18, 210, 0.60],
];
const brands = ["Apex", "Northstar", "Meridian", "Nova", "Summit", "Harbor"];
const productNames = {
  Electronics: ["Wireless Headphones", "Bluetooth Speaker", "USB-C Hub", "Mechanical Keyboard", "27-inch Monitor", "Webcam", "Laptop Stand", "Portable SSD", "Wi-Fi Router", "Smart Plug", "Noise-Canceling Earbuds", "Power Bank"],
  Furniture: ["Ergonomic Chair", "Standing Desk", "Bookshelf", "Filing Cabinet", "Coffee Table", "Desk Lamp", "Storage Ottoman", "Monitor Riser", "Side Table", "Task Chair", "Wall Shelf", "Mobile Pedestal"],
  "Office Supplies": ["Premium Notebook", "Gel Pen Set", "Printer Paper", "Desk Organizer", "Sticky Note Pack", "Archive Box", "Label Tape", "Stapler", "File Folder Set", "Whiteboard Kit", "Document Wallet", "Planner"],
  "Home & Kitchen": ["Electric Kettle", "Air Fryer", "Table Lamp", "Wall Clock", "Food Container Set", "Coffee Grinder", "Throw Pillow Set", "Digital Scale", "Desk Fan", "Humidifier", "Knife Set", "Storage Basket"],
};

const products = [];
let productIndex = 1;
for (const [category, subcategories, low, high, costRatio] of categoryDefs) {
  for (let i = 0; i < 12; i++) {
    const price = round2(low + random() * (high - low));
    products.push({
      product_id: `P${String(productIndex++).padStart(3, "0")}`,
      product_name: productNames[category][i],
      category,
      subcategory: subcategories[i % subcategories.length],
      brand: brands[(productIndex + i) % brands.length],
      unit_price: price,
      unit_cost: round2(price * (costRatio + (random() - 0.5) * 0.08)),
    });
  }
}

const firstNames = ["Ava", "Liam", "Mia", "Noah", "Emma", "Ethan", "Sophia", "Lucas", "Olivia", "Mason", "Amelia", "Aria", "Elijah", "Zoe", "Leo", "Nora", "Maya", "James", "Layla", "Henry"];
const lastNames = ["Patel", "Johnson", "Garcia", "Kim", "Singh", "Brown", "Martinez", "Wilson", "Davis", "Clark", "Lee", "Taylor", "Anderson", "Thomas", "Moore", "Jackson", "White", "Harris", "Lewis", "Walker"];
const segments = ["Consumer", "Corporate", "Small Business"];
const acquisitionChannels = ["Organic Search", "Paid Search", "Social", "Email", "Referral", "Marketplace"];
const customers = [];
for (let i = 1; i <= 720; i++) {
  const region = pick(regionRows);
  const segment = pick(segments, [0.58, 0.24, 0.18]);
  const signup = new Date(Date.UTC(2021 + Math.floor(random() * 3), Math.floor(random() * 12), 1 + Math.floor(random() * 27)));
  customers.push({
    customer_id: `C${String(i).padStart(4, "0")}`,
    customer_name: `${pick(firstNames)} ${pick(lastNames)}`,
    segment,
    signup_date: signup,
    region_id: region[0],
    acquisition_channel: pick(acquisitionChannels, [0.25, 0.18, 0.17, 0.14, 0.16, 0.10]),
    purchase_weight: Math.pow(random(), 4) + (segment === "Corporate" ? 0.06 : segment === "Small Business" ? 0.03 : 0.01),
  });
}
const customerWeights = customers.map((c) => c.purchase_weight);

const orders = [];
const orderItems = [];
const start = Date.UTC(2024, 0, 1);
const end = Date.UTC(2025, 11, 31);
for (let i = 1; i <= 5200; i++) {
  let orderDate;
  let customer;
  do {
    const t = start + random() * (end - start);
    orderDate = new Date(t);
    customer = pick(customers, customerWeights);
    const region = regionRows.find((r) => r[0] === customer.region_id)[1];
    const yearProgress = (orderDate.getUTCFullYear() - 2024) + orderDate.getUTCMonth() / 12;
    const accept = region === "South" ? 0.72 + 0.18 * yearProgress : region === "Central" ? 0.95 - 0.24 * yearProgress : 0.82;
    if (random() <= Math.max(0.45, accept)) break;
  } while (true);
  const regionName = regionRows.find((r) => r[0] === customer.region_id)[1];
  const itemCount = pick([1, 2, 3, 4], [0.49, 0.31, 0.15, 0.05]);
  const selected = [];
  for (let j = 0; j < itemCount; j++) {
    let p = pick(products, products.map((x) => x.category === "Office Supplies" ? 1.35 : x.category === "Electronics" ? 1.15 : 1));
    while (selected.some((x) => x.product_id === p.product_id)) p = pick(products);
    selected.push(p);
  }
  const maxReturnRisk = Math.max(...selected.map((p) => ({ Electronics: 0.065, Furniture: 0.105, "Office Supplies": 0.025, "Home & Kitchen": 0.05 })[p.category]));
  const cancelRisk = 0.028 + (regionName === "Central" ? 0.035 : 0) + (orderDate.getUTCMonth() === 11 ? 0.012 : 0);
  const r = random();
  const status = r < cancelRisk ? "Cancelled" : r < cancelRisk + maxReturnRisk ? "Returned" : "Completed";
  const orderId = `O${String(i).padStart(6, "0")}`;
  const shippingMode = pick(["Standard", "Express"], [0.82, 0.18]);
  const promisedDays = shippingMode === "Express" ? 3 : 6;
  const promisedDate = status === "Cancelled" ? "" : new Date(orderDate.getTime() + promisedDays * 86400000);
  const lateRisk = selected.some((p) => p.category === "Furniture") ? 0.24 : 0.12;
  const delayDays = status === "Cancelled" ? 0 : (random() < lateRisk ? 1 + Math.floor(random() * 4) : -Math.floor(random() * 2));
  const actualDate = status === "Cancelled" ? "" : new Date(promisedDate.getTime() + delayDays * 86400000);
  const shippingCost = round2((shippingMode === "Express" ? 14 : 7) + selected.reduce((s, p) => s + (p.category === "Furniture" ? 5 : 1.5), 0));
  const campaignId = orderDate.getUTCMonth() === 10 || orderDate.getUTCMonth() === 11 ? "HOLIDAY" : random() < 0.18 ? pick(["SPRING", "SUMMER", "BACK2WORK"]) : "NONE";
  const cancellationReason = status === "Cancelled" ? pick(["Payment failure", "Customer changed mind", "Inventory unavailable", "Address issue"], [0.32, 0.29, 0.25, 0.14]) : "";
  orders.push([orderId, isoDate(orderDate), actualDate ? isoDate(actualDate) : "", customer.customer_id, customer.region_id, status, pick(["Card", "Digital Wallet", "Bank Transfer", "Buy Now Pay Later"], [0.48, 0.25, 0.17, 0.10]), shippingMode, promisedDate ? isoDate(promisedDate) : "", actualDate ? isoDate(actualDate) : "", shippingCost, campaignId, cancellationReason]);
  selected.forEach((p, j) => {
    const qty = pick([1, 2, 3, 4, 5], [0.55, 0.25, 0.12, 0.06, 0.02]);
    let discount = pick([0, 0.05, 0.10, 0.15, 0.20], [0.42, 0.22, 0.19, 0.11, 0.06]);
    if (customer.segment === "Corporate") discount = Math.min(0.20, discount + 0.05);
    const returnReason = status === "Returned" ? pick(["Damaged", "Not as described", "Wrong item", "Changed mind", "Arrived late"], p.category === "Furniture" ? [0.34, 0.22, 0.10, 0.15, 0.19] : [0.20, 0.24, 0.13, 0.28, 0.15]) : "";
    const stockoutFlag = cancellationReason === "Inventory unavailable" || random() < 0.015 ? 1 : 0;
    orderItems.push([`${orderId}-${j + 1}`, orderId, p.product_id, qty, p.unit_price, p.unit_cost, discount, returnReason, stockoutFlag]);
  });
}

await writeCsv("regions.csv", [["region_id", "region", "city", "state", "market"], ...regionRows]);
await writeCsv("customers.csv", [["customer_id", "customer_name", "segment", "signup_date", "region_id", "acquisition_channel"], ...customers.map((c) => [c.customer_id, c.customer_name, c.segment, isoDate(c.signup_date), c.region_id, c.acquisition_channel])]);
await writeCsv("products.csv", [["product_id", "product_name", "category", "subcategory", "brand", "unit_price", "unit_cost"], ...products.map((p) => [p.product_id, p.product_name, p.category, p.subcategory, p.brand, p.unit_price, p.unit_cost])]);
await writeCsv("orders.csv", [["order_id", "order_date", "ship_date", "customer_id", "region_id", "order_status", "payment_method", "shipping_mode", "promised_delivery_date", "actual_delivery_date", "shipping_cost", "campaign_id", "cancellation_reason"], ...orders]);
await writeCsv("order_items.csv", [["order_item_id", "order_id", "product_id", "quantity", "unit_price", "unit_cost", "discount_pct", "return_reason", "stockout_flag"], ...orderItems]);

const targets = [];
for (const month of Array.from({ length: 24 }, (_, i) => new Date(Date.UTC(2024 + Math.floor(i / 12), i % 12, 1)))) {
  for (const region of regionRows) {
    const regionFactor = ({ North: 1.02, South: 1.08, West: 1.00, Central: 0.97 })[region[1]];
    const seasonality = [1.05, 0.98, 1.00, 1.02, 0.98, 1.08, 1.01, 0.96, 1.00, 1.03, 1.10, 1.12][month.getUTCMonth()];
    const annualGrowth = month.getUTCFullYear() === 2025 ? 1.06 : 1;
    const revenueTarget = round2(11200 * regionFactor * seasonality * annualGrowth);
    targets.push([isoDate(month), region[0], revenueTarget, round2(revenueTarget * 0.34), 0.06, 0.035]);
  }
}
await writeCsv("targets.csv", [["month_start", "region_id", "revenue_target", "contribution_profit_target", "return_rate_target", "cancellation_rate_target"], ...targets]);

const orderMap = new Map(orders.map((o) => [o[0], o]));
const customerMap = new Map(customers.map((c) => [c.customer_id, c]));
const productMap = new Map(products.map((p) => [p.product_id, p]));
const regionMap = new Map(regionRows.map((r) => [r[0], r]));
const itemCountMap = new Map();
for (const item of orderItems) itemCountMap.set(item[1], (itemCountMap.get(item[1]) ?? 0) + 1);
const facts = orderItems.map((x) => {
  const o = orderMap.get(x[1]);
  const p = productMap.get(x[2]);
  const c = customerMap.get(o[3]);
  const gross = x[3] * x[4];
  const booked = gross * (1 - x[6]);
  const net = o[5] === "Completed" ? booked : 0;
  const cogs = o[5] === "Completed" ? x[3] * x[5] : 0;
  const allocatedShipping = o[10] / itemCountMap.get(o[0]);
  const processingCost = o[5] === "Returned" ? x[3] * x[5] * 0.15 : o[5] === "Cancelled" ? 2.5 / itemCountMap.get(o[0]) : 0;
  const contributionProfit = net - cogs - allocatedShipping - processingCost;
  const deliveryDaysLate = o[9] && o[8] ? Math.max(0, Math.round((new Date(o[9]) - new Date(o[8])) / 86400000)) : 0;
  return { orderId: o[0], date: o[1], customerId: c.customer_id, customerName: c.customer_name, segment: c.segment, acquisitionChannel: c.acquisition_channel, region: regionMap.get(o[4])[1], status: o[5], cancellationReason: o[12], productId: p.product_id, productName: p.product_name, category: p.category, brand: p.brand, quantity: x[3], gross, discount: gross * x[6], booked, net, lost: booked - net, cogs, profit: net - cogs, shippingCost: allocatedShipping, processingCost, contributionProfit, returnReason: x[7], stockoutFlag: x[8], deliveryDaysLate };
});

const monthKeys = Array.from({ length: 24 }, (_, i) => `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);
const monthly = monthKeys.map((m) => {
  const lines = facts.filter((f) => f.date.slice(0, 7) === m);
  const orderIds = new Set(lines.map((f) => f.orderId));
  const orderStatuses = [...orderIds].map((id) => orderMap.get(id)[5]);
  return { month: m, gross: lines.reduce((s, f) => s + f.gross, 0), net: lines.reduce((s, f) => s + f.net, 0), profit: lines.reduce((s, f) => s + f.profit, 0), contribution: lines.reduce((s, f) => s + f.contributionProfit, 0), orders: orderIds.size, completed: orderStatuses.filter((s) => s === "Completed").length, returns: orderStatuses.filter((s) => s === "Returned").length, cancels: orderStatuses.filter((s) => s === "Cancelled").length };
});

function groupSummary(keyFn) {
  const groups = new Map();
  for (const f of facts) {
    const key = keyFn(f);
    const g = groups.get(key) ?? { key, net: 0, profit: 0, contribution: 0, lost: 0, orders: new Set() };
    g.net += f.net; g.profit += f.profit; g.contribution += f.contributionProfit; g.lost += f.lost; g.orders.add(f.orderId); groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ ...g, orders: g.orders.size })).sort((a, b) => b.net - a.net);
}
const categories = groupSummary((f) => f.category);
const regions = groupSummary((f) => f.region);
const customerSummary = groupSummary((f) => `${f.customerId}|${f.customerName}|${f.segment}`).slice(0, 20);

const targetByMonth = new Map();
for (const t of targets) {
  const month = t[0].slice(0, 7);
  const g = targetByMonth.get(month) ?? { revenue: 0, contribution: 0 };
  g.revenue += t[2]; g.contribution += t[3]; targetByMonth.set(month, g);
}
const targetAnalysis = monthly.map((m) => {
  const target = targetByMonth.get(m.month);
  return { ...m, revenueTarget: target.revenue, contributionTarget: target.contribution };
});

const completedByCustomer = new Map();
for (const f of facts.filter((x) => x.status === "Completed")) {
  const g = completedByCustomer.get(f.customerId) ?? { id: f.customerId, name: f.customerName, segment: f.segment, channel: f.acquisitionChannel, last: f.date, orders: new Set(), revenue: 0, months: new Set() };
  if (f.date > g.last) g.last = f.date;
  g.orders.add(f.orderId); g.revenue += f.net; g.months.add(f.date.slice(0, 7)); completedByCustomer.set(f.customerId, g);
}
const rfm = [...completedByCustomer.values()].map((g) => ({ ...g, frequency: g.orders.size, recency: Math.round((new Date("2026-01-01") - new Date(g.last)) / 86400000) }));
function assignQuintile(rows, value, descending) {
  const sorted = [...rows].sort((a, b) => descending ? value(b) - value(a) : value(a) - value(b));
  sorted.forEach((x, i) => { x._score = Math.min(5, Math.floor(i * 5 / sorted.length) + 1); });
  return new Map(sorted.map((x) => [x.id, 6 - x._score]));
}
const recencyScore = assignQuintile(rfm, (x) => x.recency, false);
const frequencyScore = assignQuintile(rfm, (x) => x.frequency, true);
const monetaryScore = assignQuintile(rfm, (x) => x.revenue, true);
for (const x of rfm) {
  x.rScore = recencyScore.get(x.id); x.fScore = frequencyScore.get(x.id); x.mScore = monetaryScore.get(x.id);
  const avg = (x.rScore + x.fScore + x.mScore) / 3;
  x.rfmSegment = avg >= 4.4 ? "Champions" : x.rScore >= 4 && x.fScore >= 3 ? "Loyal" : x.rScore <= 2 && x.fScore >= 3 ? "At Risk" : x.rScore <= 2 ? "Hibernating" : "Potential Loyalist";
}
rfm.sort((a, b) => b.revenue - a.revenue);

const cohortMap = new Map();
for (const x of rfm) {
  const months = [...x.months].sort();
  const cohort = months[0];
  const g = cohortMap.get(cohort) ?? { cohort, customers: 0, offsets: new Map() };
  g.customers++;
  for (const active of months) {
    const [cy, cm] = cohort.split("-").map(Number); const [ay, am] = active.split("-").map(Number);
    const offset = (ay - cy) * 12 + (am - cm);
    g.offsets.set(offset, (g.offsets.get(offset) ?? 0) + 1);
  }
  cohortMap.set(cohort, g);
}
const cohorts = [...cohortMap.values()].sort((a, b) => a.cohort.localeCompare(b.cohort));

const flatHeaders = ["order_id", "order_date", "customer_id", "customer_name", "segment", "acquisition_channel", "region", "order_status", "cancellation_reason", "product_id", "product_name", "category", "brand", "quantity", "gross_sales", "discount_amount", "booked_revenue", "net_revenue", "lost_revenue", "cogs", "gross_profit", "allocated_shipping_cost", "processing_cost", "contribution_profit", "return_reason", "stockout_flag", "delivery_days_late"];
await writeCsv(path.join("..", "processed", "sales_fact.csv"), [flatHeaders, ...facts.map((f) => [f.orderId, f.date, f.customerId, f.customerName, f.segment, f.acquisitionChannel, f.region, f.status, f.cancellationReason, f.productId, f.productName, f.category, f.brand, f.quantity, round2(f.gross), round2(f.discount), round2(f.booked), round2(f.net), round2(f.lost), round2(f.cogs), round2(f.profit), round2(f.shippingCost), round2(f.processingCost), round2(f.contributionProfit), f.returnReason, f.stockoutFlag, f.deliveryDaysLate])]);
await writeCsv(path.join("..", "processed", "customer_rfm.csv"), [["customer_id", "customer_name", "segment", "acquisition_channel", "last_purchase_date", "recency_days", "frequency", "monetary_value", "r_score", "f_score", "m_score", "rfm_segment"], ...rfm.map((x) => [x.id, x.name, x.segment, x.channel, x.last, x.recency, x.frequency, round2(x.revenue), x.rScore, x.fScore, x.mScore, x.rfmSegment])]);
const cohortLongRows = [];
for (const cohort of cohorts) for (const [monthNumber, activeCustomers] of [...cohort.offsets.entries()].sort((a, b) => a[0] - b[0])) cohortLongRows.push([cohort.cohort, monthNumber, activeCustomers, cohort.customers, Math.round(activeCustomers / cohort.customers * 10000) / 10000]);
await writeCsv(path.join("..", "processed", "cohort_retention.csv"), [["cohort_month", "month_number", "active_customers", "cohort_size", "retention_rate"], ...cohortLongRows]);

const workbook = Workbook.create();
const dashboard = workbook.worksheets.add("Dashboard");
const targetSheet = workbook.worksheets.add("Targets & Variance");
const rfmSheet = workbook.worksheets.add("Customer RFM");
const cohortSheet = workbook.worksheets.add("Cohort Retention");
const monthSheet = workbook.worksheets.add("Monthly Analysis");
const categorySheet = workbook.worksheets.add("Category Analysis");
const regionSheet = workbook.worksheets.add("Region Analysis");
const customerSheet = workbook.worksheets.add("Customer Analysis");
const validationSheet = workbook.worksheets.add("Validation");
const dictionary = workbook.worksheets.add("Data Dictionary");

const font = "Arial";
for (const s of [dashboard, targetSheet, rfmSheet, cohortSheet, monthSheet, categorySheet, regionSheet, customerSheet, validationSheet, dictionary]) {
  s.showGridLines = false;
}

monthSheet.getRange("A1:L25").values = [["Month", "Gross Sales", "Net Revenue", "Gross Profit", "Contribution Profit", "Total Orders", "Completed Orders", "AOV", "Returned Orders", "Cancelled Orders", "Return Rate", "MoM Net Revenue"], ...monthly.map((m, i) => [m.month, round2(m.gross), round2(m.net), round2(m.profit), round2(m.contribution), m.orders, m.completed, round2(m.net / m.completed), m.returns, m.cancels, m.returns / m.orders, i === 0 ? null : (m.net / monthly[i - 1].net) - 1])];
monthSheet.tables.add("A1:L25", true, "MonthlyTable").style = "TableStyleMedium2";
monthSheet.getRange("B2:E25").format.numberFormat = "$#,##0.00";
monthSheet.getRange("H2:H25").format.numberFormat = "$#,##0.00";
monthSheet.getRange("F2:G25").format.numberFormat = "#,##0";
monthSheet.getRange("I2:J25").format.numberFormat = "#,##0";
monthSheet.getRange("K2:L25").format.numberFormat = "0.0%";
monthSheet.freezePanes.freezeRows(1);
monthSheet.getRange("A1:L25").format.autofitColumns();

function writeSummary(sheet, rows, tableName) {
  sheet.getRange(`A1:F${rows.length + 1}`).values = [["Name", "Net Revenue", "Gross Profit", "Contribution Profit", "Lost Revenue", "Orders"], ...rows.map((x) => [x.key, round2(x.net), round2(x.profit), round2(x.contribution), round2(x.lost), x.orders])];
  sheet.tables.add(`A1:F${rows.length + 1}`, true, tableName).style = "TableStyleMedium2";
  sheet.getRange(`B2:E${rows.length + 1}`).format.numberFormat = "$#,##0.00";
  sheet.getRange(`F2:F${rows.length + 1}`).format.numberFormat = "#,##0";
  sheet.getRange(`A1:F${rows.length + 1}`).format.autofitColumns();
  sheet.freezePanes.freezeRows(1);
}
writeSummary(categorySheet, categories, "CategoryTable");
writeSummary(regionSheet, regions, "RegionTable");
customerSheet.getRange(`A1:F${customerSummary.length + 1}`).values = [["Customer ID", "Customer Name", "Segment", "Net Revenue", "Gross Profit", "Orders"], ...customerSummary.map((x) => {
  const [customerId, customerName, segment] = x.key.split("|");
  return [customerId, customerName, segment, round2(x.net), round2(x.profit), x.orders];
})];
customerSheet.tables.add(`A1:F${customerSummary.length + 1}`, true, "CustomerTable").style = "TableStyleMedium2";
customerSheet.getRange(`D2:E${customerSummary.length + 1}`).format.numberFormat = "$#,##0.00";
customerSheet.getRange(`F2:F${customerSummary.length + 1}`).format.numberFormat = "#,##0";
customerSheet.getRange(`A1:F${customerSummary.length + 1}`).format.autofitColumns();
customerSheet.freezePanes.freezeRows(1);

targetSheet.getRange("A1:I25").values = [["Month", "Net Revenue", "Revenue Target", "Revenue Variance", "Revenue Attainment", "Contribution Profit", "Contribution Target", "Contribution Variance", "Contribution Attainment"], ...targetAnalysis.map((x) => [x.month, round2(x.net), round2(x.revenueTarget), round2(x.net - x.revenueTarget), x.net / x.revenueTarget, round2(x.contribution), round2(x.contributionTarget), round2(x.contribution - x.contributionTarget), x.contribution / x.contributionTarget])];
targetSheet.tables.add("A1:I25", true, "TargetVarianceTable").style = "TableStyleMedium2";
targetSheet.getRange("B2:D25").format.numberFormat = "$#,##0.00";
targetSheet.getRange("F2:H25").format.numberFormat = "$#,##0.00";
targetSheet.getRange("E2:E25").format.numberFormat = "0.0%";
targetSheet.getRange("I2:I25").format.numberFormat = "0.0%";
targetSheet.getRange("A1:I25").format.autofitColumns();
targetSheet.getRange("D2:D25").conditionalFormats.add("cellIs", { operator: "lessThan", formula: 0, format: { fill: "#FEE2E2", font: { color: "#B91C1C" } } });
targetSheet.freezePanes.freezeRows(1);

const rfmRows = rfm.slice(0, 60);
rfmSheet.getRange(`A1:L${rfmRows.length + 1}`).values = [["Customer ID", "Customer Name", "Segment", "Acquisition Channel", "Last Purchase", "Recency Days", "Orders", "Revenue", "R Score", "F Score", "M Score", "RFM Segment"], ...rfmRows.map((x) => [x.id, x.name, x.segment, x.channel, x.last, x.recency, x.frequency, round2(x.revenue), x.rScore, x.fScore, x.mScore, x.rfmSegment])];
rfmSheet.tables.add(`A1:L${rfmRows.length + 1}`, true, "RFMTable").style = "TableStyleMedium2";
rfmSheet.getRange(`H2:H${rfmRows.length + 1}`).format.numberFormat = "$#,##0.00";
rfmSheet.getRange(`A1:L${rfmRows.length + 1}`).format.autofitColumns();
rfmSheet.freezePanes.freezeRows(1);

const cohortOffsets = [0, 1, 2, 3, 6, 12];
cohortSheet.getRange(`A1:H${cohorts.length + 1}`).values = [["Cohort", "Customers", ...cohortOffsets.map((x) => `Month ${x}`)], ...cohorts.map((x) => [x.cohort, x.customers, ...cohortOffsets.map((offset) => (x.offsets.get(offset) ?? 0) / x.customers)])];
cohortSheet.tables.add(`A1:H${cohorts.length + 1}`, true, "CohortTable").style = "TableStyleMedium2";
cohortSheet.getRange(`C2:H${cohorts.length + 1}`).format.numberFormat = "0.0%";
cohortSheet.getRange(`A1:H${cohorts.length + 1}`).format.autofitColumns();
cohortSheet.getRange(`C2:H${cohorts.length + 1}`).conditionalFormats.add("colorScale", { colors: ["#F8FAFC", "#99F6E4", "#0F766E"], thresholds: ["min", { type: "percentile", value: 50 }, "max"] });
cohortSheet.freezePanes.freezeRows(1);

const orderIds = new Set(orders.map((x) => x[0]));
const productIds = new Set(products.map((x) => x.product_id));
const validationRows = [
  ["Orders", orders.length, 5200, orders.length === 5200 ? "Pass" : "Review"],
  ["Order items", orderItems.length, "> 0", orderItems.length > 0 ? "Pass" : "Review"],
  ["Duplicate order IDs", orders.length - orderIds.size, 0, orders.length === orderIds.size ? "Pass" : "Review"],
  ["Orphan order items", orderItems.filter((x) => !orderIds.has(x[1])).length, 0, orderItems.every((x) => orderIds.has(x[1])) ? "Pass" : "Review"],
  ["Invalid product keys", orderItems.filter((x) => !productIds.has(x[2])).length, 0, orderItems.every((x) => productIds.has(x[2])) ? "Pass" : "Review"],
  ["Invalid discounts", orderItems.filter((x) => x[6] < 0 || x[6] > 1).length, 0, orderItems.every((x) => x[6] >= 0 && x[6] <= 1) ? "Pass" : "Review"],
  ["Minimum order date", orders.map((x) => x[1]).sort()[0], "2024-01-01 or later", "Pass"],
  ["Maximum order date", orders.map((x) => x[1]).sort().at(-1), "2025-12-31 or earlier", "Pass"],
  ["Net revenue reconciliation", round2(facts.reduce((s, x) => s + x.net, 0)), round2(monthly.reduce((s, x) => s + x.net, 0)), "Pass"],
];
validationSheet.getRange(`A1:D${validationRows.length + 1}`).values = [["Check", "Actual", "Expected", "Status"], ...validationRows];
validationSheet.tables.add(`A1:D${validationRows.length + 1}`, true, "ValidationTable").style = "TableStyleMedium2";
validationSheet.getRange(`A1:D${validationRows.length + 1}`).format.autofitColumns();
validationSheet.getRange(`D2:D${validationRows.length + 1}`).conditionalFormats.add("containsText", { text: "Review", format: { fill: "#FEE2E2", font: { bold: true, color: "#B91C1C" } } });

dashboard.mergeCells("A2:H2");
dashboard.getRange("A2:H2").values = [["E-commerce Sales & Customer Revenue Analytics"]];
dashboard.getRange("A2:H2").format.font = { name: font, size: 16, bold: true, color: "#0F172A" };
dashboard.getRange("A3:H3").format.borders = { bottom: { style: "thin", color: "#94A3B8" } };
dashboard.getRange("A5:H5").values = [["Net Revenue", "", "Orders", "", "Average Order Value", "", "Gross Profit", ""]];
dashboard.getRange("A6:H6").formulas = [["=SUM('Monthly Analysis'!$C$2:$C$25)", "", "=SUM('Monthly Analysis'!$F$2:$F$25)", "", "=A6/SUM('Monthly Analysis'!$G$2:$G$25)", "", "=SUM('Monthly Analysis'!$D$2:$D$25)", ""]];
dashboard.getRange("A5:H5").format = { fill: "#0F766E", font: { name: font, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };
dashboard.getRange("A6:H6").format = { fill: "#F0FDFA", font: { name: font, size: 14, bold: true, color: "#0F172A" }, horizontalAlignment: "center", numberFormat: "$#,##0" };
dashboard.getRange("C6:C6").format.numberFormat = "#,##0";
dashboard.getRange("A8:H8").values = [["Return Rate", "", "Cancellation Rate", "", "Revenue Lost", "", "Gross Margin", ""]];
dashboard.getRange("A9:H9").formulas = [["=SUM('Monthly Analysis'!$I$2:$I$25)/SUM('Monthly Analysis'!$F$2:$F$25)", "", "=SUM('Monthly Analysis'!$J$2:$J$25)/SUM('Monthly Analysis'!$F$2:$F$25)", "", "=SUM('Category Analysis'!$E$2:$E$5)", "", "=G6/A6", ""]];
dashboard.getRange("A8:H8").format = { fill: "#334155", font: { name: font, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };
dashboard.getRange("A9:H9").format = { fill: "#F8FAFC", font: { name: font, size: 14, bold: true, color: "#0F172A" }, horizontalAlignment: "center", numberFormat: "0.0%" };
dashboard.getRange("E9:E9").format.numberFormat = "$#,##0";
dashboard.mergeCells("A12:H12");
dashboard.getRange("A12:H12").values = [["Dashboard scope: 2024-01-01 to 2025-12-31. Net revenue recognizes completed orders only. Synthetic dataset for portfolio use."]];
dashboard.getRange("A12:H12").format.font = { name: font, size: 9, italic: true, color: "#475569" };
dashboard.getRange("A:H").format.columnWidth = 17;
dashboard.getRange("A1:H46").format.font = { name: font, size: 10, color: "#1F2937" };
dashboard.getRange("A2").format.font = { name: font, size: 16, bold: true, color: "#0F172A" };
dashboard.getRange("A12").format.font = { name: font, size: 9, italic: true, color: "#475569" };
dashboard.getRange("J1:K25").values = [["Month", "Net Revenue"], ...monthly.map((m) => [m.month, round2(m.net)])];
dashboard.getRange("J:K").format.columnWidth = 2;
dashboard.getRange("J1:K25").format.font = { name: font, size: 1, color: "#FFFFFF" };

const lineChart = dashboard.charts.add("line", dashboard.getRange("J1:K25"));
lineChart.title = "Monthly Net Revenue";
lineChart.titleTextStyle.fontSize = 12;
lineChart.titleTextStyle.typeface = font;
lineChart.hasLegend = false;
lineChart.yAxis = { numberFormatCode: "$0," + '"K"', numberFormatSourceLinked: false, textStyle: { typeface: font, fontSize: 9 } };
lineChart.setPosition("A14", "H29");

const categoryChart = dashboard.charts.add("bar", [categorySheet.getRange("A1:A5"), categorySheet.getRange("B1:B5")]);
categoryChart.title = "Net Revenue by Category";
categoryChart.titleTextStyle.fontSize = 12;
categoryChart.titleTextStyle.typeface = font;
categoryChart.hasLegend = false;
categoryChart.yAxis = { numberFormatCode: "$0," + '"K"', numberFormatSourceLinked: false, textStyle: { typeface: font, fontSize: 9 } };
categoryChart.setPosition("A31", "H45");

const dictionaryRows = [
  ["Table", "Field", "Definition"],
  ["orders", "order_status", "Completed, Returned, or Cancelled at order level"],
  ["order_items", "discount_pct", "Line-level discount as a decimal"],
  ["sales_fact", "gross_sales", "quantity × unit price"],
  ["sales_fact", "booked_revenue", "gross sales less discount"],
  ["sales_fact", "net_revenue", "booked revenue for completed orders; zero otherwise"],
  ["sales_fact", "lost_revenue", "booked revenue removed by returns or cancellations"],
  ["sales_fact", "cogs", "unit cost × quantity for completed orders"],
  ["sales_fact", "gross_profit", "net revenue less COGS"],
  ["sales_fact", "contribution_profit", "gross profit less allocated shipping and return/cancellation processing cost"],
  ["orders", "delivery_days_late", "days actual delivery exceeded promised delivery date"],
  ["targets", "revenue_target", "synthetic monthly revenue target by territory"],
  ["customer", "RFM segment", "behavior segment based on recency, frequency, and monetary quintiles"],
  ["project", "source", "Deterministic synthetic dataset generated for portfolio use"],
];
dictionary.getRange(`A1:C${dictionaryRows.length}`).values = dictionaryRows;
dictionary.tables.add(`A1:C${dictionaryRows.length}`, true, "DictionaryTable").style = "TableStyleMedium2";
dictionary.getRange(`A1:C${dictionaryRows.length}`).format.autofitColumns();
dictionary.getRange("C:C").format.columnWidth = 55;
dictionary.getRange("C2:C20").format.wrapText = true;

workbook.recalculate();
const inspect = await workbook.inspect({ kind: "table", sheetId: "Dashboard", range: "A2:H12", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 10, maxChars: 6000 });
await fs.writeFile(path.join(outputDir, "workbook_check.ndjson"), inspect.ndjson, "utf8");
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
await fs.writeFile(path.join(outputDir, "formula_error_scan.ndjson"), errors.ndjson, "utf8");
for (const sheet of [dashboard, targetSheet, rfmSheet, cohortSheet, monthSheet, categorySheet, regionSheet, customerSheet, validationSheet, dictionary]) {
  const preview = await workbook.render(sheet.name === "Dashboard" ? { sheetName: sheet.name, range: "A1:H46", scale: 1, format: "png" } : { sheetName: sheet.name, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheet.name.toLowerCase().replaceAll(" ", "_")}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, "ecommerce_sales_analytics.xlsx"));

const totals = {
  orders: orders.length,
  order_items: orderItems.length,
  customers: customers.length,
  products: products.length,
  net_revenue: round2(facts.reduce((s, f) => s + f.net, 0)),
  gross_profit: round2(facts.reduce((s, f) => s + f.profit, 0)),
  contribution_profit: round2(facts.reduce((s, f) => s + f.contributionProfit, 0)),
  lost_revenue: round2(facts.reduce((s, f) => s + f.lost, 0)),
};
await fs.writeFile(path.join(outputDir, "build_summary.json"), JSON.stringify(totals, null, 2), "utf8");
console.log(JSON.stringify(totals, null, 2));
