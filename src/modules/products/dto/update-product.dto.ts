import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// Omit imageMeta from the base DTO since it's only for creation
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['imageMeta'] as const),
) {
  contentSections: any;
}
