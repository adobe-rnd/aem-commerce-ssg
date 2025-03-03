# AppBuilder SSG Template for Edge Delivery Storefront

## Setup

- Populate the `.env` file in the project root and fill it as shown [below](#env)
- Add the folllowing to [helix-query](https://www.aem.live/docs/admin.html#schema/IndexConfig) config:
  ```yaml
  index-published-products:
    # adjust paths based on your specific requirements (i.e. storeCode, routes, ...)
    target: s3://published-products-index.json
    include:
      - 'products/**'
    properties:
      sku:
        select: head > meta[name="sku"]
        value: attribute(el, "content")
      last-modified:
        select: none
        value: parseTimestamp(headers["last-modified"], "ddd, DD MMM YYYY hh:mm:ss GMT")
      # for benchmarking in the AppBuilder action
      product-last-modified:
        select: head > meta[name="x-cs-lastModifiedAt"]
        value: parseTimestamp(attribute(el, "content"), "YYYY-MM-DDTHH:mm:ss.SSSZ")
  ```

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

## Config

### `.env`

You can generate this file using the command `aio app use`. 

```bash
# This file must **not** be committed to source control

## please provide your Adobe I/O Runtime credentials
# AIO_RUNTIME_AUTH=
# AIO_RUNTIME_NAMESPACE=
```

### `app.config.yaml`

- Main configuration file that defines an application's implementation. 
- Once ready, the action `check-product-changes` - in charge of detecting product changes, triggering generation and publishing of the respective Product Detail Pages - needs to be configured for periodic activation (every 1 minute); to do so, just comment out the following block from the yaml file:
  ```yaml
        # triggers:
        #   everyMinTrigger:
        #     feed: /whisk.system/alarms/interval
        #     inputs: 
        #       minutes: 1
        # rules:
        #   everyMinRule:
        #   # When the action is invoked, it first checks
        #   # that no instances of the same action are already
        #   # running. If an instance is running, business logic
        #   # execution is skipped; if no instances are running,
        #   # it scans the Catalog to check for product changes.
        #   # The above means that the actual logic is not
        #   # necessarily executed every minute.
        #     trigger: everyMinTrigger
        #     action: check-product-changes
  ```
- More information on this file, application configuration, and extension configuration 
  can be found [here](https://developer.adobe.com/app-builder/docs/guides/appbuilder-configuration/#appconfigyaml)

#### Action Dependencies

- You have two options to resolve your actions' dependencies:

  1. **Packaged action file**: Add your action's dependencies to the root
   `package.json` and install them using `npm install`. Then set the `function`
   field in `app.config.yaml` to point to the **entry file** of your action
   folder. We will use `webpack` to package your code and dependencies into a
   single minified js file. The action will then be deployed as a single file.
   Use this method if you want to reduce the size of your actions.

  2. **Zipped action folder**: In the folder containing the action code add a
     `package.json` with the action's dependencies. Then set the `function`
     field in `app.config.yaml` to point to the **folder** of that action. We will
     install the required dependencies within that directory and zip the folder
     before deploying it as a zipped action. Use this method if you want to keep
     your action's dependencies separated.

## LiveSearch

The action uses LiveSearch to list products from the store.
PLEASE NOTE that LiveSearch has a hard limit on the maximum number of results that can be returned in a search query: 10,000.
For further details, please see https://experienceleague.adobe.com/en/docs/commerce-merchant-services/live-search/boundaries-limits#query

To mitigate that issue, the [fetch-all-products](/actions/fetch-all-products/index.js) action goes into each of the categories to fetch all products under each category. Then it combines all products and removes any duplicates.
