import { NextResponse } from 'next/server';
import { requireOrganization } from '@startkit/auth/server';
import { SubscriptionService } from '@/lib/db/services/subscription.service';
import { withTenant } from '@startkit/database/server';

export async function GET() {
  try {
    const { orgId, userId } = await requireOrganization();

    const usage = await withTenant({ organizationId: orgId, userId }, () =>
      SubscriptionService.getUsageStatus(orgId)
    );

    return NextResponse.json(usage);
  } catch (error) {
    console.error('[Subscription Usage API] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
