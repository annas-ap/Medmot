import https from 'https';
import fs from 'fs';
https.get('https://smilingwestjava.jabarprov.go.id/ic-logo.svg', (res) => {
  let chunks = [];
  res.on('data', (d) => chunks.push(d));
  res.on('end', () => {
    const svg = Buffer.concat(chunks).toString('base64');
    fs.writeFileSync('logo_b64.txt',  svg);
    console.log('done');
  });
});
