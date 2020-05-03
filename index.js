'use strict';

const DoorlockManagerApiHandler = require('./DoorlockManagerApiHandler');

module.exports = (addonManager) => {
    new DoorlockManagerApiHandler(addonManager);
};
