# Configure CI/CD

  * Clone your fork and open it in your favourite code editor.
      * Go to the repository settings and under "Secrets and variables → Actions" add the following secrets:
          * AIO\_RUNTIME\_AUTH\_PROD
          * AIO\_RUNTIME\_NAMESPACE\_PROD
          * AIO\_RUNTIME\_AUTH\_STAGE
          * AIO\_RUNTIME\_NAMESPACE\_STAGE
          * You can retrieve the values from the JSON files you downloaded earlier, from the corresponding workspace (Stage or Prod) and copy/pasting the values (`namespace` and `auth`).
            Just install [jq](https://github.com/jqlang/jq) and execute `cat /path/to/my/AppBuilder-Project-file.json | jq '.project.workspace.details.runtime.namespaces[0]'`
      * Make sure you activate the GitHub actions. By default, any commit to the main branch of your project will be deployed to the staging workspace of your AppBuilder project. Any release will [trigger](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#release) an deployment to the production workspace. We recommend to stick to this workflow.

# Initial Rollout of Product Pages

  * After you completed the setup steps, you can deploy the AppBuilder project by [creating a release in GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release) (recommended) or running the aio app deploy command with your production configuration.
  * You can validate successful deployment of your action, by accessing "https://{namespace}.[adobeioruntime.net/api/v1/web/aem-commerce-ssg/pdp-renderer/products/{urlKey}/{sku](https://www.google.com/search?q=http://adobeioruntime.net/api/v1/web/aem-commerce-ssg/pdp-renderer/products/%7BurlKey%7D/%7Bsku%7D)". You should be able to see a rendered version of your product detail page.
  * The rollout of PDPs might be required after the storefront is live and running, for example in order to refresh the pages to reflect changes that by design are not considered as a change in the Product model. See [Test, Monitoring and Ops](https://www.google.com/search?q=%23testing-monitoring-and-ops) for details.
  * The indexing process usually takes between 10-30 minutes, but in the first cold start it should be faster. You can check if the index was created by simply navigating to [https://store-base-url/published-product-index.json.](https://www.google.com/search?q=https://store-base-url/published-product-index.json.) Once it's ready, you can proceed with the next steps.

# Ops

This section is related to the specific tools to test and monitor the polling and rendering flow as well as to debug any issues.
All the tools depend on a pair of common environment variables in order to connect to AppBuilder:

Either the ones generated by `aio app use` command as above:
```bash
AIO_runtime_namespace=...
AIO_runtime_auth=...
```
or uppercase
```
AIO_RUNTIME_NAMESPACE=...
AIO_RUNTIME_AUTH=...
```

## Online Tools

 * [Storage Bucket Explorer](https://245265-filesexplorer.adobeio-static.net/) (Alpha): this is a tool to explore what's inside the storage bucket where the rendered markup is persisted and from where its served to the Helix infrastructure (that picks it up during the preview phase). Usage: just provide the Namespace and Auth params (from the Env vars/Adobe I/O project json file) and hit "Connect".
   You will find csv files with the list of crawled products (from Catalog Service) and .html files with the actual markup.

## CLI Tools

In the tools/ folder, there are scripts for troubleshooting and monitoring the polling and change detection activity, specifically:

  * Roll back PDPs (disaster recovery scenario)
    In case the poller has published pages that should not be accessible (nor indexed), it is important to act promptly in order to get them removed and prevent indexing by search engines, by triggering a bulk unpublish job in the AEM Admin API. It's possible to generate the request body for the job with a one-line command (requires the cli util `jq` ):

    ```bash
    curl "https://www.mystorefront.com/us/products-index.json" -s | jq '{ "delete": true, "paths": [.data[].path]}' > delete-req-body.json
    ```

    The path `/products-index.json` may vary depending on your indexing setup.
    Then, use the JSON as the request body to make a REST call according to: [https://www.aem.live/docs/admin.html\#tag/publish/operation/bulkPublish](https://www.aem.live/docs/admin.html#tag/publish/operation/bulkPublish) (please note: the "delete": true param turns the publish operation into a "delete publish" job). You can follow the job status following the semantic links in the JSON response.

  * refresh-pdps.js
    This tool cleans up the internal list of tracked products and forces restart of the product change detector: this way all the products in the catalog will be republished.

  * download-poller-stats.js
    This script is used to download and display poller statistics from Adobe I/O Runtime. It can extract time series of the statistics and generate charts.

      * Usage:
        Ensure you have the required environment variables set in your .env file.

        ```bash        
        Usage: `node download-poller-stats.js [options]`

        Options:
        -d, --date <YYYY-MM-DD>             Select data for a specific day. If not provided, defaults to today's date
        -c, --chart <chart_filename.svg>    Generate a chart from the data, showing latency distribution and
        correlation with other factors. In addition, generate a JSON file with corresponding data series.
        -h, --help                          Display help for cli tool
        -f, --file <records_filename.{csv,json}> The filename to save the records to; JSON and CSV formats are supported.
        ```

  * check-products-count.js
    This script checks the product count consistency between the `published-products-index` and the Adobe Commerce store.
    The products count is retrieved in Adobe Commerce via a Live Search query.
    This script is a starting point to investigate issues in PDP publishing or rendering.

      * Usage:
        Ensure you have the required env vars configured (in .env file):
        ```bash
        COMMERCE_STORE_CODE=<your_store_code>
        COMMERCE_STORE_URL=<your_store_url>
        COMMERCE_CONFIG_NAME=<your_config_name>
        ````

        Then, run the script using Node.js: `node check-products-count.js`

      * The script will throw an error if the product counts do not match, indicating the expected and actual product counts. PLEASE NOTE: the number of products listed is just an indication to check for "macroscopic" failures, slight differences might be due to specific Commerce configs/attributes for certain products which might not show up in the query results.

      * In case of a mismatch, it is advised to check the logs and statistics of the service, by using [Adobe I/O cli](https://developer.adobe.com/runtime/docs/guides/getting-started/activations/) tool and looking at the invocation results - which are quite descriptive, as well as `download-poller-stats.js`, to have more specific insights on the nature of the issue (whether it's a failed publish task, for example).

```js
    "result": {
    "elapsed": 13001,
    "state": "completed",
    "status": {
        "failed": 29,
        "ignored": 4572,
        "published": 0,
        "unpublished": 0
    },
    "timings": {
        "fetchedLastModifiedDates": {
            "avg": 5710,
            "max": 5710,
            "min": 5710,
            "n": 1
        },
        "fetchedSkus": {
            "avg": 0,
            "max": 0,
            "min": 0,
            "n": 1
        },
        "loadedState": {
            "avg": 47,
            "max": 47,
            "min": 47,
            "n": 1
        },
        "previewDuration": {
            "avg": 1677.2758620689656,
            "max": 3180,
            "min": 1037,
            "n": 29
        },
        "publishedPaths": {
            "avg": 7075,
            "max": 7075,
            "min": 7075,
            "n": 1
        },
        "unpublishedPaths": {
            "avg": 143,
            "max": 143,
            "min": 143,
            "n": 1
        }
    }
}
```

## Observability

 Logs and statistics of operation (like i.e. number of pages published, changes detected, products ignored, errored, ...) are sent to the endpoint specified in `app.config.yaml`

 You can always extract reports/data following the instructions above.