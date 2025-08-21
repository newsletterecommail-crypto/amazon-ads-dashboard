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

const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');

const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const authMessage = document.getElementById('authMessage');

signupButton.addEventListener('click', () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => authMessage.textContent = 'Signed up successfully!')
    .catch(error => authMessage.textContent = error.message);
});

loginButton.addEventListener('click', () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => authMessage.textContent = '')
    .catch(error => authMessage.textContent = error.message);
});

logoutButton.addEventListener('click', () => {
  auth.signOut();
});

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    // Ensures dashboard is rendered before script runs
    setTimeout(() => fetchCSVFromGitHub(), 50);
  } else {
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
  }
});

// ==========================
// CSV Fetch & Init
// ==========================
let allData = [];

function fetchCSVFromGitHub() {
  const CSV1 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part1.csv";
  const CSV2 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part2.csv";

  Promise.all([
    fetch(CSV1).then(r => r.text()),
    fetch(CSV2).then(r => r.text())
  ]).then(([text1, text2]) => {
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
}

// ==========================
// Init Dashboard
// ==========================
function initDashboard(data) {
  populateFilters(data);
  applyFilters();
  $('#dataTable').DataTable();
}

// ==========================
// Filters
// ==========================
function populateFilters(data) {
  const monthSet = new Set();
  const storeSet = new Set();

  data.forEach(row => {
    const dt = new Date(row["Date"]);
    if (!isNaN(dt)) {
      const m = ("0" + (dt.getMonth() + 1)).slice(-2);
      const y = dt.getFullYear();
      monthSet.add(`${y}-${m}`);
    }
    storeSet.add(row["Store"]);
  });

  const monthFilter = document.getElementById("monthFilter");
  const storeFilter = document.getElementById("storeFilter");

  [...monthSet].sort().forEach(month => {
    const opt = document.createElement("option");
    opt.value = month;
    opt.text = month;
    monthFilter.appendChild(opt);
  });

  [...storeSet].sort().forEach(store => {
    const opt = document.createElement("option");
    opt.value = store;
    opt.text = store;
    storeFilter.appendChild(opt);
  });

  // Initialize Choices and only trigger filtering *after* rendering completes
  const monthChoices = new Choices("#monthFilter", {
    removeItemButton: true,
    shouldSort: false
  });

  const storeChoices = new Choices("#storeFilter", {
    removeItemButton: true,
    shouldSort: false
  });

  // Wait for next frame to let DOM render
  requestAnimationFrame(() => {
    applyFilters();

    // Bind change handlers AFTER first render
    monthFilter.addEventListener("change", applyFilters);
    storeFilter.addEventListener("change", applyFilters);
  });
}

// ==========================
// Apply Filters
// ==========================
function applyFilters() {
  const selectedMonths = Array.from(document.getElementById("monthFilter").selectedOptions).map(o => o.value);
  const selectedStores = Array.from(document.getElementById("storeFilter").selectedOptions).map(o => o.value);

  const filtered = allData.filter(row => {
    const dt = new Date(row["Date"]);
    const m = ("0" + (dt.getMonth() + 1)).slice(-2);
    const y = dt.getFullYear();
    const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(`${y}-${m}`);
    const storeMatch = selectedStores.length === 0 || selectedStores.includes(row["Store"]);
    return monthMatch && storeMatch;
  });

  updateKPIs(filtered);
  updateTable(filtered);
  updatePivot(filtered);
}

// ==========================
// Update KPIs
// ==========================
function updateKPIs(data) {
  let totalSpend = 0, totalSales = 0, totalOrders = 0, totalClicks = 0, totalImpressions = 0;

  data.forEach(row => {
    const spend = parseFloat(row["Spend"]) || 0;
    const sales = parseFloat(row["7 Day Total Sales "]) || 0;
    const orders = parseInt(row["7 Day Total Orders (#)"]) || 0;
    const clicks = parseInt(row["Clicks"]) || 0;
    const impressions = parseInt(row["Impressions"]) || 0;

    totalSpend += spend;
    totalSales += sales;
    totalOrders += orders;
    totalClicks += clicks;
    totalImpressions += impressions;
  });

  const avgACOS = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  document.getElementById("kpiSpend").textContent = totalSpend.toFixed(2);
  document.getElementById("kpiSales").textContent = totalSales.toFixed(2);
  document.getElementById("kpiOrders").textContent = totalOrders;
  document.getElementById("kpiACOS").textContent = avgACOS.toFixed(2) + "%";
  document.getElementById("kpiCTR").textContent = avgCTR.toFixed(2) + "%";
}

// ==========================
// Update Data Table
// ==========================
function updateTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row["Date"]}</td>
      <td>${row["Store"]}</td>
      <td>${row["Campaign Name"]}</td>
      <td>${parseFloat(row["Spend"]).toFixed(2)}</td>
      <td>${parseFloat(row["7 Day Total Sales "]).toFixed(2)}</td>
      <td>${row["7 Day Total Orders (#)"]}</td>
      <td>${parseFloat(row["Click-Thru Rate (CTR)"]).toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  });

  if ($.fn.DataTable.isDataTable('#dataTable')) {
    $('#dataTable').DataTable().clear().destroy();
  }
  $('#dataTable').DataTable();
}

// ==========================
// Pivot Table
// ==========================
function updatePivot(data) {
  const summary = {};

  data.forEach(row => {
    const store = row["Store"];
    const spend = parseFloat(row["Spend"]) || 0;
    const sales = parseFloat(row["7 Day Total Sales "]) || 0;

    if (!summary[store]) summary[store] = { spend: 0, sales: 0 };
    summary[store].spend += spend;
    summary[store].sales += sales;
  });

  const tbody = document.querySelector("#pivotTable tbody");
  tbody.innerHTML = "";

  for (const store in summary) {
    const { spend, sales } = summary[store];
    const acos = sales > 0 ? (spend / sales) * 100 : 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${store}</td>
      <td>${spend.toFixed(2)}</td>
      <td>${sales.toFixed(2)}</td>
      <td>${acos.toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  }
}
