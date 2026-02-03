import { PartialType } from '@nestjs/swagger';
import { CreateHeroDto } from 'src/modules/admin/homepage/dto/hero.dto';

export class UpdateHeroDto extends PartialType(CreateHeroDto) {}
