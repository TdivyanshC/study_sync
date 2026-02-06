const http = require('http');

const data = JSON.stringify({
  step1_data: {
    gender: "male",
    age: "25",
    relationship: "single"
  },
  step2_data: {
    preferred_sessions: ["coding", "study"]
  },
  display_name: "Test User"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/users/onboarding',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Dev-User-Id': '87de494f-4185-4507-8843-400dfa49b954',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
