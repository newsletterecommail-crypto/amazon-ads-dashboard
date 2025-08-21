window.onload = () => {
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

  const loginContainer = document.getElementById("loginContainer");
  const dashboardContainer = document.getElementById("dashboardContainer");

  document.getElementById("signupButton").addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
      .then(() => {
        loginContainer.classList.add("hidden");
        dashboardContainer.classList.remove("hidden");
        loadDashboard();
      })
      .catch(error => {
        document.getElementById("authMessage").textContent = error.message;
      });
  });

  document.getElementById("loginButton").addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        loginContainer.classList.add("hidden");
        dashboardContainer.classList.remove("hidden");
        loadDashboard();
      })
      .catch(error => {
        document.getElementById("authMessage").textContent = error.message;
      });
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    auth.signOut().then(() => {
      dashboardContainer.classList.add("hidden");
      loginContainer.classList.remove("hidden");
    });
  });

  function loadDashboard() {
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
  }

  function initDashboard(data) {
    const monthSet = new Set();
    const storeSet = new Set();

    data.forEach(row => {
      const dt = new Date(row["Date"]);
      if (!isNaN(dt)) {
        const m = ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + dt.getFullYear();
        monthSet.add(m);
      }
      if (row["Store"]) {
        storeSet.add(row["Store"]);
      }
    });

    const monthSelect = document.getElementById("monthFilter");
    const storeSelect = document.getElementById("storeFilter");

    Array.from(monthSet).sort().reverse().forEach(month => {
      const option = document.createElement("option");
      option.value = month;
      option.text = month;
      monthSelect.appendChild(option);
    });

    Array.from(storeSet).sort().forEach(store => {
      const option = document.createElement("option");
      option.value = store;
      option.text = store;
      storeSelect.appendChild(option);
    });

    new Choices(monthSelect, { removeItemButton: true });
    new Choices(storeSelect, { removeItemButton: true });

    monthSelect.addEventListener("change", () => applyFilters(data));
    storeSelect.addEventListener("change", () => applyFilters(data));

    applyFilters(data);
  }

  function applyFilters(data) {
    const selectedMonths = getSelectValues(document.getElementById("monthFilter"));
    const selectedStores = getSelectValues(document.getElementById("storeFilter"));

    const filtered = data.filter(row => {
      const rowDate = new Date(row["Date"]);
      const rowMonth = ("0" + (rowDate.getMonth() + 1)).slice(-2) + "-" + rowDate.getFullYear();
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(rowMonth);
      const matchStore = selectedStores.length === 0 || selectedStores.includes(row["Store"]);
      return matchMonth && matchStore;
    });

    updateKPIs(filtered);
    updateTable(filtered);
    updatePivotTable(filtered);
    updateCharts(filtered);
  }

  function getSelectValues(selectElement) {
    return Array.from(selectElement.selectedOptions).map(opt => opt.value);
  }

  function updateKPIs(data) {
    let totalSpend = 0, totalSales = 0, totalOrders = 0, totalACOS = 0, totalCTR = 0, validACOS = 0, validCTR = 0;

    data.forEach(row => {
      totalSpend += parseFloat(row["Spend"] || 0);
      totalSales += parseFloat(row["7 Day Total Sales "] || 0);
      totalOrders += parseInt(row["7 Day Total Orders (#)"] || 0);

      const acos = parseFloat((row["Total Advertising Cost of Sales (ACOS) "] || "").replace("%", ""));
      if (!isNaN(acos)) {
        totalACOS += acos;
        validACOS++;
      }

      const ctr = parseFloat((row["Click-Thru Rate (CTR)"] || "").replace("%", ""));
      if (!isNaN(ctr)) {
        totalCTR += ctr;
        validCTR++;
      }
    });

    document.getElementById("kpiSpend").textContent = `$${totalSpend.toFixed(2)}`;
    document.getElementById("kpiSales").textContent = `$${totalSales.toFixed(2)}`;
    document.getElementById("kpiOrders").textContent = totalOrders.toLocaleString();
    document.getElementById("kpiACOS").textContent = validACOS ? `${(totalACOS / validACOS).toFixed(2)}%` : "0%";
    document.getElementById("kpiCTR").textContent = validCTR ? `${(totalCTR / validCTR).toFixed(2)}%` : "0%";
  }

  function updateTable(data) {
    if ($.fn.dataTable.isDataTable("#dataTable")) {
      $('#dataTable').DataTable().destroy();
    }

    const tableBody = document.querySelector("#dataTable tbody");
    tableBody.innerHTML = "";

    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row["Date"]}</td>
        <td>${row["Store"]}</td>
        <td>${row["Campaign Name"]}</td>
        <td>${row["Spend"]}</td>
        <td>${row["7 Day Total Sales "]}</td>
        <td>${row["7 Day Total Orders (#)"]}</td>
        <td>${row["Click-Thru Rate (CTR)"]}</td>
      `;
      tableBody.appendChild(tr);
    });

    $('#dataTable').DataTable({
      paging: true,
      searching: true,
      ordering: true,
      scrollX: true
    });
  }

  function updatePivotTable(data) {
    const pivotTableBody = document.querySelector("#pivotTable tbody");
    pivotTableBody.innerHTML = "";

    const storeMap = {};

    data.forEach(row => {
      const store = row["Store"];
      const spend = parseFloat(row["Spend"] || 0);
      const sales = parseFloat(row["7 Day Total Sales "] || 0);
      const acos = parseFloat((row["Total Advertising Cost of Sales (ACOS) "] || "").replace("%", ""));

      if (!storeMap[store]) {
        storeMap[store] = { spend: 0, sales: 0, acosTotal: 0, acosCount: 0 };
      }

      storeMap[store].spend += spend;
      storeMap[store].sales += sales;

      if (!isNaN(acos)) {
        storeMap[store].acosTotal += acos;
        storeMap[store].acosCount++;
      }
    });

    Object.keys(storeMap).sort().forEach(store => {
      const entry = storeMap[store];
      const avgAcos = entry.acosCount ? (entry.acosTotal / entry.acosCount).toFixed(2) : "0.00";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${store}</td>
        <td>$${entry.spend.toFixed(2)}</td>
        <td>$${entry.sales.toFixed(2)}</td>
        <td>${avgAcos}%</td>
      `;
      pivotTableBody.appendChild(tr);
    });
  }

  function updateCharts(data) {
    // Optional future implementation
  }
};
