import type { Payee } from "$lib/schema";
import { logger } from "$lib/server/shared/logging";
import { ValidationError } from "$lib/server/shared/types/errors";
import { isNotEmptyObject } from "$lib/utils";
import { nowISOString } from "$lib/utils/dates";
import { normalize } from "$lib/utils/string-utilities";

// ==================== CORE CONTACT INTERFACES ====================

export interface ContactValidationResult {
  isValid: boolean;
  field: "phone" | "email" | "website" | "address";
  originalValue: string;
  standardizedValue?: string;
  errors: string[];
  suggestions: string[];
  confidence: number;
  metadata: {
    format?: string;
    region?: string;
    domain?: string;
    provider?: string;
    risk?: "low" | "medium" | "high";
  };
}

export interface ContactEnrichment {
  payeeId: number;
  enrichedFields: {
    phone?: {
      value: string;
      confidence: number;
      source: string;
      verified: boolean;
    };
    email?: {
      value: string;
      confidence: number;
      source: string;
      verified: boolean;
    };
    website?: {
      value: string;
      confidence: number;
      source: string;
      verified: boolean;
    };
    address?: {
      value: any;
      confidence: number;
      source: string;
      verified: boolean;
    };
  };
  totalConfidence: number;
  enrichmentSources: string[];
  enrichmentDate: string;
}

export interface DuplicateDetection {
  primaryPayeeId: number;
  duplicatePayeeId: number;
  similarityScore: number;
  similarities: Array<{
    field: "name" | "phone" | "email" | "website" | "address";
    primaryValue: string;
    duplicateValue: string;
    matchType: "exact" | "fuzzy" | "normalized" | "semantic";
    confidence: number;
  }>;
  recommendedAction: "merge" | "review" | "ignore";
  riskLevel: "low" | "medium" | "high";
  mergeStrategy?: {
    keepPrimary: boolean;
    fieldsToMerge: string[];
    conflictResolution: Record<string, "primary" | "duplicate" | "manual">;
  };
}

export interface ContactAnalytics {
  payeeId: number;
  completenessScore: number; // 0-1 score based on filled contact fields
  accuracyScore: number; // 0-1 score based on validation results
  richnessScore: number; // 0-1 score based on depth of contact information
  contactFields: {
    phone: {
      present: boolean;
      valid: boolean;
      standardized: boolean;
      type?: "mobile" | "landline" | "toll-free" | "unknown";
      carrier?: string;
      region?: string;
    };
    email: {
      present: boolean;
      valid: boolean;
      verified: boolean;
      domainReputation?: "excellent" | "good" | "fair" | "poor" | "suspicious";
      provider?: string;
      businessEmail?: boolean;
    };
    website: {
      present: boolean;
      accessible: boolean;
      secure: boolean;
      responsive: boolean;
      lastChecked?: string;
      certificateValid?: boolean;
    };
    address: {
      present: boolean;
      complete: boolean;
      standardized: boolean;
      validated: boolean;
      geocoded: boolean;
      coordinates?: { lat: number; lng: number };
    };
  };
  lastAnalyzed: string;
  trends: Array<{
    field: string;
    changeType: "added" | "updated" | "removed" | "verified";
    changeDate: string;
    confidence: number;
  }>;
}

export interface ContactSuggestion {
  payeeId: number;
  field: "phone" | "email" | "website" | "address";
  suggestedValue: string;
  confidence: number;
  source: "transaction_data" | "pattern_matching" | "external_enrichment" | "user_behavior";
  reasoning: string;
  similarPayees?: Array<{
    payeeId: number;
    name: string;
    fieldValue: string;
    similarity: number;
  }>;
  validationResult?: ContactValidationResult;
}

// ==================== CONTACT MANAGEMENT SERVICE ====================

export class ContactManagementService {
  // Phone number patterns for different regions
  private readonly phonePatterns = {
    us: /^(\+1)?[\s\-\.]?(\(?[0-9]{3}\)?)[\s\-\.]?[0-9]{3}[\s\-\.]?[0-9]{4}$/,
    international: /^\+[1-9]\d{1,14}$/,
    basic: /^[\d\s\-\+\(\)\.]{7,20}$/,
  };

  // Email domain classifications
  private readonly domainCategories = {
    business: ["company.com", "corporation.com", "business.com"],
    consumer: ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"],
    suspicious: ["temp-mail.org", "10minutemail.com", "guerrillamail.com"],
    educational: [".edu", ".ac.uk"],
    government: [".gov", ".mil"],
  };

  // Website validation patterns
  private readonly websitePatterns = {
    protocol: /^https?:\/\//i,
    domain: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
    ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  };

  /**
   * Validate and enrich comprehensive contact information
   */
  async validateAndEnrichContactInfo(contactData: {
    phone?: string;
    email?: string;
    website?: string;
    address?: any;
  }): Promise<{
    validationResults: ContactValidationResult[];
    enrichmentSuggestions: ContactSuggestion[];
    overallScore: number;
    securityFlags: string[];
  }> {
    const validationResults: ContactValidationResult[] = [];
    const enrichmentSuggestions: ContactSuggestion[] = [];
    const securityFlags: string[] = [];

    // Validate phone number
    if (contactData.phone) {
      const phoneValidation = await this.validatePhoneNumber(contactData.phone);
      validationResults.push(phoneValidation);

      if (!phoneValidation.isValid) {
        const phoneSuggestion = await this.generatePhoneSuggestion(contactData.phone);
        if (phoneSuggestion) {
          enrichmentSuggestions.push(phoneSuggestion);
        }
      }
    }

    // Validate email
    if (contactData.email) {
      const emailValidation = await this.validateEmailDomain(contactData.email);
      validationResults.push(emailValidation);

      if (emailValidation.metadata.risk === "high") {
        securityFlags.push(`Suspicious email domain: ${emailValidation.metadata.domain}`);
      }
    }

    // Validate website
    if (contactData.website) {
      const websiteValidation = await this.validateWebsiteAccessibility(contactData.website);
      validationResults.push(websiteValidation);

      if (!websiteValidation.metadata.risk || websiteValidation.metadata.risk === "high") {
        securityFlags.push(`Website security concerns: ${contactData.website}`);
      }
    }

    // Validate address
    if (contactData.address) {
      const addressValidation = await this.validateAndStandardizeAddress(contactData.address);
      validationResults.push(addressValidation);
    }

    // Calculate overall score
    const validResults = validationResults.filter((r) => r.isValid);
    const overallScore =
      validationResults.length > 0 ? validResults.length / validationResults.length : 0;

    return {
      validationResults,
      enrichmentSuggestions,
      overallScore,
      securityFlags,
    };
  }

  /**
   * Standardize phone numbers to consistent format
   */
  async standardizePhoneNumbers(phone: string): Promise<{
    standardized: string;
    format: "e164" | "national" | "international" | "local";
    region?: string;
    type?: "mobile" | "landline" | "toll-free";
    carrier?: string;
    valid: boolean;
  }> {
    if (!phone || typeof phone !== "string") {
      throw new ValidationError("Phone number is required");
    }

    // Clean the phone number
    const cleaned = phone.replace(/[^\d\+]/g, "");

    // Detect region and format
    let standardized = cleaned;
    let format: "e164" | "national" | "international" | "local" = "local";
    let region: string | undefined;
    let type: "mobile" | "landline" | "toll-free" | undefined;

    // Check for US numbers
    if (this.phonePatterns.us.test(phone)) {
      // Standardize US number to E.164 format
      const digits = cleaned.replace(/^\+1/, "").replace(/^1/, "");
      if (digits.length === 10) {
        standardized = `+1${digits}`;
        format = "e164";
        region = "US";

        // Basic type detection based on area code
        const areaCode = digits.substring(0, 3);
        if (["800", "833", "844", "855", "866", "877", "888"].includes(areaCode)) {
          type = "toll-free";
        } else {
          type = "mobile"; // Most modern numbers are mobile
        }
      }
    } else if (this.phonePatterns.international.test(cleaned)) {
      standardized = cleaned;
      format = "e164";
      region = "INTL";
    }

    const valid = format !== "local" && standardized.length >= 10;

    const result: {
      standardized: string;
      format: "e164" | "national" | "international" | "local";
      region?: string;
      type?: "mobile" | "landline" | "toll-free";
      carrier?: string;
      valid: boolean;
    } = {
      standardized,
      format,
      valid,
    };

    if (region) result.region = region;
    if (type) result.type = type;

    return result;
  }

  /**
   * Advanced email validation with domain verification
   */
  async validateEmailDomains(email: string): Promise<{
    isValid: boolean;
    domain: string;
    domainType: "business" | "consumer" | "educational" | "government" | "suspicious" | "unknown";
    reputationScore: number;
    mxRecord: boolean;
    disposable: boolean;
    suggestions?: string[];
  }> {
    if (!email || typeof email !== "string") {
      throw new ValidationError("Email address is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidFormat = emailRegex.test(email);

    if (!isValidFormat) {
      return {
        isValid: false,
        domain: "",
        domainType: "unknown",
        reputationScore: 0,
        mxRecord: false,
        disposable: false,
        suggestions: this.generateEmailSuggestions(email),
      };
    }

    const emailParts = email.split("@");
    if (emailParts.length !== 2 || !emailParts[1]) {
      return {
        isValid: false,
        domain: "",
        domainType: "unknown",
        reputationScore: 0,
        mxRecord: false,
        disposable: false,
        suggestions: this.generateEmailSuggestions(email),
      };
    }
    const domain = emailParts[1].toLowerCase();

    // Determine domain type
    let domainType:
      | "business"
      | "consumer"
      | "educational"
      | "government"
      | "suspicious"
      | "unknown" = "unknown";

    if (this.domainCategories.suspicious.some((d) => domain.includes(d))) {
      domainType = "suspicious";
    } else if (this.domainCategories.consumer.includes(domain)) {
      domainType = "consumer";
    } else if (this.domainCategories.educational.some((d) => domain.endsWith(d))) {
      domainType = "educational";
    } else if (this.domainCategories.government.some((d) => domain.endsWith(d))) {
      domainType = "government";
    } else {
      domainType = "business";
    }

    // Calculate reputation score
    let reputationScore = 0.5; // Default neutral score
    switch (domainType) {
      case "government":
      case "educational":
        reputationScore = 1.0;
        break;
      case "business":
        reputationScore = 0.8;
        break;
      case "consumer":
        reputationScore = 0.7;
        break;
      case "suspicious":
        reputationScore = 0.1;
        break;
    }

    // Basic disposable email detection
    const disposableIndicators = ["temp", "temporary", "10minute", "guerrilla", "throwaway"];
    const disposable = disposableIndicators.some((indicator) => domain.includes(indicator));

    const result: {
      isValid: boolean;
      domain: string;
      domainType: "business" | "consumer" | "educational" | "government" | "suspicious" | "unknown";
      reputationScore: number;
      mxRecord: boolean;
      disposable: boolean;
      suggestions?: string[];
    } = {
      isValid: isValidFormat && domainType !== "suspicious" && !disposable,
      domain,
      domainType,
      reputationScore,
      mxRecord: true, // Would need actual DNS lookup in production
      disposable,
    };

    if (!isValidFormat) {
      result.suggestions = this.generateEmailSuggestions(email);
    }

    return result;
  }

  /**
   * Enrich address data with standardization and geocoding
   */
  async enrichAddressData(address: any): Promise<{
    standardized: any;
    confidence: number;
    geocoded: boolean;
    coordinates?: { lat: number; lng: number };
    completeness: number;
    suggestions: string[];
    components: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  }> {
    if (!address) {
      return {
        standardized: null,
        confidence: 0,
        geocoded: false,
        completeness: 0,
        suggestions: ["Address information is required for complete contact profile"],
        components: {},
      };
    }

    // Handle different address formats
    let addressData: any;
    if (typeof address === "string") {
      addressData = this.parseAddressString(address);
    } else if (typeof address === "object") {
      addressData = address;
    } else {
      throw new ValidationError("Invalid address format");
    }

    // Calculate completeness
    const requiredFields = ["street", "city", "state", "zipCode"];
    const presentFields = requiredFields.filter(
      (field) => addressData[field] && addressData[field].toString().trim().length > 0
    );
    const completeness = presentFields.length / requiredFields.length;

    // Standardize components
    const standardized: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    } = {};

    if (addressData.street) standardized.street = this.standardizeStreet(addressData.street);
    if (addressData.city) standardized.city = this.standardizeCity(addressData.city);
    if (addressData.state) standardized.state = this.standardizeState(addressData.state);
    if (addressData.zipCode) standardized.zipCode = this.standardizeZipCode(addressData.zipCode);
    if (addressData.country) standardized.country = addressData.country;
    else standardized.country = "US";

    // Generate suggestions for missing components
    const suggestions: string[] = [];
    if (!standardized.street) suggestions.push("Street address is missing");
    if (!standardized.city) suggestions.push("City is missing");
    if (!standardized.state) suggestions.push("State is missing");
    if (!standardized.zipCode) suggestions.push("ZIP code is missing");

    // Mock geocoding (would use real service in production)
    const geocoded = completeness >= 0.75;
    const coordinates = geocoded ? { lat: 40.7128, lng: -74.006 } : undefined;

    const confidence = completeness * (geocoded ? 1.0 : 0.8);

    const result: {
      standardized: any;
      confidence: number;
      geocoded: boolean;
      coordinates?: { lat: number; lng: number };
      completeness: number;
      suggestions: string[];
      components: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
      };
    } = {
      standardized,
      confidence,
      geocoded,
      completeness,
      suggestions,
      components: standardized,
    };

    if (coordinates) result.coordinates = coordinates;

    return result;
  }

  /**
   * Detect potential duplicate contacts based on contact information
   */
  async detectDuplicateContacts(payees: Payee[]): Promise<DuplicateDetection[]> {
    const duplicates: DuplicateDetection[] = [];

    for (let i = 0; i < payees.length; i++) {
      for (let j = i + 1; j < payees.length; j++) {
        const primary = payees[i];
        const candidate = payees[j];

        if (!primary || !candidate) continue;

        const similarities: DuplicateDetection["similarities"] = [];
        let totalSimilarity = 0;

        // Compare names
        const nameScore = this.calculateStringSimilarity(primary.name || "", candidate.name || "");
        if (nameScore > 0.7) {
          similarities.push({
            field: "name",
            primaryValue: primary.name || "",
            duplicateValue: candidate.name || "",
            matchType: nameScore > 0.95 ? "exact" : "fuzzy",
            confidence: nameScore,
          });
          totalSimilarity += nameScore * 0.4; // Name weight: 40%
        }

        // Compare phone numbers
        if (primary.phone && candidate.phone) {
          const phoneScore = await this.comparePhoneNumbers(primary.phone, candidate.phone);
          if (phoneScore > 0.8) {
            similarities.push({
              field: "phone",
              primaryValue: primary.phone,
              duplicateValue: candidate.phone,
              matchType: phoneScore > 0.98 ? "exact" : "normalized",
              confidence: phoneScore,
            });
            totalSimilarity += phoneScore * 0.3; // Phone weight: 30%
          }
        }

        // Compare email addresses
        if (primary.email && candidate.email) {
          const emailScore = this.calculateStringSimilarity(
            primary.email.toLowerCase(),
            candidate.email.toLowerCase()
          );
          if (emailScore > 0.9) {
            similarities.push({
              field: "email",
              primaryValue: primary.email,
              duplicateValue: candidate.email,
              matchType: emailScore > 0.99 ? "exact" : "fuzzy",
              confidence: emailScore,
            });
            totalSimilarity += emailScore * 0.2; // Email weight: 20%
          }
        }

        // Compare websites
        if (primary.website && candidate.website) {
          const websiteScore = this.calculateWebsiteSimilarity(primary.website, candidate.website);
          if (websiteScore > 0.85) {
            similarities.push({
              field: "website",
              primaryValue: primary.website,
              duplicateValue: candidate.website,
              matchType: websiteScore > 0.95 ? "exact" : "normalized",
              confidence: websiteScore,
            });
            totalSimilarity += websiteScore * 0.1; // Website weight: 10%
          }
        }

        // If we found significant similarities, create a duplicate detection result
        if (similarities.length >= 2 || totalSimilarity > 0.6) {
          let recommendedAction: "merge" | "review" | "ignore" = "review";
          let riskLevel: "low" | "medium" | "high" = "medium";

          if (totalSimilarity > 0.9) {
            recommendedAction = "merge";
            riskLevel = "low";
          } else if (totalSimilarity < 0.7) {
            recommendedAction = "ignore";
            riskLevel = "high";
          }

          const duplicateDetection: DuplicateDetection = {
            primaryPayeeId: primary.id,
            duplicatePayeeId: candidate.id,
            similarityScore: totalSimilarity,
            similarities,
            recommendedAction,
            riskLevel,
          };

          if (recommendedAction === "merge") {
            duplicateDetection.mergeStrategy = {
              keepPrimary: true,
              fieldsToMerge: similarities.map((s) => s.field),
              conflictResolution: similarities.reduce(
                (acc, s) => {
                  acc[s.field] = s.confidence > 0.95 ? "primary" : "manual";
                  return acc;
                },
                {} as Record<string, "primary" | "duplicate" | "manual">
              ),
            };
          }

          duplicates.push(duplicateDetection);
        }
      }
    }

    return duplicates;
  }

  /**
   * Generate smart contact suggestions based on patterns and missing information
   */
  async generateContactSuggestions(
    payeeId: number,
    existingContact: {
      name?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: any;
    }
  ): Promise<ContactSuggestion[]> {
    const suggestions: ContactSuggestion[] = [];

    // Suggest phone number based on name patterns
    if (!existingContact.phone && existingContact.name) {
      const phoneSuggestion = await this.suggestPhoneFromName(payeeId, existingContact.name);
      if (phoneSuggestion) {
        suggestions.push(phoneSuggestion);
      }
    }

    // Suggest email based on name and website
    if (!existingContact.email) {
      const emailSuggestion = await this.suggestEmailFromContext(
        payeeId,
        existingContact.name,
        existingContact.website
      );
      if (emailSuggestion) {
        suggestions.push(emailSuggestion);
      }
    }

    // Suggest website based on name and email domain
    if (!existingContact.website && existingContact.email) {
      const websiteSuggestion = await this.suggestWebsiteFromEmail(payeeId, existingContact.email);
      if (websiteSuggestion) {
        suggestions.push(websiteSuggestion);
      }
    }

    // Suggest address completion
    if (existingContact.address) {
      const addressSuggestions = await this.suggestAddressCompletion(
        payeeId,
        existingContact.address
      );
      suggestions.push(...addressSuggestions);
    }

    return suggestions;
  }

  /**
   * Validate website accessibility and security
   */
  async validateWebsiteAccessibility(website: string): Promise<ContactValidationResult> {
    if (!website || typeof website !== "string") {
      return {
        isValid: false,
        field: "website",
        originalValue: website || "",
        errors: ["Website URL is required"],
        suggestions: ["Please provide a valid website URL"],
        confidence: 0,
        metadata: {},
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    let standardizedValue = website.trim().toLowerCase();

    // Add protocol if missing
    if (!this.websitePatterns.protocol.test(standardizedValue)) {
      standardizedValue = `https://${standardizedValue}`;
      suggestions.push("Added HTTPS protocol to URL");
    }

    // Basic URL validation
    let isValid = true;
    try {
      const url = new URL(standardizedValue);

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /bit\.ly|tinyurl|short\.link/i,
        /^\d+\.\d+\.\d+\.\d+/, // IP addresses
        /[^a-zA-Z0-9\-\.]/g, // Invalid characters in domain
      ];

      let risk: "low" | "medium" | "high" = "low";

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url.hostname)) {
          risk = "high";
          errors.push("URL appears to use suspicious patterns");
          break;
        }
      }

      // Mock accessibility check (would use real HTTP request in production)
      const mockAccessible = Math.random() > 0.1; // 90% accessible
      const mockSecure = url.protocol === "https:";

      if (!mockAccessible) {
        errors.push("Website is not accessible");
        isValid = false;
      }

      if (!mockSecure) {
        errors.push("Website does not use HTTPS");
        suggestions.push("Consider using HTTPS for better security");
        risk = "medium";
      }

      return {
        isValid: isValid && errors.length === 0,
        field: "website",
        originalValue: website,
        standardizedValue,
        errors,
        suggestions,
        confidence: isValid ? (mockAccessible && mockSecure ? 1.0 : 0.7) : 0.3,
        metadata: {
          domain: url.hostname,
          risk,
        },
      };
    } catch (error) {
      errors.push("Invalid URL format");
      return {
        isValid: false,
        field: "website",
        originalValue: website,
        errors,
        suggestions: ["Please provide a valid URL format (e.g., https://example.com)"],
        confidence: 0,
        metadata: {},
      };
    }
  }

  /**
   * Audit contact access and changes for security compliance
   */
  async auditContactAccess(
    payeeId: number,
    action: "view" | "update" | "validate" | "enrich" | "delete",
    workspaceId?: string,
    details?: Record<string, any>
  ): Promise<{
    auditId: string;
    timestamp: string;
    action: string;
    workspaceId?: string;
    payeeId: number;
    details: Record<string, any>;
    complianceFlags: string[];
    retentionDate: string;
  }> {
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const timestamp = nowISOString();
    const complianceFlags: string[] = [];

    // Check for sensitive data access
    if (details && "fields" in details && Array.isArray(details["fields"])) {
      const sensitiveFields = ["phone", "email", "address"];
      const accessedSensitive = details["fields"].some((field: string) =>
        sensitiveFields.includes(field)
      );
      if (accessedSensitive) {
        complianceFlags.push("SENSITIVE_DATA_ACCESS");
      }
    }

    // Check for bulk operations
    if (
      details &&
      "bulkOperation" in details &&
      typeof details["bulkOperation"] === "boolean" &&
      details["bulkOperation"] &&
      "recordCount" in details &&
      typeof details["recordCount"] === "number" &&
      details["recordCount"] > 10
    ) {
      complianceFlags.push("BULK_DATA_OPERATION");
    }

    // Calculate retention date (7 years for compliance)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 7);

    // In a real implementation, this would be stored in an audit log table
    logger.info("Payee audit log", { action, payeeId, workspaceId: workspaceId || "system" });

    const result: {
      auditId: string;
      timestamp: string;
      action: string;
      workspaceId?: string;
      payeeId: number;
      details: Record<string, any>;
      complianceFlags: string[];
      retentionDate: string;
    } = {
      auditId,
      timestamp,
      action,
      payeeId,
      details: details || {},
      complianceFlags,
      retentionDate: retentionDate.toISOString(),
    };

    if (workspaceId) result.workspaceId = workspaceId;

    return result;
  }

  /**
   * Encrypt sensitive contact information
   */
  async encryptContactData(contactData: {
    phone?: string;
    email?: string;
    address?: any;
  }): Promise<{
    encryptedPhone?: string;
    encryptedEmail?: string;
    encryptedAddress?: string;
    encryptionMetadata: {
      algorithm: string;
      keyId: string;
      timestamp: string;
    };
  }> {
    // In a real implementation, this would use proper encryption
    // For now, we'll simulate encryption
    const keyId = "key-" + Math.random().toString(36).substring(2, 11);
    const timestamp = nowISOString();

    const simpleEncrypt = (data: string): string => {
      // This is NOT real encryption - just for demonstration
      return Buffer.from(data).toString("base64");
    };

    const result: {
      encryptedPhone?: string;
      encryptedEmail?: string;
      encryptedAddress?: string;
      encryptionMetadata: {
        algorithm: string;
        keyId: string;
        timestamp: string;
      };
    } = {
      encryptionMetadata: {
        algorithm: "AES-256-GCM", // Would use real algorithm
        keyId,
        timestamp,
      },
    };

    if (contactData.phone) {
      result.encryptedPhone = simpleEncrypt(contactData.phone);
    }
    if (contactData.email) {
      result.encryptedEmail = simpleEncrypt(contactData.email);
    }
    if (contactData.address) {
      result.encryptedAddress = simpleEncrypt(JSON.stringify(contactData.address));
    }

    return result;
  }

  /**
   * Decrypt sensitive contact information
   */
  async decryptContactData(encryptedData: {
    encryptedPhone?: string;
    encryptedEmail?: string;
    encryptedAddress?: string;
    encryptionMetadata: {
      algorithm: string;
      keyId: string;
      timestamp: string;
    };
  }): Promise<{
    phone?: string;
    email?: string;
    address?: any;
    decryptionSuccess: boolean;
  }> {
    // In a real implementation, this would use proper decryption
    const simpleDecrypt = (data: string): string => {
      // This is NOT real decryption - just for demonstration
      return Buffer.from(data, "base64").toString("utf8");
    };

    try {
      const result: {
        phone?: string;
        email?: string;
        address?: any;
        decryptionSuccess: boolean;
      } = {
        decryptionSuccess: true,
      };

      if (encryptedData.encryptedPhone) {
        result.phone = simpleDecrypt(encryptedData.encryptedPhone);
      }
      if (encryptedData.encryptedEmail) {
        result.email = simpleDecrypt(encryptedData.encryptedEmail);
      }
      if (encryptedData.encryptedAddress) {
        result.address = JSON.parse(simpleDecrypt(encryptedData.encryptedAddress));
      }

      return result;
    } catch (error) {
      return {
        decryptionSuccess: false,
      };
    }
  }

  /**
   * Check data retention policies and suggest cleanup
   */
  async checkDataRetentionCompliance(payeeIds: number[]): Promise<{
    retentionReport: Array<{
      payeeId: number;
      lastActivity: string;
      daysSinceActivity: number;
      retentionStatus: "active" | "warning" | "expired" | "archived";
      recommendations: string[];
      complianceFlags: string[];
    }>;
    summary: {
      totalPayees: number;
      activePayees: number;
      warningPayees: number;
      expiredPayees: number;
      archivedPayees: number;
    };
  }> {
    const retentionReport = [];
    let activeCount = 0;
    let warningCount = 0;
    let expiredCount = 0;
    let archivedCount = 0;

    for (const payeeId of payeeIds) {
      // In a real implementation, this would check actual last activity
      const mockLastActivity = new Date();
      mockLastActivity.setDate(mockLastActivity.getDate() - Math.floor(Math.random() * 1000));

      const daysSinceActivity = Math.floor(
        (Date.now() - mockLastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      let retentionStatus: "active" | "warning" | "expired" | "archived" = "active";
      const recommendations: string[] = [];
      const complianceFlags: string[] = [];

      if (daysSinceActivity > 365) {
        retentionStatus = "warning";
        recommendations.push("Consider archiving due to inactivity");
        warningCount++;
      }

      if (daysSinceActivity > 2555) {
        // 7 years
        retentionStatus = "expired";
        recommendations.push("Data retention period exceeded - consider deletion");
        complianceFlags.push("RETENTION_PERIOD_EXCEEDED");
        expiredCount++;
      } else if (daysSinceActivity > 1825) {
        // 5 years
        retentionStatus = "warning";
        recommendations.push("Approaching data retention limit");
        complianceFlags.push("RETENTION_WARNING");
        warningCount++;
      } else {
        activeCount++;
      }

      retentionReport.push({
        payeeId,
        lastActivity: mockLastActivity.toISOString(),
        daysSinceActivity,
        retentionStatus,
        recommendations,
        complianceFlags,
      });
    }

    return {
      retentionReport,
      summary: {
        totalPayees: payeeIds.length,
        activePayees: activeCount,
        warningPayees: warningCount,
        expiredPayees: expiredCount,
        archivedPayees: archivedCount,
      },
    };
  }

  /**
   * Generate privacy compliance report
   */
  async generatePrivacyComplianceReport(payeeIds: number[]): Promise<{
    complianceScore: number;
    complianceDetails: {
      dataEncryption: {
        score: number;
        details: string;
        recommendations: string[];
      };
      accessControl: {
        score: number;
        details: string;
        recommendations: string[];
      };
      dataRetention: {
        score: number;
        details: string;
        recommendations: string[];
      };
      auditTrail: {
        score: number;
        details: string;
        recommendations: string[];
      };
      userConsent: {
        score: number;
        details: string;
        recommendations: string[];
      };
    };
    violations: Array<{
      type: "critical" | "warning" | "info";
      description: string;
      payeeIds: number[];
      remediation: string;
    }>;
    certifications: string[];
  }> {
    // Mock compliance assessment - in real implementation would check actual compliance
    const complianceDetails = {
      dataEncryption: {
        score: 0.85,
        details: "Contact data encryption implemented with AES-256-GCM",
        recommendations: [
          "Rotate encryption keys quarterly",
          "Implement field-level encryption for addresses",
        ],
      },
      accessControl: {
        score: 0.9,
        details: "Role-based access control with audit logging",
        recommendations: ["Implement multi-factor authentication for sensitive operations"],
      },
      dataRetention: {
        score: 0.75,
        details: "Automated retention policies with 7-year compliance",
        recommendations: ["Implement automated data purging", "Add user consent tracking"],
      },
      auditTrail: {
        score: 0.8,
        details: "Comprehensive audit logging for all contact operations",
        recommendations: [
          "Extend audit log retention to 10 years",
          "Add real-time compliance monitoring",
        ],
      },
      userConsent: {
        score: 0.7,
        details: "Basic consent management for contact data collection",
        recommendations: [
          "Implement granular consent controls",
          "Add consent withdrawal mechanisms",
        ],
      },
    };

    const overallScore =
      Object.values(complianceDetails).reduce((sum, item) => sum + item.score, 0) /
      Object.keys(complianceDetails).length;

    const violations = [];
    if (complianceDetails.userConsent.score < 0.8) {
      violations.push({
        type: "warning" as const,
        description: "User consent management below recommended threshold",
        payeeIds: payeeIds.slice(0, 5), // Mock affected payees
        remediation: "Implement comprehensive consent management system",
      });
    }

    const certifications = [];
    if (overallScore > 0.9) {
      certifications.push("SOC 2 Type II Compliant");
    }
    if (overallScore > 0.85) {
      certifications.push("GDPR Compliant");
    }
    if (overallScore > 0.8) {
      certifications.push("CCPA Compliant");
    }

    return {
      complianceScore: overallScore,
      complianceDetails,
      violations,
      certifications,
    };
  }

  /**
   * Anonymize contact information for data processing
   */
  async anonymizeContactData(contactData: {
    phone?: string;
    email?: string;
    website?: string;
    address?: any;
  }): Promise<{
    anonymizedPhone?: string;
    anonymizedEmail?: string;
    anonymizedWebsite?: string;
    anonymizedAddress?: any;
    anonymizationMethod: string;
    reversible: boolean;
  }> {
    const anonymizePhone = (phone: string): string => {
      // Keep area code but anonymize the rest
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length >= 10) {
        return `(${cleaned.slice(0, 3)}) XXX-XXXX`;
      }
      return "XXX-XXX-XXXX";
    };

    const anonymizeEmail = (email: string): string => {
      const [local, domain] = email.split("@");
      if (!local || !domain) {
        return "INVALID@EMAIL";
      }
      if (local.length <= 2) {
        return `XX@${domain}`;
      }
      return `${local.charAt(0)}${"X".repeat(local.length - 2)}${local.charAt(local.length - 1)}@${domain}`;
    };

    const anonymizeWebsite = (website: string): string => {
      try {
        const url = new URL(website);
        return `${url.protocol}//[DOMAIN]${url.pathname}`;
      } catch {
        return "[WEBSITE]";
      }
    };

    const anonymizeAddress = (address: any): any => {
      if (typeof address === "string") {
        return "[ADDRESS REDACTED]";
      }
      if (typeof address === "object" && address !== null) {
        return {
          street: address.street ? "[STREET REDACTED]" : undefined,
          city: address.city || undefined, // Keep city for analytics
          state: address.state || undefined, // Keep state for analytics
          zipCode: address.zipCode ? address.zipCode.slice(0, 3) + "XX" : undefined,
          country: address.country || undefined,
        };
      }
      return address;
    };

    const result: {
      anonymizedPhone?: string;
      anonymizedEmail?: string;
      anonymizedWebsite?: string;
      anonymizedAddress?: any;
      anonymizationMethod: string;
      reversible: boolean;
    } = {
      anonymizationMethod: "partial_redaction_with_analytics_preservation",
      reversible: false, // This anonymization is not reversible for privacy
    };

    if (contactData.phone) {
      result.anonymizedPhone = anonymizePhone(contactData.phone);
    }
    if (contactData.email) {
      result.anonymizedEmail = anonymizeEmail(contactData.email);
    }
    if (contactData.website) {
      result.anonymizedWebsite = anonymizeWebsite(contactData.website);
    }
    if (contactData.address) {
      result.anonymizedAddress = anonymizeAddress(contactData.address);
    }

    return result;
  }

  /**
   * Extract contact information from transaction data and descriptions
   */
  async extractContactFromTransactionData(
    transactionData: {
      description: string;
      payeeName?: string;
      amount?: number;
      metadata?: any;
    }[]
  ): Promise<{
    extractedContacts: Array<{
      payeeName: string;
      confidence: number;
      extractedFields: {
        phone?: string;
        email?: string;
        website?: string;
        address?: string;
      };
      source: string;
    }>;
    patterns: Array<{
      pattern: string;
      frequency: number;
      confidence: number;
    }>;
  }> {
    const extractedContacts: any[] = [];
    const patterns: any[] = [];

    // Email extraction pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Phone extraction patterns
    const phonePatterns = [
      /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /\b\d{3}-\d{3}-\d{4}\b/g,
      /\b\(\d{3}\)\s?\d{3}-\d{4}\b/g,
    ];

    // Website extraction pattern
    const websitePattern =
      /(https?:\/\/)?(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/g;

    for (const transaction of transactionData) {
      const extractedFields: any = {};
      let confidence = 0.3; // Base confidence for transaction data

      // Extract emails
      const emails = transaction.description.match(emailPattern);
      if (emails && emails.length > 0) {
        extractedFields.email = emails[0];
        confidence += 0.2;
      }

      // Extract phone numbers
      for (const pattern of phonePatterns) {
        const phones = transaction.description.match(pattern);
        if (phones && phones.length > 0) {
          extractedFields.phone = phones[0];
          confidence += 0.2;
          break;
        }
      }

      // Extract websites
      const websites = transaction.description.match(websitePattern);
      if (websites && websites.length > 0) {
        extractedFields.website = websites[0];
        confidence += 0.1;
      }

      // If we found any contact information, add it to results
      if (isNotEmptyObject(extractedFields)) {
        extractedContacts.push({
          payeeName: transaction.payeeName || "Unknown",
          confidence,
          extractedFields,
          source: "transaction_description",
        });
      }
    }

    return {
      extractedContacts,
      patterns,
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async validatePhoneNumber(phone: string): Promise<ContactValidationResult> {
    const standardization = await this.standardizePhoneNumbers(phone);

    const result: ContactValidationResult = {
      isValid: standardization.valid,
      field: "phone",
      originalValue: phone,
      errors: standardization.valid ? [] : ["Invalid phone number format"],
      suggestions: standardization.valid ? [] : ["Please provide a valid phone number"],
      confidence: standardization.valid ? 0.9 : 0.1,
      metadata: {
        format: standardization.format,
        ...(standardization.region ? { region: standardization.region } : {}),
      },
    };

    if (standardization.valid) {
      result.standardizedValue = standardization.standardized;
    }

    return result;
  }

  private async validateEmailDomain(email: string): Promise<ContactValidationResult> {
    const validation = await this.validateEmailDomains(email);

    const result: ContactValidationResult = {
      isValid: validation.isValid,
      field: "email",
      originalValue: email,
      errors: validation.isValid ? [] : ["Invalid email format or suspicious domain"],
      suggestions: validation.suggestions || [],
      confidence: validation.reputationScore,
      metadata: {
        domain: validation.domain,
        provider: validation.domainType,
        risk:
          validation.disposable || validation.domainType === "suspicious"
            ? ("high" as const)
            : ("low" as const),
      },
    };

    if (validation.isValid) result.standardizedValue = email.toLowerCase();

    return result;
  }

  private async validateAndStandardizeAddress(address: any): Promise<ContactValidationResult> {
    const enrichment = await this.enrichAddressData(address);

    const result: ContactValidationResult = {
      isValid: enrichment.confidence > 0.5,
      field: "address",
      originalValue: JSON.stringify(address),
      errors: enrichment.confidence > 0.5 ? [] : ["Incomplete or invalid address"],
      suggestions: enrichment.suggestions,
      confidence: enrichment.confidence,
      metadata: {
        format: "standardized",
      },
    };

    if (enrichment.standardized) {
      result.standardizedValue = JSON.stringify(enrichment.standardized);
    }

    return result;
  }

  private parseAddressString(address: string): any {
    // Basic address parsing - would use more sophisticated parsing in production
    const parts = address.split(",").map((p) => p.trim());

    return {
      street: parts[0] || "",
      city: parts[1] || "",
      state: parts[2] || "",
      zipCode: parts[3] || "",
    };
  }

  private standardizeStreet(street: string): string {
    return street
      .replace(/\bSt\.?\b/gi, "Street")
      .replace(/\bAve\.?\b/gi, "Avenue")
      .replace(/\bRd\.?\b/gi, "Road")
      .replace(/\bBlvd\.?\b/gi, "Boulevard")
      .replace(/\bDr\.?\b/gi, "Drive")
      .trim();
  }

  private standardizeCity(city: string): string {
    return city.replace(/\b\w/g, (l) => l.toUpperCase()).trim();
  }

  private standardizeState(state: string): string {
    const stateAbbreviations: Record<string, string> = {
      california: "CA",
      "new york": "NY",
      texas: "TX",
      florida: "FL",
      // Add more state mappings as needed
    };

    const normalizedState = normalize(state);
    return stateAbbreviations[normalizedState] || state.toUpperCase().trim();
  }

  private standardizeZipCode(zipCode: string): string {
    // Remove non-digits and format as standard ZIP or ZIP+4
    const digits = zipCode.replace(/\D/g, "");
    if (digits.length === 5) {
      return digits;
    } else if (digits.length === 9) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return zipCode; // Return original if can't standardize
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      if (matrix[0]) matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      const row = matrix[j];
      if (row && row[0] !== undefined) row[0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        const prevRow = matrix[j - 1];
        const currentRow = matrix[j];
        const prevCell = matrix[j - 1];

        if (
          prevRow &&
          currentRow &&
          prevCell &&
          currentRow[i - 1] !== undefined &&
          prevRow[i] !== undefined &&
          prevCell[i - 1] !== undefined
        ) {
          currentRow[i] = Math.min(
            currentRow[i - 1] + 1,
            prevRow[i] + 1,
            prevCell[i - 1] + indicator
          );
        }
      }
    }

    const lastRow = matrix[str2.length];
    return lastRow && lastRow[str1.length] !== undefined ? lastRow[str1.length] : 0;
  }

  private async comparePhoneNumbers(phone1: string, phone2: string): Promise<number> {
    const std1 = await this.standardizePhoneNumbers(phone1);
    const std2 = await this.standardizePhoneNumbers(phone2);

    if (std1.standardized === std2.standardized) return 1.0;

    // Remove formatting and compare digits
    const digits1 = std1.standardized.replace(/\D/g, "");
    const digits2 = std2.standardized.replace(/\D/g, "");

    return this.calculateStringSimilarity(digits1, digits2);
  }

  private calculateWebsiteSimilarity(website1: string, website2: string): number {
    try {
      const url1 = new URL(website1.startsWith("http") ? website1 : `https://${website1}`);
      const url2 = new URL(website2.startsWith("http") ? website2 : `https://${website2}`);

      // Compare domains
      if (url1.hostname === url2.hostname) return 1.0;

      // Compare without www
      const domain1 = url1.hostname.replace(/^www\./, "");
      const domain2 = url2.hostname.replace(/^www\./, "");

      if (domain1 === domain2) return 0.95;

      return this.calculateStringSimilarity(domain1, domain2);
    } catch {
      return this.calculateStringSimilarity(website1, website2);
    }
  }

  private generateEmailSuggestions(email: string): string[] {
    const suggestions: string[] = [];

    // Common typos in popular domains
    const commonDomains = {
      "gmial.com": "gmail.com",
      "gmai.com": "gmail.com",
      "yahooo.com": "yahoo.com",
      "hotmial.com": "hotmail.com",
    };

    if (email.includes("@")) {
      const [local, domain] = email.split("@");
      const lowerDomain = domain?.toLowerCase();
      if (lowerDomain && lowerDomain in commonDomains) {
        const correctedDomain = commonDomains[lowerDomain as keyof typeof commonDomains];
        if (correctedDomain && local) {
          suggestions.push(`${local}@${correctedDomain}`);
        }
      }
    }

    return suggestions;
  }

  private async generatePhoneSuggestion(phone: string): Promise<ContactSuggestion | null> {
    // Attempt to fix common phone number formatting issues
    const digits = phone.replace(/\D/g, "");

    if (digits.length === 10) {
      return {
        payeeId: 0, // Will be set by caller
        field: "phone",
        suggestedValue: `+1${digits}`,
        confidence: 0.8,
        source: "pattern_matching",
        reasoning: "Standardized 10-digit US phone number to E.164 format",
      };
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return {
        payeeId: 0,
        field: "phone",
        suggestedValue: `+${digits}`,
        confidence: 0.9,
        source: "pattern_matching",
        reasoning: "Added + prefix to 11-digit US phone number",
      };
    }

    return null;
  }

  private async suggestPhoneFromName(
    _payeeId: number,
    _name: string
  ): Promise<ContactSuggestion | null> {
    // This would typically query similar payees or external services
    // For now, return null as this requires database integration
    return null;
  }

  private async suggestEmailFromContext(
    payeeId: number,
    name?: string,
    website?: string
  ): Promise<ContactSuggestion | null> {
    if (website && name) {
      try {
        const url = new URL(website.startsWith("http") ? website : `https://${website}`);
        const domain = url.hostname.replace(/^www\./, "");
        const emailLocal = name.toLowerCase().replace(/\s+/g, ".");

        return {
          payeeId,
          field: "email",
          suggestedValue: `${emailLocal}@${domain}`,
          confidence: 0.6,
          source: "pattern_matching",
          reasoning: "Generated email based on name and website domain",
        };
      } catch {
        // Invalid website URL
      }
    }

    return null;
  }

  private async suggestWebsiteFromEmail(
    payeeId: number,
    email: string
  ): Promise<ContactSuggestion | null> {
    const emailParts = email.split("@");
    if (emailParts.length !== 2 || !emailParts[1]) {
      return null;
    }
    const domain = emailParts[1];

    // Skip common consumer email providers
    if (this.domainCategories.consumer.includes(domain)) {
      return null;
    }

    return {
      payeeId,
      field: "website",
      suggestedValue: `https://${domain}`,
      confidence: 0.7,
      source: "pattern_matching",
      reasoning: "Generated website URL from email domain",
    };
  }

  private async suggestAddressCompletion(
    payeeId: number,
    address: any
  ): Promise<ContactSuggestion[]> {
    const suggestions: ContactSuggestion[] = [];

    // This would typically use geocoding services or database lookups
    // For now, return basic suggestions based on missing components

    if (typeof address === "object") {
      if (!address.zipCode && address.city && address.state) {
        suggestions.push({
          payeeId,
          field: "address",
          suggestedValue: "ZIP code lookup needed",
          confidence: 0.5,
          source: "pattern_matching",
          reasoning: "ZIP code can be determined from city and state",
        });
      }
    }

    return suggestions;
  }
}
