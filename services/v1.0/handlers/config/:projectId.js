'use strict';
/**
 * Operations on /config/{projectid}
 */
module.exports = {
    /**
     * summary: get project config list
     * description: pass projetid to get the config

     * parameters: projectid
     * produces: application/json
     * responses: 200, 400
     */
    get: function getConfig(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: update project config
     * description: save project config

     * parameters: projectid, body
     * produces: application/json
     * responses: 200, 400
     */
    post: function updateConfig(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    }
};
