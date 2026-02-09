const https = require('https');
const fs = require('fs');

const secretKey = 'sk_test_End2qKrnSlIkSRFlhktSiKcSz1N8TTitlvFK3L7pzd';

const options = {
    hostname: 'api.clerk.com',
    path: '/v1/users?limit=1',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    const output = `StatusCode: ${res.statusCode}`;
    fs.writeFileSync('validation_output.txt', output);
});

req.on('error', (error) => {
    fs.writeFileSync('validation_output.txt', `Error: ${error.message}`);
});

req.end();
