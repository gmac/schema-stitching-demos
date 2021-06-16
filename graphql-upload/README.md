# GraphQL Upload

This example is based off of `combining-local-and-remote-schemas`.

**This example demonstrates:**

- Adding a locally-executable schema.
- Adding a remote schema, fetched via introspection.
- Adding GraphQL Upload

## Setup

```shell
cd graphql-upload

yarn install
yarn start
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Products subservice_: http://localhost:4001/graphql

## Summary

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  product(upc: "1") {
    upc
    name
  }
}
```

The results of this query are live-proxied from the underlying subschemas by the stitched gateway:

- `product` comes from the remote Products server. This service is added into the stitched schema using introspection, i.e.: `introspectSchema` from the `@graphql-tools/wrap` package. Introspection is a tidy way to incorporate remote schemas, but be careful: not all GraphQL servers enable introspection, and those that do will not include custom directives.

- `errorCodes` comes from a locally-executable schema running on the gateway server itself. This schema is built using `makeExecutableSchema` from the `@graphql-tools/schema` package, and then stitched directly into the combined schema. Note that this still operates as a standalone schema instance that is proxied by the top-level gateway schema.

## Upload a File

Run the following command from the terminal to upload the file `file.txt`. To learn more, visit [graphql-multipart-request-spec](https://github.com/jaydenseric/graphql-multipart-request-spec)

```bash
curl localhost:4000/graphql \
  -F operations='{ "query": "mutation($file: Upload!) { uploadFile(input: $file) { filename mimetype content } }", "variables": { "file": null } }' \
  -F map='{ "0": ["variables.file"] }' \
  -F 0=@graphql-upload/file.txt

# output
# {"data":{"uploadFile":{"filename":"file.txt","mimetype":"text/plain","content":"hello upload\n"}}}
```
