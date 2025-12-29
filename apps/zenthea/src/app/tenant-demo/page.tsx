'use client';

import { useState, useEffect } from 'react';
import { TenantBranding, TenantThemeProvider, FeatureGate, useTenantBranding } from '../../components/tenant/TenantBranding';

const demoTenants = [
  { id: 'demo-clinic', name: 'Demo Medical Center' },
  { id: 'hospital-main', name: 'Main General Hospital' },
  { id: 'clinic-family', name: 'Family Care Clinic' },
  { id: 'practice-dental', name: 'Bright Smile Dental Practice' }
];

export default function TenantDemoPage() {
  const [selectedTenant, setSelectedTenant] = useState('demo-clinic');
  const { branding, isLoading } = useTenantBranding(selectedTenant);

  // Update URL when tenant changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tenantId', selectedTenant);
    window.history.replaceState({}, '', url.toString());
    localStorage.setItem('currentTenantId', selectedTenant);
  }, [selectedTenant]);

  return (
    <TenantThemeProvider tenantId={selectedTenant}>
      <div className="min-h-screen bg-background-primary">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              🏥 Zenthea Multi-Tenant Demo
            </h1>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Experience how Zenthea adapts to different healthcare organizations with 
              dynamic branding, feature toggles, and tenant-specific customization.
            </p>
          </div>

          {/* Tenant Selector */}
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-primary p-6 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Select a Tenant</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {demoTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => setSelectedTenant(tenant.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedTenant === tenant.id
                      ? 'border-tenant-primary bg-tenant-primary bg-opacity-10 text-tenant-primary'
                      : 'border-border-primary hover:border-border-secondary text-text-secondary hover:text-text-primary'
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
            <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-primary p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Tenant Branding</h3>
              
              <div className="space-y-6">
                <TenantBranding 
                  tenantId={selectedTenant} 
                  size="lg"
                  className="justify-center"
                />
                
                {!isLoading && branding && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-text-secondary mb-2">Color Palette</h4>
                      <div className="flex space-x-3">
                        <div className="flex flex-col items-center">
                          <div 
                            className="w-12 h-12 rounded-lg border border-border-primary"
                            style={{ backgroundColor: branding.branding.primaryColor }}
                          />
                          <span className="text-xs text-text-tertiary mt-1">Primary</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div 
                            className="w-12 h-12 rounded-lg border border-border-primary"
                            style={{ backgroundColor: branding.branding.secondaryColor }}
                          />
                          <span className="text-xs text-text-tertiary mt-1">Secondary</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div 
                            className="w-12 h-12 rounded-lg border border-border-primary"
                            style={{ backgroundColor: branding.branding.accentColor }}
                          />
                          <span className="text-xs text-text-tertiary mt-1">Accent</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-text-secondary mb-2">Contact Information</h4>
                      <div className="text-sm text-text-secondary space-y-1">
                        <div>📞 (555) 123-4567</div>
                        <div>✉️ info@demo-clinic.com</div>
                        <div>
                          123 Healthcare Ave, Medical City, MC 12345
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features Demo */}
            <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-primary p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Feature Toggles</h3>
              
              {!isLoading && branding && (
                <div className="space-y-3">
                  {Object.entries(branding.branding.features).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-secondary">
                        {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        enabled 
                          ? 'bg-status-success bg-opacity-20 text-status-success' 
                          : 'bg-surface-secondary text-text-tertiary'
                      }`}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Component Examples */}
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-primary p-6 mb-8">
            <h3 className="text-lg font-semibold text-text-primary mb-6">Tenant-Styled Components</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Buttons */}
              <div>
                <h4 className="font-medium text-text-secondary mb-3">Buttons</h4>
                <div className="space-y-2">
                  <button className="btn-tenant-primary px-4 py-2 rounded-md font-medium w-full">
                    Primary Button
                  </button>
                  <button className="btn-tenant-secondary px-4 py-2 rounded-md font-medium w-full">
                    Secondary Button
                  </button>
                  <button className="btn-tenant-outline px-4 py-2 rounded-md font-medium w-full">
                    Outline Button
                  </button>
                </div>
              </div>

              {/* Cards */}
              <div>
                <h4 className="font-medium text-text-secondary mb-3">Cards</h4>
                <div className="space-y-3">
                  <div className="card-tenant p-4 rounded-lg">
                    <h5 className="font-medium text-text-primary">Patient Card</h5>
                    <p className="text-sm text-text-secondary mt-1">
                      John Doe - Next appointment: Tomorrow
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Elements */}
              <div>
                <h4 className="font-medium text-text-secondary mb-3">Form Elements</h4>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Patient name"
                    className="input-tenant w-full px-3 py-2 rounded-md bg-surface-elevated text-text-primary"
                  />
                  <select className="input-tenant w-full px-3 py-2 rounded-md bg-surface-elevated text-text-primary">
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
            <h3 className="text-lg font-semibold text-text-primary mb-6">Feature Gates in Action</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureGate 
                feature="appointments" 
                tenantId={selectedTenant}
                fallback={
                  <div className="p-4 bg-surface-secondary rounded-lg text-center text-text-tertiary">
                    Online Scheduling Disabled
                  </div>
                }
              >
                <div className="p-4 bg-status-info-bg rounded-lg text-center">
                  <div className="text-status-info font-medium">📅 Online Scheduling</div>
                  <div className="text-status-info text-sm mt-1">Book appointments online</div>
                </div>
              </FeatureGate>

              <FeatureGate 
                feature="telemedicine" 
                tenantId={selectedTenant}
                fallback={
                  <div className="p-4 bg-surface-secondary rounded-lg text-center text-text-tertiary">
                    Telehealth Disabled
                  </div>
                }
              >
                <div className="p-4 bg-status-success-bg rounded-lg text-center">
                  <div className="text-status-success font-medium">💻 Telehealth</div>
                  <div className="text-status-success text-sm mt-1">Virtual consultations</div>
                </div>
              </FeatureGate>

              <FeatureGate 
                feature="billing" 
                tenantId={selectedTenant}
                fallback={
                  <div className="p-4 bg-surface-secondary rounded-lg text-center text-text-tertiary">
                    Billing Disabled
                  </div>
                }
              >
                <div className="p-4 bg-zenthea-purple-50 rounded-lg text-center">
                  <div className="text-zenthea-purple font-medium">💳 Billing</div>
                  <div className="text-zenthea-purple text-sm mt-1">Payment processing</div>
                </div>
              </FeatureGate>

              <FeatureGate 
                feature="messaging" 
                tenantId={selectedTenant}
                fallback={
                  <div className="p-4 bg-surface-secondary rounded-lg text-center text-text-tertiary">
                    Messaging Disabled
                  </div>
                }
              >
                <div className="p-4 bg-status-warning-bg rounded-lg text-center">
                  <div className="text-status-warning font-medium">💬 Messaging</div>
                  <div className="text-status-warning text-sm mt-1">Patient communication</div>
                </div>
              </FeatureGate>

              <FeatureGate 
                feature="labResults" 
                tenantId={selectedTenant}
                fallback={
                  <div className="p-4 bg-surface-secondary rounded-lg text-center text-text-tertiary">
                    Lab Results Disabled
                  </div>
                }
              >
                <div className="p-4 bg-status-error-bg rounded-lg text-center">
                  <div className="text-status-error font-medium">🧪 Lab Results</div>
                  <div className="text-status-error text-sm mt-1">View test results</div>
                </div>
              </FeatureGate>

              <FeatureGate 
                feature="prescriptions" 
                tenantId={selectedTenant}
                fallback={
                  <div className="p-4 bg-surface-secondary rounded-lg text-center text-text-tertiary">
                    Prescription Refills Disabled
                  </div>
                }
              >
                <div className="p-4 bg-indigo-50 rounded-lg text-center">
                  <div className="text-indigo-800 font-medium">💊 Prescriptions</div>
                  <div className="text-indigo-600 text-sm mt-1">Refill requests</div>
                </div>
              </FeatureGate>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-text-tertiary">
            <p>
              🚀 Powered by Zenthea Multi-Tenant Architecture
            </p>
            <p className="text-sm mt-2">
              Switch between tenants to see how branding, features, and styling adapt automatically.
            </p>
          </div>
        </div>
      </div>
    </TenantThemeProvider>
  );
}
