const crypto = require('crypto');

// Example payload and headers - replace these with your actual data
const body = JSON.stringify({
  // Your actual JSON payload here
  "example": "data"
});
const svix_id = "msg_p5jXN8AQM9LWM0D4loKWxJek"; // Example ID, replace with actual
const svix_timestamp = "1614265330"; // Example timestamp, replace with actual
const signedContent = `${svix_id}.${svix_timestamp}.${body}`;

const secret = "whsec_8TXZCLEsyqDTzRs9Srngci2O6eBmlTI9"

// Decoding the secret key from base64
const secretBytes = Buffer.from(secret.split('_')[1], "base64");

// Generating the HMAC SHA-256 signature
const signature = crypto
  .createHmac('sha256', secretBytes)
  .update(signedContent)
  .digest('base64');

console.log("Generated Signature:", signature);
