const speakeasy = require('speakeasy');

// Get the secret from command line or use the admin user's secret
const secret = process.argv[2] || 'JVBEC5BTJJTFGIZZER2DMW2PIRZWMLTW';

// Generate current TOTP code
const token = speakeasy.totp({
  secret: secret,
  encoding: 'base32'
});

console.log(`Current TOTP code for secret ${secret}: ${token}`);
console.log(`This code is valid for about 30 seconds`);

// Also show next code
setTimeout(() => {
  const nextToken = speakeasy.totp({
    secret: secret,
    encoding: 'base32'
  });
  console.log(`Next TOTP code: ${nextToken}`);
}, 1000);
