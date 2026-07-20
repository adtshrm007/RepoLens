import { config } from 'dotenv';
config();
import jwt from 'jsonwebtoken';
import https from 'https';

const userId = 'cmrhou24j000qbb2mxwut50ns'; 
const secret = process.env.ACCESS_TOKEN_SECRET;

if (!secret) {
  console.error('No ACCESS_TOKEN_SECRET found locally.');
  process.exit(1);
}

const token = jwt.sign({ id: userId }, secret, { expiresIn: '1d' });

const body = JSON.stringify({
  filename: 'test.js',
  content: 'function add(a,b) { return a+b; }'
});

const opts = {
  hostname: 'repolens-fuxb.onrender.com',
  path: '/analysis/manual',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Cookie': 'accessToken=' + token
  }
};

const req = https.request(opts, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', e => console.error(e));
req.write(body);
req.end();
