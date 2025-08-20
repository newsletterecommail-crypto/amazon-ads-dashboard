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

  if (window['chartjs-plugin-zoom']) Chart.register(window['chartjs-plugin-zoom']);

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

  signupButton.addEventListener('click', e => {
    e.preventDefault();
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
      .then(() => authMessage.textContent = "Signup successful!")
      .catch(err => authMessage.textContent = err.message);
  });

  loginButton.addEventListener('click', e => {
    e.preventDefault();
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
      .then(() => authMessage.textContent = "")
      .catch(err => authMessage.textContent = err.message);
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
    const CSV1 = "https://raw.githubusercontent.com/newsletterecommail-crypto/amazon-ads-dashboard/main/report_part1.csv";
    const CSV2 = "https://raw.githubusercontent.com/newsletterecommail-crypto/amazon-ads-dashboard/main/report_part2.csv";

    let merged = [];

    Papa.parse(CSV1, { download: true, header: true, skipEmptyLines: true, complete: r1 => {
      merged = r1.data;
      Papa.parse(CSV2, { download: true, header: true, skipEmptyLines: true, complete: r2 => {
          merged = merged.concat(r2.data);
          allData = merged;
          console.log("Headers:", Object.keys(allData[0]));
          updateDashboard(allData);
        }
      });
    }});
  }

  function updateKPIs(data) {
    let spend=0,sales=0,orders=0,acosSum=0,ctrSum=0,count=0;
    data.forEach(r => {
      spend += parseFloat(r.Spend) || 0;
      sales += parseFloat(r["7 Day Total Sales"]) || 0;
      orders += parseInt(r["7 Day Total Orders (#)"]) || 0;
      const a = parseFloat(r["Total Advertising Cost of Sales (ACOS)"]) || 0;
      const c = parseFloat(r["Click-Thru Rate (CTR)"]) || 0;
      if (!isNaN(a)) { acosSum+=a; count++; }
      ctrSum += isNaN(c)?0:c;
    });
    kpiSpend.textContent = `$${spend.toFixed(2)}`;
    kpiSales.textContent = `$${sales.toFixed(2)}`;
    kpiOrders.textContent = orders;
    kpiACOS.textContent = count ? `${(acosSum/count).toFixed(2)}%` : '0%';
    kpiCTR.textContent = `${(ctrSum/data.length).toFixed(2)}%`;
  }

  function updateDashboard(data) {
    const months = [...new Set(data.map(r => r.Date?.slice(3)))].sort();
    const stores = [...new Set(data.map(r => r.Store))].sort();
    const portfolios = [...new Set(data.map(r => (r["Portfolio name"]||"Unknown").trim()))]
                        .filter(v=>v).sort();

    monthFilter.innerHTML = `<label><input type="checkbox" value="All" checked> All</label>` +
      months.map(m=>`<label><input type="checkbox" value="${m}" checked> ${m}</label>`).join('');
    storeFilter.innerHTML = `<label><input type="checkbox" value="All" checked> All</label>` +
      stores.map(s=>`<label><input type="checkbox" value="${s}" checked> ${s}</label>`).join('');
    portfolioFilter.innerHTML = `<label><input type="checkbox" value="All" checked> All</label>` +
      portfolios.map(p=>`<label><input type="checkbox" value="${p}" checked> ${p}</label>`).join('');

    [monthFilter,storeFilter,portfolioFilter].forEach(el => el.querySelectorAll('input')
      .forEach(cb => cb.addEventListener('change', ()=>applyFilters(data))));
    ['monthFilter','storeFilter','portfolioFilter'].forEach(id => enableAllToggle(id,data));
    applyFilters(data);
  }

  function enableAllToggle(id,data) {
    document.getElementById(id).addEventListener('change',e=>{
      if(e.target.value==="All") {
        document.getElementById(id).querySelectorAll('input')
          .forEach(cb=>cb.checked=e.target.checked);
      } else {
        document.getElementById(id).querySelector('input[value="All"]').checked=false;
      }
      applyFilters(data);
    });
  }

  function applyFilters(data) {
    const selM = Array.from(monthFilter.querySelectorAll('input:checked')).map(cb=>cb.value);
    const selS = Array.from(storeFilter.querySelectorAll('input:checked')).map(cb=>cb.value);
    const selP = Array.from(portfolioFilter.querySelectorAll('input:checked')).map(cb=>cb.value);
    const f = data.filter(r =>
      (selM.includes("All")||selM.includes(r.Date?.slice(3))) &&
      (selS.includes("All")||selS.includes(r.Store)) &&
      (selP.includes("All")||selP.includes((r["Portfolio name"]||"Unknown").trim()))
    );
    updateKPIs(f);
    renderCampaignTable(f);
    renderPivotTable(f);
    renderBarChart(f);
    renderLineChart(f);
  }

  function renderCampaignTable(d) {
    const t = document.querySelector('#dataTable tbody');
    if(!t) return;
    t.innerHTML = "";
    d.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.Date||''}</td><td>${r.Store||''}</td><td>${r["Campaign Name"]||''}</td>
        <td>${parseFloat(r.Spend||0).toFixed(2)}</td>
        <td>${parseFloat(r["7 Day Total Sales"]||0).toFixed(2)}</td>
        <td>${parseInt(r["7 Day Total Orders (#)"]||0)}</td>
        <td>${parseFloat(r["Click-Thru Rate (CTR)"]||0).toFixed(2)}</td>`;
      t.appendChild(tr);
    });
    if($.fn.DataTable.isDataTable('#dataTable')) $('#dataTable').DataTable().clear().destroy();
    $('#dataTable').DataTable({paging: true,searching: true,ordering: true, info: true});
  }

  function renderPivotTable(d) {
    const t = document.querySelector('#pivotTable tbody');
    if(!t) return;
    t.innerHTML = '';
    const m = {};
    d.forEach(r=>{
      const s = r.Store, sp = parseFloat(r.Spend)||0, sa = parseFloat(r["7 Day Total Sales"])||0, a = parseFloat(r["Total Advertising Cost of Sales (ACOS)"])||0;
      if(!m[s]) m[s]={sp:0,sa:0,aSum:0,aCount:0};
      m[s].sp+=sp; m[s].sa+=sa;
      if(!isNaN(a)){m[s].aSum+=a; m[s].aCount++;}
    });
    Object.entries(m).forEach(([s,v])=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s}</td><td>$${v.sp.toFixed(2)}</td><td>$${v.sa.toFixed(2)}</td><td>${v.aCount?(v.aSum/v.aCount).toFixed(2)+'%':'0%'}</td>`;
      t.appendChild(tr);
    });
  }

  function renderBarChart(d) {
    const ctx = document.getElementById('barChart').getContext('2d');
    if(window.barChart) window.barChart.destroy();
    const spendByStore = {};
    d.forEach(r=>{spendByStore[r.Store] = (spendByStore[r.Store]||0) + (parseFloat(r.Spend)||0);});
    const labels = Object.keys(spendByStore), dataVals = Object.values(spendByStore);
    window.barChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{label:'Spend by Store', data:dataVals, backgroundColor:'rgba(54,162,235,0.6)'}] }});
  }

  function renderLineChart(d) {
    const ctx = document.getElementById('lineChart1').getContext('2d');
    if(window.lineChart) window.lineChart.destroy();
    const salesByDate = {};
    d.forEach(r=>{ const date=r.Date, sal = parseFloat(r["7 Day Total Sales"])||0; salesByDate[date]=(salesByDate[date]||0)+sal;});
    const labels = Object.keys(salesByDate).sort(), dataVals= labels.map(l=>salesByDate[l]);
    window.lineChart = new Chart(ctx,{type:'line', data:{labels, datasets:[{label:'Sales Over Time', data:dataVals, borderColor:'rgba(75,192,192,1)', fill:false}]}, options:{scales:{x:{ticks:{autoSkip:true,maxTicksLimit:10}}}});
  }
};
