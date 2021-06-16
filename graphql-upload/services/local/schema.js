const { makeExecutableSchema } = require("@graphql-tools/schema");

// does not work
// const { GraphQLUpload } = require("graphql-upload");

// does work
const { GraphQLUpload } =require("@graphql-tools/links");

module.exports = makeExecutableSchema({
  typeDefs: `
    scalar Upload
    type SomeFile {
      filename: String
      mimetype: String
      content: String
    }
    type Mutation {
      uploadFile(input: Upload!): SomeFile!
    }
    type Query {
      errorCodes: [String!]!
    }
  `,
  resolvers: {
    Upload: GraphQLUpload,
    Mutation: {
      uploadFile: async (_, { input }) => {
        const { createReadStream, filename, mimetype } = await input;
        const chunks = [];
        const stream = createReadStream();
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buf = Buffer.concat(chunks);

        return {
          filename,
          mimetype,
          content: buf.toString(),
        };
      },
    },
    Query: {
      errorCodes: () => [
        "NOT_FOUND",
        "GRAPHQL_PARSE_FAILED",
        "GRAPHQL_VALIDATION_FAILED",
      ],
    },
  },
});
