import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';

import { AdminUser } from '@prisma/client';
import { AdminHomepageService } from './admin-homepage.service';

import { CreateHeroDto, UpdateHeroDto } from './dto/hero.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import {
  CreateWhyChooseUsDto,
  UpdateWhyChooseUsDto,
} from './dto/why-choose-us.dto';
import { ReviewFeedbackDto, PromoteTestimonialDto } from './dto/feedback.dto';

import { CatalogManagerOnly } from '../decorators/roles.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

/* ======================================================
   TYPES
====================================================== */

interface AuthenticatedRequest extends Request {
  user: AdminUser;
}

/* ======================================================
   FILE UPLOAD CONFIG
====================================================== */

const imageUploadInterceptor = FileInterceptor('image', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return cb(new BadRequestException('Only image files allowed'), false);
    }
    cb(null, true);
  },
});

/* ======================================================
   CONTROLLER
====================================================== */

@ApiTags('Admin • Homepage')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('admin/homepage')
export class AdminHomepageController {
  constructor(private readonly homepage: AdminHomepageService) {}

  /* ======================================================
   DASHBOARD METRICS
====================================================== */

  @Get('metrics')
  @CatalogManagerOnly()
  @ApiOperation({ summary: 'Get dashboard metrics' })
  async getDashboardMetrics() {
    return this.homepage.getDashboardMetrics();
  }

  /* ======================================================
     HERO SECTION CRUD
  ====================================================== */

  @Post('hero')
  @CatalogManagerOnly()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageUploadInterceptor)
  async createHero(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateHeroDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    if (!image) throw new BadRequestException('Hero image is required');
    return this.homepage.createHero(req.user, dto, image);
  }

  @Get('hero')
  @CatalogManagerOnly()
  async listHeroes() {
    return this.homepage.listHeroes();
  }

  @Patch('hero/:id')
  @CatalogManagerOnly()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageUploadInterceptor)
  async updateHero(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHeroDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.homepage.updateHero(req.user, id, dto, image);
  }

  @Delete('hero/:id')
  @CatalogManagerOnly()
  async deleteHero(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.homepage.deleteHero(req.user, id);
  }

  /* ======================================================
     BANNERS CRUD
  ====================================================== */

  @Post('banner')
  @CatalogManagerOnly()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageUploadInterceptor)
  async createBanner(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBannerDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    if (!image) throw new BadRequestException('Banner image is required');
    return this.homepage.createBanner(req.user, dto, image);
  }

  @Get('banner')
  @CatalogManagerOnly()
  async listBanners() {
    return this.homepage.listBanners();
  }

  @Patch('banner/:id')
  @CatalogManagerOnly()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageUploadInterceptor)
  async updateBanner(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.homepage.updateBanner(req.user, id, dto, image);
  }

  @Delete('banner/:id')
  @CatalogManagerOnly()
  async deleteBanner(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.homepage.deleteBanner(req.user, id);
  }

  /* ======================================================
     WHY CHOOSE US CRUD
  ====================================================== */

  @Post('why-choose-us')
  @CatalogManagerOnly()
  async createWhyChooseUs(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWhyChooseUsDto,
  ) {
    return this.homepage.createWhyChooseUs(req.user, dto);
  }

  @Get('why-choose-us')
  async listWhyChooseUs() {
    return this.homepage.listWhyChooseUs();
  }

  @Patch('why-choose-us/:id')
  @CatalogManagerOnly()
  async updateWhyChooseUs(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWhyChooseUsDto,
  ) {
    return this.homepage.updateWhyChooseUs(req.user, id, dto);
  }

  @Delete('why-choose-us/:id')
  @CatalogManagerOnly()
  async deleteWhyChooseUs(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.homepage.deleteWhyChooseUs(req.user, id);
  }

  /* ======================================================
     CUSTOMER FEEDBACK — ADMIN ROUTES
  ====================================================== */

  @Get('feedback')
  @CatalogManagerOnly()
  async listCustomerFeedback() {
    return this.homepage.listCustomerFeedback();
  }

  @Patch('feedback/:id/review')
  @CatalogManagerOnly()
  @ApiBody({ type: ReviewFeedbackDto })
  async reviewFeedback(
    @Req() req: AuthenticatedRequest,
    @Param('id') feedbackId: string,
    @Body() dto: ReviewFeedbackDto,
  ) {
    return this.homepage.reviewFeedback(req.user, feedbackId, dto);
  }

  @Post('testimonial/promote')
  @CatalogManagerOnly()
  @ApiBody({ type: PromoteTestimonialDto })
  async promoteFeedbackToTestimonial(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PromoteTestimonialDto,
  ) {
    return this.homepage.promoteFeedbackToTestimonial(req.user, dto);
  }

  /* ======================================================
     TESTIMONIALS
  ====================================================== */

  @Get('testimonial')
  async listTestimonials() {
    return this.homepage.listTestimonials();
  }

  @Patch('testimonial/:id/toggle')
  @CatalogManagerOnly()
  @ApiBody({
    schema: {
      type: 'object',
      properties: { isActive: { type: 'boolean' } },
      required: ['isActive'],
    },
  })
  async toggleTestimonial(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    if (typeof isActive !== 'boolean')
      throw new BadRequestException('isActive must be boolean');

    return this.homepage.toggleTestimonial(req.user, id, isActive);
  }
}
