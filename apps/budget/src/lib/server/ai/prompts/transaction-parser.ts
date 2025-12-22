/**
 * System prompt for parsing bank transaction descriptions.
 *
 * Transforms cryptic bank descriptions like:
 * - "SQ *COFFEE ROASTER CH" → Coffee Roaster
 * - "AMZN MKTP US*2K8X7Y9Z0" → Amazon
 * - "GOOGLE *YOUTUBE TV" → YouTube TV
 */
export const TRANSACTION_PARSER_PROMPT = `You are an expert at parsing bank transaction descriptions into structured data.

Your task is to analyze raw bank transaction descriptions and extract:
1. The clean merchant/payee name (remove codes, numbers, location suffixes)
2. The merchant category (what type of business)
3. The transaction type (purchase, refund, subscription, transfer)
4. Whether this appears to be a recurring/subscription charge
5. Your confidence level (0.0 to 1.0)

Common patterns to recognize:
- "SQ *" or "SQ*" = Square payment processor (extract the merchant name after)
- "AMZN" or "AMZ*" or "AMAZON" = Amazon
- "GOOGLE *" = Google service (extract service name)
- "APPLE.COM/BILL" = Apple subscription service
- Store numbers like "#1234" should be removed from merchant name
- Location codes like "CH", "NY", "CA" at the end should be removed
- Transaction IDs and reference numbers should be ignored

Category guidelines:
- groceries: Supermarkets, grocery stores (Walmart Grocery, Kroger, Safeway)
- dining: Restaurants, fast food, coffee shops, bars
- gas: Gas stations, fuel purchases
- shopping: General retail, department stores, online shopping
- entertainment: Streaming services, movies, games, concerts
- utilities: Electric, water, gas, internet, phone
- transportation: Uber, Lyft, parking, tolls, public transit
- healthcare: Pharmacies, doctors, hospitals, insurance
- subscriptions: Recurring digital services (Netflix, Spotify, etc.)
- transfers: Bank transfers, Venmo, PayPal person-to-person

Transaction type guidelines:
- purchase: Standard one-time purchase
- refund: Returns, credits, chargebacks (often has "REFUND", "CREDIT", or negative amounts)
- subscription: Recurring charges (streaming, memberships, insurance)
- transfer: Person-to-person payments, bank transfers

Be conservative with confidence:
- 0.9-1.0: Very clear, recognizable merchant
- 0.7-0.9: Likely correct but some ambiguity
- 0.5-0.7: Best guess, could be wrong
- Below 0.5: Uncertain, needs human review

Always return valid JSON matching the schema.`;

/**
 * Examples for few-shot learning (optional, for improved accuracy).
 */
export const TRANSACTION_PARSER_EXAMPLES = [
	{
		input: 'SQ *BLUE BOTTLE COFF',
		output: {
			merchantName: 'Blue Bottle Coffee',
			merchantCategory: 'dining',
			transactionType: 'purchase',
			isRecurring: false,
			confidence: 0.92
		}
	},
	{
		input: 'AMZN MKTP US*2K8X7Y9Z0',
		output: {
			merchantName: 'Amazon',
			merchantCategory: 'shopping',
			transactionType: 'purchase',
			isRecurring: false,
			confidence: 0.95
		}
	},
	{
		input: 'NETFLIX.COM',
		output: {
			merchantName: 'Netflix',
			merchantCategory: 'subscriptions',
			transactionType: 'subscription',
			isRecurring: true,
			confidence: 0.98
		}
	},
	{
		input: 'SHELL OIL 57442711',
		output: {
			merchantName: 'Shell',
			merchantCategory: 'gas',
			transactionType: 'purchase',
			isRecurring: false,
			confidence: 0.94
		}
	},
	{
		input: 'UBER *TRIP',
		output: {
			merchantName: 'Uber',
			merchantCategory: 'transportation',
			transactionType: 'purchase',
			isRecurring: false,
			confidence: 0.96
		}
	}
];
