import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginClientDto } from './dto/login-client.dto';
import { ClientJwtGuard } from './guards/client-jwt.guard';

@ApiTags('Client Authentication')
@Controller('client/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Organization ID' })
  async register(
    @Headers('x-organization-id') orgId: string,
    @Body() dto: RegisterClientDto,
  ) {
    const targetOrg = orgId?.trim() || 'org_8492a158b';
    return this.authService.register(targetOrg, dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in with client credentials' })
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Organization ID' })
  async login(
    @Headers('x-organization-id') orgId: string,
    @Body() dto: LoginClientDto,
  ) {
    const targetOrg = orgId?.trim() || 'org_8492a158b';
    return this.authService.login(targetOrg, dto);
  }

  @Get('me')
  @UseGuards(ClientJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current customer profile' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id, req.user.organizationId);
  }
}
