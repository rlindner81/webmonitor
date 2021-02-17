"use strict";

const urllib = require("url");
const fetchlib = require("node-fetch");

const fetch = async ({
  // https://nodejs.org/docs/latest-v10.x/api/url.html
  url,
  protocol,
  host,
  hostname,
  pathname,
  query,
  hash,
  // https://github.com/node-fetch/node-fetch#options
  method,
  headers,
  body,
  redirect,
  // custom
  auth,
  logged = true,
  checkStatus = true,
}) => {
  const _url = urllib.format({
    ...urllib.parse(url),
    ...(protocol && { protocol }),
    ...(host && { host }),
    ...(hostname && { hostname }),
    ...(pathname && { pathname }),
    ...(query && { query }),
    ...(hash && { hash }),
  });
  const _basicAuthHeader =
    auth &&
    Object.prototype.hasOwnProperty.call(auth, "username") &&
    Object.prototype.hasOwnProperty.call(auth, "password")
      ? "Basic " + Buffer.from(auth.username + ":" + auth.password).toString("base64")
      : null;
  const _bearerAuthHeader = auth && Object.prototype.hasOwnProperty.call(auth, "token") ? "Bearer " + auth.token : null;
  const _method = method || "GET";
  const response = await fetchlib(_url, {
    method: _method,
    headers: {
      ...headers,
      ...((_basicAuthHeader && { Authorization: _basicAuthHeader }) ||
        (_bearerAuthHeader && { Authorization: _bearerAuthHeader })),
    },
    ...(body && { body }),
    ...(redirect && { redirect }),
  });
  if (logged) {
    console.log(`${_method} ${_url} ${response.status} ${response.statusText}`);
  }
  if (checkStatus) {
    if (!response.ok) {
      throw new Error(`got bad response from ${_url}\n${await response.text()}`);
    }
  }
  return response;
};

module.exports = fetch;
