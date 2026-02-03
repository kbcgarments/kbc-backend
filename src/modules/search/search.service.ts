import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { PrismaService } from 'src/prisma/prisma.service';

interface ProductDocument {
  id: string;
  title?: string;
  description?: string;
  status?: string;
}

@Injectable()
export class SearchService {
  constructor(
    @Inject('ELASTICSEARCH_CLIENT')
    private readonly es: Client,
    private readonly prisma: PrismaService,
  ) {}

  async searchProducts(query: string) {
    const res = await this.es.search<ProductDocument>({
      index: process.env.ELASTICSEARCH_INDEX_PRODUCTS!,
      size: 30,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: [
                  'title_en^4',
                  'title_es^4',
                  'title_fr^4',
                  'title_zu^4',
                  'title_autocomplete^6',
                  'description_en^1',
                  'description_es^1',
                  'description_fr^1',
                  'description_zu^1',
                ],
                fuzziness: 'AUTO',
                operator: 'and',
              },
            },
          ],
          filter: [{ term: { 'status.keyword': 'ACTIVE' } }],
        },
      },
    });

    const ids = res.hits.hits
      .map((h) => h._source?.id)
      .filter((id): id is string => Boolean(id));

    if (!ids.length) return [];

    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: true,
        category: true,
      },
    });
  }

  async saveSearch(input: {
    customerId: string | null;
    deviceId: string | null;
    query: string;
  }) {
    const { customerId, deviceId, query } = input;
    if (query.length < 2) return;
    if (!customerId && !deviceId) return;

    const existing = await this.prisma.searchHistory.findFirst({
      where: {
        customerId,
        deviceId,
        query,
      },
    });

    if (existing) {
      await this.prisma.searchHistory.update({
        where: { id: existing.id },
        data: { createdAt: new Date() },
      });
    } else {
      await this.prisma.searchHistory.create({
        data: { customerId, deviceId, query },
      });
    }
  }

  async getHistory(input: {
    customerId: string | null;
    deviceId: string | null;
  }) {
    const { customerId, deviceId } = input;
    if (!customerId && !deviceId) return;
    return this.prisma.searchHistory.findMany({
      where: customerId ? { customerId } : { deviceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async deleteHistory(input: {
    id: string;
    customerId: string | null;
    deviceId: string | null;
  }) {
    const { id, customerId, deviceId } = input;

    return this.prisma.searchHistory.deleteMany({
      where: {
        id,
        ...(customerId ? { customerId } : { deviceId }),
      },
    });
  }
}
