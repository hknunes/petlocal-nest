import {
  Controller,
  Patch,
  Body,
  UseGuards,
  ForbiddenException,
  Get,
  Query,
} from '@nestjs/common'; // 👈 Faltavam estes
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SittersService } from './sitters.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UpdateSitterDto } from './dto/update-sitter.dto';
import type { ActiveUserInterface } from 'src/auth/interfaces/active-user.interface';
import { GetSittersFilterDto } from './dto/get-sitters-filter.dto';

@ApiTags('Sitters') // Organiza no Swagger
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sitters')
export class SitterController {
  constructor(private readonly sitterService: SittersService) {}
  @Patch('my-profile')
  updateMyProfile(
    @CurrentUser() user: ActiveUserInterface,
    @Body() dto: UpdateSitterDto,
  ) {
    if (!user.roles?.includes('SITTER')) {
      throw new ForbiddenException(
        'Apenas utilizadores com a role SITTER podem configurar este perfil.',
      );
    }
    return this.sitterService.updateSitterProfile(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Pesquisar e filtrar cuidadores',
    description:
      'Permite filtrar por localização (cidade), preço máximo, tipo de animal e serviço.',
  })
  // O @Query() extrai os parâmetros da URL: ?maxPrice=20&location=Lisboa
  findAll(@Query() filters: GetSittersFilterDto) {
    return this.sitterService.findAll(filters);
  }
}
