# Diagnosis History Body Map Component

## Overview
The `DiagnosisHistoryBodyMap` component provides an interactive anatomical body map for visualizing patient diagnoses. It includes timeline filtering, search functionality, and detailed modal cards for diagnosis information.

## Features

### Interactive Body Map
- Anatomical SVG representation of the human body
- Clickable diagnosis markers positioned on relevant body regions
- Color-coded markers based on diagnosis severity
- Hover effects and visual feedback

### Timeline Integration
- Interactive year-based filtering
- Visual indicators for years with diagnoses
- Click to filter diagnoses by year
- Clear year filter functionality

### Search and Filtering
- Real-time search through diagnosis names and ICD codes
- Body system filtering (Muscular, Skeletal, Circulatory, etc.)
- Combined search and year filtering

### Modal Cards
- Detailed diagnosis information on marker click
- ICD codes, visit counts, and status information
- Treatment details and provider information
- Action buttons for viewing notes and timeline

## Usage

```tsx
import { DiagnosisHistoryBodyMap } from './DiagnosisHistoryBodyMap';

function PatientDashboard() {
  const handleDiagnosisClick = (diagnosis) => {
    // Handle diagnosis click - open detailed modal
    console.log('Selected diagnosis:', diagnosis);
  };

  return (
    <DiagnosisHistoryBodyMap 
      onDiagnosisClick={handleDiagnosisClick}
      className="w-full"
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `onDiagnosisClick` | `(diagnosis: Diagnosis) => void` | Callback when a diagnosis marker is clicked |
| `className` | `string` | Additional CSS classes |

## Data Structure

### Diagnosis Object
```typescript
interface Diagnosis {
  id: string;
  name: string;
  icdCode: string;
  bodyRegion: string;
  position: { x: number; y: number };
  visits: number;
  complaint: string;
  latestUpdate: string;
  status: 'active' | 'healing' | 'chronic' | 'resolved';
  severity: 'mild' | 'moderate' | 'severe';
}
```

## Integration with Modal System

The component integrates with the existing patient profile modal system:

```tsx
const { openDiagnosisModal } = usePatientProfileModals();

const handleDiagnosisClick = (diagnosis) => {
  openDiagnosisModal(diagnosis.id);
};
```

## Styling

The component uses Tailwind CSS classes and follows the design system:
- Responsive grid layout (1 column on mobile, 4 columns on large screens)
- Consistent color scheme with the rest of the application
- Hover states and transitions for better UX
- Accessible focus states and keyboard navigation

## Future Enhancements

1. **3D Body Model**: Replace SVG with 3D anatomical model
2. **Animation**: Add smooth transitions and animations
3. **Data Integration**: Connect to real patient data API
4. **Advanced Filtering**: Add more filter options (severity, status, provider)
5. **Export Functionality**: Allow exporting diagnosis data
6. **Print Support**: Optimize for printing diagnosis reports
