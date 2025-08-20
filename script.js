window.onload = () => {
  const CSV1 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part1.csv";
  const CSV2 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part2.csv";
  let allData = [];

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

  function initDashboard(data) {
    const monthChoices = new Choices('#monthFilter', { removeItemButton: true });
    const storeChoices = new Choices('#storeFilter', { removeItemButton: true });

    const months = new Set();
    const stores = new Set();

    data.forEach(row => {
      const dt = new Date(row["Date"]);
      if (!isNaN(dt)) {
        const month = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        months.add(month);
      }
      if (row["Store"]) stores.add(row["Store"]);
    });

    monthChoices.setChoices([...months].sort().map(m => ({ value: m, label: m })), 'value', 'label', true);
    storeChoices.setChoices([...stores].sort().map(s => ({ value: s, label: s })), 'value', 'label', true);

    document.getElementById("monthFilter").addEventListener("change", () => applyFilters(data));
    document.getElementById("storeFilter").addEventListener("change", () => applyFilters(data));

    applyFilters(data);
  }

  function applyFilters(data) {
    const selectedMonths = Array.from(document.getElementById("monthFilter").selectedOptions).map(o => o.value);
    const selectedStores = Array.from(document.getElementById("storeFilter").selectedOptions).map(o => o.value);

    const filtered = data.filter(row => {
      const dt = new Date(row["Date"]);
      const rowMonth = !isNaN(dt) ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` : "";
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(rowMonth);
      const matchStore = selectedStores.length === 0 || selectedStores.includes(row["Store"]);
      return matchMonth && matchStore;
    });

    updateKPIs(filtered);
    renderTable(filtered);
    renderCharts(filtered);
    updatePivotTable(filtered);
  }

  function updateKPIs(data) {
    const spend = data.reduce((sum, row) => sum + parseFloat(row["Spend"] || 0), 0);
    const sales = data.reduce((sum, row) => sum + parseFloat(row["7 Day Total Sales "] || 0), 0);
    const orders = data.reduce((sum, row) => sum + parseInt(row["Orders"] || 0), 0);
    const acos = sales !== 0 ? (spend / sales) * 100 : 0;
    const ctrs = data.map(row => parseFloat(row["CTR"] || 0)).filter(v => !isNaN(v));
    const avgCtr = ctrs.length ? ctrs.reduce((a, b) => a + b, 0) / ctrs.length : 0;

    document.getElementById("kpiSpend").textContent = `$${spend.toFixed(2)}`;
    document.getElementById("kpiSales").textContent = `$${sales.toFixed(2)}`;
    document.getElementById("kpiOrders").textContent = orders;
    document.getElementById("kpiACOS").textContent = `${acos.toFixed(2)}%`;
    document.getElementById("kpiCTR").textContent = `${avgCtr.toFixed(2)}%`;
  }

  function renderTable(data) {
    if ($.fn.DataTable.isDataTable("#dataTable")) {
      $('#dataTable').DataTable().clear().rows.add(data).draw();
    } else {
      $('#dataTable').DataTable({
        data: data,
        columns: [
          { data: "Date" },
          { data: "Store" },
          { data: "Campaign Name" },
          { data: "Spend" },
          { data: "7 Day Total Sales " },
          { data: "Orders" },
          { data: "CTR" }
        ]
      });
    }
  }

  let barChart, lineChart1, lineChart2;

  function renderCharts(data) {
    const campaigns = {};
    data.forEach(row => {
      const name = row["Campaign Name"];
      if (!campaigns[name]) {
        campaigns[name] = { spend: 0, sales: 0, ctr: [] };
      }
      campaigns[name].spend += parseFloat(row["Spend"] || 0);
      campaigns[name].sales += parseFloat(row["7 Day Total Sales "] || 0);
      const ctrVal = parseFloat(row["CTR"]);
      if (!isNaN(ctrVal)) campaigns[name].ctr.push(ctrVal);
    });

    const labels = Object.keys(campaigns);
    const spendData = labels.map(l => campaigns[l].spend);
    const salesData = labels.map(l => campaigns[l].sales);
    const ctrData = labels.map(l => {
      const ctrs = campaigns[l].ctr;
      return ctrs.length ? ctrs.reduce((a, b) => a + b, 0) / ctrs.length : 0;
    });

    if (barChart) barChart.destroy();
    if (lineChart1) lineChart1.destroy();
    if (lineChart2) lineChart2.destroy();

    barChart = new Chart(document.getElementById("barChart"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Spend", data: spendData, backgroundColor: "#4285F4" },
          { label: "Sales", data: salesData, backgroundColor: "#0F9D58" }
        ]
      },
      options: {
        responsive: true,
        plugins: { zoom: { pan: { enabled: true }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" } } }
      }
    });

    lineChart1 = new Chart(document.getElementById("lineChart1"), {
      type: "line",
      data: { labels, datasets: [{ label: "CTR", data: ctrData, borderColor: "#F4B400", fill: false }] },
      options: { responsive: true }
    });

    lineChart2 = new Chart(document.getElementById("lineChart2"), {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Spend", data: spendData, borderColor: "#4285F4", fill: false },
          { label: "Sales", data: salesData, borderColor: "#0F9D58", fill: false }
        ]
      },
      options: { responsive: true }
    });
  }

  function updatePivotTable(data) {
    const summary = {};
    data.forEach(row => {
      const store = row["Store"];
      if (!summary[store]) summary[store] = { spend: 0, sales: 0 };
      summary[store].spend += parseFloat(row["Spend"] || 0);
      summary[store].sales += parseFloat(row["7 Day Total Sales "] || 0);
    });

    const tbody = document.querySelector("#pivotTable tbody");
    tbody.innerHTML = "";

    Object.entries(summary).forEach(([store, vals]) => {
      const acos = vals.sales ? (vals.spend / vals.sales) * 100 : 0;
      const row = `<tr><td>${store}</td><td>${vals.spend.toFixed(2)}</td><td>${vals.sales.toFixed(2)}</td><td>${acos.toFixed(2)}%</td></tr>`;
      tbody.innerHTML += row;
    });
  }

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
  const authMessage = document.getElementById('authMessage');

  document.getElementById("signupButton").addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => showDashboard())
      .catch(error => authMessage.textContent = error.message);
  });

  document.getElementById("loginButton").addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    auth.signInWithEmailAndPassword(email, password)
      .then(() => showDashboard())
      .catch(error => authMessage.textContent = error.message);
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    auth.signOut().then(() => {
      loginContainer.classList.remove("hidden");
      dashboardContainer.classList.add("hidden");
    });
  });

  function showDashboard() {
    loginContainer.classList.add("hidden");
    dashboardContainer.classList.remove("hidden");
  }

  auth.onAuthStateChanged(user => {
    if (user) showDashboard();
  });
};
