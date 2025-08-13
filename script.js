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

// ==========================
// Firebase Initialization
// ==========================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ==========================
// Safe Plugin Registration
// ==========================
if (window['chartjs-plugin-zoom']) {
  Chart.register(window['chartjs-plugin-zoom']);
} else {
  console.warn("chartjs-plugin-zoom plugin not found. Zoom features will be disabled.");
}

// ==========================
// DOM Elements
// ==========================
const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authMessage = document.getElementById('authMessage');

// KPI Cards
const kpiSpend = document.getElementById('kpiSpend');
const kpiSales = document.getElementById('kpiSales');
const kpiOrders = document.getElementById('kpiOrders');
const kpiACOS = document.getElementById('kpiACOS');
const kpiCTR = document.getElementById('kpiCTR');

// Filters
const monthFilter = document.getElementById('monthFilter');
const storeFilter = document.getElementById('storeFilter');

// ==========================
// Data Storage and Chart Instances
// ==========================
let allData = [];
let barChartInstance;
let lineChart1Instance;
let lineChart2Instance;

// ==========================
// Auth Listeners
// ==========================
signupButton.addEventListener('click', (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      authMessage.textContent = "Signup successful!";
    })
    .catch((error) => {
      authMessage.textContent = error.message;
    });
});

loginButton.addEventListener('click', (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      authMessage.textContent = "";
    })
    .catch((error) => {
      authMessage.textContent = error.message;
    });
});

logoutButton.addEventListener('click', () => {
  auth.signOut();
});

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.style.display = 'none';
    dashboardContainer.classList.remove('hidden');
    fetchCSVFromGitHub(); // ✅ Call it correctly now
  } else {
    loginContainer.style.display = 'block';
    dashboardContainer.classList.add('hidden');
  }
});

// ==========================
// Fetch CSV from Google Drive
// ==========================
function fetchCSVFromGitHub() {
  const CSV_URL = "https://drive.google.com/uc?export=download&id=1ZIWJs3YikGMRtUqcTokRKqtIR6u2SsQ5w5HCgwf88CE";

  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      allData = results.data;
      console.log("✅ CSV Data Loaded", allData);
      updateDashboard(allData);
    },
    error: function(err) {
      console.error("❌ CSV Load Error:", err);
    }
  });
}

// ==========================
// Update Dashboard
// ==========================
function updateDashboard(data) {
  const uniqueMonths = [...new Set(data.map(row => row.Date.slice(3)))];
  const uniqueStores = [...new Set(data.map(row => row.Store))];

  monthFilter.innerHTML = `<option value="All">All</option>` + 
    uniqueMonths.map(m => `<option value="${m}">${m}</option>`).join('');
  storeFilter.innerHTML = `<option value="All">All</option>` + 
    uniqueStores.map(s => `<option value="${s}">${s}</option>`).join('');

  monthFilter.onchange = () => applyFilters(data);
  storeFilter.onchange = () => applyFilters(data);

  applyFilters(data);
}

// ==========================
// Apply Filter Logic
// ==========================
function applyFilters(data) {
  const selectedMonth = monthFilter.value;
  const selectedStore = storeFilter.value;

  let filtered = data;

  if (selectedMonth !== "All") {
    filtered = filtered.filter(row => row.Date.endsWith(selectedMonth));
  }

  if (selectedStore !== "All") {
    filtered = filtered.filter(row => row.Store === selectedStore);
  }

  updateKPIs(filtered);
  renderBarChart(filtered);
  renderLineChart(filtered);
  populateTable(filtered);
}

// ==========================
// Update KPI Cards
// ==========================
function updateKPIs(data) {
  const totalSpend = data.reduce((sum, row) => sum + parseFloat(row.Spend || 0), 0);
  const totalSales = data.reduce((sum, row) => sum + parseFloat(row.Sales || 0), 0);
  const totalOrders = data.reduce((sum, row) => sum + parseInt(row["7 Day Total Orders (#)"] || 0), 0);
  const avgACOS = totalSales ? ((totalSpend / totalSales) * 100).toFixed(2) + '%' : '0%';
  const avgCTR = data.reduce((sum, row) => sum + parseFloat(row["CTR"] || 0), 0) / data.length;

  kpiSpend.textContent = "$" + totalSpend.toFixed(2);
  kpiSales.textContent = "$" + totalSales.toFixed(2);
  kpiOrders.textContent = totalOrders;
  kpiACOS.textContent = avgACOS;
  kpiCTR.textContent = avgCTR.toFixed(2) + "%";
}

// ==========================
// Populate Table
// ==========================
function populateTable(data) {
  const tableBody = document.querySelector("#dataTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.Date}</td>
      <td>${row.Store}</td>
      <td>${row["Campaign Name"] || ""}</td>
      <td>${row.Spend || "0"}</td>
      <td>${row.Sales || "0"}</td>
      <td>${row["7 Day Total Orders (#)"] || "0"}</td>
      <td>${row["CTR"] || "0"}</td>
    `;
    tableBody.appendChild(tr);
  });

  if ($.fn.DataTable.isDataTable('#dataTable')) {
    $('#dataTable').DataTable().clear().destroy();
  }
  $('#dataTable').DataTable();
}

// ==========================
// Stub for Charts
// ==========================
function renderBarChart(data) {
  // Your chart logic
}

function renderLineChart(data) {
  // Your chart logic
}
