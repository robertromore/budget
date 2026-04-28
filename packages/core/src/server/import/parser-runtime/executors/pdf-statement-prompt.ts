/**
 * User-facing extraction prompt for the BYOA ("paste from external AI")
 * mode of the bulk-import flow.
 *
 * Lives next to `pdf-statement-extraction.ts` so it stays adjacent to
 * the Zod schema it mirrors. When the schema in that file changes,
 * the prompt here needs the matching update — there's no automatic
 * link, but the proximity makes the requirement obvious.
 *
 * Why a hand-written constant rather than generated from Zod:
 *   - LLMs do better with prose + an inlined example than with a
 *     formal JSON Schema.
 *   - The user sees this verbatim when they click "Copy prompt".
 *     It needs to read naturally for a human, not just be valid.
 */

export const STATEMENT_EXTRACTION_PROMPT = `You are extracting a single financial statement (one PDF) into structured JSON for an external import tool. The user will give you the statement; you reply with JSON only.

Return ONE JSON object matching this shape exactly. Do NOT wrap it in markdown fences. Do NOT add commentary before or after.

{
  "header": {
    "institution": string | null,
    "accountNumberLast4": string | null,
    "accountType": "checking" | "savings" | "credit_card" | "loan" | "investment" | "hsa" | "cash" | "utility" | "other" | null,
    "accountName": string | null,
    "statementPeriodStart": string | null,
    "statementPeriodEnd": string | null,
    "openingBalance": number | null,
    "closingBalance": number | null,
    "currency": string | null,
    "portalUrl": string | null,
    "statementCycleDay": number | null,
    "loanSubtype": "mortgage" | "auto" | "student" | "personal" | "heloc" | "other_loan" | null,
    "originalPrincipal": number | null,
    "escrowBalance": number | null,
    "maturityDate": string | null,
    "vestedBalance": number | null
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": number,
      "payee": string,
      "notes": string,
      "category": string
    }
  ]
}

Field guide (header):
- institution: bank or card issuer as printed (e.g. "Chase", "American Express"). Null if not shown.
- accountNumberLast4: last 4 digits if shown, else any masked or partial reference up to 32 chars (e.g. "1234", "5915-75"). Null if no account number is shown.
- accountType: best inference from statement context. Null if unclear.
- accountName: display name shown for the account (e.g. "Chase Total Checking", "Sapphire Preferred"). Null if not present.
- statementPeriodStart / statementPeriodEnd: YYYY-MM-DD. Null if not shown.
- openingBalance / closingBalance: signed numbers. For credit cards, "previous balance" is the opening balance and "new balance" is the closing balance.
- currency: ISO 4217 (e.g. "USD"). Null if not shown.
- portalUrl: URL of the institution's portal as printed (e.g. "https://www.chase.com/amazon"). Null if not shown.
- statementCycleDay: integer 1-31 — day of month the statement closes (derive from statementPeriodEnd if not stated explicitly).
- loanSubtype: only set for loan statements. Null otherwise.
- originalPrincipal: original loan amount at origination. Loan-only. Null otherwise.
- escrowBalance: mortgage escrow balance held by the servicer. Mortgage-only. Null otherwise.
- maturityDate: YYYY-MM-DD. If only month/year is shown (e.g. "07/2053"), use the first day of that month. Null otherwise.
- vestedBalance: vested portion for 401(k)-style plans with employer matching. Null otherwise.

Field guide (transactions):
- date: YYYY-MM-DD. Resolve relative dates (e.g. "02/14") against the statement period.
- amount: signed.
  - Negative for charges, debits, withdrawals, outflows.
  - Positive for credits, deposits, payments-received, refunds.
  - For credit cards: purchases NEGATIVE, payments toward the card POSITIVE.
- payee: merchant or counter-party name, cleaned of transaction codes / store numbers when reasonable.
- notes: optional. Any additional description / memo not already in payee. Omit if empty.
- category: optional. Use only if the statement itself prints a category. Do not invent one.

Rules:
1. Only return what's actually printed on the statement. For any header field not present, use null.
2. Skip summary rows, balance lines, totals, page headers / footers, marketing inserts, and "year-to-date" summaries from the transactions list.
3. Preserve the statement's sign convention. Do not flip signs.
4. Dates must be YYYY-MM-DD.
5. accountNumberLast4: use exactly the digits printed. If the statement only shows "****1234" use "1234". Up to 32 characters allowed.
6. Output JSON only — no fences, no prose, no commentary. The text after the closing brace must be empty.

Example output (for a small Chase credit-card statement):
{
  "header": {
    "institution": "Chase",
    "accountNumberLast4": "7104",
    "accountType": "credit_card",
    "accountName": "Amazon Prime Visa",
    "statementPeriodStart": "2026-02-25",
    "statementPeriodEnd": "2026-03-24",
    "openingBalance": 178.92,
    "closingBalance": 193.03,
    "currency": "USD",
    "portalUrl": "https://www.chase.com/amazon",
    "statementCycleDay": 24,
    "loanSubtype": null,
    "originalPrincipal": null,
    "escrowBalance": null,
    "maturityDate": null,
    "vestedBalance": null
  },
  "transactions": [
    { "date": "2026-03-04", "amount": -127.47, "payee": "Fareway Stores #983", "notes": "Grimes IA" },
    { "date": "2026-03-20", "amount": 35.00, "payee": "Automatic Payment - Thank You" }
  ]
}
`;
