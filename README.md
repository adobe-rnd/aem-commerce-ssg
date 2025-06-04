# Edge Delivery Services Storefront Prerender

Pluggable prerendering framework for ahead-of-time data fetching and embedding in Product Pages and more.
* ⚡️ Boost SEO by pre-rendering human-readable product data in the markup
* 💉 Inject JSON-LD Structured data in the page source code
* 📈 Aggregate data sources and inject resulting data ahead-of-time
* ⚙️ Define your custom rendering logic
* 🧠 Offload intensive computation to the rendering phase

:sparkles: _Early-access technology_ :sparkles: Please get in touch with us in your dedicated support Slack channel to learn more about this feature.

## Getting started

Please follow the [Documentation](https://github.com/adobe-rnd/aem-commerce-ssg/wiki/Documentation#summary) for setting up the solution, maintaining and operating it.

## Local Dev

- `aio app run` to start your local Dev server
- App will run on `localhost:9080` by default

By default the UI will be served locally but actions will be deployed and served from Adobe I/O Runtime. To start a
local serverless stack and also run your actions locally use the `aio app run --local` option.

## Test & Coverage

- Run `aio app test` to run unit tests for ui and actions
- Run `aio app test --e2e` to run e2e tests

## Deploy & Cleanup

- `aio app deploy` to build and deploy all actions on Runtime and static files to CDN
- `aio app undeploy` to undeploy the app

### `.env` config

You can generate this file using the command `aio app use`. 

```bash
# This file must **not** be committed to source control

## please provide your Adobe I/O Runtime credentials
# AIO_RUNTIME_AUTH=
# AIO_RUNTIME_NAMESPACE=
```

## Notes on dependencies

The action uses LiveSearch to list products from the store.
PLEASE NOTE that LiveSearch has a hard limit on the maximum number of results that can be returned in a search query: 10,000.
For further details, please see https://experienceleague.adobe.com/en/docs/commerce-merchant-services/live-search/boundaries-limits#query

To mitigate that issue, the [fetch-all-products](/actions/fetch-all-products/index.js) action goes into each of the categories to fetch all products under each category. Then it combines all products and removes any duplicates.
