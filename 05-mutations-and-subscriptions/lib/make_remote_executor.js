const { fetch } = require('cross-fetch');
const { print } = require('graphql');

module.exports = function makeRemoteExecutor(url) {
  return async ({ document, variables }) => {
    const query = print(document);
    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };
};
