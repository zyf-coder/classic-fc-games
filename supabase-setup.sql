-- 创建玩家表
CREATE TABLE IF NOT EXISTS players (
    name TEXT PRIMARY KEY,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建房间表
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    player1 TEXT,
    player2 TEXT,
    status TEXT DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 玩家表权限
CREATE POLICY "Allow anonymous read players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update players" ON players FOR UPDATE USING (true);

-- 房间表权限
CREATE POLICY "Allow anonymous read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete rooms" ON rooms FOR DELETE USING (true);
