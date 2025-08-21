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
              allData = allData.map(row => {
                const trimmed = {};
                for (const key in row) {
                  trimmed[key.trim()] = row[key];
                }
                return trimmed;
              });
              initDashboard(allData);
            }
          });
        }
      });
    });

  function initDashboard(data) {
    updateKPIs(data);
    renderDataTable(data);
  }

  function updateKPIs(data) {
    let totalSpend = 0, totalSales = 0, totalOrders = 0, totalACOS = 0, totalCTR = 0;
    let validACOS = 0, validCTR = 0;

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

    document.getElementById("totalSpend").innerText = `$${totalSpend.toFixed(2)}`;
    document.getElementById("totalSales").innerText = `$${totalSales.toFixed(2)}`;
    document.getElementById("totalOrders").innerText = totalOrders;
    document.getElementById("avgACOS").innerText = validACOS ? `${(totalACOS / validACOS).toFixed(2)}%` : "0%";
    document.getElementById("avgCTR").innerText = validCTR ? `${(totalCTR / validCTR).toFixed(2)}%` : "0%";
  }

  function renderDataTable(data) {
    const tableBody = document.querySelector("#dataTable tbody");
    tableBody.innerHTML = "";

    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row["Date"] || ""}</td>
        <td>${row["Store"] || ""}</td>
        <td>${row["Campaign Name"] || ""}</td>
        <td>${parseFloat(row["Spend"]) || 0}</td>
        <td>${parseFloat(row["7 Day Total Sales "]) || 0}</td>
        <td>${parseInt(row["7 Day Total Orders (#)"]) || 0}</td>
        <td>${row["Click-Thru Rate (CTR)"] || "0"}</td>
        <td>${row["Total Advertising Cost of Sales (ACOS) "] || "0"}</td>
        <td>${row["Total Return on Advertising Spend (ROAS)"] || "0"}</td>
      `;
      tableBody.appendChild(tr);
    });

    $("#dataTable").DataTable();
  }
};
