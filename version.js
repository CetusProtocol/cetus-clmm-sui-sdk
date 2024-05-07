// Don't sync to github

const fs = require('fs');

const packageJsonPath = './package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const newVersion = `0.0.0-experimental-${getCurrentDateTimeString()}`;
packageJson.version = newVersion;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

console.log(`Version updated to ${newVersion}`);

function getCurrentDateTimeString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const dateTimeString = `${year}${month}${day}${hours}${minutes}${seconds}`;

  return dateTimeString;
}