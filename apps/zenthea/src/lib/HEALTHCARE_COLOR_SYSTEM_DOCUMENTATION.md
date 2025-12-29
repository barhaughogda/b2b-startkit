# Zenthea Healthcare Color System Documentation

This document describes the comprehensive healthcare color system implemented for the Zenthea healthcare platform, including medical status indicators, data visualization, and accessibility compliance.

## 🎨 Color System Overview

The Zenthea healthcare color system provides semantic color coding for medical data visualization, ensuring consistent and accessible communication of health information across all themes (light, dark, high contrast).

## 🏥 Healthcare Color Categories

### 1. Patient Status Colors

**Purpose**: Visual indicators for patient status and conditions

```css
--healthcare-patient: 142 71% 45%;         /* #22c55e - Green */
--healthcare-patient-active: 142 71% 55%;  /* #4ade80 - Light Green */
--healthcare-patient-inactive: 142 71% 35%; /* #16a34a - Dark Green */
--healthcare-patient-discharged: 215 20% 65%; /* #94a3b8 - Gray */
```

**Usage**:
- `patient`: General patient information
- `patient-active`: Currently active patients
- `patient-inactive`: Inactive or dormant patients
- `patient-discharged`: Discharged patients

### 2. Appointment Status Colors

**Purpose**: Visual indicators for appointment scheduling and management

```css
--healthcare-appointment: 172 60% 60%;     /* #5FBFAF - Teal */
--healthcare-appointment-scheduled: 172 60% 70%; /* #7dd3fc - Light Teal */
--healthcare-appointment-confirmed: 142 71% 45%; /* #22c55e - Green */
--healthcare-appointment-cancelled: 0 70% 45%; /* #B91C1C - Red */
--healthcare-appointment-rescheduled: 45 93% 47%; /* #eab308 - Yellow */
```

**Usage**:
- `appointment`: General appointment information
- `appointment-scheduled`: Newly scheduled appointments
- `appointment-confirmed`: Confirmed appointments
- `appointment-cancelled`: Cancelled appointments
- `appointment-rescheduled`: Rescheduled appointments

### 3. Vital Signs Colors

**Purpose**: Visual indicators for vital signs and medical measurements

```css
--healthcare-vital: 0 70% 45%;             /* #B91C1C - Deep Red */
--healthcare-vital-normal: 142 71% 45%;    /* #22c55e - Green */
--healthcare-vital-elevated: 45 93% 47%;   /* #eab308 - Yellow */
--healthcare-vital-critical: 0 70% 35%;    /* #991B1B - Darker Red */
--healthcare-vital-low: 262 83% 58%;       /* #8b5cf6 - Purple */
```

**Usage**:
- `vital`: General vital signs
- `vital-normal`: Normal vital signs within range
- `vital-elevated`: Elevated readings requiring attention
- `vital-critical`: Critical values requiring immediate action
- `vital-low`: Low values requiring monitoring

### 4. Lab Results Colors

**Purpose**: Visual indicators for laboratory test results and status

```css
--healthcare-lab-normal: 142 71% 45%;      /* #22c55e - Green */
--healthcare-lab-abnormal: 0 70% 45%;      /* #B91C1C - Red */
--healthcare-lab-critical: 0 70% 35%;       /* #991B1B - Darker Red */
--healthcare-lab-pending: 45 93% 47%;      /* #eab308 - Yellow */
--healthcare-lab-unavailable: 215 20% 65%; /* #94a3b8 - Gray */
```

**Usage**:
- `lab-normal`: Normal lab values within range
- `lab-abnormal`: Abnormal lab results
- `lab-critical`: Critical lab results
- `lab-pending`: Pending test results
- `lab-unavailable`: Unavailable or incomplete tests

### 5. Alert Severity Colors

**Purpose**: Visual indicators for medical alerts and notifications

```css
--healthcare-alert-info: 172 60% 60%;      /* #5FBFAF - Teal */
--healthcare-alert-warning: 45 93% 47%;    /* #eab308 - Yellow */
--healthcare-alert-error: 0 70% 45%;       /* #B91C1C - Red */
--healthcare-alert-critical: 0 70% 35%;    /* #991B1B - Darker Red */
--healthcare-alert-success: 142 71% 45%;  /* #22c55e - Green */
```

**Usage**:
- `alert-info`: Informational alerts
- `alert-warning`: Warning alerts requiring attention
- `alert-error`: Error alerts
- `alert-critical`: Critical alerts requiring immediate action
- `alert-success`: Success notifications

### 6. Treatment Status Colors

**Purpose**: Visual indicators for treatment plans and medical procedures

```css
--healthcare-treatment-active: 142 71% 45%; /* #22c55e - Green */
--healthcare-treatment-completed: 215 20% 65%; /* #94a3b8 - Gray */
--healthcare-treatment-pending: 45 93% 47%; /* #eab308 - Yellow */
--healthcare-treatment-cancelled: 0 70% 45%; /* #B91C1C - Red */
```

**Usage**:
- `treatment-active`: Active treatments in progress
- `treatment-completed`: Completed treatments
- `treatment-pending`: Pending treatments
- `treatment-cancelled`: Cancelled treatments

### 7. Insurance Status Colors

**Purpose**: Visual indicators for insurance coverage and claims

```css
--healthcare-insurance-active: 142 71% 45%; /* #22c55e - Green */
--healthcare-insurance-pending: 45 93% 47%; /* #eab308 - Yellow */
--healthcare-insurance-denied: 0 70% 45%; /* #B91C1C - Red */
--healthcare-insurance-expired: 215 20% 65%; /* #94a3b8 - Gray */
```

**Usage**:
- `insurance-active`: Active insurance coverage
- `insurance-pending`: Pending insurance claims
- `insurance-denied`: Denied insurance claims
- `insurance-expired`: Expired insurance coverage

## 🧩 Component Usage

### Healthcare Status Components

The system includes specialized components for each healthcare category:

```tsx
import { 
  PatientStatus, 
  AppointmentStatus, 
  VitalStatus, 
  LabStatus, 
  AlertSeverity, 
  TreatmentStatus, 
  InsuranceStatus 
} from '@/components/ui/healthcare-status';

// Patient Status
<PatientStatus status="active">Active Patient</PatientStatus>
<PatientStatus status="inactive">Inactive Patient</PatientStatus>
<PatientStatus status="discharged">Discharged</PatientStatus>

// Appointment Status
<AppointmentStatus status="scheduled">Scheduled</AppointmentStatus>
<AppointmentStatus status="confirmed">Confirmed</AppointmentStatus>
<AppointmentStatus status="cancelled">Cancelled</AppointmentStatus>

// Vital Signs Status
<VitalStatus status="normal">Normal</VitalStatus>
<VitalStatus status="elevated">Elevated</VitalStatus>
<VitalStatus status="critical">Critical</VitalStatus>

// Lab Results Status
<LabStatus status="normal">Normal Results</LabStatus>
<LabStatus status="abnormal">Abnormal Results</LabStatus>
<LabStatus status="critical">Critical Results</LabStatus>

// Alert Severity
<AlertSeverity severity="info">Info Alert</AlertSeverity>
<AlertSeverity severity="warning">Warning Alert</AlertSeverity>
<AlertSeverity severity="error">Error Alert</AlertSeverity>
<AlertSeverity severity="critical">Critical Alert</AlertSeverity>

// Treatment Status
<TreatmentStatus status="active">Active Treatment</TreatmentStatus>
<TreatmentStatus status="completed">Completed</TreatmentStatus>
<TreatmentStatus status="pending">Pending</TreatmentStatus>

// Insurance Status
<InsuranceStatus status="active">Active Coverage</InsuranceStatus>
<InsuranceStatus status="pending">Pending</InsuranceStatus>
<InsuranceStatus status="denied">Denied</InsuranceStatus>
```

### CSS Usage

You can also use the healthcare colors directly in CSS:

```css
.patient-card {
  border-color: hsl(var(--healthcare-patient));
  background-color: hsl(var(--healthcare-patient) / 0.1);
}

.critical-alert {
  color: hsl(var(--healthcare-alert-critical));
  background-color: hsl(var(--healthcare-alert-critical) / 0.1);
}

.normal-vitals {
  color: hsl(var(--healthcare-vital-normal));
}
```

## 🎯 Color Semantics

### Color Meaning Guidelines

- **Green**: Normal, healthy, active, successful states
- **Red**: Critical, abnormal, error, cancelled states
- **Yellow**: Warning, pending, elevated states
- **Teal**: Informational, scheduled, neutral states
- **Gray**: Inactive, completed, unavailable states
- **Purple**: Low values, special conditions

### Medical Context Usage

1. **Patient Care**: Use green for healthy/active, red for critical/abnormal
2. **Appointments**: Use teal for scheduled, green for confirmed, red for cancelled
3. **Vital Signs**: Use green for normal, yellow for elevated, red for critical
4. **Lab Results**: Use green for normal, red for abnormal/critical
5. **Alerts**: Use appropriate severity colors (info, warning, error, critical)
6. **Treatments**: Use green for active, gray for completed, yellow for pending
7. **Insurance**: Use green for active, yellow for pending, red for denied

## ♿ Accessibility Features

### WCAG 2.1 AA Compliance

All healthcare colors meet minimum contrast ratios:

- **Light Theme**: 4.5:1 contrast ratio minimum
- **Dark Theme**: 4.5:1 contrast ratio minimum  
- **High Contrast Theme**: 7:1 contrast ratio minimum

### Color Independence

- Color is not the only means of conveying information
- Text labels are always included with color indicators
- Semantic meaning is preserved for screen readers
- High contrast mode provides maximum accessibility

### Screen Reader Support

- Proper ARIA labels on all status indicators
- Semantic HTML structure for medical data
- Descriptive text for all color-coded information
- Consistent naming conventions

## 🎨 Theme Support

### Light Theme
- Standard healthcare colors with optimal readability
- High contrast for medical data visualization
- Consistent with Zenthea brand colors

### Dark Theme
- Adjusted colors for dark backgrounds
- Maintained contrast ratios for accessibility
- Optimized for low-light medical environments

### High Contrast Theme
- Maximum contrast colors for accessibility
- Enhanced visibility for visual impairments
- Critical medical information clearly distinguished

## 🧪 Testing and Validation

### Color Testing

```tsx
import { HealthcareColorSystemTest } from '@/components/HealthcareColorSystemTest';

// Comprehensive test component
<HealthcareColorSystemTest />
```

### Accessibility Testing

1. **Contrast Testing**: Use tools like WebAIM contrast checker
2. **Colorblind Testing**: Test with colorblind simulation tools
3. **Screen Reader Testing**: Verify semantic meaning is preserved
4. **Keyboard Navigation**: Ensure all indicators are accessible

### Manual Testing

1. **Theme Switching**: Test all colors across themes
2. **Component Rendering**: Verify all status indicators render correctly
3. **Color Combinations**: Test readability of color combinations
4. **Medical Context**: Validate colors make sense in medical scenarios

## 📚 Usage Guidelines

### Best Practices

1. **Consistency**: Use the same colors for similar medical concepts
2. **Clarity**: Always provide text labels alongside color indicators
3. **Accessibility**: Test color combinations for readability
4. **Context**: Consider the medical context when choosing colors
5. **Testing**: Test with users who have visual impairments
6. **Documentation**: Document color usage in your application

### Common Patterns

```tsx
// Patient status with icon and text
<div className="flex items-center space-x-2">
  <PatientStatus status="active">Active</PatientStatus>
  <span>Patient is currently active</span>
</div>

// Critical alert with multiple indicators
<div className="flex items-center space-x-2">
  <AlertSeverity severity="critical">Critical</AlertSeverity>
  <VitalStatus status="critical">Critical Vitals</VitalStatus>
  <span>Immediate attention required</span>
</div>

// Lab results with status
<div className="flex items-center space-x-2">
  <LabStatus status="abnormal">Abnormal</LabStatus>
  <span>Lab results require review</span>
</div>
```

## 🔧 Customization

### Adding New Colors

To add new healthcare colors:

1. **Define CSS Variables**:
```css
:root {
  --healthcare-custom: 200 100% 50%; /* Custom color */
}
```

2. **Add to Component**:
```tsx
const customVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  {
    variants: {
      status: {
        custom: "bg-[hsl(var(--healthcare-custom))] text-white",
      },
    },
  }
);
```

3. **Update Documentation**: Document the new color usage

### Theme-Specific Colors

For theme-specific healthcare colors:

```css
:root {
  --healthcare-custom: 200 100% 50%; /* Light theme */
}

.dark {
  --healthcare-custom: 200 100% 70%; /* Dark theme */
}

[data-theme="high-contrast"] {
  --healthcare-custom: 200 100% 25%; /* High contrast theme */
}
```

## 🚀 Migration Guide

### From Basic Colors

If migrating from basic color systems:

1. **Replace Color Classes**:
```css
/* Old */
.status-normal { color: green; }
.status-critical { color: red; }

/* New */
.status-normal { color: hsl(var(--healthcare-normal)); }
.status-critical { color: hsl(var(--healthcare-critical)); }
```

2. **Update Components**:
```tsx
// Old
<span className="text-green-500">Normal</span>

// New
<LabStatus status="normal">Normal</LabStatus>
```

3. **Test Accessibility**: Ensure all colors meet contrast requirements

### Gradual Migration

1. **Start with Critical Colors**: Migrate critical/error colors first
2. **Test Thoroughly**: Test each color category thoroughly
3. **Update Documentation**: Keep documentation current
4. **Train Team**: Ensure team understands new color system

## 📖 Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Color Accessibility Guidelines](https://webaim.org/articles/contrast/)
- [Medical UI Design Patterns](https://www.nngroup.com/articles/medical-website-usability/)

### Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colorblind Simulation Tools](https://www.toptal.com/designers/colorfilter)
- [Accessibility Testing Tools](https://www.deque.com/axe/)

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: Zenthea Development Team  
**Accessibility**: WCAG 2.1 AA Compliant
