# Feature: User Profile & Tax Intelligence

## Overview
Gather user profile information to intelligently set tax-deductible defaults for categories based on their employment status, occupation, and life situation.

## User Profile Data to Collect

### Employment & Business
- **Employment Status**
  - W-2 Employee (full-time/part-time)
  - Self-employed / Freelancer
  - Business Owner
  - Contractor (1099)
  - Unemployed
  - Retired
  - Student

- **Industry/Occupation**
  - Technology
  - Healthcare
  - Education
  - Retail
  - Construction
  - Creative/Arts
  - Finance
  - Real Estate
  - Other (free text)

- **Business Type** (if self-employed/business owner)
  - Sole Proprietorship
  - LLC
  - S-Corp
  - C-Corp
  - Partnership

### Education & Life Stage
- **Student Status**
  - Not a student
  - Part-time student
  - Full-time student
  - Graduate student

- **Education Type** (if student)
  - Undergraduate
  - Graduate/Professional
  - Vocational/Trade
  - Continuing Education

### Housing & Family
- **Homeowner Status**
  - Rent
  - Own (with mortgage)
  - Own (no mortgage)

- **Family Status**
  - Single
  - Married
  - Head of Household
  - Dependents (number)

## Tax Deductibility Rules

### Business Expenses
**When to mark as tax deductible:**
- User is self-employed, freelancer, contractor, or business owner
- Categories affected:
  - Office Supplies
  - Software & Subscriptions
  - Business Expenses (parent category)

### Education Expenses
**When to mark as tax deductible:**
- User is enrolled as a student (part-time or full-time)
- Categories affected:
  - Tuition (keep as deductible - generally qualifies)
  - Books & Supplies (mark deductible for students)
  - Online Courses (mark deductible for qualified programs)

### Medical Expenses
**Always keep as potentially deductible:**
- Medical expenses can be deductible if they exceed 7.5% of AGI
- Keep these marked as deductible by default:
  - Health Insurance
  - Medical Expenses
  - Prescriptions
  - Dental

### Mortgage Interest
**When to mark as tax deductible:**
- User owns a home with a mortgage
- Category: Mortgage Interest (add this category if homeowner)

### Home Office
**When to mark as tax deductible:**
- User is self-employed or business owner
- User works from home
- Category: Home Office (add with special tax category)

## Implementation Plan

### Phase 1: User Profile Schema
1. Create user profile table/schema
2. Add profile fields for employment, education, housing
3. Create migration

### Phase 2: Onboarding Flow
1. Create user profile setup wizard
2. Make it optional but encouraged
3. Show during first login or account setup
4. Allow users to skip and set up later

### Phase 3: Tax Intelligence Service
1. Create service to determine tax deductibility based on profile
2. Apply rules when user adds categories
3. Update existing categories when profile changes
4. Show explanations/tooltips about why categories are marked deductible

### Phase 4: Smart Defaults
1. When seeding default categories, apply user's profile
2. Show indicators in the category selector for tax-deductible items
3. Add "Recommended for you" section based on profile

### Phase 5: Tax Insights
1. Show tax summary dashboard
2. Estimate potential deductions
3. Generate tax reports
4. Export for tax preparation software

## UI/UX Considerations

### Profile Setup
- Use a multi-step wizard
- Explain why we're asking for each piece of information
- Show preview of how it affects their categories
- Allow "I'm not sure" / "Skip" options

### Category Management
- Show tax indicator badge on categories
- Tooltip explaining why a category is/isn't deductible
- Allow manual override
- Warning when changing tax status

### Privacy
- Clearly explain data usage
- Store locally (no external sharing)
- Allow profile deletion
- Optional feature

## Future Enhancements
- Integration with tax software APIs
- State-specific tax rules
- International tax support
- Business expense tracking with receipt upload
- Mileage tracking for business use
- Estimated quarterly tax payments

## Notes
- Keep tax deductibility rules conservative (default to false for ambiguous cases)
- Provide educational tooltips/links to IRS resources
- Update rules annually as tax laws change
- Consider adding a "Tax Professional Review" warning/disclaimer
- This is guidance only - users should consult tax professionals
