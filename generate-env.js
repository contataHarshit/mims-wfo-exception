const fs = require('fs');
require('dotenv').config();

const targetPath = './src/environments/environment.deployment.ts';

const envFileContent = `
export const Environment = {
  production: ${process.env.PRODUCTION === 'true'},
  baseUrl: "${process.env.BASEURL}",
  redirectURL: "${process.env.REDIRECTURL}"
};
`;

fs.writeFileSync(targetPath, envFileContent);
