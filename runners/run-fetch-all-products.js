require('dotenv').config();
const { main } = require('../actions/fetch-all-products/index');

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
            HLX_SITE_NAME: process.env.HLX_SITE_NAME,
            HLX_ORG_NAME: process.env.HLX_ORG_NAME,
            HLX_CONTENT_URL: process.env.HLX_CONTENT_URL,
            LOG_LEVEL: 'info',
        });
        console.log(JSON.stringify(resp, null, 2));
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        console.log(new Date().toISOString(), 'Finishing the action');
    }
})();
