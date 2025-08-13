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

// Filter elements
const monthFilter = document.getElementById('monthFilter');
const storeFilter = document.getElementById('storeFilter');

// Data storage
let allData = [];

// Chart instances
let barChartInstance;
let lineChart1Instance;
let lineChart2Instance;

// Populate filter options for month and store
function populateFilters(data) {
  const monthSet = new Set();
  const storeSet = new Set();
  data.forEach((row) => {
    // Collect store values
    if (row['Store']) {
      storeSet.add(row['Store']);
    }
    // Parse date string and derive month (YYYY-MM)
    let dateStr = row['Date'];
    dateStr = String(dateStr).replace(/\//g, '-');
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
  // Sort and populate month filter
  const months = Array.from(monthSet).sort();
  monthFilter.innerHTML = '';
  const defaultOptionM = document.createElement('option');
  defaultOptionM.value = 'All';
  defaultOptionM.textContent = 'All';
  monthFilter.appendChild(defaultOptionM);
  months.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    monthFilter.appendChild(opt);
  });
  // Sort and populate store filter
  const stores = Array.from(storeSet).sort();
  storeFilter.innerHTML = '';
  const defaultOptionS = document.createElement('option');
  defaultOptionS.value = 'All';
  defaultOptionS.textContent = 'All';
  storeFilter.appendChild(defaultOptionS);
  stores.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    storeFilter.appendChild(opt);
  });
  // Add change listeners
  monthFilter.addEventListener('change', applyFilters);
  storeFilter.addEventListener('change', applyFilters);
}

// Apply selected filters and refresh the dashboard
function applyFilters() {
  let filtered = allData;
  const monthVal = monthFilter.value;
  const storeVal = storeFilter.value;
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
  if (storeVal && storeVal !== 'All') {
    filtered = filtered.filter((row) => row['Store'] === storeVal);
  }
  computeAndRender(filtered);
}

// Sign up function
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

// Login function
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

// Logout function
function logout() {
  auth.signOut();
}

// Attach event listeners
signupButton.addEventListener('click', signup);
loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);

// Authentication state observer
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    authMessage.textContent = '';
    // Load data if not already loaded
    if (!barChartInstance) {
      loadDataAndRender();
    }
  } else {
    // User is signed out
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    authMessage.textContent = '';
  }
});

// Function to load CSV, compute metrics and render charts
function loadDataAndRender() {
  // Parse CSV via PapaParse (requires running over HTTP)
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

function computeAndRender(data) {
  // Initialize accumulators
  let totalSpend = 0;
  let totalSales = 0;
  let totalOrders = 0;
  let totalClicks = 0;
  let totalImpressions = 0;

  const dailyMap = {};
  const campaignMap = {};

  data.forEach((row) => {
    // Parse numeric fields (strings may contain commas or whitespace)
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

    // Parse date (assuming dd-mm-yyyy or dd/mm/yyyy)
    let dateStr = row['Date'];
    // Normalize separators
    dateStr = dateStr.replace(/\//g, '-');
    const parts = dateStr.split('-');
    let year, month, day;
    // Determine format; if first part > 12 then it's day-month-year
    if (parts.length === 3) {
      if (parseInt(parts[1]) > 12) {
        // Possibly yyyy-dd-mm
        year = parseInt(parts[0]);
        month = parseInt(parts[2]) - 1;
        day = parseInt(parts[1]);
      } else {
        // dd-mm-yyyy
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
      }
    } else {
      // fallback to Date constructor
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

  // Compute averages
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0;
  const avgACOS = totalSales > 0 ? (totalSpend / totalSales) : 0;

  // Update KPI elements
  kpiSpend.innerText = totalSpend.toFixed(2);
  kpiSales.innerText = totalSales.toFixed(2);
  kpiOrders.innerText = totalOrders;
  kpiACOS.innerText = (avgACOS * 100).toFixed(2) + '%';
  kpiCTR.innerText = (avgCTR * 100).toFixed(2) + '%';

  // Prepare data for charts
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

  // Compute top 10 campaigns by spend
  const campaignEntries = Object.entries(campaignMap);
  campaignEntries.sort((a, b) => b[1] - a[1]);
  const topCampaigns = campaignEntries.slice(0, 10);
  const topCampaignNames = topCampaigns.map((entry) => entry[0]);
  const topCampaignValues = topCampaigns.map((entry) => entry[1]);

  // Draw charts
  drawBarChart(topCampaignNames, topCampaignValues);
  drawLineChart1(sortedDates, spendList, salesList);
  drawLineChart2(sortedDates, ctrList, acosList);

  // Update aggregated performance table
  updateTable(data);
}

// Build aggregated performance table grouped by store
function updateTable(data) {
  const tbody = document.querySelector('#aggTable tbody');
  const tfoot = document.querySelector('#aggTable tfoot');
  // Clear existing rows
  tbody.innerHTML = '';
  tfoot.innerHTML = '';
  // Aggregate metrics per store
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
  // Convert to array and sort alphabetically by store
  const entries = Object.entries(storeMap).sort((a, b) => a[0].localeCompare(b[0]));
  entries.forEach(([store, vals]) => {
    const { spend, sales } = vals;
    const acos = sales > 0 ? (spend / sales) : 0;
    const tr = document.createElement('tr');
    const storeCell = document.createElement('td');
    storeCell.textContent = store;
    const spendCell = document.createElement('td');
    spendCell.textContent = spend.toFixed(2);
    const salesCell = document.createElement('td');
    salesCell.textContent = sales.toFixed(2);
    const acosCell = document.createElement('td');
    acosCell.textContent = (acos * 100).toFixed(0) + '%';
    tr.appendChild(storeCell);
    tr.appendChild(spendCell);
    tr.appendChild(salesCell);
    tr.appendChild(acosCell);
    tbody.appendChild(tr);
  });
  // Grand total row
  const grandAcos = grandSales > 0 ? (grandSpend / grandSales) : 0;
  const trFoot = document.createElement('tr');
  const totalLabelCell = document.createElement('td');
  totalLabelCell.textContent = 'Grand Total';
  const totalSpendCell = document.createElement('td');
  totalSpendCell.textContent = grandSpend.toFixed(2);
  const totalSalesCell = document.createElement('td');
  totalSalesCell.textContent = grandSales.toFixed(2);
  const totalAcosCell = document.createElement('td');
  totalAcosCell.textContent = (grandAcos * 100).toFixed(0) + '%';
  trFoot.appendChild(totalLabelCell);
  trFoot.appendChild(totalSpendCell);
  trFoot.appendChild(totalSalesCell);
  trFoot.appendChild(totalAcosCell);
  tfoot.appendChild(trFoot);
}
// Initialize DataTable (search, sort, pagination)
$(document).ready(function () {
  $('#aggTable').DataTable({
    paging: true,
    searching: true,
    order: [[1, 'desc']] // default sort by Spend column
  });
});

function drawBarChart(labels, data) {
  const ctx = document.getElementById('barChart').getContext('2d');
  // Destroy previous instance if exists
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
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#333' }
        },
        y: {
          ticks: { color: '#333' }
        }
      }
    }
  });
}

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
        legend: { position: 'top' }
      },
      scales: {
        x: {
          ticks: { color: '#333' }
        },
        y: {
          ticks: { color: '#333' }
        }
      }
    }
  });
}

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
        legend: { position: 'top' }
      },
      scales: {
        x: {
          ticks: { color: '#333' }
        },
        y: {
          ticks: { color: '#333' }
        }
      }
    }
  });
}
