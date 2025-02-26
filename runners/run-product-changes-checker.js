require('dotenv').config();
const { main } = require('../actions/check-product-changes/index');

(async () => {
    try {
        console.log(new Date().toISOString(), 'Starting the action');
        const resp = await main({
            libInit: {
                ow: {
                    namespace: process.env.AIO_runtime_namespace,
                    auth: process.env.AIO_runtime_auth,
                }
            },
            authToken: process.env.EDS_API_KEY,
            HLX_SITE_NAME: process.env.HLX_SITE_NAME,
            HLX_PATH_FORMAT: process.env.HLX_PATH_FORMAT,
            HLX_ORG_NAME: process.env.HLX_ORG_NAME,
            HLX_CONTENT_URL: process.env.HLX_CONTENT_URL,
            HLX_CONFIG_NAME: process.env.HLX_CONFIG_NAME,
            LOG_LEVEL: 'info'
        });
        console.log(resp);
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        console.log(new Date().toISOString(), 'Finishing the action');
    }
})();
