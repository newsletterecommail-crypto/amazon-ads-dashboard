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

    const monthSelect = document.getElementById("monthSelect");
    const storeSelect = document.getElementById("storeSelect");

    Array.from(monthSet).sort().reverse().forEach(month => {
      const option = document.createElement("option");
      option.value = month;
      option.text = month;
      monthSelect.appendChild(option);
    });

    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.text = "All";
    storeSelect.appendChild(allOption);

    Array.from(storeSet).sort().forEach(store => {
      const option = document.createElement("option");
      option.value = store;
      option.text = store;
      storeSelect.appendChild(option);
    });

    function applyFilters() {
      const selectedMonth = monthSelect.value;
      const selectedStore = storeSelect.value;

      const filtered = data.filter(row => {
        const rowDate = new Date(row["Date"]);
        const rowMonth = ("0" + (rowDate.getMonth() + 1)).slice(-2) + "-" + rowDate.getFullYear();
        const matchMonth = selectedMonth === "" || rowMonth === selectedMonth;
        const matchStore = selectedStore === "All" || row["Store"] === selectedStore;
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
      totalSales += parseFloat(row["7 Day Total Sales"] || 0);
      totalOrders += parseInt(row["Total Orders"] || 0);
    });

    document.getElementById("spendValue").textContent = `$${totalSpend.toFixed(2)}`;
    document.getElementById("salesValue").textContent = `$${totalSales.toFixed(2)}`;
    document.getElementById("ordersValue").textContent = totalOrders.toLocaleString();
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
        <td>${row["7 Day Total Sales"]}</td>
        <td>${row["Total Orders"]}</td>
        <td>${row["ACOS"]}</td>
        <td>${row["CTR"]}</td>
      `;
      tableBody.appendChild(tr);
    });

    $('#dataTable').DataTable({
      paging: true,
      searching: true,
      ordering: true,
      scrollX: true,
      footerCallback: function (row, data, start, end, display) {
        const api = this.api();
        const intVal = i => typeof i === 'string' ? parseFloat(i.replace(/[\$,]/g, '')) : typeof i === 'number' ? i : 0;

        const colIndices = [3, 4, 5]; // Spend, Sales, Orders
        colIndices.forEach(col => {
          const total = api
            .column(col, { search: 'applied' })
            .data()
            .reduce((a, b) => intVal(a) + intVal(b), 0);
          $(api.column(col).footer()).html(col === 5 ? total.toLocaleString() : `$${total.toFixed(2)}`);
        });
      }
    });
  }

  function updateCharts(data) {
    // Placeholder for chart logic
  }
};
