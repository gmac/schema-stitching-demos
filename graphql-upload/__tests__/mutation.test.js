const { ApolloServer, gql } = require("apollo-server-express");
const { buildSchema } = require("graphql");
const { Upload } = require("graphql-upload/public");
const { Readable } = require("stream");
const { stitchSchemas } = require("@graphql-tools/stitch");
const { GraphQLUpload: GatewayGraphQLUpload } = require("@graphql-tools/links");

const makeRemoteExecutor = require("../lib/make_remote_executor");
const localSchema = require("../services/local/schema");

async function makeGatewaySchema() {
  // Make remote executors:
  // these are simple functions that query a remote GraphQL API for JSON.
  const productsExec = makeRemoteExecutor("http://localhost:4001/graphql");

  return stitchSchemas({
    subschemas: [
      {
        // 1. Introspect a remote schema. Simple, but there are caveats:
        // - Remote server must enable introspection.
        // - Custom directives are not included in introspection.
        schema: buildSchema(`
          type Product {
            name: String!
            price: Float!
            upc: ID!
          }

          type Query {
            product(upc: ID!): Product
          }
        `),
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

async function createApolloserver() {
  const schema = await makeGatewaySchema();

  const server = new ApolloServer({
    schema,
    uploads: false,
  });

  return server;
}

test("mutation", async () => {
  const THE_MUTATION = gql`
    mutation uploadFile($input: Upload!) {
      uploadFile(input: $input) {
        filename
        mimetype
        content
      }
    }
  `;

  const upload = new Upload();
  const filename = "some_file.jpeg";

  const buffer = Buffer.from('hello upload', 'utf-8');
  const stream = Readable.from(buffer);
  upload.promise = new Promise(resolve => resolve({
    createReadStream: () => stream,
    filename,
    mimetype: 'text/plain'
  }))

  const server = await createApolloserver();
  const result = await server.executeOperation({
    query: THE_MUTATION,
    variables: {
      input: upload,
    },
  });

  expect(result.errors).toBeUndefined();
  expect(result.data).toMatchObject({
    uploadFile: {
      filename: "some_file.jpeg",
      mimetype: "text/plain",
      content: "hello upload",
    },
  });
});
