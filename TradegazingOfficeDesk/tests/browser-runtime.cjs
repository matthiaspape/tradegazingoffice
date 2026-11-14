const {chromium} = require('playwright');

function browserOptions(env = process.env) {
  if (env.FLEET_BROWSER_EXECUTABLE && env.FLEET_BROWSER_CHANNEL) {
    throw new Error('Choose FLEET_BROWSER_EXECUTABLE or FLEET_BROWSER_CHANNEL, not both.');
  }
  return {
    headless: true,
    ...(env.FLEET_BROWSER_EXECUTABLE ? {executablePath: env.FLEET_BROWSER_EXECUTABLE} : {}),
    ...(env.FLEET_BROWSER_CHANNEL ? {channel: env.FLEET_BROWSER_CHANNEL} : {}),
  };
}

module.exports = {chromium, browserOptions};
