import { Controller, Get, Param, Query, Headers, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { MenuService } from './menu.service';

@ApiTags('Public Menu')
@Controller('client/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'Get active published menu items for an organization (Publicly accessible to guests)' })
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Target Organization ID (defaults to Downtown)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search dish name or description' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category keyword' })
  @ApiResponse({ status: 200, description: 'Returns visible dishes' })
  async getMenu(
    @Headers('x-organization-id') orgId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    const targetOrg = orgId?.trim() || 'org_8492a158b';
    return this.menuService.getPublicMenu(targetOrg, search, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a single published dish' })
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Target Organization ID' })
  async getDish(
    @Headers('x-organization-id') orgId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const targetOrg = orgId?.trim() || 'org_8492a158b';
    const dish = await this.menuService.getDishById(id, targetOrg);
    if (!dish) {
      throw new NotFoundException(`Dish #${id} is not available on the public menu.`);
    }
    return dish;
  }
}
