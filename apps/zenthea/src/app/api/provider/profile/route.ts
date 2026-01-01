import { NextRequest, NextResponse } from 'next/server';
import { requireOrganization } from '@startkit/auth/server';
import { withTenant } from '@startkit/database/tenant';
import { ProviderService } from '@/lib/db/services/provider.service';
import { db } from '@startkit/database';
import { users as usersTable } from '@startkit/database/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/provider/profile
 * Get the current provider's profile data
 */
export async function GET() {
  try {
    const { organization, user } = await requireOrganization();
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const profile = await ProviderService.getProviderProfileByUserId(user.userId, organization.organizationId);
        const info = await ProviderService.getProviderInfoByUserId(user.userId, organization.organizationId);
        
        // Get core user info for name/email
        const [userData] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId)).limit(1);

        if (!profile && !info && !userData) {
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        return NextResponse.json({
          provider: {
            ...(userData || {}),
            ...(info || {}),
            ...(profile || {}),
            id: user.userId, // Source of truth for ID
          }
        });
      }
    );
  } catch (error: any) {
    console.error('Error fetching provider profile:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/provider/profile
 * Update the current provider's profile data
 */
export async function PUT(req: NextRequest) {
  try {
    const { organization, user } = await requireOrganization();
    const data = await req.json();
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        // 1. Update core user info if provided (name, avatarUrl)
        const userUpdates: any = {};
        if (data.name) userUpdates.name = data.name;
        if (data.avatarUrl) userUpdates.avatarUrl = data.avatarUrl;
        
        if (Object.keys(userUpdates).length > 0) {
          await db.update(usersTable)
            .set(userUpdates)
            .where(eq(usersTable.id, user.userId));
        }

        // 2. Update provider metadata
        const infoUpdates: any = {};
        if (data.specialty) infoUpdates.specialty = data.specialty;
        if (data.licenseNumber) infoUpdates.licenseNumber = data.licenseNumber;
        if (data.npi) infoUpdates.npi = data.npi;

        if (Object.keys(infoUpdates).length > 0) {
          await ProviderService.upsertProviderInfo(user.userId, organization.organizationId, infoUpdates);
        }

        // 3. Update detailed profile
        const profileUpdates = { ...data };
        // Remove fields that went into other tables
        delete profileUpdates.name;
        delete profileUpdates.avatarUrl;
        delete profileUpdates.specialty;
        delete profileUpdates.licenseNumber;
        delete profileUpdates.npi;

        const updatedProfile = await ProviderService.upsertProviderProfile(
          user.userId, 
          organization.organizationId, 
          profileUpdates
        );

        return NextResponse.json({ provider: updatedProfile });
      }
    );
  } catch (error: any) {
    console.error('Error updating provider profile:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
