
'use strict';

const {APIHandler, APIResponse} = require('gateway-addon');
const manifest = require('./manifest.json');

/**
 * Doorlock Manager API
 */
class DoorlockManagerApi extends APIHandler {
    constructor(addonManager) {
        super(addonManager, manifest.id);
        addonManager.addAPIHandler(this);
    }

    async handleRequest(request) {
        if (request.method !== 'POST' || request.path !== '/doorlock-api') {
            return new APIResponse({status: 404});
        }

        // echo back the body
        return new APIResponse({
            status: 200,
            contentType: 'application/json',
            content: JSON.stringify(request.body),
        });
    }
}

module.exports = DoorlockManagerApi;
