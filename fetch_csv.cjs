const https = require('https');

https.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vTwKZEQ0e2BA_HW7H_e-Og2aNP5DS5miZPbaD-raEMlcRC8JZNULqPjEctCqOBsJ763J4xnbTjVlq_L/pub?gid=0&single=true&output=csv', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
    if (data.length > 1000) {
      console.log(data.substring(0, 1000));
      process.exit(0);
    }
  });
}).on('error', (err) => {
  console.error(err);
});
