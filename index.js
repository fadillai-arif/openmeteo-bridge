const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

app.get("/precip", async (req, res) => {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const start = formatDate(sevenDaysAgo);
  const end = formatDate(today);

  const latitude = -6.77;
  const longitude = 106.7203;
  const timezone = "Asia/Bangkok";

  const apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${start}&end_date=${end}&daily=precipitation_sum&timezone=${timezone}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.daily) {
      return res.status(500).send("Failed to get precipitation data.");
    }

    const csvRows = ["date,precipitation_sum"];
    for (let i = 0; i < data.daily.time.length; i++) {
      csvRows.push(`${data.daily.time[i]},${data.daily.precipitation_sum[i]}`);
    }

    res.setHeader("Content-Type", "text/csv");
    res.send(csvRows.join("\n"));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});