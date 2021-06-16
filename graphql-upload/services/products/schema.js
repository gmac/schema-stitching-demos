const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const products = [
  { upc: '1', name: 'Cookbook', price: 15.99 },
  { upc: '2', name: 'Toothbrush', price: 3.99 },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      product: (root, { upc }) => products.find(p => p.upc === upc) || new NotFoundError()
    }
  }
});
