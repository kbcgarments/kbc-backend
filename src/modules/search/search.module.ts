import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ElasticsearchProvider } from './elasticsearch.provider';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [SearchController],
  providers: [SearchService, PrismaService, ElasticsearchProvider, JwtService],
  exports: [ElasticsearchProvider],
})
export class SearchModule {}
