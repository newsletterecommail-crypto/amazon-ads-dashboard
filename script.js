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
  const uniqueMonths = [...new Set(data.map(row => row.Date?.slice(3)))].sort();
  const uniqueStores = [...new Set(data.map(row => row.Store))].sort();

  monthFilter.innerHTML = uniqueMonths.map(month =>
    `<label><input type="checkbox" value="${month}" checked> ${month}</label>`
  ).join('') + `<label><input type="checkbox" value="All"> All</label>`;

  storeFilter.innerHTML = uniqueStores.map(store =>
    `<label><input type="checkbox" value="${store}" checked> ${store}</label>`
  ).join('') + `<label><input type="checkbox" value="All"> All</label>`;

  monthFilter.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => applyFilters(data)));
  storeFilter.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => applyFilters(data)));

  enableAllCheckboxToggle('monthFilter', data);
  enableAllCheckboxToggle('storeFilter', data);

  applyFilters(data);
}

  function enableAllCheckboxToggle(groupId, data) {
    const container = document.getElementById(groupId);
    container.addEventListener('change', function (e) {
      if (e.target.value === "All") {
        const isChecked = e.target.checked;
        container.querySelectorAll('input[type=checkbox]').forEach(cb => {
          cb.checked = isChecked;
        });
      } else {
        const allBox = container.querySelector('input[value="All"]');
        if (allBox) allBox.checked = false;
      }
      applyFilters(data);
    });
  }

  function applyFilters(data) {
  const selectedMonths = Array.from(monthFilter.querySelectorAll('input:checked')).map(cb => cb.value);
  const selectedStores = Array.from(storeFilter.querySelectorAll('input:checked')).map(cb => cb.value);

  const showAllMonths = selectedMonths.includes("All");
  const showAllStores = selectedStores.includes("All");

  const filtered = data.filter(row =>
    (showAllMonths || selectedMonths.includes(row.Date?.slice(3))) &&
    (showAllStores || selectedStores.includes(row.Store))
  );

  updateKPIs(filtered);
  renderBarChart(filtered);
  renderLineChart(filtered);
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

  function renderBarChart(data) {
    const ctx = document.getElementById("barChart").getContext("2d");
    if (window.barChartInstance) window.barChartInstance.destroy();

    const storeSpend = {};
    data.forEach(row => {
      const store = row.Store || "Unknown";
      const spend = parseFloat(row.Spend || 0);
      storeSpend[store] = (storeSpend[store] || 0) + spend;
    });

    const labels = Object.keys(storeSpend);
    const values = Object.values(storeSpend);

    window.barChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Spend by Store",
          data: values,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Total Spend by Store'
          }
        }
      }
    });
  }

  function renderLineChart(data) {
  const ctx = document.getElementById("lineChart1").getContext("2d");
  if (window.lineChartInstance) window.lineChartInstance.destroy();

  const dateSales = {};

  data.forEach(row => {
    const date = row["Date"]?.trim() || "Unknown";
    const rawSales = row["7 Day Total Sales"] || "0";
    const sales = parseFloat(rawSales.toString().replace(/[$,]/g, ""));

    if (!isNaN(sales)) {
      dateSales[date] = (dateSales[date] || 0) + sales;
    }
  });

  const labels = Object.keys(dateSales).sort();
  const values = labels.map(date => dateSales[date]);

  window.lineChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Sales Over Time",
        data: values,
        fill: false,
        borderColor: "rgba(75, 192, 192, 1)",
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Total Sales Over Time'
        }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 15
          }
        }
      }
    }
  });
}
