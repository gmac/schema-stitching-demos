const waitOn = require("wait-on");
const express = require("express");
const { introspectSchema } = require("@graphql-tools/wrap");
const { stitchSchemas } = require("@graphql-tools/stitch");

const { GraphQLUpload: GatewayGraphQLUpload } = require("@graphql-tools/links");
const { graphqlUploadExpress } = require("graphql-upload");
const { ApolloServer } = require("apollo-server-express");

const makeRemoteExecutor = require("./lib/make_remote_executor");
const localSchema = require("./services/local/schema");

async function makeGatewaySchema() {
  // Make remote executors:
  // these are simple functions that query a remote GraphQL API for JSON.
  const productsExec = makeRemoteExecutor("http://localhost:4001/graphql");
  const adminContext = { authHeader: "Bearer my-app-to-app-token" };

  return stitchSchemas({
    subschemas: [
      {
        // 1. Introspect a remote schema. Simple, but there are caveats:
        // - Remote server must enable introspection.
        // - Custom directives are not included in introspection.
        schema: await introspectSchema(productsExec, adminContext),
        executor: productsExec,
      },
      {
        // 4. Incorporate a locally-executable subschema.
        // No need for a remote executor!
        // Note that that the gateway still proxies through
        // to this same underlying executable schema instance.
        schema: localSchema,
      },
    ],
    resolvers: {
      Upload: GatewayGraphQLUpload,
    },
  });
}

async function startApolloServer() {
  const schema = await makeGatewaySchema();
  const server = new ApolloServer({
    schema,
    uploads: false,
  });
  await server.start();
  const app = express();

  // Additional middleware can be mounted at this point to run before Apollo.
  app.use(
    graphqlUploadExpress({
      maxFileSize: 10000000, // 10 MB
      maxFiles: 5,
    })
  );

  // Mount Apollo middleware here.
  server.applyMiddleware({ app, path: "/", cors: false });

  await new Promise((resolve) => app.listen({ port: 4000 }, resolve));
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

waitOn({ resources: ["tcp:4001"] }, async () => {
  startApolloServer();
});
