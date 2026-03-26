// Generate a valid JWT token for testing
// Run: node generate-test-token.js

const crypto = require('crypto');

// Header
const header = {
    alg: 'HS256',
    typ: 'JWT'
};

// Payload - expires in year 2099
const payload = {
    unique_name: 'TestAdmin',
    role: 'Admin',
    nameid: 'test-user-001',
    exp: 4102444800  // 2099-12-31
};

// Base64Url encode function
function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Create token parts
const headerEncoded = base64UrlEncode(JSON.stringify(header));
const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

// Create signature (using a dummy secret)
const secret = 'test-secret-key-for-smart-parts';
const signatureInput = `${headerEncoded}.${payloadEncoded}`;
const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

// Final token
const token = `${headerEncoded}.${payloadEncoded}.${signature}`;

console.log('\n=== Smart Parts Test Token ===\n');
console.log('Token:', token);
console.log('\n=== Test URL ===\n');
console.log(`http://localhost:5100/?token=${token}`);
console.log(`https://smartparts.ericchh.work/?token=${token}`);
console.log('\n');
