// ==========================
// Firebase Configuration
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyA0831NjwrFfuceFgcg7ur2sVqOBkrAg1Y",
  authDomain: "ecom-ads-dashboard.firebaseapp.com",
  projectId: "ecom-ads-dashboard",
  storageBucket: "ecom-ads-dashboard.appspot.com", // ✅ FIXED LINE
  messagingSenderId: "98800254885",
  appId: "1:98800254885:web:887b2679a23362f8b6b24c",
  measurementId: "G-42KBT0D9ET"
};

// ==========================
// Firebase Initialization
// ==========================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ==========================
// Safe Plugin Registration
// ==========================
if (window['chartjs-plugin-zoom']) {
  Chart.register(window['chartjs-plugin-zoom']);
} else {
  console.warn("chartjs-plugin-zoom plugin not found. Zoom features will be disabled.");
}

// ==========================
// DOM Elements
// ==========================
const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authMessage = document.getElementById('authMessage');

// KPI Cards
const kpiSpend = document.getElementById('kpiSpend');
const kpiSales = document.getElementById('kpiSales');
const kpiOrders = document.getElementById('kpiOrders');
const kpiACOS = document.getElementById('kpiACOS');
const kpiCTR = document.getElementById('kpiCTR');

// Filters
const monthFilter = document.getElementById('monthFilter');
const storeFilter = document.getElementById('storeFilter');

// ==========================
// Data Storage and Chart Instances
// ==========================
let allData = [];
let barChartInstance;
let lineChart1Instance;
let lineChart2Instance;

// ==========================
// Auth Listeners
// ==========================
signupButton.addEventListener('click', (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      authMessage.textContent = "Signup successful!";
    })
    .catch((error) => {
      authMessage.textContent = error.message;
    });
});

loginButton.addEventListener('click', (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      authMessage.textContent = "";
    })
    .catch((error) => {
      authMessage.textContent = error.message;
    });
});

logoutButton.addEventListener('click', () => {
  auth.signOut();
});

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.style.display = 'none';
    dashboardContainer.classList.remove('hidden');

    // ✅ Load CSV data from GitHub after login
    fetchCSVFromGitHub(); 
  } else {
    loginContainer.style.display = 'block';
    dashboardContainer.classList.add('hidden');
  }
});

function fetchCSVFromGitHub() {
  const CSV_URL = "https://raw.githubusercontent.com/newsletterecommail-crypto/amazon-ads-dashboard/main/Products_Search_Term.csv";

  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      allData = results.data;
      console.log("CSV Data Loaded", allData);

      updateDashboard(allData); // 🔁 Trigger KPI + Charts update
    },
    error: function(err) {
      console.error("CSV Load Error:", err);
    }
  });
}
