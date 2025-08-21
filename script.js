// ==========================
// Firebase Configuration
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyA0831NjwrFfuceFgcg7ur2sVqOBkrAg1Y",
  authDomain: "ecom-ads-dashboard.firebaseapp.com",
  projectId: "ecom-ads-dashboard",
  storageBucket: "ecom-ads-dashboard.appspot.com",
  messagingSenderId: "98800254885",
  appId: "1:98800254885:web:887b2679a23362f8b6b24c",
  measurementId: "G-42KBT0D9ET"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ==========================
// Chart Zoom Plugin Safety
// ==========================
if (window['chartjs-plugin-zoom']) {
  Chart.register(window['chartjs-plugin-zoom']);
} else {
  console.warn("chartjs-plugin-zoom plugin not found. Zoom features will be disabled.");
}

// ==========================
// Global Variables
// ==========================
let allData = [], filteredData = [], monthSet = new Set(), storeSet = new Set();

window.onload = () => {
  const CSV1 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part1.csv";
  const CSV2 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part2.csv";

  Promise.all([fetch(CSV1).then(r => r.text()), fetch(CSV2).then(r => r.text())])
    .then(([text1, text2]) => {
      Papa.parse(text1, {
        header: true,
        skipEmptyLines: true,
        complete: res1 => {
          Papa.parse(text2, {
            header: true,
            skipEmptyLines: true,
            complete: res2 => {
              allData = res1.data.concat(res2.data);
              initDashboard(allData);
            }
          });
        }
      });
    });
};

// ==========================
// Dashboard Initialization
// ==========================
function initDashboard(data) {
  const monthFilter = document.getElementById("monthFilter");
  const storeFilter = document.getElementById("storeFilter");

  data.forEach(row => {
    const dt = new Date(row["Date"]);
    if (!isNaN(dt)) {
      const month = (dt.getMonth() + 1).toString().padStart(2, "0") + "-" + dt.getFullYear();
      monthSet.add(month);
    }
    if (row["Store"]) storeSet.add(row["Store"].trim());
  });

  [...monthSet].sort().forEach(m => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = m;
    monthFilter.appendChild(opt);
  });

  [...storeSet].sort().forEach(s => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = s;
    storeFilter.appendChild(opt);
  });

  applyFilters();
  monthFilter.addEventListener("change", applyFilters);
  storeFilter.addEventListener("change", applyFilters);
}

// ==========================
// Filters and Render
// ==========================
function applyFilters() {
  const monthVal = document.getElementById("monthFilter").value;
  const storeVal = document.getElementById("storeFilter").value;

  filteredData = allData.filter(row => {
    const dt = new Date(row["Date"]);
    const m = ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + dt.getFullYear();
    return (!monthVal || m === monthVal) && (!storeVal || row["Store"].trim() === storeVal);
  });

  updateKPIs();
  updateDataTable();
  updateStoreSummary();
}

function toFloat(val) {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/[^0-9.-]+/g, "")) || 0;
}

function updateKPIs() {
  let totalSpend = 0, totalSales = 0, totalOrders = 0, totalACOS = 0, totalCTR = 0, validACOS = 0, validCTR = 0;

  filteredData.forEach(row => {
    totalSpend += toFloat(row["Spend"]);
    totalSales += toFloat(row["7 Day Total Sales "]);
    totalOrders += toFloat(row["7 Day Total Orders (#)"]);

    const acos = toFloat(row["Total Advertising Cost of Sales (ACOS) "]);
    const ctr = toFloat(row["Click-Thru Rate (CTR)"]);
    if (acos) { totalACOS += acos; validACOS++; }
    if (ctr) { totalCTR += ctr; validCTR++; }
  });

  document.getElementById("totalSpend").textContent = `$${totalSpend.toFixed(2)}`;
  document.getElementById("totalSales").textContent = `$${totalSales.toFixed(2)}`;
  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("avgACOS").textContent = validACOS ? `${(totalACOS / validACOS).toFixed(2)}%` : "0%";
  document.getElementById("avgCTR").textContent = validCTR ? `${(totalCTR / validCTR).toFixed(2)}%` : "0%";
}

function updateDataTable() {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  filteredData.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row["Date"]}</td>
      <td>${row["Store"]}</td>
      <td>${row["Campaign Name"]}</td>
      <td>${toFloat(row["Spend"]).toFixed(2)}</td>
      <td>${toFloat(row["7 Day Total Sales "]).toFixed(2)}</td>
      <td>${toFloat(row["7 Day Total Orders (#)"])}</td>
      <td>${row["Click-Thru Rate (CTR)"] || "0%"}</td>
      <td>${row["Total Advertising Cost of Sales (ACOS) "] || "0%"}</td>
    `;
    tbody.appendChild(tr);
  });

  $("#dataTable").DataTable();
}

function updateStoreSummary() {
  const summary = {};

  filteredData.forEach(row => {
    const store = row["Store"].trim();
    if (!summary[store]) summary[store] = { spend: 0, sales: 0 };
    summary[store].spend += toFloat(row["Spend"]);
    summary[store].sales += toFloat(row["7 Day Total Sales "]);
  });

  const tbody = document.querySelector("#storeSummary tbody");
  tbody.innerHTML = "";

  for (const [store, val] of Object.entries(summary)) {
    const acos = val.sales > 0 ? (val.spend / val.sales) * 100 : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${store}</td>
      <td>$${val.spend.toFixed(2)}</td>
      <td>$${val.sales.toFixed(2)}</td>
      <td>${acos.toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  }
}
