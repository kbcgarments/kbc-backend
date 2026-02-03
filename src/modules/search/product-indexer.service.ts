import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { Product } from '@prisma/client';

@Injectable()
export class ProductIndexer {
  constructor(
    @Inject('ELASTICSEARCH_CLIENT')
    private readonly es: Client,
  ) {}

  async index(product: Product) {
    await this.es.index({
      index: process.env.ELASTICSEARCH_INDEX_PRODUCTS!,
      id: product.id,
      document: {
        id: product.id,

        title_en: product.title_en,
        title_es: product.title_es,
        title_fr: product.title_fr,
        title_zu: product.title_zu,

        title_autocomplete: product.title_en,

        description_en: product.description_en,
        description_es: product.description_es,
        description_fr: product.description_fr,
        description_zu: product.description_zu,

        // 💰 Commerce fields
        priceUSD: product.priceUSD,
        category: product.categoryId,
        status: product.status, // ✅ REQUIRED
        createdAt: product.createdAt,
      },
    });
  }

  async remove(productId: string) {
    await this.es.delete({
      index: process.env.ELASTICSEARCH_INDEX_PRODUCTS!,
      id: productId,
    });
  }
}
