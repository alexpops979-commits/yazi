import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { checkoutSchema } from '@yazi/contracts';
import type { z } from 'zod';
import { AuthGuard, CurrentUser, MinRole, Public, TenantGuard, TenantId, ZodValidationPipe, type AuthUserContext } from '../../common/guards';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Public()
  @Get('plans')
  plans() {
    return this.billing.plans();
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    return this.billing.handleWebhook(req.rawBody, signature);
  }

  @Get('subscription')
  @UseGuards(AuthGuard, TenantGuard)
  subscription(@TenantId() tenantId: string) {
    return this.billing.subscription(tenantId);
  }

  @Get('entitlements')
  @UseGuards(AuthGuard, TenantGuard)
  entitlements(@TenantId() tenantId: string) {
    return this.billing.entitlementsSummary(tenantId);
  }

  @Post('checkout')
  @UseGuards(AuthGuard, TenantGuard)
  @MinRole('OWNER')
  checkout(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(checkoutSchema)) body: z.infer<typeof checkoutSchema>,
  ) {
    return this.billing.checkout(tenantId, user.id, body.planCode);
  }

  @Post('portal')
  @UseGuards(AuthGuard, TenantGuard)
  @MinRole('OWNER')
  portal(@TenantId() tenantId: string) {
    return this.billing.portal(tenantId);
  }
}
