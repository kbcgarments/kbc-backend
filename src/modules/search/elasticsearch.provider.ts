import { Client } from '@elastic/elasticsearch';

export const ElasticsearchProvider = {
  provide: 'ELASTICSEARCH_CLIENT',
  useFactory: () => {
    return new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: process.env.ELASTICSEARCH_API_KEY
        ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
        : undefined,
    });
  },
};
