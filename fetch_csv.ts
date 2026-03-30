async function fetchCsv() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTwKZEQ0e2BA_HW7H_e-Og2aNP5DS5miZPbaD-raEMlcRC8JZNULqPjEctCqOBsJ763J4xnbTjVlq_L/pub?gid=0&single=true&output=csv');
  const text = await res.text();
  const lines = text.split('\n').slice(0, 10);
  console.log(lines.join('\n'));
}
fetchCsv();
