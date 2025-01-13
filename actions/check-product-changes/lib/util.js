async function performRequest(name, url, req) {
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