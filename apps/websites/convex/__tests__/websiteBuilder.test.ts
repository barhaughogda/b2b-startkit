import { describe, it, expect, beforeEach } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

describe("Website Builder Mutations - Authorization", () => {
  let t: ConvexTestingHelper;
  let tenantId: string;
  let userId: Id<"users">;
  let userEmail: string;
  let otherTenantId: string;
  let otherUserEmail: string;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    const now = Date.now();

    // Create test tenant using direct database insert
    const tenantDbId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("tenants", {
        id: "test-tenant",
        name: "Test Clinic",
        slug: "test-clinic",
        type: "clinic",
        status: "active",
        branding: {
          logo: "",
          primaryColor: "#000000",
          secondaryColor: "#ffffff",
          accentColor: "#0000ff",
          favicon: "",
        },
        contactInfo: {
          phone: "",
          email: "",
          address: "",
          website: "",
        },
        features: {
          onlineScheduling: true,
          telehealth: false,
          patientPortal: true,
        },
        createdAt: now,
        updatedAt: now,
      });
    });
    tenantId = "test-tenant";

    // Create test user for the tenant
    userId = await t.mutation(api.users.createUserMutation, {
      email: "test@example.com",
      name: "Test User",
      role: "admin",
      tenantId: tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    userEmail = "test@example.com";

    // Create another tenant and user for unauthorized tests
    await t.runMutation(async (ctx) => {
      return await ctx.db.insert("tenants", {
        id: "other-tenant",
        name: "Other Clinic",
        slug: "other-clinic",
        type: "clinic",
        status: "active",
        branding: {
          logo: "",
          primaryColor: "#000000",
          secondaryColor: "#ffffff",
          accentColor: "#0000ff",
          favicon: "",
        },
        contactInfo: {
          phone: "",
          email: "",
          address: "",
          website: "",
        },
        features: {
          onlineScheduling: true,
          telehealth: false,
          patientPortal: true,
        },
        createdAt: now,
        updatedAt: now,
      });
    });
    otherTenantId = "other-tenant";

    const otherUserId = await t.mutation(api.users.createUserMutation, {
      email: "other@example.com",
      name: "Other User",
      role: "admin",
      tenantId: otherTenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    otherUserEmail = "other@example.com";
  });

  describe("initializeWebsiteBuilder", () => {
    it("should allow authorized user to initialize website builder", async () => {
      const result = await t.mutation(api.websiteBuilder.initializeWebsiteBuilder, {
        tenantId,
        userEmail,
      });

      expect(result.success).toBe(true);
    });

    it("should reject unauthorized user from different tenant", async () => {
      await expect(
        t.mutation(api.websiteBuilder.initializeWebsiteBuilder, {
          tenantId,
          userEmail: otherUserEmail,
        })
      ).rejects.toThrow();
    });

    it("should reject non-existent user", async () => {
      await expect(
        t.mutation(api.websiteBuilder.initializeWebsiteBuilder, {
          tenantId,
          userEmail: "nonexistent@example.com",
        })
      ).rejects.toThrow();
    });
  });

  describe("updateTemplate", () => {
    beforeEach(async () => {
      // Initialize website builder first
      await t.mutation(api.websiteBuilder.initializeWebsiteBuilder, {
        tenantId,
        userEmail,
      });
    });

    it("should allow authorized user to update template", async () => {
      const result = await t.mutation(api.websiteBuilder.updateTemplate, {
        tenantId,
        templateId: "bento-grid",
        userEmail,
      });

      expect(result.success).toBe(true);
    });

    it("should reject unauthorized user", async () => {
      await expect(
        t.mutation(api.websiteBuilder.updateTemplate, {
          tenantId,
          templateId: "bento-grid",
          userEmail: otherUserEmail,
        })
      ).rejects.toThrow();
    });
  });

  describe("updateHeader", () => {
    beforeEach(async () => {
      await t.mutation(api.websiteBuilder.initializeWebsiteBuilder, {
        tenantId,
        userEmail,
      });
    });

    it("should allow authorized user to update header", async () => {
      const header = {
        variant: "centered" as const,
        logoUrl: "https://example.com/logo.png",
        logoAlt: "Logo",
        navItems: [],
        showSignIn: true,
        signInText: "Sign In",
        signInUrl: "/login",
        showBook: true,
        bookText: "Book Appointment",
        bookUrl: "/book",
        sticky: true,
        transparent: false,
      };

      const result = await t.mutation(api.websiteBuilder.updateHeader, {
        tenantId,
        header,
        userEmail,
      });

      expect(result.success).toBe(true);
    });

    it("should reject unauthorized user", async () => {
      const header = {
        variant: "centered" as const,
        logoUrl: "",
        logoAlt: "",
        navItems: [],
        showSignIn: true,
        signInText: "Sign In",
        signInUrl: "/login",
        showBook: true,
        bookText: "Book",
        bookUrl: "/book",
        sticky: true,
        transparent: false,
      };

      await expect(
        t.mutation(api.websiteBuilder.updateHeader, {
          tenantId,
          header,
          userEmail: otherUserEmail,
        })
      ).rejects.toThrow();
    });
  });

  describe("addCustomPage", () => {
    beforeEach(async () => {
      await t.mutation(api.websiteBuilder.initializeWebsiteBuilder, {
        tenantId,
        userEmail,
      });
    });

    it("should validate slug format", async () => {
      await expect(
        t.mutation(api.websiteBuilder.addCustomPage, {
          tenantId,
          title: "Test Page",
          slug: "Invalid Slug With Spaces",
          userEmail,
        })
      ).rejects.toThrow();
    });

    it("should reject reserved slugs", async () => {
      await expect(
        t.mutation(api.websiteBuilder.addCustomPage, {
          tenantId,
          title: "Test Page",
          slug: "admin",
          userEmail,
        })
      ).rejects.toThrow();
    });

    it("should enforce maximum custom pages limit", async () => {
      // Add first custom page
      await t.mutation(api.websiteBuilder.addCustomPage, {
        tenantId,
        title: "Page 1",
        slug: "page-1",
        userEmail,
      });

      // Add second custom page
      await t.mutation(api.websiteBuilder.addCustomPage, {
        tenantId,
        title: "Page 2",
        slug: "page-2",
        userEmail,
      });

      // Third page should fail
      await expect(
        t.mutation(api.websiteBuilder.addCustomPage, {
          tenantId,
          title: "Page 3",
          slug: "page-3",
          userEmail,
        })
      ).rejects.toThrow();
    });

    it("should reject duplicate slugs", async () => {
      await t.mutation(api.websiteBuilder.addCustomPage, {
        tenantId,
        title: "Test Page",
        slug: "test-page",
        userEmail,
      });

      await expect(
        t.mutation(api.websiteBuilder.addCustomPage, {
          tenantId,
          title: "Another Page",
          slug: "test-page",
          userEmail,
        })
      ).rejects.toThrow();
    });
  });

  describe("updatePage", () => {
    let pageId: string;

    beforeEach(async () => {
      await t.mutation(api.websiteBuilder.initializeWebsiteBuilder, {
        tenantId,
        userEmail,
      });

      // Add a custom page
      const result = await t.mutation(api.websiteBuilder.addCustomPage, {
        tenantId,
        title: "Test Page",
        slug: "test-page",
        userEmail,
      });

      // Get the page ID from the tenant
      const tenant = await t.query(api.websiteBuilder.getWebsiteBuilder, { tenantId });
      const page = tenant?.websiteBuilder?.pages?.find((p) => p.slug === "test-page");
      pageId = page?.id || "";
    });

    it("should validate slug format when updating", async () => {
      await expect(
        t.mutation(api.websiteBuilder.updatePage, {
          tenantId,
          pageId,
          updates: {
            slug: "Invalid Slug",
          },
          userEmail,
        })
      ).rejects.toThrow();
    });

    it("should reject reserved slugs when updating", async () => {
      await expect(
        t.mutation(api.websiteBuilder.updatePage, {
          tenantId,
          pageId,
          updates: {
            slug: "admin",
          },
          userEmail,
        })
      ).rejects.toThrow();
    });
  });
});

