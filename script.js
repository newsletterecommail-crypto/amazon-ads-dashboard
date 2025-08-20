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

 if (typeof ChartZoom !== "undefined") {
  Chart.register(ChartZoom);
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

  logoutButton.addEventListener('click', () => auth.signOut());

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
    const CSV1 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part1.csv";
    const CSV2 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part2.csv";
    let merged = [];

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
              merged = res1.data.concat(res2.data);
              allData = merged;
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
     let rowMonth = "";
const dateParts = row["Date"]?.split("-");
if (dateParts.length === 3) {
  // Format: DD-MM-YYYY → extract MM-YYYY
  const [day, month, year] = dateParts;
  rowMonth = `${month}-${year}`;
} else {
  console.warn("Invalid Date:", row["Date"]);
}

        monthSet.add(m);
      }
      if (row.Store) storeSet.add(row.Store);
    });

    const months = Array.from(monthSet).sort().reverse();
    const stores = Array.from(storeSet).sort();

    monthFilter.innerHTML = `<option value="All">All</option>` + months.map(m => `<option value="${m}">${m}</option>`).join('');
    storeFilter.innerHTML = `<option value="All">All</option>` + stores.map(s => `<option value="${s}">${s}</option>`).join('');

    monthFilter.addEventListener('change', () => applyFilters(data));
    storeFilter.addEventListener('change', () => applyFilters(data));

    applyFilters(data);
  }

 function applyFilters(data) {
  const selectedMonth = monthFilter.value;
  const selectedStore = storeFilter.value;

  const filtered = data.filter(row => {
    const dt = new Date(row["Date"]);
    const rowMonth = !isNaN(dt) ? ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + dt.getFullYear() : "";

    // Log debugging info
    if (isNaN(dt)) console.warn("Invalid Date:", row["Date"]);

    const matchMonth = selectedMonth === "All" || rowMonth === selectedMonth;
    const matchStore = selectedStore === "All" || row.Store === selectedStore;

    return matchMonth && matchStore;
  });

  console.log("📅 Selected Month:", selectedMonth);
  console.log("🏪 Selected Store:", selectedStore);
  console.log("✅ Filtered rows:", filtered.length);

  updateKPIs(filtered);
  renderBarChart(filtered);
  renderLineChart(filtered);
  renderPivotTable(filtered);
}

  function updateKPIs(data) {
    let spend = 0, sales = 0, orders = 0, acosSum = 0, ctrSum = 0, count = 0;
    data.forEach(row => {
      spend += parseFloat(row.Spend) || 0;
      sales += parseFloat(row["7 Day Total Sales"]) || 0;
      orders += parseInt(row["7 Day Total Orders (#)"]) || 0;
      acosSum += parseFloat(row["Total Advertising Cost of Sales (ACOS)"]) || 0;
      ctrSum += parseFloat(row["Click-Thru Rate (CTR)"]) || 0;
      count++;
    });

    kpiSpend.textContent = `$${spend.toFixed(2)}`;
    kpiSales.textContent = `$${sales.toFixed(2)}`;
    kpiOrders.textContent = orders;
    kpiACOS.textContent = `${(count ? acosSum / count : 0).toFixed(2)}%`;
    kpiCTR.textContent = `${(count ? ctrSum / count : 0).toFixed(2)}%`;
  }

  function renderBarChart(data) {
    // placeholder logic
  }

  function renderLineChart(data) {
    // placeholder logic
  }

  function renderPivotTable(data) {
    // placeholder logic
  }
};
