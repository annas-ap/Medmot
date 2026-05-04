import https from 'https';
https.get('https://a.basemaps.cartocdn.com/light_all/8/125/110.png', (res) => {
  console.log(res.headers);
});
