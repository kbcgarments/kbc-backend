export const PRODUCT_INDEX = 'products';

export const PRODUCT_INDEX_MAPPING = {
  settings: {
    analysis: {
      analyzer: {
        autocomplete: {
          tokenizer: 'autocomplete',
          filter: ['lowercase'],
        },
        autocomplete_search: {
          tokenizer: 'lowercase',
        },
      },
      tokenizer: {
        autocomplete: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 10,
          token_chars: ['letter'],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      title_en: { type: 'text' },
      title_es: { type: 'text' },
      title_fr: { type: 'text' },
      title_zu: { type: 'text' },
      title_autocomplete: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'autocomplete_search',
      },
      description_en: { type: 'text' },
      description_es: { type: 'text' },
      description_fr: { type: 'text' },
      description_zu: { type: 'text' },
      category: { type: 'keyword' },
      priceUSD: { type: 'float' },
      status: { type: 'keyword' },
      sizes: { type: 'keyword' },
      colors: { type: 'keyword' },
      createdAt: { type: 'date' },
    },
  },
};
