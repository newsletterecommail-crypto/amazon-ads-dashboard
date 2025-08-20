// ========================== //
// Firebase & Dashboard Setup //
// ========================== //
window.onload = function () {
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

  if (window['chartjs-plugin-zoom']) {
    Chart.register(window['chartjs-plugin-zoom']);
  } else {
    console.warn("chartjs-plugin-zoom plugin not found. Zoom features will be disabled.");
  }

  const loginContainer = document.getElementById('loginContainer');
  const dashboardContainer = document.getElementById('dashboardContainer');
  const signupButton = document.getElementById('signupButton');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const authMessage = document.getElementById('authMessage');

  const kpiSpend = document.getElementById('kpiSpend');
  const kpiSales = document.getElementById('kpiSales');
  const kpiOrders = document.getElementById('kpiOrders');
  const kpiACOS = document.getElementById('kpiACOS');
  const kpiCTR = document.getElementById('kpiCTR');

  const monthFilter = document.getElementById('monthFilter');
  const storeFilter = document.getElementById('storeFilter');
  const portfolioFilter = document.getElementById('portfolioFilter');

  let allData = [];

  signupButton.addEventListener('click', (e) => {
    e.preventDefault();
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
      .then(() => authMessage.textContent = "Signup successful!")
      .catch((error) => authMessage.textContent = error.message);
  });

  loginButton.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
      .then(() => authMessage.textContent = "")
      .catch((error) => authMessage.textContent = error.message);
  });

  logoutButton.addEventListener('click', () => {
    auth.signOut();
  });

  auth.onAuthStateChanged(user => {
    if (user) {
      loginContainer.style.display = 'none';
      dashboardContainer.classList.remove('hidden');
      fetchCSVFromGitHub();
    } else {
      loginContainer.style.display = 'block';
      dashboardContainer.classList.add('hidden');
    }
  });

  function fetchCSVFromGitHub() {
    const CSV1 = "https://raw.githubusercontent.com/newsletterecommail-crypto/amazon-ads-dashboard/main/report_part1.csv";
    const CSV2 = "https://raw.githubusercontent.com/newsletterecommail-crypto/amazon-ads-dashboard/main/report_part2.csv";

    let merged = [];

    Papa.parse(CSV1, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function (results1) {
        merged = results1.data;

        Papa.parse(CSV2, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: function (results2) {
            merged = merged.concat(results2.data);
            allData = merged;
            updateDashboard(allData);
          },
          error: function (err2) {
            console.error("Error loading CSV 2:", err2);
          }
        });
      },
      error: function (err1) {
        console.error("Error loading CSV 1:", err1);
      }
    });
  }

  function updateDashboard(data) {
    const uniqueMonths = [...new Set(data.map(row => row.Date?.slice(3)))].sort();
    const uniqueStores = [...new Set(data.map(row => row.Store))].sort();
    const uniquePortfolios = [...new Set(data.map(row => row["Portfolio name"]?.trim()))].filter(Boolean).sort();

    monthFilter.innerHTML = [`<label><input type="checkbox" value="All" checked> All</label>`]
      .concat(uniqueMonths.map(month => `<label><input type="checkbox" value="${month}" checked> ${month}</label>`)).join('');

    storeFilter.innerHTML = [`<label><input type="checkbox" value="All" checked> All</label>`]
      .concat(uniqueStores.map(store => `<label><input type="checkbox" value="${store}" checked> ${store}</label>`)).join('');

    portfolioFilter.innerHTML = [`<label><input type="checkbox" value="All" checked> All</label>`]
      .concat(uniquePortfolios.map(p => `<label><input type="checkbox" value="${p}" checked> ${p}</label>`)).join('');

    [monthFilter, storeFilter, portfolioFilter].forEach(filter => {
      filter.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => applyFilters(data)));
    });

    applyFilters(data);
  }

  function applyFilters(data) {
    const getSelected = filter => Array.from(filter.querySelectorAll('input:checked')).map(cb => cb.value);

    const months = getSelected(monthFilter), stores = getSelected(storeFilter), portfolios = getSelected(portfolioFilter);
    const showAll = v => v.includes("All");

    const filtered = data.filter(row =>
      (showAll(months) || months.includes(row.Date?.slice(3))) &&
      (showAll(stores) || stores.includes(row.Store)) &&
      (showAll(portfolios) || portfolios.includes(row["Portfolio name"]?.trim()))
    );

    updateKPIs(filtered);
    renderPivotTable(filtered);
    renderBarChart(filtered);
    renderLineChart(filtered);
  }

  function updateKPIs(data) {
    let spend = 0, sales = 0, orders = 0, acosSum = 0, ctrSum = 0, acosCount = 0;

    data.forEach(row => {
      spend += parseFloat(row["Spend"] || 0);
      sales += parseFloat(row["7 Day Total Sales "] || 0);
      orders += parseInt(row["7 Day Total Orders (#)"] || 0);
      const acos = parseFloat(row["Total Advertising Cost of Sales (ACOS) "]);
      const ctr = parseFloat(row["Click-Thru Rate (CTR)"]);
      if (!isNaN(acos)) { acosSum += acos; acosCount++; }
      if (!isNaN(ctr)) ctrSum += ctr;
    });

    kpiSpend.textContent = `$${spend.toFixed(2)}`;
    kpiSales.textContent = `$${sales.toFixed(2)}`;
    kpiOrders.textContent = orders;
    kpiACOS.textContent = acosCount ? `${(acosSum / acosCount).toFixed(2)}%` : "0%";
    kpiCTR.textContent = `${(ctrSum / data.length).toFixed(2)}%`;
  }

  function renderPivotTable(data) {
    const tableBody = document.querySelector("#pivotTable tbody");
    tableBody.innerHTML = "";
    const storeMap = {};

    data.forEach(row => {
      const store = row.Store;
      const spend = parseFloat(row["Spend"] || 0);
      const sales = parseFloat(row["7 Day Total Sales "] || 0);
      const acos = parseFloat(row["Total Advertising Cost of Sales (ACOS) "]);
      if (!storeMap[store]) storeMap[store] = { spend: 0, sales: 0, acosTotal: 0, acosCount: 0 };
      storeMap[store].spend += spend;
      storeMap[store].sales += sales;
      if (!isNaN(acos)) { storeMap[store].acosTotal += acos; storeMap[store].acosCount++; }
    });

    Object.entries(storeMap).forEach(([store, val]) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${store}</td>
        <td>$${val.spend.toFixed(2)}</td>
        <td>$${val.sales.toFixed(2)}</td>
        <td>${val.acosCount ? (val.acosTotal / val.acosCount).toFixed(2) + "%" : "0%"}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  function renderBarChart(data) {
    console.log("Bar chart rendering", data.length, "records");
  }

  function renderLineChart(data) {
    console.log("Line chart rendering", data.length, "records");
  }
};
