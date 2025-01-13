# Tools

This directory contains utility scripts for various tasks related to the AppBuilder package. Below are the details on how to use each script.

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
    node tools/download-poller-stats.js
    ```

3. The script will output the poller statistics in CSV format.

## `check-products-count.js`

This script checks the product count consistency between the published-products-index and the Adobe Commerce store.

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

3. The script will throw an error if the product counts do not match, indicating the expected and actual product counts. PLEASE NOTE: the number of products listed is just an indication to check for "macroscopic" failures, slight differences might be due to specific Commerce configs/attributes for certain products.
