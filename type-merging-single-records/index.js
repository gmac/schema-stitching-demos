const waitOn = require('wait-on');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { introspectSchema } = require('@graphql-tools/wrap');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');

async function makeGatewaySchema() {
  const manufacturersExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const productsExec = makeRemoteExecutor('http://localhost:4002/graphql');
  const storefrontsExec = makeRemoteExecutor('http://localhost:4003/graphql');

  return stitchSchemas({
    subschemas: [
      {
        schema: await introspectSchema(manufacturersExec),
        executor: manufacturersExec,
        // Enable batch execution...
        // While 1:1 delegations are still expensive to process in the gateway schema,
        // execution batching will consolidate the generated GraphQL operations
        // into one request sent to the underlying subschema, which is better!
        batch: true,
        merge: {
          // This schema provides one unique field of data for the `Manufacturer` type (`name`).
          // The gateway needs a query configured so it can fetch this data...
          // this config delegates to `manufacturer(id: $id)`.
          Manufacturer: {
            selectionSet: '{ id }',
            fieldName: 'manufacturer',
            args: ({ id }) => ({ id }),
          }
        }
      },
      {
        schema: await introspectSchema(productsExec),
        executor: makeRemoteExecutor('http://localhost:4002/graphql', { log: true }),
        batch: true, // << try turning this on an off, and watch the logged queries.
        merge: {
          Manufacturer: {
            // This schema also provides a unique field of data for the `Manufacturer` type (`products`).
            // Therefore, the gateway needs another query configured so it can also fetch this version of the type.
            // This is a _multi-directional_ merge because multiple services contribute unique Manufacturer data.
            // This config delegates to `_manufacturer(id: $id)`.
            selectionSet: '{ id }',
            fieldName: '_manufacturer',
            args: ({ id }) => ({ id }),
          },
          Product: {
            // This service provides _all_ unique fields for the `Product` type.
            // Again, there's unique data here so the gateway needs a query configured to fetch it.
            // This config delegates to `product(upc: $upc)`.
            selectionSet: '{ upc }',
            fieldName: 'product',
            args: ({ upc }) => ({ upc: upc }),
          }
        }
      },
      {
        schema: await introspectSchema(storefrontsExec),
        executor: storefrontsExec,
        batch: true,
        // While the Storefronts service also defines a `Product` type,
        // it contains no unique data. The local `Product` type is really just
        // a foreign key (`Product.upc`) that maps to the Products schema.
        // That means the gateway will never need to perform an inbound request
        // to fetch this version of a `Product`, so no merge query config is needed.
      },
    ]
  });
}

waitOn({ resources: ['tcp:4001', 'tcp:4002', 'tcp:4003'] }, async () => {
  makeServer(await makeGatewaySchema(), 'gateway', 4000);
});
