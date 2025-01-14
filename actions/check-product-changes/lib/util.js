/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

async function performRequest(ctx, name, url, req) {
  const { log } = ctx;
    // allow requests for 60s max
    const abortController = new AbortController();
    const abortTimeout = setTimeout(() => abortController.abort(), 60000);

    const resp = await fetch(url, {
        ...req,
        signal: abortController.signal,
    });
    // clear the abort timeout if the request passed
    clearTimeout(abortTimeout);

    if (resp.ok) {
        if (resp.status < 204) {
            // ok with content
            return resp.json();
        } if (resp.status == 204) {
            // ok but no content
            return null;
        }
    } else {
      let responseText = '';
      try {
        responseText = await resp.text();
      // eslint-disable-next-line no-unused-vars
      } catch (e) { /* nothing to be done */ }
      log.error(`error statusCode=${resp.status} request='${name}': ${responseText || ''}`);
    }

    throw new Error(`Request '${name}' to '${url}' failed (${resp.status}): ${resp.headers.get('x-error') || resp.statusText}`);
}

function isValidUrl(string) {
    try {
      return Boolean(new URL(string));
    } catch {
      return false;
    }
  }

module.exports = { performRequest, isValidUrl };