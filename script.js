window.onload = function () {
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

  // ==========================
  // CSV Source (GitHub hosted)
  // ==========================
  const csvUrl = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part1.csv";

  let allData = [];

  // ==========================
  // Authentication Logic
  // ==========================
  signupButton.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => location.reload())
      .catch(err => authMessage.textContent = err.message);
  });

  loginButton.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
      .then(() => location.reload())
      .catch(err => authMessage.textContent = err.message);
  });

  logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => location.reload());
  });

  auth.onAuthStateChanged(user => {
    if (user) {
      loginContainer.classList.add('hidden');
      dashboardContainer.classList.remove('hidden');
      fetchAndParseCSV();
    } else {
      loginContainer.classList.remove('hidden');
      dashboardContainer.classList.add('hidden');
    }
  });

  // ==========================
  // Fetch and Parse CSV
  // ==========================
  function fetchAndParseCSV() {
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: function (results) {
        allData = results.data;
        populateFilters();
        updateDashboard();
      }
    });
  }

  // ==========================
  // Filter Controls
  // ==========================
  const monthFilter = document.getElementById('monthFilter');
  const storeFilter = document.getElementById('storeFilter');
  const portfolioFilter = document.getElementById('portfolioFilter');

  function populateFilters() {
    const months = [...new Set(allData.map(d => d["Month"]))].sort();
    const stores = [...new Set(allData.map(d => d["Store"]))].sort();
    const portfolios = [...new Set(allData.map(d => d["Portfolio name"]))].sort();

    addCheckboxes(monthFilter, months);
    addCheckboxes(storeFilter, stores);
    addCheckboxes(portfolioFilter, portfolios);

    document.querySelectorAll('.dropdown-content input').forEach(input => {
      input.addEventListener('change', updateDashboard);
    });
  }

  function addCheckboxes(container, items) {
    container.innerHTML = '';
    container.innerHTML += `<label><input type="checkbox" value="All" checked> All</label><br>`;
    items.forEach(item => {
      if (item && item.trim() !== "") {
        container.innerHTML += `<label><input type="checkbox" value="${item}"> ${item}</label><br>`;
      }
    });
  }

  // ==========================
  // Dashboard Logic
  // ==========================
  function updateDashboard() {
    const selectedMonths = getCheckedValues(monthFilter);
    const selectedStores = getCheckedValues(storeFilter);
    const selectedPortfolios = getCheckedValues(portfolioFilter);

    let filtered = allData.filter(row => {
      const inMonth = selectedMonths.includes("All") || selectedMonths.includes(row["Month"]);
      const inStore = selectedStores.includes("All") || selectedStores.includes(row["Store"]);
      const inPortfolio = selectedPortfolios.includes("All") || selectedPortfolios.includes(row["Portfolio name"]);
      return inMonth && inStore && inPortfolio;
    });

    updateKPIs(filtered);
    updateCharts(filtered);
    updateTable(filtered);
    updatePivotTable(filtered);
  }

  function getCheckedValues(container) {
    return [...container.querySelectorAll('input:checked')].map(input => input.value);
  }

  // ==========================
  // KPI Cards
  // ==========================
  function updateKPIs(data) {
    const spend = sum(data, "Spend");
    const sales = sum(data, "7 Day Total Sales");
    const orders = sum(data, "Orders");
    const acos = spend > 0 ? (spend / sales) * 100 : 0;
    const ctr = avg(data, "CTR");

    document.getElementById("kpiSpend").textContent = `$${spend.toFixed(2)}`;
    document.getElementById("kpiSales").textContent = `$${sales.toFixed(2)}`;
    document.getElementById("kpiOrders").textContent = orders;
    document.getElementById("kpiACOS").textContent = `${acos.toFixed(2)}%`;
    document.getElementById("kpiCTR").textContent = `${ctr.toFixed(2)}%`;
  }

  function sum(data, key) {
    return data.reduce((total, row) => total + parseFloat(row[key] || 0), 0);
  }

  function avg(data, key) {
    const valid = data.filter(row => row[key] !== "");
    const total = valid.reduce((sum, row) => sum + parseFloat(row[key]), 0);
    return valid.length ? total / valid.length : 0;
  }

  // ==========================
  // Charts
  // ==========================
  let barChart, lineChart1, lineChart2;

  function updateCharts(data) {
    const grouped = {};
    data.forEach(row => {
      const store = row["Store"];
      if (!grouped[store]) grouped[store] = { spend: 0, sales: 0 };
      grouped[store].spend += parseFloat(row["Spend"] || 0);
      grouped[store].sales += parseFloat(row["7 Day Total Sales"] || 0);
    });

    const labels = Object.keys(grouped);
    const spendData = labels.map(label => grouped[label].spend);
    const salesData = labels.map(label => grouped[label].sales);

    if (barChart) barChart.destroy();
    if (lineChart1) lineChart1.destroy();
    if (lineChart2) lineChart2.destroy();

    barChart = new Chart(document.getElementById('barChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: "Spend", data: spendData, backgroundColor: "rgba(75, 192, 192, 0.6)" },
          { label: "Sales", data: salesData, backgroundColor: "rgba(153, 102, 255, 0.6)" }
        ]
      },
      options: { responsive: true }
    });

    lineChart1 = new Chart(document.getElementById('lineChart1'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{ label: "Spend", data: spendData, fill: false, borderColor: "green" }]
      },
      options: { responsive: true }
    });

    lineChart2 = new Chart(document.getElementById('lineChart2'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{ label: "Sales", data: salesData, fill: false, borderColor: "blue" }]
      },
      options: { responsive: true }
    });
  }

  // ==========================
  // Data Table
  // ==========================
  function updateTable(data) {
    const table = $('#dataTable').DataTable();
    table.clear();

    data.forEach(row => {
      table.row.add([
        row["Date"] || '',
        row["Store"] || '',
        row["Campaign Name"] || '',
        `$${parseFloat(row["Spend"] || 0).toFixed(2)}`,
        `$${parseFloat(row["7 Day Total Sales"] || 0).toFixed(2)}`,
        row["Orders"] || 0,
        `${parseFloat(row["CTR"] || 0).toFixed(2)}%`
      ]);
    });

    table.draw();
  }

  $(document).ready(function () {
    $('#dataTable').DataTable();
  });

  // ==========================
  // Pivot Table
  // ==========================
  function updatePivotTable(data) {
    const pivot = {};

    data.forEach(row => {
      const store = row["Store"];
      if (!pivot[store]) pivot[store] = { spend: 0, sales: 0 };
      pivot[store].spend += parseFloat(row["Spend"] || 0);
      pivot[store].sales += parseFloat(row["7 Day Total Sales"] || 0);
    });

    const tbody = document.querySelector('#pivotTable tbody');
    tbody.innerHTML = '';
    Object.entries(pivot).forEach(([store, values]) => {
      const acos = values.sales > 0 ? (values.spend / values.sales) * 100 : 0;
      const row = `<tr>
        <td>${store}</td>
        <td>$${values.spend.toFixed(2)}</td>
        <td>$${values.sales.toFixed(2)}</td>
        <td>${acos.toFixed(2)}%</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  }
};
