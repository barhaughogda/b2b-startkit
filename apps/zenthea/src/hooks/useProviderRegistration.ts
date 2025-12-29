import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateStep1, validateStep2, validateStep3 } from '@/lib/validation';

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  npi: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export interface UseProviderRegistrationProps {
  tenantId?: string;
  redirectTo?: string;
}

export function useProviderRegistration({ tenantId, redirectTo = '/company/dashboard' }: UseProviderRegistrationProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    npi: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear any previous errors
  };

  const validateStep1Form = () => {
    const { firstName, lastName, email, phone } = formData;
    const result = validateStep1({ firstName, lastName, email, phone });
    
    if (!result.isValid) {
      setError(result.errors[0]); // Show first error
      return false;
    }
    
    setError(''); // Clear any previous errors
    return true;
  };

  const validateStep2Form = () => {
    const { specialty, licenseNumber, npi } = formData;
    const result = validateStep2({ specialty, licenseNumber, npi });
    
    if (!result.isValid) {
      setError(result.errors[0]); // Show first error
      return false;
    }
    
    setError(''); // Clear any previous errors
    return true;
  };

  const validateStep3Form = () => {
    const { password, confirmPassword, acceptTerms, acceptPrivacy } = formData;
    const result = validateStep3({ password, confirmPassword, acceptTerms, acceptPrivacy });
    
    if (!result.isValid) {
      setError(result.errors[0]); // Show first error
      return false;
    }
    
    setError(''); // Clear any previous errors
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1Form()) {
      setStep(2);
    } else if (step === 2 && validateStep2Form()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3Form()) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/provider/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tenantId: tenantId || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isLoading,
    error,
    step,
    handleInputChange,
    handleNext,
    handleBack,
    handleSubmit,
  };
}
