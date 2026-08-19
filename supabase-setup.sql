-- 创建房间表
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    player1 TEXT,
    player2 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用实时功能
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- 设置权限（允许匿名访问）
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON rooms
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON rooms
    FOR UPDATE USING (true);
