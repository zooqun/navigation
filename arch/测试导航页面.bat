@echo off

echo 正在检查静态导航页面文件...
if exist static_navigation.html (
    echo 找到静态导航页面文件
    echo 尝试打开导航页面...
    start static_navigation.html
    echo 请检查页面是否正常显示所有内容
) else (
    echo 错误：未找到static_navigation.html文件
)

echo.
echo 按任意键继续...
pause > nul