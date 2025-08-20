// ==========================
// Main Dashboard Script
// ==========================

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
      if (row["Store"]) {
        storeSet.add(row["Store"]);
      }
    });

    const monthSelect = document.getElementById("monthFilter");
    const storeSelect = document.getElementById("storeFilter");

    monthSet.forEach(month => {
      const option = new Option(month, month, false, true);
      monthSelect.appendChild(option);
    });
    storeSet.forEach(store => {
      const option = new Option(store, store, false, true);
      storeSelect.appendChild(option);
    });

    const monthChoices = new Choices(monthSelect, { removeItemButton: true });
    const storeChoices = new Choices(storeSelect, { removeItemButton: true });

    function applyFilters() {
      const selectedMonths = monthChoices.getValue(true);
      const selectedStores = storeChoices.getValue(true);

      const filtered = data.filter(row => {
        const rowDate = new Date(row["Date"]);
        const rowMonth = ("0" + (rowDate.getMonth() + 1)).slice(-2) + "-" + rowDate.getFullYear();
        const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(rowMonth);
        const matchStore = selectedStores.length === 0 || selectedStores.includes(row["Store"]);
        return matchMonth && matchStore;
      });

      updateKPIs(filtered);
      updateTable(filtered);
      updateCharts(filtered);
    }

    monthSelect.addEventListener("change", applyFilters);
    storeSelect.addEventListener("change", applyFilters);

    applyFilters();
  }

  function updateKPIs(data) {
    let totalSpend = 0, totalSales = 0, totalOrders = 0;

    data.forEach(row => {
      totalSpend += parseFloat(row["Spend"] || 0);
      totalSales += parseFloat((row["7 Day Total Sales"] || row["7 Day Total Sales "] || "0").toString().replace(/[$,]/g, ''));
      totalOrders += parseInt(row["7 Day Total Orders (#)"] || 0);
    });

    document.getElementById("kpiSpend").textContent = `$${totalSpend.toFixed(2)}`;
    document.getElementById("kpiSales").textContent = `$${totalSales.toFixed(2)}`;
    document.getElementById("kpiOrders").textContent = totalOrders;
    document.getElementById("kpiACOS").textContent = totalSales ? `${((totalSpend / totalSales) * 100).toFixed(2)}%` : "0%";
    document.getElementById("kpiCTR").textContent = "-";
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
        <td>${row["7 Day Total Sales"] || row["7 Day Total Sales "]}</td>
        <td>${row["7 Day Total Orders (#)"]}</td>
        <td>${row["Click-Thru Rate (CTR)"] || "-"}</td>
      `;
      tableBody.appendChild(tr);
    });

    $('#dataTable').DataTable({ scrollX: true });
  }

  function updateCharts(data) {
    const ctx1 = document.getElementById("barChart").getContext("2d");
    const ctx2 = document.getElementById("lineChart1").getContext("2d");

    if (window.barChartInstance) window.barChartInstance.destroy();
    if (window.lineChartInstance) window.lineChartInstance.destroy();

    const storeSpend = {};
    const dateSales = {};

    data.forEach(row => {
      const store = row["Store"];
      const spend = parseFloat(row["Spend"] || 0);
      storeSpend[store] = (storeSpend[store] || 0) + spend;

      const date = row["Date"];
      const rawSales = row["7 Day Total Sales"] || row["7 Day Total Sales "] || "0";
      const sales = parseFloat(rawSales.toString().replace(/[$,]/g, ""));
      if (!isNaN(sales)) {
        dateSales[date] = (dateSales[date] || 0) + sales;
      }
    });

    window.barChartInstance = new Chart(ctx1, {
      type: "bar",
      data: {
        labels: Object.keys(storeSpend),
        datasets: [{
          label: "Spend by Store",
          data: Object.values(storeSpend),
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

    const sortedDates = Object.keys(dateSales).sort();
    const sortedSales = sortedDates.map(d => dateSales[d]);

    window.lineChartInstance = new Chart(ctx2, {
      type: "line",
      data: {
        labels: sortedDates,
        datasets: [{
          label: "Sales Over Time",
          data: sortedSales,
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
};
