import https from 'https';
https.get('https://smilingwestjava.jabarprov.go.id/ic-logo.svg', (res) => {
  console.log(res.headers);
});
