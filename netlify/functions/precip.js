const https = require('https');

const LOCATIONS = {
  Berastagi: [98.52612, 3.238704],
  Langkat: [98.468829, 3.295924],
  Solok: [100.634659, -0.970453],
  Tanggamus: [104.668215, -5.445672],
  Citereup: [106.95314, -6.604072],
  Ciherang: [106.881116, -6.732639],
  Caringin: [106.865775, -6.751845],
  Lido: [106.827264, -6.765598],
  Kubang: [106.746108, -6.752897],
  Citeko: [106.85, -6.7],
  Cianjur: [107.019295, -6.846404],
  Subang: [107.686182, -6.736265],
  Subang_source: [107.738479, -6.714161],
  Wonosobo: [109.954971, -7.296722],
  Klaten: [110.47984, -7.53718],
  Pandaan: [112.638266, -7.721405],
  Pasuruan_BMKG: [112.63533, -7.70456],
  Keboncandi: [112.91889, -7.81037],
  Banyuwangi: [114.155667, -8.184945],
  Kuwum: [115.186137, -8.331112],
  Mambal: [115.304637, -8.253142],
  Bangli: [115.34661, -8.321231],
  Airmadidi: [124.99932, 1.438416]
};

function formatDateCSV(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} 07:00:00`;
}

function formatDateAPI(date) {
  return date.toISOString().split('T')[0];
}

exports.handler = async (event, context) => {
  const locationName = event.queryStringParameters.location || "Solok";
  const coords = LOCATIONS[locationName];

  if (!coords) {
    return {
      statusCode: 400,
      body: "Invalid location. Use ?location=Solok"
    };
  }

  const [longitude, latitude] = coords;
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const start = formatDateAPI(sevenDaysAgo);
  const end = formatDateAPI(today);
  const timezone = "Asia/Bangkok";

  const apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${start}&end_date=${end}&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=${timezone}`;

  return new Promise((resolve) => {
    https.get(apiUrl, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.daily) {
            resolve({
              statusCode: 500,
              body: 'Failed to get precipitation data'
            });
            return;
          }

          const csvRows = ["Timestamp;Site_Name;Source_name;Parameter_name;precipitation;evapotranspiration"];
          for (let i = 0; i < json.daily.time.length; i++) {
            const timestamp = formatDateCSV(new Date(json.daily.time[i]));
            const precipitation = json.daily.precipitation_sum[i] ?? "";
            const evapotranspiration = json.daily.et0_fao_evapotranspiration[i] ?? "";
            csvRows.push(`${timestamp};${locationName};PRCP001;precipitation;${precipitation};${evapotranspiration}`);
          }

          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'text/csv' },
            body: csvRows.join("\n")
          });
        } catch (err) {
          resolve({
            statusCode: 500,
            body: "Error parsing data"
          });
        }
      });
    }).on('error', () => {
      resolve({
        statusCode: 500,
        body: "Error fetching data"
      });
    });
  });
};
