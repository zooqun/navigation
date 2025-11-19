@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ====================================
echo    导航页面管理工具 v2.0
echo ====================================
echo.
echo [1] 启动导航页面服务
echo [2] 停止所有导航服务
echo [3] 设置开机自启
echo [4] 取消开机自启
echo [5] 打开教程文档
echo [6] 访问导航页面
echo [0] 退出
echo.

:choice
set /p choice="请选择操作 (0-6): "

if "%choice%"=="1" goto start_service
if "%choice%"=="2" goto stop_service
if "%choice%"=="3" goto add_startup
if "%choice%"=="4" goto remove_startup
if "%choice%"=="5" goto open_tutorial
if "%choice%"=="6" goto open_browser
if "%choice%"=="0" goto exit
echo 无效选择，请重新输入！
goto choice

:start_service
echo.
echo [启动中] 正在检查Python环境...
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到Python环境
    echo 请先从 https://python.org 下载安装Python
    pause
    goto main
)

echo [启动中] 检查端口8000是否被占用...
netstat -an | find ":8000" > nul
if not errorlevel 1 (
    echo ⚠️  警告：端口8000已被占用，尝试停止现有服务...
    taskkill /f /im "python.exe" > nul 2>&1
    timeout /t 2 /nobreak > nul
)

echo [启动中] 启动服务器...
cd /d "c:\Users\lenovo\Documents\trae_projects\NavigationPage"
start "导航页面服务" cmd /k "title 导航页面服务器 && echo 服务器已启动，地址: http://localhost:8000/navigation.html && echo 按 Ctrl+C 停止服务 && python -m http.server 8000"

echo [启动中] 等待服务器初始化...
timeout /t 4 /nobreak > nul

echo [启动中] 测试服务器连接...
for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" http://localhost:8000/navigation.html 2^>nul') do set http_code=%%i
if "!http_code!"=="200" (
    echo.
    echo ✅ 启动成功！
    echo 🌐 导航页面: http://localhost:8000/navigation.html
    echo 🔗 直接访问: http://localhost:8000/
    echo.
    set /p open="是否立即打开浏览器？ (y/n): "
    if /i "!open!"=="y" start "" "http://localhost:8000/navigation.html"
) else (
    echo.
    echo ❌ 启动失败！请检查防火墙设置
    echo 💡 提示：尝试以管理员身份运行此脚本
)
pause
goto main

:stop_service
echo.
echo [停止中] 正在停止所有导航相关服务...
taskkill /f /im "python.exe" > nul 2>&1
echo ✅ 所有服务已停止
pause
goto main

:add_startup
echo.
echo [设置中] 配置开机自启...
set "script_path=%~dp0启动导航页面.bat"
set "startup_path=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [设置中] 创建快捷方式到启动文件夹...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%startup_path%\导航页面.lnk'); $Shortcut.TargetPath = '%script_path%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Save()"

if exist "%startup_path%\导航页面.lnk" (
    echo ✅ 开机自启设置成功！
    echo 💡 电脑重启后将自动启动导航页面
) else (
    echo ❌ 开机自启设置失败！
    echo 💡 请尝试以管理员身份运行此脚本
)
pause
goto main

:remove_startup
echo.
echo [取消中] 移除开机自启设置...
set "startup_path=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\导航页面.lnk"
if exist "%startup_path%" (
    del "%startup_path%" > nul 2>&1
    echo ✅ 开机自启已取消
) else (
    echo ℹ️  未发现开机自启设置
)
pause
goto main

:open_tutorial
echo.
echo [打开中] 正在打开教程文档...
start "" "%~dp0设置新标签页教程.md"
goto main

:open_browser
echo.
echo [打开中] 正在打开浏览器...
start "" "http://localhost:8000/navigation.html"
goto main

:exit
echo.
echo 感谢使用导航页面管理工具！
exit /b 0

:main
cls
echo ====================================
echo    导航页面管理工具 v2.0
echo ====================================
echo.
echo [1] 启动导航页面服务
echo [2] 停止所有导航服务
echo [3] 设置开机自启
echo [4] 取消开机自启
echo [5] 打开教程文档
echo [6] 访问导航页面
echo [0] 退出
echo.
goto choice