import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { 
  createPublicProfileSchema, 
  updatePublicProfileSchema,
  convexUserIdSchema 
} from "@/lib/schemas/publicProfile";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/company/users/[id]/public-profile
 * Get the public profile for a user (if they are a provider)
 */
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getZentheaServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    // Validate user ID format
    const userIdValidation = convexUserIdSchema.safeParse(params.id);
    if (!userIdValidation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid user ID format",
          message: userIdValidation.error.errors[0]?.message || "Invalid user ID"
        },
        { status: 400 }
      );
    }

    const userId = params.id as Id<"users">;

    const result = await convex.query(api.publicProfiles.getPublicProfileByUserId, {
      userId,
      tenantId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch public profile",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company/users/[id]/public-profile
 * Create a public profile for a user (data pulled from their profile)
 */
export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getZentheaServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    const userId = params.id as Id<"users">;
    const body = await request.json();

    // Validate request body
    const validation = createPublicProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: validation.error.errors[0]?.message || "Invalid request data",
          ...(process.env.NODE_ENV === 'development' && {
            details: validation.error.errors
          })
        },
        { status: 400 }
      );
    }

    const {
      acceptingNewPatients,
      bookingEnabled,
    } = validation.data;

    const result = await convex.mutation(api.publicProfiles.createPublicProfileByUserId, {
      userId,
      tenantId,
      acceptingNewPatients,
      bookingEnabled,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error creating public profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("does not have a profile")) {
      return NextResponse.json(
        {
          success: false,
          error: "No profile",
          message: errorMessage,
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes("already exists")) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile exists",
          message: "Public profile already exists for this user",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create public profile",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/company/users/[id]/public-profile
 * Update the public profile for a user
 */
export async function PUT(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getZentheaServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    const userId = params.id as Id<"users">;
    const body = await request.json();

    // Validate request body
    const validation = updatePublicProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: validation.error.errors[0]?.message || "Invalid request data",
          ...(process.env.NODE_ENV === 'development' && {
            details: validation.error.errors
          })
        },
        { status: 400 }
      );
    }

    // First get the public profile to find its ID
    const profileData = await convex.query(api.publicProfiles.getPublicProfileByUserId, {
      userId,
      tenantId,
    });

    if (!profileData.publicProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile not found",
          message: "User does not have a public profile",
        },
        { status: 404 }
      );
    }

    const {
      displayName,
      title,
      bio,
      photo,
      specialties,
      languages,
      acceptingNewPatients,
      bookingEnabled,
      isPublished,
      showOnLandingPage,
    } = validation.data;

    const result = await convex.mutation(api.publicProfiles.updatePublicProfile, {
      profileId: profileData.publicProfile._id as Id<"publicProviderProfiles">,
      displayName: displayName?.trim(),
      title: title?.trim(),
      bio: bio?.trim(),
      photo: photo || undefined,
      specialties,
      languages,
      acceptingNewPatients,
      bookingEnabled,
      isPublished,
      showOnLandingPage,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error updating public profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update public profile",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/company/users/[id]/public-profile
 * Delete the public profile for a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getZentheaServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    // Validate user ID format
    const userIdValidation = convexUserIdSchema.safeParse(params.id);
    if (!userIdValidation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid user ID format",
          message: userIdValidation.error.errors[0]?.message || "Invalid user ID"
        },
        { status: 400 }
      );
    }

    const userId = params.id as Id<"users">;

    // First get the public profile to find its ID
    const profileData = await convex.query(api.publicProfiles.getPublicProfileByUserId, {
      userId,
      tenantId,
    });

    if (!profileData.publicProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile not found",
          message: "User does not have a public profile",
        },
        { status: 404 }
      );
    }

    const result = await convex.mutation(api.publicProfiles.deletePublicProfile, {
      profileId: profileData.publicProfile._id as Id<"publicProviderProfiles">,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error deleting public profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete public profile",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

