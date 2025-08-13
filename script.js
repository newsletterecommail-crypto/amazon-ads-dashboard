// Firebase configuration placeholder.
// TODO: Replace the following values with your Firebase project configuration.
// Updated with your Firebase project credentials.
// Replace these values with your own if they change in the future.
const firebaseConfig = {
  apiKey: "AIzaSyA0831NjwrFfuceFgcg7ur2sVqOBkrAg1Y",
  authDomain: "ecom-ads-dashboard.firebaseapp.com",
  projectId: "ecom-ads-dashboard",
  storageBucket: "ecom-ads-dashboard.firebasestorage.app",
  messagingSenderId: "98800254885",
  appId: "1:98800254885:web:887b2679a23362f8b6b24c",
  measurementId: "G-42KBT0D9ET"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// DOM elements
const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authMessage = document.getElementById('authMessage');

// KPI elements
const kpiSpend = document.getElementById('kpiSpend');
const kpiSales = document.getElementById('kpiSales');
const kpiOrders = document.getElementById('kpiOrders');
const kpiACOS = document.getElementById('kpiACOS');
const kpiCTR = document.getElementById('kpiCTR');

// Register the Chart.js zoom plugin
Chart.register(window['chartjs-plugin-zoom']);

// Filter elements
const monthFilter = document.getElementById('monthFilter');
const storeFilter = document.getElementById('storeFilter');

// Data storage
let allData = [];

// Chart instances
let barChartInstance;
let lineChart1Instance;
let lineChart2Instance;

/**
 * Populate month and store dropdowns based on the data.
 */
function populateFilters(data) {
  const monthSet = new Set();
  const storeSet = new Set();
  data.forEach((row) => {
    if (row['Store']) {
      storeSet.add(row['Store']);
    }
    // Derive YYYY‑MM from the date string
    let dateStr = String(row['Date']).replace(/\//g, '-');
    const parts = dateStr.split('-');
    let year, month, day;
    if (parts.length === 3) {
      if (parseInt(parts[1]) > 12) {
        year = parseInt(parts[0]);
        month = parseInt(parts[2]);
        day = parseInt(parts[1]);
      } else {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      }
    } else {
      const d = new Date(dateStr);
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }
    const monthStr = `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}`;
    monthSet.add(monthStr);
  });

  // Populate month filter
  monthFilter.innerHTML = '';
  const defaultOptionM = document.createElement('option');
  defaultOptionM.value = 'All';
  defaultOptionM.textContent = 'All';
  monthFilter.appendChild(defaultOptionM);
  Array.from(monthSet).sort().forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    monthFilter.appendChild(opt);
  });

  // Populate store filter
  storeFilter.innerHTML = '';
  const defaultOptionS = document.createElement('option');
  defaultOptionS.value = 'All';
  defaultOptionS.textContent = 'All';
  storeFilter.appendChild(defaultOptionS);
  Array.from(storeSet).sort().forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    storeFilter.appendChild(opt);
  });

  // Attach change listeners
  monthFilter.addEventListener('change', applyFilters);
  storeFilter.addEventListener('change', applyFilters);
}

/**
 * Apply month/store filters and trigger re‑render.
 */
function applyFilters() {
  let filtered = allData;
  const monthVal = monthFilter.value;
  const storeVal = storeFilter.value;

  // Filter by month (YYYY‑MM)
  if (monthVal && monthVal !== 'All') {
    filtered = filtered.filter((row) => {
      let dateStr = String(row['Date']).replace(/\//g, '-');
      const parts = dateStr.split('-');
      let year, month;
      if (parts.length === 3) {
        if (parseInt(parts[1]) > 12) {
          year = parseInt(parts[0]);
          month = parseInt(parts[2]);
        } else {
          month = parseInt(parts[1]);
          year = parseInt(parts[2]);
        }
      } else {
        const d = new Date(dateStr);
        year = d.getFullYear();
        month = d.getMonth() + 1;
      }
      const monthStr = `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}`;
      return monthStr === monthVal;
    });
  }

  // Filter by store
  if (storeVal && storeVal !== 'All') {
    filtered = filtered.filter((row) => row['Store'] === storeVal);
  }

  computeAndRender(filtered);
}

/**
 * Firebase auth helper functions.
 */
function signup() {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      authMessage.textContent = "Sign‑up successful! You are now logged in.";
    })
    .catch((error) => {
      authMessage.textContent = error.message;
    });
}

function login() {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      authMessage.textContent = "Login successful!";
    })
    .catch((error) => {
      authMessage.textContent = error.message;
    });
}

function logout() {
  auth.signOut();
}

// Attach event listeners
signupButton.addEventListener('click', signup);
loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);

/**
 * Observe authentication state and load data upon login.
 */
auth.onAuthStateChanged((user) => {
  if (user) {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    authMessage.textContent = '';
    if (!barChartInstance) {
      loadDataAndRender();
    }
  } else {
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    authMessage.textContent = '';
  }
});

/**
 * Parse CSV file and trigger rendering functions.
 */
function loadDataAndRender() {
  Papa.parse('Products_Search_Term.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      const data = results.data;
      allData = data;
      populateFilters(data);
      applyFilters();
    },
    error: function (err) {
      console.error('Error parsing CSV:', err);
    }
  });
}

/**
 * Compute metrics, update KPIs, draw charts and refresh the table.
 */
function computeAndRender(data) {
  let totalSpend = 0;
  let totalSales = 0;
  let totalOrders = 0;
  let totalClicks = 0;
  let totalImpressions = 0;

  const dailyMap = {};
  const campaignMap = {};

  data.forEach((row) => {
    const spend = parseFloat(String(row['Spend']).replace(/,/g, '')) || 0;
    const sales = parseFloat(String(row['7 Day Total Sales ']).replace(/,/g, '')) || 0;
    const orders = parseInt(String(row['7 Day Total Orders (#)']).replace(/,/g, '')) || 0;
    const clicks = parseFloat(String(row['Clicks']).replace(/,/g, '')) || 0;
    const impressions = parseFloat(String(row['Impressions']).replace(/,/g, '')) || 0;

    totalSpend += spend;
    totalSales += sales;
    totalOrders += orders;
    totalClicks += clicks;
    totalImpressions += impressions;

    // Normalize date to yyyy‑mm‑dd
    let dateStr = String(row['Date']).replace(/\//g, '-');
    const parts = dateStr.split('-');
    let year, month, day;
    if (parts.length === 3) {
      if (parseInt(parts[1]) > 12) {
        year = parseInt(parts[0]);
        month = parseInt(parts[2]) - 1;
        day = parseInt(parts[1]);
      } else {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
      }
    } else {
      const d = new Date(dateStr);
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }
    const dateObj = new Date(year, month, day);
    const dateKey = dateObj.toISOString().split('T')[0];

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { spend: 0, sales: 0, clicks: 0, impressions: 0 };
    }
    dailyMap[dateKey].spend += spend;
    dailyMap[dateKey].sales += sales;
    dailyMap[dateKey].clicks += clicks;
    dailyMap[dateKey].impressions += impressions;

    const campaignName = row['Campaign Name'] || 'Unknown';
    if (!campaignMap[campaignName]) {
      campaignMap[campaignName] = 0;
    }
    campaignMap[campaignName] += spend;
  });

  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0;
  const avgACOS = totalSales > 0 ? (totalSpend / totalSales) : 0;

  kpiSpend.innerText = totalSpend.toFixed(2);
  kpiSales.innerText = totalSales.toFixed(2);
  kpiOrders.innerText = totalOrders;
  kpiACOS.innerText = (avgACOS * 100).toFixed(2) + '%';
  kpiCTR.innerText = (avgCTR * 100).toFixed(2) + '%';

  // Prepare chart data
  const sortedDates = Object.keys(dailyMap).sort();
  const spendList = [];
  const salesList = [];
  const ctrList = [];
  const acosList = [];
  sortedDates.forEach((dateKey) => {
    const entry = dailyMap[dateKey];
    spendList.push(entry.spend);
    salesList.push(entry.sales);
    const ctr = entry.impressions > 0 ? (entry.clicks / entry.impressions) : 0;
    const acos = entry.sales > 0 ? (entry.spend / entry.sales) : 0;
    ctrList.push(ctr);
    acosList.push(acos);
  });

  // Top campaigns by spend
  const campaignEntries = Object.entries(campaignMap);
  campaignEntries.sort((a, b) => b[1] - a[1]);
  const topCampaigns = campaignEntries.slice(0, 10);
  const topCampaignNames = topCampaigns.map(([name]) => name);
  const topCampaignValues = topCampaigns.map(([, spend]) => spend);

  // Draw charts
  drawBarChart(topCampaignNames, topCampaignValues);
  drawLineChart1(sortedDates, spendList, salesList);
  drawLineChart2(sortedDates, ctrList, acosList);

  // Refresh table
  updateTable(data);
}

/**
 * Build aggregated performance table grouped by store.
 */
function updateTable(data) {
  const tbody = document.querySelector('#aggTable tbody');
  const tfoot = document.querySelector('#aggTable tfoot');
  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  const storeMap = {};
  let grandSpend = 0;
  let grandSales = 0;

  data.forEach((row) => {
    const store = row['Store'] || 'Unknown';
    const spend = parseFloat(String(row['Spend']).replace(/,/g, '')) || 0;
    const sales = parseFloat(String(row['7 Day Total Sales ']).replace(/,/g, '')) || 0;
    if (!storeMap[store]) {
      storeMap[store] = { spend: 0, sales: 0 };
    }
    storeMap[store].spend += spend;
    storeMap[store].sales += sales;
    grandSpend += spend;
    grandSales += sales;
  });

  Object.entries(storeMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([store, vals]) => {
    const { spend, sales } = vals;
    const acos = sales > 0 ? (spend / sales) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${store}</td>
      <td>${spend.toFixed(2)}</td>
      <td>${sales.toFixed(2)}</td>
      <td>${(acos * 100).toFixed(0)}%</td>
    `;
    tbody.appendChild(tr);
  });

  const grandAcos = grandSales > 0 ? (grandSpend / grandSales) : 0;
  const trFoot = document.createElement('tr');
  trFoot.innerHTML = `
    <td>Grand Total</td>
    <td>${grandSpend.toFixed(2)}</td>
    <td>${grandSales.toFixed(2)}</td>
    <td>${(grandAcos * 100).toFixed(0)}%</td>
  `;
  tfoot.appendChild(trFoot);

  // Initialize or reinitialize DataTables for interactive table
  if ($.fn.DataTable.isDataTable('#aggTable')) {
    $('#aggTable').DataTable().destroy();
  }
  $('#aggTable').DataTable({
    paging: true,
    searching: true,
    order: [[1, 'desc']]
  });
}

/**
 * Draw horizontal bar chart (top campaigns by spend).
 */
function drawBarChart(labels, data) {
  const ctx = document.getElementById('barChart').getContext('2d');
  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Spend',
          data: data,
          backgroundColor: 'rgba(15, 98, 254, 0.7)',
          borderColor: 'rgba(15, 98, 254, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: {
            drag: { enabled: true },
            mode: 'x'
          }
        }
      },
      scales: {
        x: { ticks: { color: '#333' } },
        y: { ticks: { color: '#333' } }
      }
    }
  });
}

/**
 * Draw line chart for Spend vs Sales by date.
 */
function drawLineChart1(labels, spendData, salesData) {
  const ctx = document.getElementById('lineChart1').getContext('2d');
  if (lineChart1Instance) lineChart1Instance.destroy();
  lineChart1Instance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Spend',
          data: spendData,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.2)',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Sales',
          data: salesData,
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.2)',
          tension: 0.1,
          fill: false
        }
      ]
    },
    options: {
      plugins: {
        legend: { position: 'top' },
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: {
            drag: { enabled: true },
            mode: 'x'
          }
        }
      },
      scales: {
        x: { ticks: { color: '#333' } },
        y: { ticks: { color: '#333' } }
      }
    }
  });
}

/**
 * Draw line chart for CTR and ACOS by date.
 */
function drawLineChart2(labels, ctrData, acosData) {
  const ctx = document.getElementById('lineChart2').getContext('2d');
  if (lineChart2Instance) lineChart2Instance.destroy();
  lineChart2Instance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'CTR',
          data: ctrData,
          borderColor: '#8e44ad',
          backgroundColor: 'rgba(142, 68, 173, 0.2)',
          tension: 0.1,
          fill: false
        },
        {
          label: 'ACOS',
          data: acosData,
          borderColor: '#2980b9',
          backgroundColor: 'rgba(41, 128, 185, 0.2)',
          tension: 0.1,
          fill: false
        }
      ]
    },
    options: {
      plugins: {
        legend: { position: 'top' },
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: {
            drag: { enabled: true },
            mode: 'x'
          }
        }
      },
      scales: {
        x: { ticks: { color: '#333' } },
        y: { ticks: { color: '#333' } }
      }
    }
  });
}
