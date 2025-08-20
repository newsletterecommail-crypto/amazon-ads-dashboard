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
    const monthSet = new Set();
    const storeSet = new Set();

    data.forEach(row => {
      const dt = new Date(row["Date"]);
      if (!isNaN(dt)) {
        const m = ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + dt.getFullYear();
        monthSet.add(m);
      }
      if (row["Store"]) storeSet.add(row["Store"]);
    });

    const monthArr = [...monthSet].sort();
    const storeArr = [...storeSet].sort();

    const monthSel = document.getElementById("monthFilter");
    const storeSel = document.getElementById("storeFilter");

    monthSel.innerHTML = '<option value="All">All</option>';
    monthArr.forEach(m => {
      monthSel.innerHTML += `<option value="${m}">${m}</option>`;
    });

    storeSel.innerHTML = '<option value="All">All</option>';
    storeArr.forEach(s => {
      storeSel.innerHTML += `<option value="${s}">${s}</option>`;
    });

    monthSel.addEventListener("change", () => applyFilters(data));
    storeSel.addEventListener("change", () => applyFilters(data));

    applyFilters(data); // initial load
  }

  function applyFilters(data) {
    const selMonth = document.getElementById("monthFilter").value;
    const selStore = document.getElementById("storeFilter").value;

    const filtered = data.filter(row => {
      const dt = new Date(row["Date"]);
      const m = ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + dt.getFullYear();
      const monthOK = selMonth === "All" || m === selMonth;
      const storeOK = selStore === "All" || row["Store"] === selStore;
      return monthOK && storeOK;
    });

    updateKPIs(filtered);
    renderCharts(filtered);
    renderTable(filtered);
  }

  function updateKPIs(data) {
    let spend = 0, sales = 0, orders = 0, ctrSum = 0, ctrCount = 0;
    data.forEach(r => {
      spend += parseFloat(r["Spend"] || 0);
      sales += parseFloat(r["7 Day Total Sales (whatever exact header)"] || 0);
      orders += parseInt(r["7 Day Total Orders (#)"] || 0);
      const ctr = parseFloat(r["Click-Thru Rate (CTR)"] || 0);
      if (!isNaN(ctr)) {
        ctrSum += ctr;
        ctrCount++;
      }
    });
    document.getElementById("kpiSpend").textContent = "$" + spend.toFixed(2);
    document.getElementById("kpiSales").textContent = "$" + sales.toFixed(2);
    document.getElementById("kpiOrders").textContent = orders;
    document.getElementById("kpiACOS").textContent = sales ? ((spend / sales) * 100).toFixed(2) + "%" : "0%";
    document.getElementById("kpiCTR").textContent = ctrCount ? (ctrSum / ctrCount).toFixed(2) + "%" : "0%";
  }

  function renderCharts(data) {
    // Your existing chart rendering logic using filtered data
    // Make sure to regenerate charts based on `data`
  }

  function renderTable(data) {
    const table = $('#dataTable').DataTable();
    table.clear();

    let totalSpend = 0, totalSales = 0, totalOrders = 0;
    data.forEach(r => {
      const s = parseFloat(r["Spend"] || 0);
      const sa = parseFloat(r["7 Day Total Sales (whatever header)"] || 0);
      const o = parseInt(r["7 Day Total Orders (#)"] || 0);
      totalSpend += s;
      totalSales += sa;
      totalOrders += o;

      table.row.add([
        r["Date"] || '',
        r["Store"] || '',
        r["Campaign Name"] || '',
        "$" + s.toFixed(2),
        "$" + sa.toFixed(2),
        o,
        r["Click-Thru Rate (CTR)"] + '%'
      ]);
    });

    // Add totals row
    table.row.add([
      '', '<strong>Totals</strong>', '',
      "<strong>$" + totalSpend.toFixed(2) + "</strong>",
      "<strong>$" + totalSales.toFixed(2) + "</strong>",
      "<strong>" + totalOrders + "</strong>",
      ''
    ]);

    table.draw();
  }
};
