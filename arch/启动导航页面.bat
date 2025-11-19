@echo off
chcp 65001 > nul
echo ====================================
echo    导航页面一键启动工具
echo ====================================
echo.

echo [1/3] 检查Python环境...
python --version > nul 2>&1
if errorlevel 1 (
    echo 错误：未找到Python环境，请先安装Python
    pause
    exit /b 1
)

echo [2/3] 启动导航页面服务器...
cd /d "c:\Users\lenovo\Documents\trae_projects\NavigationPage"

REM 启动服务器
start "导航页面服务器" cmd /k "python -m http.server 8000"
echo 服务器启动中，请稍候...

REM 等待服务器启动
timeout /t 3 /nobreak > nul

echo [3/3] 打开浏览器访问导航页面...
start "" "http://localhost:8000/navigation.html"

echo.
echo ✅ 启动完成！
echo 📍 导航页面地址: http://localhost:8000/navigation.html
echo 🖥️  请保持此窗口打开以维持服务器运行
echo 🔄 关闭窗口将停止服务器
echo.
echo 💡 提示：可以将此脚本添加到桌面，并设置为开机自启
echo    这样每次开机后就会自动启动导航页面
echo.
pause