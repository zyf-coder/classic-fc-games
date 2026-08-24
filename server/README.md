# FC Games Online Server

FC游戏联机服务器，支持双人在线对战。

## 功能

- 创建/加入房间
- 实时游戏状态同步
- 玩家输入同步

## 部署到Glitch

1. 访问 https://glitch.com
2. 创建新项目
3. 上传 server.js 和 package.json
4. 项目会自动运行

## 环境变量

- `PORT`: 服务器端口（默认3000）

## Windows 宝塔部署

在宝塔 Node 项目中选择本目录，启动文件填写 `server.js`，端口填写 `3000`。
也可以在 PowerShell 执行 `./start-windows.ps1`。启动日志位于 `logs/server.out.log` 和 `logs/server.err.log`。

## WSS 反向代理

将 `ws.onlyforus.online` 的 DNS A 记录指向服务器公网 IP，在宝塔创建站点并申请 SSL，反向代理到 `127.0.0.1:3000`，启用 WebSocket 支持。网页端通过 `wss://ws.onlyforus.online` 连接。
