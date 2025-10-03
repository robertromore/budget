-- Test Data for Budget System
-- This creates realistic test data to verify budget consumption tracking

-- Create test account (INSERT OR IGNORE to skip if already exists)
INSERT OR IGNORE INTO account (id, name, slug, account_type, initial_balance, created_at, updated_at) VALUES
(1, 'Main Checking', 'main-checking', 'checking', 5000.00, datetime('now'), datetime('now'));

-- Budget-account link already exists in database (budget #1 -> account #1)

-- Create categories (INSERT OR IGNORE to skip if already exists)
INSERT OR IGNORE INTO categories (id, name, category_type, category_color, created_at, updated_at) VALUES
(1, 'Groceries', 'expense', '#10b981', datetime('now'), datetime('now')),
(2, 'Dining Out', 'expense', '#f59e0b', datetime('now'), datetime('now')),
(3, 'Transportation', 'expense', '#3b82f6', datetime('now'), datetime('now')),
(4, 'Utilities', 'expense', '#8b5cf6', datetime('now'), datetime('now')),
(5, 'Entertainment', 'expense', '#ec4899', datetime('now'), datetime('now')),
(6, 'Salary', 'income', '#22c55e', datetime('now'), datetime('now'));

-- Create payees (INSERT OR IGNORE to skip if already exists)
INSERT OR IGNORE INTO payee (id, name, created_at, updated_at) VALUES
(1, 'Safeway', datetime('now'), datetime('now')),
(2, 'Chipotle', datetime('now'), datetime('now')),
(3, 'Shell Gas Station', datetime('now'), datetime('now')),
(4, 'PG&E', datetime('now'), datetime('now')),
(5, 'Netflix', datetime('now'), datetime('now')),
(6, 'Acme Corp (Employer)', datetime('now'), datetime('now'));

-- Create transactions for current month (October 2025)
-- Mix of different categories and amounts
-- Total expenses will be around $1,850 (leaving $650 of $2,500 budget)

INSERT INTO "transaction" (account_id, amount, category_id, payee_id, status, date, notes, created_at, updated_at) VALUES
-- Income
(1, 4500.00, 6, 6, 'cleared', '2025-10-01', 'October salary', datetime('now'), datetime('now')),

-- Expenses
(1, -125.50, 1, 1, 'cleared', '2025-10-02', 'Weekly grocery shopping', datetime('now'), datetime('now')),
(1, -45.00, 2, 2, 'cleared', '2025-10-03', 'Lunch with team', datetime('now'), datetime('now')),
(1, -60.00, 3, 3, 'cleared', '2025-10-04', 'Gas fill-up', datetime('now'), datetime('now')),
(1, -150.00, 4, 4, 'cleared', '2025-10-05', 'Monthly electricity bill', datetime('now'), datetime('now')),
(1, -15.99, 5, 5, 'cleared', '2025-10-06', 'Netflix subscription', datetime('now'), datetime('now')),
(1, -98.75, 1, 1, 'cleared', '2025-10-08', 'Grocery shopping', datetime('now'), datetime('now')),
(1, -32.00, 2, 2, 'cleared', '2025-10-10', 'Dinner', datetime('now'), datetime('now')),
(1, -55.00, 3, 3, 'cleared', '2025-10-12', 'Gas', datetime('now'), datetime('now')),
(1, -112.30, 1, 1, 'cleared', '2025-10-15', 'Weekly groceries', datetime('now'), datetime('now')),
(1, -28.50, 2, 2, 'cleared', '2025-10-17', 'Coffee and pastries', datetime('now'), datetime('now')),
(1, -85.00, 5, NULL, 'cleared', '2025-10-18', 'Concert tickets', datetime('now'), datetime('now')),
(1, -50.00, 3, 3, 'cleared', '2025-10-20', 'Gas', datetime('now'), datetime('now')),
(1, -95.20, 1, 1, 'cleared', '2025-10-22', 'Grocery shopping', datetime('now'), datetime('now')),
(1, -42.00, 2, 2, 'cleared', '2025-10-24', 'Takeout dinner', datetime('now'), datetime('now')),

-- Pending transactions
(1, -89.50, 1, 1, 'pending', '2025-10-25', 'Weekly groceries', datetime('now'), datetime('now')),
(1, -35.00, 2, NULL, 'pending', '2025-10-26', 'Restaurant', datetime('now'), datetime('now'));

-- Create budget period instance for October 2025
-- This represents the current active period for the budget
INSERT INTO budget_period_instance (
  template_id,
  start_date,
  end_date,
  allocated_amount,
  actual_amount,
  created_at
) VALUES (
  1, -- Links to budget #1's template
  '2025-10-01',
  '2025-10-31',
  2500.00,
  0, -- Will be calculated by the system
  datetime('now')
);
