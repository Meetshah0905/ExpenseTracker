-- SUPABASE SQL SCHEMA

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  type TEXT CHECK (type IN ('expense', 'income', 'unknown')),
  title TEXT NOT NULL,
  merchant TEXT,
  amount DECIMAL(15,2),
  currency TEXT DEFAULT 'INR',
  tax_amount DECIMAL(15,2),
  discount_amount DECIMAL(15,2),
  tip_amount DECIMAL(15,2),
  total_amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  payment_mode TEXT,
  is_emi BOOLEAN DEFAULT FALSE,
  emi_months INTEGER,
  emi_interest_rate DECIMAL(5,2),
  notes TEXT,
  source TEXT CHECK (source IN ('manual', 'photo', 'screenshot', 'import')),
  raw_extracted_text TEXT,
  gemini_confidence DECIMAL(3,2),
  items JSONB DEFAULT '[]', -- Store line items if extracted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can perform all actions on own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- EMI Commitments table
CREATE TABLE emi_commitments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  transaction_id UUID REFERENCES transactions ON DELETE CASCADE,
  principal DECIMAL(15,2) NOT NULL,
  tenure_months INTEGER NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  monthly_emi DECIMAL(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  lender TEXT,
  status TEXT CHECK (status IN ('active', 'closed')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on emi_commitments
ALTER TABLE emi_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can perform all actions on own EMIs" ON emi_commitments
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Smart Buy Decisions table
CREATE TABLE smart_buy_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  price DECIMAL(15,2) NOT NULL,
  recommendation TEXT,
  recommendation_reason TEXT,
  affordability_score INTEGER,
  usefulness_score INTEGER,
  luxury_score INTEGER,
  raw_data JSONB, -- Store full evaluation metrics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on smart_buy_decisions
ALTER TABLE smart_buy_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can perform all actions on own decisions" ON smart_buy_decisions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Dashboard Snapshots table
CREATE TABLE dashboard_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  date DATE NOT NULL,
  income_total DECIMAL(15,2),
  expense_total DECIMAL(15,2),
  net_total DECIMAL(15,2),
  transaction_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on dashboard_snapshots
ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can perform all actions on own snapshots" ON dashboard_snapshots
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Helper functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_emi_commitments_updated_at BEFORE UPDATE ON emi_commitments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_smart_buy_decisions_updated_at BEFORE UPDATE ON smart_buy_decisions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
