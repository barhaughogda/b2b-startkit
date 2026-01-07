'use client';

import { useState, useEffect } from 'react';
import { TenantThemeProvider, FeatureGate, useTenantBranding } from '../../components/tenant/TenantBranding';

const demoTenants = [
  { id: 'demo-clinic', name: 'Demo Medical Center' },
  { id: 'hospital-main', name: 'Main General Hospital' },
  { id: 'clinic-family', name: 'Family Care Clinic' },
  { id: 'practice-dental', name: 'Bright Smile Dental Practice' }
];

// Mock tenant data for demo purposes
const mockTenantData = {
  'demo-clinic': {
    branding: {
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      accentColor: '#10b981'
    },
    contactInfo: {
      phone: '(555) 123-4567',
      email: 'info@democlinic.com',
      address: {
        street: '123 Medical Drive',
        city: 'Demo City',
        state: 'DC'
      }
    },
    features: {
      onlineScheduling: true,
      telehealth: true,
      billing: false,
      messaging: true,
      labResults: true,
      prescriptionRefills: false
    }
  },
  'hospital-main': {
    branding: {
      primaryColor: '#dc2626',
      secondaryColor: '#991b1b',
      accentColor: '#f59e0b'
    },
    contactInfo: {
      phone: '(555) 987-6543',
      email: 'contact@mainhospital.com',
      address: {
        street: '456 Hospital Blvd',
        city: 'Main City',
        state: 'MC'
      }
    },
    features: {
      onlineScheduling: true,
      telehealth: true,
      billing: true,
      messaging: true,
      labResults: true,
      prescriptionRefills: true
    }
  },
  'clinic-family': {
    branding: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      accentColor: '#0d9488'
    },
    contactInfo: {
      phone: '(555) 456-7890',
      email: 'hello@familyclinic.com',
      address: {
        street: '789 Family Lane',
        city: 'Family Town',
        state: 'FT'
      }
    },
    features: {
      onlineScheduling: true,
      telehealth: false,
      billing: true,
      messaging: true,
      labResults: false,
      prescriptionRefills: true
    }
  },
  'practice-dental': {
    branding: {
      primaryColor: '#7c3aed',
      secondaryColor: '#5b21b6',
      accentColor: '#ec4899'
    },
    contactInfo: {
      phone: '(555) 321-0987',
      email: 'smile@brightdental.com',
      address: {
        street: '321 Smile Street',
        city: 'Dental City',
        state: 'DC'
      }
    },
    features: {
      onlineScheduling: true,
      telehealth: false,
      billing: true,
      messaging: false,
      labResults: false,
      prescriptionRefills: false
    }
  }
};

export default function PublicTenantDemoPage() {
  const [selectedTenant, setSelectedTenant] = useState('demo-clinic');
  const [tenantData, setTenantData] = useState(mockTenantData[selectedTenant as keyof typeof mockTenantData]);

  // Update tenant data when selection changes
  useEffect(() => {
    setTenantData(mockTenantData[selectedTenant as keyof typeof mockTenantData]);
  }, [selectedTenant]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏥 Zenthea Multi-Tenant Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience how Zenthea adapts to different healthcare organizations with 
            dynamic branding, feature toggles, and tenant-specific customization.
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Demo Mode:</strong> This is a public demo with mock data. 
              In production, this would require authentication and real tenant data.
            </p>
          </div>
        </div>

        {/* Tenant Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Tenant</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {demoTenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedTenant === tenant.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900'
                }`}
              >
                <div className="font-medium">{tenant.name}</div>
                <div className="text-sm opacity-75">{tenant.id}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Current Tenant Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Branding Demo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Branding</h3>
            
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2" style={{ color: tenantData.branding.primaryColor }}>
                  {demoTenants.find(t => t.id === selectedTenant)?.name}
                </div>
                <div className="text-sm text-gray-500">{selectedTenant}</div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Color Palette</h4>
                  <div className="flex space-x-3">
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-12 h-12 rounded-lg border border-gray-200"
                        style={{ backgroundColor: tenantData.branding.primaryColor }}
                      />
                      <span className="text-xs text-gray-500 mt-1">Primary</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-12 h-12 rounded-lg border border-gray-200"
                        style={{ backgroundColor: tenantData.branding.secondaryColor }}
                      />
                      <span className="text-xs text-gray-500 mt-1">Secondary</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-12 h-12 rounded-lg border border-gray-200"
                        style={{ backgroundColor: tenantData.branding.accentColor }}
                      />
                      <span className="text-xs text-gray-500 mt-1">Accent</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Contact Information</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{tenantData.contactInfo.phone}</div>
                    <div>{tenantData.contactInfo.email}</div>
                    <div>
                      {tenantData.contactInfo.address.street}, {tenantData.contactInfo.address.city}, {tenantData.contactInfo.address.state}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Demo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Toggles</h3>
            
            <div className="space-y-3">
              {Object.entries(tenantData.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Component Examples */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Tenant-Styled Components</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Buttons */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Buttons</h4>
              <div className="space-y-2">
                <button 
                  className="px-4 py-2 rounded-md font-medium w-full text-white"
                  style={{ backgroundColor: tenantData.branding.primaryColor }}
                >
                  Primary Button
                </button>
                <button 
                  className="px-4 py-2 rounded-md font-medium w-full text-white"
                  style={{ backgroundColor: tenantData.branding.secondaryColor }}
                >
                  Secondary Button
                </button>
                <button 
                  className="px-4 py-2 rounded-md font-medium w-full border-2"
                  style={{ 
                    borderColor: tenantData.branding.primaryColor,
                    color: tenantData.branding.primaryColor
                  }}
                >
                  Outline Button
                </button>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Cards</h4>
              <div className="space-y-3">
                <div 
                  className="p-4 rounded-lg border-l-4"
                  style={{ borderLeftColor: tenantData.branding.primaryColor }}
                >
                  <h5 className="font-medium text-gray-900">Patient Card</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    John Doe - Next appointment: Tomorrow
                  </p>
                </div>
              </div>
            </div>

            {/* Form Elements */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Form Elements</h4>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Patient name"
                  className="w-full px-3 py-2 rounded-md border-2 bg-surface-elevated text-text-primary focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    borderColor: tenantData.branding.primaryColor,
                    '--tw-ring-color': tenantData.branding.primaryColor
                  } as React.CSSProperties}
                />
                <select 
                  className="w-full px-3 py-2 rounded-md border-2 bg-surface-elevated text-text-primary focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    borderColor: tenantData.branding.primaryColor,
                    '--tw-ring-color': tenantData.branding.primaryColor
                  } as React.CSSProperties}
                >
                  <option>Select provider</option>
                  <option>Dr. Smith</option>
                  <option>Dr. Johnson</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Gates Demo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Feature Gates in Action</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(tenantData.features).map(([feature, enabled]) => (
              <div key={feature}>
                {enabled ? (
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-green-800 font-medium">
                      {feature === 'onlineScheduling' && '📅 Online Scheduling'}
                      {feature === 'telehealth' && '💻 Telehealth'}
                      {feature === 'billing' && '💳 Billing'}
                      {feature === 'messaging' && '💬 Messaging'}
                      {feature === 'labResults' && '🧪 Lab Results'}
                      {feature === 'prescriptionRefills' && '💊 Prescriptions'}
                    </div>
                    <div className="text-green-600 text-sm mt-1">
                      {feature === 'onlineScheduling' && 'Book appointments online'}
                      {feature === 'telehealth' && 'Virtual consultations'}
                      {feature === 'billing' && 'Payment processing'}
                      {feature === 'messaging' && 'Patient communication'}
                      {feature === 'labResults' && 'View test results'}
                      {feature === 'prescriptionRefills' && 'Refill requests'}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                    {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Disabled
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>
            🚀 Powered by Zenthea Multi-Tenant Architecture
          </p>
          <p className="text-sm mt-2">
            Switch between tenants to see how branding, features, and styling adapt automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
