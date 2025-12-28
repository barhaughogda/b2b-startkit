# Product Configuration Guide

This guide explains how to configure a product using the `ProductConfigContract` system.

## Overview

Every product in the StartKit factory MUST have a `product.config.ts` file that defines:

- **Features**: What capabilities exist in the product
- **Plans**: What features and limits each plan tier provides
- **Kill Switches**: Default emergency control settings
- **Branding**: Visual identity (optional)
- **Navigation**: App navigation structure (optional)

## Creating a Product Config

### Step 1: Create the Config File

Create `src/config/product.config.ts` in your app:

```typescript
import { defineProductConfig } from '@startkit/config'

export const productConfig = defineProductConfig({
  id: 'my-product',
  name: 'My Product',
  version: '1.0.0',
  description: 'A StartKit-powered B2B SaaS product',

  features: {
    // Define your features here
  },

  plans: {
    // Define plan configurations here
  },

  killSwitches: {
    productEnabled: true,
    maintenanceMode: false,
  },
})
```

### Step 2: Define Features

Features are the capabilities of your product. Each feature has:

- `key`: Unique identifier (snake_case)
- `name`: Human-readable name
- `description`: Optional description
- `category`: One of `core`, `premium`, `beta`, `enterprise`

```typescript
features: {
  // Core features - available to all users
  dashboard: {
    key: 'dashboard',
    name: 'Dashboard',
    description: 'Main analytics dashboard',
    category: 'core',
  },
  
  // Premium features - paid plans only
  advanced_reports: {
    key: 'advanced_reports',
    name: 'Advanced Reports',
    description: 'Custom report builder',
    category: 'premium',
  },
  
  // Enterprise features - enterprise plan only
  sso: {
    key: 'sso',
    name: 'Single Sign-On',
    description: 'SAML/OIDC integration',
    category: 'enterprise',
  },
  
  // Beta features - being tested
  ai_assistant: {
    key: 'ai_assistant',
    name: 'AI Assistant',
    description: 'AI-powered features (beta)',
    category: 'beta',
  },
}
```

### Step 3: Configure Plans

Each plan tier defines which features are available and what limits apply:

```typescript
plans: {
  free: {
    features: ['dashboard'],
    limits: {
      seats: 3,
      apiCallsPerMonth: 1000,
      storageGb: 1,
    },
  },
  
  starter: {
    features: ['dashboard'],
    limits: {
      seats: 10,
      apiCallsPerMonth: 10000,
      storageGb: 10,
    },
    customFlags: ['email_support'], // Additional flags
  },
  
  pro: {
    features: ['dashboard', 'advanced_reports'],
    limits: {
      seats: 50,
      apiCallsPerMonth: 100000,
      storageGb: 100,
    },
  },
  
  enterprise: {
    features: ['dashboard', 'advanced_reports', 'sso'],
    limits: {
      seats: undefined,        // undefined = unlimited
      apiCallsPerMonth: undefined,
      storageGb: undefined,
    },
  },
}
```

### Step 4: Add Branding (Optional)

```typescript
branding: {
  primaryColor: '#0070f3',
  logo: '/logo.svg',
  favicon: '/favicon.ico',
}
```

### Step 5: Configure Navigation (Optional)

```typescript
navigation: {
  main: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Reports', href: '/reports', icon: 'BarChart', requiredFeature: 'advanced_reports' },
    { label: 'Team', href: '/team', icon: 'Users' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
}
```

## Using the Product Config

### Check Feature Availability

```typescript
import { isFeatureAvailable, getPlanFeatures } from '@startkit/config'
import { productConfig } from '@/config/product.config'

// Check if a feature is available for a plan
if (isFeatureAvailable(productConfig, 'advanced_reports', 'pro')) {
  // Show the feature
}

// Get all features for a plan
const features = getPlanFeatures(productConfig, 'pro')
// ['dashboard', 'advanced_reports']
```

### Get Plan Limits

```typescript
import { getPlanLimit } from '@startkit/config'
import { productConfig } from '@/config/product.config'

const maxSeats = getPlanLimit(productConfig, 'pro', 'seats')
// 50

const apiCalls = getPlanLimit(productConfig, 'enterprise', 'apiCallsPerMonth')
// undefined (unlimited)
```

### Check Product Accessibility

```typescript
import { isProductAccessible } from '@startkit/config'
import { productConfig } from '@/config/product.config'

const { accessible, reason } = isProductAccessible(productConfig)
if (!accessible) {
  // Show maintenance page with reason
}
```

### Filter Navigation by Features

```typescript
import { productConfig } from '@/config/product.config'
import { isFeatureAvailable } from '@startkit/config'

const visibleNavItems = productConfig.navigation?.main.filter(item => {
  if (!item.requiredFeature) return true
  return isFeatureAvailable(productConfig, item.requiredFeature, userPlan)
})
```

## Kill Switches

Kill switches provide emergency controls to disable products, features, or organizations.

### Default Settings

```typescript
killSwitches: {
  productEnabled: true,      // Set to false to disable the product
  maintenanceMode: false,    // Set to true to show maintenance page
}
```

### Runtime Kill Switch Checks

Use the `@startkit/rbac` kill switch functions in your API routes:

```typescript
import { checkKillSwitch } from '@startkit/rbac'

export async function GET(req: Request) {
  const result = await checkKillSwitch({
    productId: 'my-product',
    featureKey: 'advanced_reports',
    organizationId: org.id,
  })

  if (result.blocked) {
    return new Response(result.reason, { status: 503 })
  }

  // Continue with normal operation
}
```

### Kill Switch Hierarchy

Kill switches are evaluated in order:

1. **Global**: Blocks all products (system-wide emergency)
2. **Product**: Blocks a specific product
3. **Feature**: Blocks a specific feature across all orgs
4. **Organization**: Blocks a specific organization

A block at any level stops further evaluation.

## Validation

The `defineProductConfig()` function validates your configuration at build time:

- All plan features must reference existing feature keys
- Feature keys must be snake_case
- Product ID must be kebab-case
- Version must be semver format

If validation fails, you'll see helpful error messages:

```
ProductConfigValidationError: Invalid product configuration for "my-product":
  - plans.pro: Feature "invalid_feature" not found in features
  - features.MyFeature: Feature key must be snake_case
```

## Best Practices

### 1. Start with Core Features

Define only essential features first. Add premium/enterprise features as your product matures.

### 2. Use Consistent Naming

- Feature keys: `snake_case` (e.g., `advanced_analytics`)
- Product IDs: `kebab-case` (e.g., `my-product`)

### 3. Set Sensible Limits

Start conservative and increase limits as you understand usage patterns:

```typescript
limits: {
  seats: 3,              // Start small
  apiCallsPerMonth: 1000,  // Easy to increase later
}
```

### 4. Document Feature Categories

Use categories consistently:
- `core`: Available to all plans
- `premium`: Paid plans (starter+)
- `enterprise`: Enterprise plan only
- `beta`: Features being tested (can be enabled per-org)

### 5. Keep Config Pure

The product config should be pure data with no logic:

```typescript
// ✅ Good - Pure data
export const productConfig = defineProductConfig({
  // Static configuration
})

// ❌ Bad - Logic in config
export const productConfig = defineProductConfig({
  features: process.env.ENABLE_AI ? { ai: ... } : {},  // Don't do this
})
```

## Related Documentation

- [RBAC Guide](./rbac.md) - Permission and feature flag patterns
- [Billing Integration](./billing-integration.md) - Stripe integration
- [Schema Ownership Rules](../ai-context/conventions.md#schema-ownership-rules) - Database conventions
