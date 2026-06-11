# Windows 本地一键启动脚本（无需阿里云、无需 MySQL）
# 用法：在 PowerShell 中执行  .\start-local.ps1

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host "=== 教培网课平台 · 本地验证 ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "请先安装 Node.js 18+：https://nodejs.org" -ForegroundColor Red
    exit 1
}

Set-Location "$Root\backend"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.local" ".env"
    Write-Host "已复制 .env.local -> .env" -ForegroundColor Green
}

if (-not (Test-Path "node_modules")) {
    Write-Host "安装后端依赖..." -ForegroundColor Yellow
    npm install
}

Write-Host "初始化 SQLite 数据库（无需 MySQL）..." -ForegroundColor Yellow
npm run setup:local

foreach ($app in @("user-web", "admin-web")) {
    Set-Location "$Root\$app"
    if (-not (Test-Path "node_modules")) {
        Write-Host "安装 $app 依赖..." -ForegroundColor Yellow
        npm install
    }
}

Write-Host ""
Write-Host "请在 3 个终端分别运行：" -ForegroundColor Cyan
Write-Host '  终端1: cd D:\plan\tools\backend; npm run start:dev'
Write-Host '  终端2: cd D:\plan\tools\user-web; npm run dev'
Write-Host '  终端3: cd D:\plan\tools\admin-web; npm run dev'
Write-Host ""
Write-Host "访问地址：" -ForegroundColor Green
Write-Host "  学员端：   http://localhost:5173"
Write-Host '  管理后台： http://localhost:5174  账号 admin  密码 admin123456'
Write-Host "  验证码：   查看后端终端控制台输出"
Write-Host ""
