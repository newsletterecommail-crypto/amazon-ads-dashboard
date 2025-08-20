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
    const uniquePortfolios = [...new Set(data.map(row => row["Portfolio"]?.trim()))].filter(Boolean).sort();

    const monthHTML = [`<label><input type="checkbox" value="All" checked> All</label>`]
      .concat(uniqueMonths.map(month =>
        `<label><input type="checkbox" value="${month}" checked> ${month}</label>`
      )).join('');

    const storeHTML = [`<label><input type="checkbox" value="All" checked> All</label>`]
      .concat(uniqueStores.map(store =>
        `<label><input type="checkbox" value="${store}" checked> ${store}</label>`
      )).join('');

    const portfolioHTML = [`<label><input type="checkbox" value="All" checked> All</label>`]
      .concat(uniquePortfolios.map(p =>
        `<label><input type="checkbox" value="${p}" checked> ${p}</label>`
      )).join('');

    monthFilter.innerHTML = monthHTML;
    storeFilter.innerHTML = storeHTML;
    portfolioFilter.innerHTML = portfolioHTML;

    monthFilter.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => applyFilters(data)));
    storeFilter.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => applyFilters(data)));
    portfolioFilter.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => applyFilters(data)));

    enableAllCheckboxToggle('monthFilter', data);
    enableAllCheckboxToggle('storeFilter', data);
    enableAllCheckboxToggle('portfolioFilter', data);

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
    const selectedPortfolios = Array.from(portfolioFilter.querySelectorAll('input:checked')).map(cb => cb.value);

    const showAllMonths = selectedMonths.includes("All");
    const showAllStores = selectedStores.includes("All");
    const showAllPortfolios = selectedPortfolios.includes("All");

    const filtered = data.filter(row =>
      (showAllMonths || selectedMonths.includes(row.Date?.slice(3))) &&
      (showAllStores || selectedStores.includes(row.Store)) &&
      (showAllPortfolios || selectedPortfolios.includes(row["Portfolio"]?.trim()))
    );

    updateKPIs(filtered);
    renderBarChart(filtered);
    renderLineChart(filtered);
    renderPivotTable(filtered);
  }

  // updateKPIs, renderBarChart, renderLineChart, renderPivotTable (same as before)
};
