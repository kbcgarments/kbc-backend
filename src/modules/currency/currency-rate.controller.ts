import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AdminUser } from '@prisma/client';

import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { AdminOnly } from '../admin/decorators/roles.decorator';
import { CurrencyRateService } from './currency-rate.service';
import { UpdateCurrencyRateDto } from './dto/current-rate.dto';

// Extend Express Request to include authenticated admin user
interface AuthenticatedRequest extends Request {
  user: AdminUser;
}

@ApiTags('Currency Rates')
@Controller('currency-rates')
export class CurrencyRateController {
  constructor(private readonly service: CurrencyRateService) {}

  /* ======================================================
   * GET ALL RATES (PUBLIC)
   * ====================================================== */
  @Get()
  @ApiOperation({
    summary: 'Get all currency conversion rates',
    description:
      'Returns all available currency exchange rates relative to USD',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all currency rates retrieved successfully',
  })
  getAll() {
    return this.service.getAll();
  }

  /* ======================================================
   * CREATE RATES (ADMIN ONLY)
   * ====================================================== */

  @Post()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create one or multiple currency rates',
    description:
      'Admin-only endpoint to create new currency exchange rates. Supports both single object and array of objects.',
  })
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            currency: {
              type: 'string',
              example: 'USD',
              enum: ['NGN', 'ZAR', 'GBP', 'EUR', 'USD'],
            },
            rate: {
              type: 'number',
              example: 1,
              description: 'Exchange rate relative to USD',
            },
          },
          required: ['currency', 'rate'],
        },
        {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              currency: {
                type: 'string',
                example: 'NGN',
                enum: ['NGN', 'ZAR', 'GBP', 'EUR', 'USD'],
              },
              rate: {
                type: 'number',
                example: 1400,
                description: 'Exchange rate relative to USD',
              },
            },
            required: ['currency', 'rate'],
          },
          example: [
            { currency: 'NGN', rate: 1400 },
            { currency: 'ZAR', rate: 18.5 },
            { currency: 'GBP', rate: 0.79 },
          ],
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Currency rate(s) created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid currency or bad request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateCurrencyRateDto | UpdateCurrencyRateDto[],
  ) {
    return this.service.create(req.user, dto);
  }

  /* ======================================================
   * UPDATE RATE (ADMIN ONLY)
   * ====================================================== */

  @Patch()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a specific currency rate',
    description:
      'Admin-only endpoint to update an existing currency exchange rate',
  })
  @ApiBody({
    type: UpdateCurrencyRateDto,
    examples: {
      updateNGN: {
        summary: 'Update NGN rate',
        value: {
          currency: 'NGN',
          rate: 1450,
        },
      },
      updateGBP: {
        summary: 'Update GBP rate',
        value: {
          currency: 'GBP',
          rate: 0.78,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Currency rate updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid currency code',
  })
  @ApiResponse({
    status: 404,
    description: 'Currency rate not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  updateRate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateCurrencyRateDto,
  ) {
    return this.service.updateRate(req.user, dto);
  }
}
