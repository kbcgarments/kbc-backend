// scripts/create-product-index.ts
import { Client } from '@elastic/elasticsearch';

const client = new Client({ node: process.env.ELASTICSEARCH_URL });

async function run() {
  await client.indices.create({
    index: 'products_v1',
    settings: {
      analysis: {
        analyzer: {
          autocomplete: {
            type: 'custom',
            tokenizer: 'edge_ngram_tokenizer',
            filter: ['lowercase'],
          },
        },
        tokenizer: {
          edge_ngram_tokenizer: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 20,
            token_chars: ['letter', 'digit'],
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            autocomplete: {
              type: 'text',
              analyzer: 'autocomplete',
            },
          },
        },
        description: { type: 'text' },
        price: { type: 'float' },
        currency: { type: 'keyword' },
        category: { type: 'keyword' },
        createdAt: { type: 'date' },
      },
    },
  });
}

void run();
