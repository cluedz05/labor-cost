-- ============================================
-- 多绮爱服饰工序成本工具 - Supabase建表语句
-- ============================================

-- 创建应用数据表
CREATE TABLE IF NOT EXISTS app_data (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_key TEXT NOT NULL UNIQUE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_data_data_key ON app_data(data_key);

-- 启用行级安全（RLS）
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有用户读取（因为使用anon key，需要公开读取）
DROP POLICY IF EXISTS "Allow read access" ON app_data;
CREATE POLICY "Allow read access" ON app_data
    FOR SELECT USING (true);

-- 创建策略：允许所有用户插入（因为使用anon key，需要公开写入）
DROP POLICY IF EXISTS "Allow insert access" ON app_data;
CREATE POLICY "Allow insert access" ON app_data
    FOR INSERT WITH CHECK (true);

-- 创建策略：允许所有用户更新
DROP POLICY IF EXISTS "Allow update access" ON app_data;
CREATE POLICY "Allow update access" ON app_data
    FOR UPDATE USING (true);

-- 创建策略：允许所有用户删除
DROP POLICY IF EXISTS "Allow delete access" ON app_data;
CREATE POLICY "Allow delete access" ON app_data
    FOR DELETE USING (true);

-- ============================================
-- 可选：创建更新时间自动更新触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_data_updated_at ON app_data;
CREATE TRIGGER update_app_data_updated_at
    BEFORE UPDATE ON app_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 执行完成后，请在应用中填入：
-- 1. Supabase Project URL
-- 2. anon public key
-- 3. 数据表名：app_data
-- ============================================
