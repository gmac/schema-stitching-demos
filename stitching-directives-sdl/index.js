const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { buildSchema } = require('graphql');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');

const { stitchingDirectivesTransformer } = stitchingDirectives();

async function makeGatewaySchema() {
  const accountsExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const inventoryExec = makeRemoteExecutor('http://localhost:4002/graphql');
  const productsExec = makeRemoteExecutor('http://localhost:4003/graphql');
  const reviewsExec = makeRemoteExecutor('http://localhost:4004/graphql');

  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: [
      {
        schema: await fetchRemoteSchema(accountsExec),
        executor: accountsExec,
      },
      {
        schema: await fetchRemoteSchema(inventoryExec),
        executor: inventoryExec,
      },
      {
        schema: await fetchRemoteSchema(productsExec),
        executor: productsExec,
      },
      {
        schema: await fetchRemoteSchema(reviewsExec),
        executor: reviewsExec,
      }
    ]
  });
}

async function fetchRemoteSchema(executor) {
  const result = await executor({ document: '{ _sdl }' });
  return buildSchema(result.data._sdl);
}

makeGatewaySchema().then(schema => makeServer(schema, 'gateway', 4000));
