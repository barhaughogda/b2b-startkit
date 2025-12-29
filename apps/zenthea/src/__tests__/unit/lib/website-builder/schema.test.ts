import { describe, it, expect } from "vitest";
import {
  validateWebsiteDefinition,
  createBlockInstance,
  type WebsiteDefinition,
  type BlockType,
  BlockTypes,
  TestimonialsLayouts,
  testimonialsBlockPropsSchema,
} from "@/lib/website-builder/schema";
import { createDefaultWebsiteDefinition } from "@/lib/website-builder/schema";

describe("Website Builder Schema Validation", () => {
  describe("validateWebsiteDefinition", () => {
    it("should validate a valid website definition", () => {
      const validDefinition: WebsiteDefinition = createDefaultWebsiteDefinition();
      const result = validateWebsiteDefinition(validDefinition);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid template ID", () => {
      const invalidDefinition = {
        ...createDefaultWebsiteDefinition(),
        templateId: "invalid-template" as any,
      };
      const result = validateWebsiteDefinition(invalidDefinition);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject invalid block types", () => {
      const invalidDefinition = {
        ...createDefaultWebsiteDefinition(),
        blocks: [
          {
            id: "test-1",
            type: "invalid-block-type" as any,
            enabled: true,
            props: {},
          },
        ],
      };
      const result = validateWebsiteDefinition(invalidDefinition);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should validate all valid block types", () => {
      BlockTypes.forEach((blockType) => {
        const definition = {
          ...createDefaultWebsiteDefinition(),
          blocks: [
            {
              id: `test-${blockType}`,
              type: blockType,
              enabled: true,
              props: {},
            },
          ],
        };
        const result = validateWebsiteDefinition(definition);
        expect(result.success).toBe(true);
      });
    });

    it("should apply defaults for missing fields", () => {
      const minimalDefinition = {
        templateId: "classic-stacked",
        // Missing header, footer, theme, blocks - should get defaults
      };
      const result = validateWebsiteDefinition(minimalDefinition);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Verify defaults are applied
      expect(result.data?.header).toBeDefined();
      expect(result.data?.footer).toBeDefined();
      expect(result.data?.theme).toBeDefined();
      expect(result.data?.blocks).toEqual([]);
      expect(result.data?.version).toBe('1.0.0');
    });

    it("should validate page configuration", () => {
      const definition = {
        ...createDefaultWebsiteDefinition(),
        pages: [
          {
            id: "test-page",
            type: "services" as const,
            title: "Services",
            slug: "services",
            enabled: true,
            showInHeader: true,
            showInFooter: false,
            blocks: [],
            order: 1,
          },
        ],
      };
      const result = validateWebsiteDefinition(definition);

      expect(result.success).toBe(true);
    });

    it("should reject invalid page types", () => {
      const definition = {
        ...createDefaultWebsiteDefinition(),
        pages: [
          {
            id: "test-page",
            type: "invalid-page-type" as any,
            title: "Test",
            slug: "test",
            enabled: true,
            showInHeader: true,
            showInFooter: false,
            blocks: [],
            order: 1,
          },
        ],
      };
      const result = validateWebsiteDefinition(definition);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("createBlockInstance", () => {
    it("should create a valid block instance for each block type", () => {
      BlockTypes.forEach((blockType) => {
        const block = createBlockInstance(blockType);
        expect(block.id).toBeDefined();
        expect(block.type).toBe(blockType);
        expect(block.enabled).toBe(true);
        expect(block.props).toBeDefined();
      });
    });

    it("should generate unique IDs for each block", () => {
      const block1 = createBlockInstance("hero");
      const block2 = createBlockInstance("hero");

      expect(block1.id).not.toBe(block2.id);
    });
  });

  describe("Testimonials Schema", () => {
    describe("Layout Validation", () => {
      it("should validate all 5 testimonial layouts", () => {
        expect(TestimonialsLayouts).toHaveLength(5);
        expect(TestimonialsLayouts).toContain("hero-card");
        expect(TestimonialsLayouts).toContain("carousel-cards");
        expect(TestimonialsLayouts).toContain("grid-cards");
        expect(TestimonialsLayouts).toContain("stacked-list");
        expect(TestimonialsLayouts).toContain("centered-quote");
      });

      it("should accept valid new layout values", () => {
        TestimonialsLayouts.forEach((layout) => {
          const result = testimonialsBlockPropsSchema.safeParse({
            layout,
            testimonials: [],
          });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.layout).toBe(layout);
          }
        });
      });
    });

    describe("Legacy Data Migration", () => {
      it("should migrate legacy 'carousel' layout to 'carousel-cards'", () => {
        const legacyData = {
          layout: "carousel",
          testimonials: [],
        };
        const result = testimonialsBlockPropsSchema.safeParse(legacyData);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.layout).toBe("carousel-cards");
        }
      });

      it("should migrate legacy 'grid' layout to 'grid-cards'", () => {
        const legacyData = {
          layout: "grid",
          testimonials: [],
        };
        const result = testimonialsBlockPropsSchema.safeParse(legacyData);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.layout).toBe("grid-cards");
        }
      });

      it("should migrate legacy testimonial item (quote/authorName/authorTitle) to new format", () => {
        const legacyData = {
          testimonials: [
            {
              id: "1",
              quote: "This is a great service!",
              authorName: "John Doe",
              authorTitle: "CEO at Company",
              rating: 5,
            },
          ],
        };
        const result = testimonialsBlockPropsSchema.safeParse(legacyData);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.testimonials).toHaveLength(1);
          const item = result.data.testimonials[0];
          expect(item.testimonial).toBe("This is a great service!");
          expect(item.name).toBe("John Doe");
          expect(item.tagline).toBe("CEO at Company");
          expect(item.rating).toBe(5);
        }
      });

      it("should preserve new testimonial format fields", () => {
        const newFormatData = {
          testimonials: [
            {
              id: "1",
              imageUrl: "https://example.com/photo.jpg",
              imageAlt: "John's photo",
              name: "John Doe",
              tagline: "Patient since 2022",
              rating: 5,
              header: "Exceptional Care",
              testimonial: "The service was amazing!",
            },
          ],
        };
        const result = testimonialsBlockPropsSchema.safeParse(newFormatData);
        
        expect(result.success).toBe(true);
        if (result.success) {
          const item = result.data.testimonials[0];
          expect(item.imageUrl).toBe("https://example.com/photo.jpg");
          expect(item.imageAlt).toBe("John's photo");
          expect(item.name).toBe("John Doe");
          expect(item.tagline).toBe("Patient since 2022");
          expect(item.rating).toBe(5);
          expect(item.header).toBe("Exceptional Care");
          expect(item.testimonial).toBe("The service was amazing!");
        }
      });

      it("should handle mixed legacy and new format items", () => {
        const mixedData = {
          testimonials: [
            {
              id: "1",
              quote: "Legacy item quote",
              authorName: "Legacy User",
            },
            {
              id: "2",
              name: "New User",
              testimonial: "New format testimonial",
              header: "Great Experience",
            },
          ],
        };
        const result = testimonialsBlockPropsSchema.safeParse(mixedData);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.testimonials).toHaveLength(2);
          
          // Legacy item should be migrated
          expect(result.data.testimonials[0].testimonial).toBe("Legacy item quote");
          expect(result.data.testimonials[0].name).toBe("Legacy User");
          
          // New item should be preserved
          expect(result.data.testimonials[1].testimonial).toBe("New format testimonial");
          expect(result.data.testimonials[1].name).toBe("New User");
          expect(result.data.testimonials[1].header).toBe("Great Experience");
        }
      });
    });

    describe("Default Values", () => {
      it("should apply default values for empty input", () => {
        const result = testimonialsBlockPropsSchema.safeParse({});
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.title).toBe("What Our Patients Say");
          expect(result.data.layout).toBe("carousel-cards");
          expect(result.data.maxVisible).toBe(3);
          expect(result.data.testimonials).toEqual([]);
        }
      });
    });

    describe("Testimonial Item Validation", () => {
      it("should validate rating is between 1 and 5", () => {
        const validRatings = [1, 2, 3, 4, 5];
        validRatings.forEach((rating) => {
          const result = testimonialsBlockPropsSchema.safeParse({
            testimonials: [
              { id: "1", name: "Test", testimonial: "Test", rating },
            ],
          });
          expect(result.success).toBe(true);
        });
      });

      it("should allow optional fields to be undefined", () => {
        const minimalItem = {
          testimonials: [
            {
              id: "1",
              name: "Test User",
              testimonial: "Great service!",
            },
          ],
        };
        const result = testimonialsBlockPropsSchema.safeParse(minimalItem);
        
        expect(result.success).toBe(true);
        if (result.success) {
          const item = result.data.testimonials[0];
          expect(item.imageUrl).toBeUndefined();
          expect(item.imageAlt).toBeUndefined();
          expect(item.tagline).toBeUndefined();
          expect(item.rating).toBeUndefined();
          expect(item.header).toBeUndefined();
        }
      });
    });
  });
});

