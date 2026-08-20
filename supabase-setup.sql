-- 创建玩家表（带设备ID）
CREATE TABLE IF NOT EXISTS players (
    name TEXT PRIMARY KEY,
    device_id TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在，添加device_id列
ALTER TABLE players ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 创建房间表
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    player1 TEXT,
    player2 TEXT,
    status TEXT DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 兼容已存在的旧表结构
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS player2 TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 启用RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Allow anonymous read players" ON players;
DROP POLICY IF EXISTS "Allow anonymous insert players" ON players;
DROP POLICY IF EXISTS "Allow anonymous update players" ON players;
DROP POLICY IF EXISTS "Allow anonymous read rooms" ON rooms;
DROP POLICY IF EXISTS "Allow anonymous insert rooms" ON rooms;
DROP POLICY IF EXISTS "Allow anonymous update rooms" ON rooms;
DROP POLICY IF EXISTS "Allow anonymous delete rooms" ON rooms;

-- 创建新策略
CREATE POLICY "Allow anonymous read players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update players" ON players FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete rooms" ON rooms FOR DELETE USING (true);
