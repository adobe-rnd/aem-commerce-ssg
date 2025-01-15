# Tools

This directory contains utility scripts for various tasks related to the AppBuilder package. Below are the details on how to use each script.

## `check-products-count.js`

This script checks the product count consistency between the `published-products-index` and the Adobe Commerce store.
The products count is retrieved in Adobe Commerce via a Live Search query.
This script is a starting point to investigate issues in PDP publishing or rendering.

### Usage

1. Ensure you have the required environment variables set in your `.env` file:
    ```bash
    COMMERCE_STORE_CODE=<your_store_code>
    COMMERCE_STORE_URL=<your_store_url>
    COMMERCE_CONFIG_NAME=<your_config_name>
    ```

2. Run the script using Node.js:
    ```bash
    node check-products-count.js
    ```

3. The script will throw an error if the product counts do not match, indicating the expected and actual product counts. PLEASE NOTE: the number of products listed is just an indication to check for "macroscopic" failures, slight differences might be due to specific Commerce configs/attributes for certain products which might not show up in the query results.
4. In case of a mismatch, it is advised to check the logs and statistics of the service, by using [Adobe I/O cli](https://developer.adobe.com/runtime/docs/guides/getting-started/activations/) tool and looking at the invocation results - which are quite descriptive, as well as `download-poller-stats.js`, to have more specific insights on the nature of the issue (whether it's a failed publish task, for example).

Inovcation results (example):

```json
{ 
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

## `download-poller-stats.js`

This script is used to download and display poller statistics from Adobe I/O Runtime.

### Usage

1. Ensure you have the required environment variables set in your `.env` file:
    ```bash
    AIO_RUNTIME_NAMESPACE=<your_namespace>
    AIO_RUNTIME_AUTH=<your_auth_key>
    ```

2. Run the script using Node.js:
    ```bash
    node download-poller-stats.js
    ```

3. The script will output the poller statistics in CSV format.
