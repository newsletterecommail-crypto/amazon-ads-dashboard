window.onload = () => {
  const CSV1 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part1.csv";
  const CSV2 = "https://newsletterecommail-crypto.github.io/amazon-ads-dashboard/report_part2.csv";
  let allData = [];

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

  function fetchCSV() {
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

  function updateKPIs(data) {
    const totalSpend = data.reduce((sum, row) => sum + parseFloat(row["Spend"] || 0), 0);
    const totalSales = data.reduce((sum, row) => sum + parseFloat(row["7 Day Total Sales "] || 0), 0);
    const totalOrders = data.reduce((sum, row) => sum + parseInt(row["7 Day Total Orders (#)"] || 0), 0);
    const totalImpressions = data.reduce((sum, row) => sum + parseInt(row["Impressions"] || 0), 0);
    const totalClicks = data.reduce((sum, row) => sum + parseInt(row["Clicks"] || 0), 0);
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0;
    const avgACOS = totalSales > 0 ? ((totalSpend / totalSales) * 100).toFixed(2) : 0;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('kpiSpend', totalSpend.toFixed(2));
    setText('kpiSales', totalSales.toFixed(2));
    setText('kpiOrders', totalOrders);
    setText('kpiCTR', avgCTR);
    setText('kpiACOS', avgACOS);
  }

  function populateTable(data) {
    const tbody = document.querySelector('#dataTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row["Date"]}</td>
        <td>${row["Store"]}</td>
        <td>${row["Campaign Name"]}</td>
        <td>${parseFloat(row["Spend"] || 0).toFixed(2)}</td>
        <td>${parseFloat(row["7 Day Total Sales "] || 0).toFixed(2)}</td>
        <td>${row["7 Day Total Orders (#)"]}</td>
        <td>${row["Click-Thru Rate (CTR)"]}</td>
      `;
      tbody.appendChild(tr);
    });
    $('#dataTable').DataTable();
  }

  function populateStoreSummary(data) {
    const summary = {};
    data.forEach(row => {
      const store = row["Store"];
      if (!summary[store]) {
        summary[store] = { spend: 0, sales: 0 };
      }
      summary[store].spend += parseFloat(row["Spend"] || 0);
      summary[store].sales += parseFloat(row["7 Day Total Sales "] || 0);
    });

    const tbody = document.querySelector('#pivotTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (const [store, vals] of Object.entries(summary)) {
      const acos = vals.sales > 0 ? (vals.spend / vals.sales * 100).toFixed(2) : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${store}</td>
        <td>${vals.spend.toFixed(2)}</td>
        <td>${vals.sales.toFixed(2)}</td>
        <td>${acos}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function initDashboard(data) {
    updateKPIs(data);
    populateTable(data);
    populateStoreSummary(data);
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      loginContainer.classList.add('hidden');
      dashboardContainer.classList.remove('hidden');
      fetchCSV();
    } else {
      loginContainer.classList.remove('hidden');
      dashboardContainer.classList.add('hidden');
    }
  });

  signupButton.onclick = () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    auth.createUserWithEmailAndPassword(email, password).catch(e => alert(e.message));
  };

  loginButton.onclick = () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    auth.signInWithEmailAndPassword(email, password).catch(e => alert(e.message));
  };

  logoutButton.onclick = () => {
    auth.signOut();
  };

  if (window['chartjs-plugin-zoom']) {
    Chart.register(window['chartjs-plugin-zoom']);
  } else {
    console.warn("chartjs-plugin-zoom plugin not found. Zoom features will be disabled.");
  }
};
