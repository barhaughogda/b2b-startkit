'use client';

import React from 'react';
import { BoardCertification, Education, Certification } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, GraduationCap, FileText, ExternalLink } from 'lucide-react';

interface ProviderCredentialsProps {
  boardCertifications?: BoardCertification[];
  education?: Education[];
  certifications?: Certification[];
  showVerifiedOnly?: boolean;
}

export function ProviderCredentials({
  boardCertifications = [],
  education = [],
  certifications = [],
  showVerifiedOnly = false
}: ProviderCredentialsProps) {
  const filteredBoardCerts = showVerifiedOnly 
    ? boardCertifications.filter(c => c.verified)
    : boardCertifications;
  
  const filteredEducation = showVerifiedOnly
    ? education.filter(e => e.verified)
    : education;
  
  const filteredCerts = showVerifiedOnly
    ? certifications.filter(c => c.verified)
    : certifications;
  
  const hasAnyCredentials = filteredBoardCerts.length > 0 || 
                            filteredEducation.length > 0 || 
                            filteredCerts.length > 0;
  
  if (!hasAnyCredentials) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Credentials & Education</CardTitle>
        <CardDescription>Professional qualifications and training</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Board Certifications */}
        {filteredBoardCerts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Board Certifications
            </h3>
            <div className="space-y-3">
              {filteredBoardCerts.map((cert, idx) => (
                <div key={idx} className="flex items-start justify-between p-3 bg-background-secondary rounded-md">
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">{cert.specialty}</div>
                    <div className="text-sm text-text-secondary">{cert.board}</div>
                    {cert.certificationNumber && (
                      <div className="text-xs text-text-tertiary mt-1">
                        Certification #{cert.certificationNumber}
                      </div>
                    )}
                    {(cert.issueDate || cert.expirationDate) && (
                      <div className="text-xs text-text-tertiary mt-1">
                        {cert.issueDate && `Issued: ${cert.issueDate}`}
                        {cert.expirationDate && ` • Expires: ${cert.expirationDate}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {cert.verified && (
                      <Badge variant="outline" className="text-xs">
                        Verified
                      </Badge>
                    )}
                    {cert.digitalBadgeUrl && (
                      <a
                        href={cert.digitalBadgeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zenthea-teal hover:underline"
                        aria-label="View digital badge"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Education */}
        {filteredEducation.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Education
            </h3>
            <div className="space-y-3">
              {filteredEducation.map((edu, idx) => (
                <div key={idx} className="flex items-start justify-between p-3 bg-background-secondary rounded-md">
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">
                      {edu.degree}
                      {edu.field && ` in ${edu.field}`}
                    </div>
                    <div className="text-sm text-text-secondary">{edu.institution}</div>
                    {edu.graduationYear && (
                      <div className="text-xs text-text-tertiary mt-1">
                        Graduated: {edu.graduationYear}
                      </div>
                    )}
                  </div>
                  {edu.verified && (
                    <Badge variant="outline" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Additional Certifications */}
        {filteredCerts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Additional Certifications
            </h3>
            <div className="space-y-3">
              {filteredCerts.map((cert, idx) => (
                <div key={idx} className="flex items-start justify-between p-3 bg-background-secondary rounded-md">
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">{cert.name}</div>
                    <div className="text-sm text-text-secondary">{cert.issuingOrganization}</div>
                    {(cert.issueDate || cert.expirationDate) && (
                      <div className="text-xs text-text-tertiary mt-1">
                        {cert.issueDate && `Issued: ${cert.issueDate}`}
                        {cert.expirationDate && ` • Expires: ${cert.expirationDate}`}
                      </div>
                    )}
                  </div>
                  {cert.verified && (
                    <Badge variant="outline" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

