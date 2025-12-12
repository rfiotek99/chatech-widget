-- ====================================
-- CHATECH DATABASE SCHEMA
-- Supabase PostgreSQL Setup
-- ====================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- TABLE: clients
-- ====================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Visual configuration
  primary_color VARCHAR(7) DEFAULT '#667eea',
  secondary_color VARCHAR(7) DEFAULT '#764ba2',
  logo TEXT,
  logo_type VARCHAR(20) DEFAULT 'emoji',
  
  -- Chatbot configuration
  welcome_message TEXT,
  system_prompt TEXT NOT NULL,
  hours VARCHAR(100),
  shipping VARCHAR(200),
  returns VARCHAR(200),
  payments VARCHAR(200),
  
  -- Subscription info
  plan VARCHAR(20) DEFAULT 'starter',
  status VARCHAR(20) DEFAULT 'trial',
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  
  -- Platform integration
  platform VARCHAR(20),
  shopify_domain VARCHAR(255),
  shopify_access_token TEXT,
  woocommerce_url VARCHAR(255),
  woocommerce_consumer_key TEXT,
  woocommerce_consumer_secret TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_scraped_at TIMESTAMP,
  
  -- Stats
  total_conversations INTEGER DEFAULT 0,
  conversations_this_month INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0
);

-- Indexes for clients
CREATE INDEX idx_clients_client_id ON clients(client_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_platform ON clients(platform);

-- ====================================
-- TABLE: conversations
-- ====================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  
  -- Metadata
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  
  -- Stats
  message_count INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  bot_messages INTEGER DEFAULT 0,
  
  -- Context
  user_agent TEXT,
  ip_address INET,
  page_url TEXT,
  referrer TEXT,
  
  -- Engagement
  duration_seconds INTEGER,
  feedback VARCHAR(20)
);

-- Indexes for conversations
CREATE INDEX idx_conversations_client ON conversations(client_id);
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_conversations_started ON conversations(started_at DESC);
CREATE INDEX idx_conversations_client_started ON conversations(client_id, started_at DESC);

-- ====================================
-- TABLE: messages
-- ====================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  tokens_used INTEGER,
  response_time_ms INTEGER,
  model VARCHAR(50) DEFAULT 'gpt-4o-mini',
  
  -- Feedback
  feedback VARCHAR(20),
  feedback_text TEXT,
  
  -- Cost tracking
  cost_usd DECIMAL(10,6)
);

-- Indexes for messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_client ON messages(client_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);

-- ====================================
-- TABLE: catalog_items
-- ====================================
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Product info
  name VARCHAR(500) NOT NULL,
  price DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'ARS',
  description TEXT,
  image_url TEXT,
  product_url TEXT,
  sku VARCHAR(100),
  stock_status VARCHAR(20) DEFAULT 'in_stock',
  category VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  scraped_at TIMESTAMP DEFAULT NOW(),
  
  -- Source tracking
  source_platform VARCHAR(20),
  external_id VARCHAR(100)
);

-- Indexes for catalog_items
CREATE INDEX idx_catalog_client ON catalog_items(client_id);
CREATE INDEX idx_catalog_sku ON catalog_items(sku);
CREATE INDEX idx_catalog_updated ON catalog_items(updated_at DESC);
CREATE INDEX idx_catalog_external ON catalog_items(source_platform, external_id);

-- ====================================
-- TABLE: subscriptions
-- ====================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Plan info
  plan VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  
  -- Billing details
  provider VARCHAR(20) NOT NULL,
  provider_subscription_id VARCHAR(255),
  provider_customer_id VARCHAR(255),
  
  -- Pricing
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  interval VARCHAR(20) DEFAULT 'month',
  
  -- Dates
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  canceled_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider, provider_subscription_id);

-- ====================================
-- TABLE: admins (for admin panel auth)
-- ====================================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_email ON admins(email);

-- ====================================
-- FUNCTIONS
-- ====================================

-- Function to increment client conversation counter
CREATE OR REPLACE FUNCTION increment_client_conversations(client_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE clients 
  SET 
    total_conversations = total_conversations + 1,
    conversations_this_month = conversations_this_month + 1,
    updated_at = NOW()
  WHERE id = client_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily conversations (for analytics)
CREATE OR REPLACE FUNCTION get_daily_conversations(client_uuid UUID, days INTEGER)
RETURNS TABLE(date DATE, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(started_at) as date,
    COUNT(*) as count
  FROM conversations
  WHERE 
    client_id = client_uuid
    AND started_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY DATE(started_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate conversation duration
CREATE OR REPLACE FUNCTION calculate_conversation_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate conversation duration
CREATE TRIGGER trigger_calculate_duration
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION calculate_conversation_duration();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_updated_at BEFORE UPDATE ON catalog_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to clients"
ON clients FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
));

CREATE POLICY "Admins have full access to conversations"
ON conversations FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
));

CREATE POLICY "Admins have full access to messages"
ON messages FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
));

CREATE POLICY "Admins have full access to catalog"
ON catalog_items FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
));

CREATE POLICY "Admins have full access to subscriptions"
ON subscriptions FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
));

-- Policy: Public API can insert conversations and messages (via service role key)
-- This will be handled by service role key in backend

-- ====================================
-- INITIAL DATA (OPTIONAL)
-- ====================================

-- Insert demo admin user (update with your email after creating user in Supabase Auth)
-- INSERT INTO admins (user_id, email, role) 
-- VALUES ('your-user-id-here', 'ramiro@chatech.com', 'admin');

-- ====================================
-- VIEWS (for analytics)
-- ====================================

-- View: Daily stats per client
CREATE OR REPLACE VIEW daily_client_stats AS
SELECT 
  c.id as client_uuid,
  c.client_id,
  c.name,
  DATE(conv.started_at) as date,
  COUNT(DISTINCT conv.id) as conversations,
  COUNT(DISTINCT m.id) as messages,
  AVG(conv.message_count) as avg_messages_per_conversation,
  AVG(conv.duration_seconds) as avg_duration_seconds
FROM clients c
LEFT JOIN conversations conv ON c.id = conv.client_id
LEFT JOIN messages m ON conv.id = m.conversation_id
GROUP BY c.id, c.client_id, c.name, DATE(conv.started_at);

-- View: Monthly revenue (will be updated when subscriptions are active)
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT 
  DATE_TRUNC('month', current_period_start) as month,
  COUNT(*) as active_subscriptions,
  SUM(amount) as total_revenue,
  AVG(amount) as avg_revenue_per_client
FROM subscriptions
WHERE status = 'active'
GROUP BY DATE_TRUNC('month', current_period_start)
ORDER BY month DESC;

-- ====================================
-- COMMENTS (for documentation)
-- ====================================

COMMENT ON TABLE clients IS 'Stores client/customer information and configuration';
COMMENT ON TABLE conversations IS 'Tracks individual chat sessions';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE catalog_items IS 'Product catalog synced from client stores';
COMMENT ON TABLE subscriptions IS 'Billing and subscription information';
COMMENT ON TABLE admins IS 'Admin users who can access the admin panel';

COMMENT ON COLUMN clients.client_id IS 'Unique identifier used in widget snippet (e.g., "shopnow", "denela")';
COMMENT ON COLUMN clients.status IS 'Subscription status: trial, active, past_due, canceled';
COMMENT ON COLUMN conversations.session_id IS 'Unique session ID for tracking conversation across page reloads';
COMMENT ON COLUMN messages.cost_usd IS 'Calculated cost based on tokens_used and model pricing';

-- ====================================
-- DONE!
-- ====================================

-- To verify everything was created:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
