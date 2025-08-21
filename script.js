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
    // Wait for dashboard KPIs to exist before updating
    const dashboardCheckInterval = setInterval(() => {
      if (
        document.getElementById("totalSpend") &&
        document.getElementById("totalSales") &&
        document.getElementById("totalOrders") &&
        document.getElementById("avgACOS") &&
        document.getElementById("avgCTR")
      ) {
        clearInterval(dashboardCheckInterval);
        updateKPIs(data);
        renderDataTable(data);
      }
    }, 100);
  }

  function updateKPIs(data) {
    let totalSpend = 0,
        totalSales = 0,
        totalOrders = 0,
        totalACOS = 0,
        totalCTR = 0,
        validACOS = 0,
        validCTR = 0;

    data.forEach(row => {
      const spend = parseFloat(row["Spend"]) || 0;
      const sales = parseFloat(row["7 Day Total Sales "]) || 0;
      const orders = parseInt(row["7 Day Total Orders (#)"]) || 0;
      const acos = parseFloat(row["Total Advertising Cost of Sales (ACOS) "]);
      const ctr = parseFloat(row["Click-Thru Rate (CTR)"]);

      totalSpend += spend;
      totalSales += sales;
      totalOrders += orders;

      if (!isNaN(acos)) {
        totalACOS += acos;
        validACOS++;
      }
      if (!isNaN(ctr)) {
        totalCTR += ctr;
        validCTR++;
      }
    });

    document.getElementById("totalSpend").textContent = `$${totalSpend.toFixed(2)}`;
    document.getElementById("totalSales").textContent = `$${totalSales.toFixed(2)}`;
    document.getElementById("totalOrders").textContent = totalOrders.toString();
    document.getElementById("avgACOS").textContent = (validACOS ? (totalACOS / validACOS).toFixed(2) : "0") + "%";
    document.getElementById("avgCTR").textContent = (validCTR ? (totalCTR / validCTR).toFixed(2) : "0") + "%";
  }

  function renderDataTable(data) {
    const tableData = data.map(row => {
      return {
        Date: row["Date"],
        Store: row["Store"],
        Campaign: row["Campaign Name"],
        Spend: parseFloat(row["Spend"]).toFixed(2),
        Sales: parseFloat(row["7 Day Total Sales "]).toFixed(2),
        Orders: parseInt(row["7 Day Total Orders (#)"]) || 0,
        CTR: row["Click-Thru Rate (CTR)"] || "0%",
        ACOS: row["Total Advertising Cost of Sales (ACOS) "] || "0%",
        ROAS: row["Total Return on Advertising Spend (ROAS)"] || "0",
      };
    });

    const table = $("#dataTable").DataTable({
      data: tableData,
      destroy: true,
      columns: [
        { data: "Date" },
        { data: "Store" },
        { data: "Campaign" },
        { data: "Spend" },
        { data: "Sales" },
        { data: "Orders" },
        { data: "CTR" },
        { data: "ACOS" },
        { data: "ROAS" },
      ],
    });
  }

  // Firebase Setup
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

  signupButton.addEventListener("click", () => {
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => location.reload())
      .catch(error => alert(error.message));
  });

  loginButton.addEventListener("click", () => {
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;
    auth.signInWithEmailAndPassword(email, password)
      .then(() => location.reload())
      .catch(error => alert(error.message));
  });

  logoutButton.addEventListener("click", () => {
    auth.signOut().then(() => location.reload());
  });

  auth.onAuthStateChanged(user => {
    if (user) {
      loginContainer.style.display = "none";
      dashboardContainer.style.display = "block";
    } else {
      loginContainer.style.display = "block";
      dashboardContainer.style.display = "none";
    }
  });
};
