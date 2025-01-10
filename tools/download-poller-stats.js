require('dotenv').config();
const openwhisk = require('openwhisk');
const { exit } = require('process');

const {
    AIO_RUNTIME_NAMESPACE,
    AIO_RUNTIME_AUTH,
// eslint-disable-next-line no-undef
} = process.env;

if (!AIO_RUNTIME_NAMESPACE || !AIO_RUNTIME_AUTH) {
  console.log('Missing required environment variables AIO_RUNTIME_AUTH and AIO_RUNTIME_NAMESPACE');
  exit(1);
}

const actionName = 'poller';
const opts = {};
const ow = openwhisk({
  apihost: 'https://adobeioruntime.net',
  api_key: AIO_RUNTIME_AUTH,
  namespace: AIO_RUNTIME_NAMESPACE,
});

async function* listActivations() {
  const { activations } = await ow.activations.list({ count: true, ...opts });
  for (let limit = 50, skip = 0, retry = true; skip < activations; skip += limit) {
    let activations;
    try {
      activations = await ow.activations.list({ limit, skip, ...opts });
    } catch(e) {
      if (retry) {
        // retry only once
        retry = false;
        continue;
      }
      throw e;
    }
    
    for (const activation of activations) {
      yield activation;
    }
  }
}

console.log('activationId,startDate,duration,state,failed,ignored,published,unpublished,previewDuration');

async function dumpActivations() {
  for await (const activation of listActivations()) {
    const { name, duration, activationId, start } = activation;

    if (actionName === name) {
      const startDate = new Date(start)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/,'');

      let result;
      try {
         result = await ow.activations.result({ name: activationId });
      // eslint-disable-next-line no-unused-vars
      } catch(e) {
        // ignore and retry
        result = await ow.activations.result({ name: activationId });
      }

      // skip skipped
      if (!result?.result || result.result.state === 'skipped') {
        continue;
      }

      const { state, status = {}, timings = {} } = result.result;
      const { failed, ignored, published, unpublished } = status;
      const { previewDuration } = timings;

      console.log([
        activationId,
        startDate,
        duration,
        state,
        failed,
        ignored,
        published,
        unpublished,
        previewDuration?.avg || 0
      ].join(','));
    }
  }
}

dumpActivations();
