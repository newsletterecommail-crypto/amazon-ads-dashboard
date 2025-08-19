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
            console.log("✅ Merged CSV Data Sample:", allData[0]);
            console.log("✅ Available Keys:", Object.keys(allData[0]));
            updateDashboard(allData);
          },
          error: function (err2) {
            console.error("❌ Error loading CSV 2:", err2);
          }
        });
      },
      error: function (err1) {
        console.error("❌ Error loading CSV 1:", err1);
      }
    });
  }

  function updateDashboard(data) {
    const uniqueMonths = [...new Set(data.map(row => row.Date?.slice(3)))];
    const uniqueStores = [...new Set(data.map(row => row.Store))];

    monthFilter.innerHTML = `<option value="All">All</option>` + 
      uniqueMonths.map(m => `<option value="${m}">${m}</option>`).join('');
    storeFilter.innerHTML = `<option value="All">All</option>` + 
      uniqueStores.map(s => `<option value="${s}">${s}</option>`).join('');

    monthFilter.onchange = () => applyFilters(data);
    storeFilter.onchange = () => applyFilters(data);

    applyFilters(data);
  }

  function applyFilters(data) {
    const selectedMonth = monthFilter.value;
    const selectedStore = storeFilter.value;

    let filtered = data;

    if (selectedMonth !== "All") {
      filtered = filtered.filter(row => row.Date?.endsWith(selectedMonth));
    }

    if (selectedStore !== "All") {
      filtered = filtered.filter(row => row.Store === selectedStore);
    }

    updateKPIs(filtered);
    renderBarChart(filtered);
    renderLineChart(filtered);
    populateTable(filtered);
  }

  function updateKPIs(data) {
    const totalSpend = data.reduce((sum, row) => sum + parseFloat(row["Spend"] || 0), 0);

    const sample = data[0] || {};
    let salesKey = Object.keys(sample).find(k => k.toLowerCase().includes("total sales"));
    if (!salesKey) salesKey = "7 Day Total Sales ";

    const totalSales = data.reduce((sum, row) => {
      const rawValue = row[salesKey] || "0";
      const clean = rawValue.toString().replace(/[$,]/g, '');
      return sum + parseFloat(clean || 0);
    }, 0);

    const totalOrders = data.reduce((sum, row) => sum + parseInt(row["7 Day Total Orders (#)"] || 0), 0);
    const avgACOS = totalSales ? ((totalSpend / totalSales) * 100).toFixed(2) + '%' : '0%';
    const avgCTR = data.length
      ? (data.reduce((sum, row) => sum + parseFloat(row["Click-Thru Rate (CTR)"] || 0), 0) / data.length).toFixed(2) + '%'
      : '0%';

    kpiSpend.textContent = "$" + totalSpend.toFixed(2);
    kpiSales.textContent = "$" + totalSales.toFixed(2);
    kpiOrders.textContent = totalOrders;
    kpiACOS.textContent = avgACOS;
    kpiCTR.textContent = avgCTR;
  }

  function populateTable(data) {
    const tableBody = document.querySelector("#dataTable tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    const sample = data[0] || {};
    let salesKey = Object.keys(sample).find(k => k.toLowerCase().includes("total sales"));
    if (!salesKey) salesKey = "7 Day Total Sales ";

    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.Date}</td>
        <td>${row.Store}</td>
        <td>${row["Campaign Name"] || ""}</td>
        <td>${row["Spend"] || "0"}</td>
        <td>${row[salesKey] || "0"}</td>
        <td>${row["7 Day Total Orders (#)"] || "0"}</td>
        <td>${row["Click-Thru Rate (CTR)"] || "0"}</td>
      `;
      tableBody.appendChild(tr);
    });

    if ($.fn.DataTable.isDataTable('#dataTable')) {
      $('#dataTable').DataTable().clear().destroy();
    }
    $('#dataTable').DataTable();
  }

  function renderBarChart(data) {
    // Add logic if needed
  }

  function renderLineChart(data) {
    // Add logic if needed
  }
};
