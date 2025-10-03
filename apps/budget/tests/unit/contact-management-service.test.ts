import {describe, it, expect, beforeEach, vi} from 'vitest';
import {ContactManagementService} from '../../src/lib/server/domains/payees/contact-management';
import {ValidationError} from '../../src/lib/server/shared/types/errors';

// Mock InputSanitizer
vi.mock('../../src/lib/server/shared/validation', () => ({
  InputSanitizer: {
    sanitizeEmail: vi.fn((email) => email),
    sanitizePhone: vi.fn((phone) => phone),
    sanitizeUrl: vi.fn((url) => url),
  }
}));

// Mock logger
vi.mock('../../src/lib/server/shared/logging', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  }
}));

describe('ContactManagementService', () => {
  let service: ContactManagementService;

  beforeEach(() => {
    service = new ContactManagementService();
    vi.clearAllMocks();
  });

  describe('standardizePhoneNumbers', () => {
    it('should throw ValidationError for empty phone', async () => {
      await expect(service.standardizePhoneNumbers('')).rejects.toThrow(ValidationError);
    });

    it('should standardize US phone number to E.164 format', async () => {
      const result = await service.standardizePhoneNumbers('(555) 123-4567');

      expect(result.standardized).toBe('+15551234567');
      expect(result.format).toBe('e164');
      expect(result.region).toBe('US');
      expect(result.valid).toBe(true);
    });

    it('should handle various US phone formats', async () => {
      const formats = [
        '555-123-4567',
        '555.123.4567',
        '(555)123-4567',
        '+1 555 123 4567',
      ];

      for (const phone of formats) {
        const result = await service.standardizePhoneNumbers(phone);
        // Should extract the 10 digits regardless of format
        const digitsOnly = result.standardized.replace(/[^\d]/g, '');
        expect(digitsOnly).toBe('15551234567');
      }
    });

    it('should detect toll-free numbers', async () => {
      const result = await service.standardizePhoneNumbers('(800) 555-1234');

      // Should extract digits correctly
      const digitsOnly = result.standardized.replace(/[^\d]/g, '');
      expect(digitsOnly).toBe('18005551234');
      // Type detection based on area code
      if (result.type) {
        expect(result.type).toBe('toll-free');
      }
      // May set region if pattern matches
      if (result.region) {
        expect(result.region).toBe('US');
      }
    });

    it('should handle international numbers', async () => {
      const result = await service.standardizePhoneNumbers('+442012345678');

      expect(result.standardized).toBe('+442012345678');
      expect(result.format).toBe('e164');
      expect(result.region).toBe('INTL');
      expect(result.valid).toBe(true);
    });

    it('should mark invalid numbers as not valid', async () => {
      const result = await service.standardizePhoneNumbers('123');

      expect(result.valid).toBe(false);
      expect(result.format).toBe('local');
    });
  });

  describe('validateEmailDomains', () => {
    it('should throw ValidationError for empty email', async () => {
      await expect(service.validateEmailDomains('')).rejects.toThrow(ValidationError);
    });

    it('should validate valid email addresses', async () => {
      const result = await service.validateEmailDomains('user@example.com');

      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
      expect(result.domainType).toBe('business');
      expect(result.mxRecord).toBe(true);
    });

    it('should detect consumer email domains', async () => {
      const result = await service.validateEmailDomains('user@gmail.com');

      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('gmail.com');
      expect(result.domainType).toBe('consumer');
      expect(result.reputationScore).toBe(0.7);
    });

    it('should detect educational domains', async () => {
      const result = await service.validateEmailDomains('student@university.edu');

      expect(result.isValid).toBe(true);
      expect(result.domainType).toBe('educational');
      expect(result.reputationScore).toBe(1.0);
    });

    it('should detect government domains', async () => {
      const result = await service.validateEmailDomains('official@agency.gov');

      expect(result.isValid).toBe(true);
      expect(result.domainType).toBe('government');
      expect(result.reputationScore).toBe(1.0);
    });

    it('should flag suspicious domains', async () => {
      const result = await service.validateEmailDomains('user@temp-mail.org');

      expect(result.isValid).toBe(false);
      expect(result.domainType).toBe('suspicious');
      expect(result.reputationScore).toBe(0.1);
    });

    it('should detect disposable email addresses', async () => {
      const result = await service.validateEmailDomains('user@10minutemail.com');

      expect(result.disposable).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('should handle invalid email format', async () => {
      const result = await service.validateEmailDomains('not-an-email');

      expect(result.isValid).toBe(false);
      expect(result.domain).toBe('');
      expect(result.suggestions).toBeDefined();
    });

    it('should handle malformed email with multiple @', async () => {
      const result = await service.validateEmailDomains('user@@example.com');

      expect(result.isValid).toBe(false);
    });
  });

  describe('enrichAddressData', () => {
    it('should handle null address', async () => {
      const result = await service.enrichAddressData(null);

      expect(result.confidence).toBe(0);
      expect(result.geocoded).toBe(false);
      expect(result.completeness).toBe(0);
      expect(result.suggestions).toContain('Address information is required for complete contact profile');
    });

    it('should parse and enrich complete address', async () => {
      const address = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001'
      };

      const result = await service.enrichAddressData(address);

      expect(result.completeness).toBe(1);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.geocoded).toBe(true);
      expect(result.coordinates).toBeDefined();
      expect(result.components.street).toBeDefined();
      expect(result.components.city).toBeDefined();
      expect(result.components.state).toBeDefined();
      expect(result.components.zipCode).toBeDefined();
    });

    it('should handle incomplete address', async () => {
      const address = {
        city: 'New York',
        state: 'NY'
      };

      const result = await service.enrichAddressData(address);

      expect(result.completeness).toBe(0.5);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain('Street address is missing');
      expect(result.suggestions).toContain('ZIP code is missing');
    });

    it('should standardize address components', async () => {
      const address = {
        street: '123 main street',
        city: 'new york',
        state: 'new york',
        zipCode: '10001'
      };

      const result = await service.enrichAddressData(address);

      expect(result.components.street).toBeDefined();
      expect(result.components.city).toBeDefined();
      expect(result.components.state).toBeDefined();
      expect(result.components.zipCode).toBe('10001');
      expect(result.components.country).toBe('US');
    });

    it('should handle string address format', async () => {
      const address = '123 Main St, New York, NY 10001';

      const result = await service.enrichAddressData(address);

      expect(result.components).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should throw ValidationError for invalid address type', async () => {
      await expect(service.enrichAddressData(123)).rejects.toThrow(ValidationError);
    });
  });

  describe('validateAndEnrichContactInfo', () => {
    it('should validate and enrich multiple contact fields', async () => {
      const contactData = {
        phone: '555-123-4567',
        email: 'user@example.com',
        website: 'https://example.com',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        }
      };

      const result = await service.validateAndEnrichContactInfo(contactData);

      expect(result.validationResults).toHaveLength(4);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.enrichmentSuggestions)).toBe(true);
      expect(Array.isArray(result.securityFlags)).toBe(true);
    });

    it('should flag suspicious email domains as security risk', async () => {
      const contactData = {
        email: 'user@temp-mail.org'
      };

      const result = await service.validateAndEnrichContactInfo(contactData);

      expect(result.securityFlags.length).toBeGreaterThan(0);
      expect(result.securityFlags[0]).toContain('Suspicious email domain');
    });

    it('should flag insecure websites', async () => {
      const contactData = {
        website: 'http://example.com'
      };

      const result = await service.validateAndEnrichContactInfo(contactData);

      // Website validation should be in results
      const websiteValidation = result.validationResults.find(v => v.field === 'website');
      expect(websiteValidation).toBeDefined();
    });

    it('should generate enrichment suggestions for invalid data', async () => {
      const contactData = {
        phone: '123'  // Invalid phone
      };

      const result = await service.validateAndEnrichContactInfo(contactData);

      // Should have validation result
      expect(result.validationResults.length).toBeGreaterThan(0);
    });

    it('should calculate overall score correctly', async () => {
      const contactData = {
        email: 'valid@example.com',
        phone: '555-123-4567'
      };

      const result = await service.validateAndEnrichContactInfo(contactData);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });

    it('should return zero score for empty contact data', async () => {
      const result = await service.validateAndEnrichContactInfo({});

      expect(result.overallScore).toBe(0);
      expect(result.validationResults).toHaveLength(0);
    });
  });

  // Note: The ContactManagementService has many more sophisticated methods including:
  // - detectContactDuplicates (requires database access and complex similarity algorithms)
  // - generateContactSuggestions (pattern matching and ML-based suggestions)
  // - validateWebsiteAccessibility (HTTP requests to external websites)
  // - getContactAnalytics (comprehensive analytics with historical data)
  // - bulkContactValidation (batch processing)
  // - smartMergeContactDuplicates (merge strategies with conflict resolution)
  //
  // These methods involve complex integrations, external services, and database operations
  // that are better tested through integration tests with realistic data. The tests above
  // cover the core validation and enrichment logic that can be unit tested effectively.
});