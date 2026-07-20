import { config } from 'dotenv';
config();
import { runManualAnalysis } from './src/controllers/analysis.controller.js';
import prisma from './src/utils/prisma.util.js';

async function test() {
  const req = {
    body: {
      filename: 'auth.js',
      content: `const jwt = require('jsonwebtoken');
const SECRET = 'abc123';
function login(user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '7d' });
  console.log('token:', token);
  return token;
}
module.exports = { login };`
    },
    user: { id: 'cmrhou24j000qbb2mxwut50ns' }
  };
  
  const res = {
    status: (code) => {
      console.log('Status:', code);
      return {
        json: (data) => console.log('Response JSON:', JSON.stringify(data, null, 2))
      };
    }
  };
  
  await runManualAnalysis(req, res);
}
test();
