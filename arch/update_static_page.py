#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
静态导航页面更新工具
根据正确的书签结构从pintree.json提取数据并更新static_navigation.html
"""
import json
import os
import re

def extract_navigation_data(json_file):
    """
    从pintree.json文件提取导航数据
    
    参数:
        json_file: JSON文件路径
    
    返回:
        navigation_data: 组织好的导航数据字典
    """
    try:
        # 读取JSON文件
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 初始化导航数据
        navigation_data = {}
        
        # 查找根文件夹（通常是第一个元素）
        if isinstance(data, list) and data:
            root_folder = data[0] if len(data) == 1 else None
            
            # 如果根文件夹有children属性，使用它
            if root_folder and 'children' in root_folder:
                # 遍历顶级文件夹（资源、云服务、效率工具、JustFun）
                for top_folder in root_folder['children']:
                    if top_folder.get('type') == 'folder':
                        folder_title = top_folder.get('title', '未命名文件夹')
                        navigation_data[folder_title] = {}
                        
                        # 处理每个顶级文件夹下的内容
                        process_folder_content(top_folder, navigation_data[folder_title])
        
        return navigation_data
        
    except Exception as e:
        print(f"提取数据出错: {e}")
        return {}

def process_folder_content(folder, target_dict):
    """
    递归处理文件夹内容
    
    参数:
        folder: 文件夹对象
        target_dict: 目标字典，用于存储处理后的内容
    """
    if 'children' not in folder:
        return
    
    # 确保每个子分类都是数组格式
    # 先收集所有子文件夹
    subfolders = []
    links = []
    
    for item in folder['children']:
        if item.get('type') == 'link':
            # 收集链接
            link_data = {
                'type': 'link',
                'title': item.get('title', '未命名链接'),
                'url': item.get('url', '#'),
                'icon': get_emoji_for_url(item.get('url', ''))
            }
            links.append(link_data)
        elif item.get('type') == 'folder':
            # 收集子文件夹
            subfolders.append(item)
    
    # 处理子文件夹
    for subfolder in subfolders:
        subfolder_title = subfolder.get('title', '未命名文件夹')
        # 为子文件夹创建专门的子分类
        target_dict[subfolder_title] = []
        process_folder_recursive(subfolder, target_dict[subfolder_title])
    
    # 处理当前文件夹的链接
    if links:
        # 如果是顶级文件夹或只有链接没有子文件夹
        folder_title = folder.get('title', '未命名文件夹')
        
        # 对于顶级文件夹（除了资源），使用"主要链接"作为子分类名
        if folder_title in ['云服务', '效率工具', 'JustFun']:
            if '主要链接' not in target_dict or not isinstance(target_dict['主要链接'], list):
                target_dict['主要链接'] = []
            target_dict['主要链接'].extend(links)
        else:
            # 对于其他文件夹，如果没有子文件夹，直接使用文件夹名作为子分类
            if not subfolders:
                target_dict[folder_title] = links
            else:
                # 如果有子文件夹，将链接放在"其他链接"中
                if '其他链接' not in target_dict or not isinstance(target_dict['其他链接'], list):
                    target_dict['其他链接'] = []
                target_dict['其他链接'].extend(links)

def process_folder_recursive(folder, target_array):
    """
    递归处理文件夹并将所有链接添加到目标数组
    
    参数:
        folder: 文件夹对象
        target_array: 目标数组，用于存储链接
    """
    if 'children' not in folder:
        return
    
    for item in folder['children']:
        if item.get('type') == 'link':
            # 直接添加链接到目标数组
            link_data = {
                'type': 'link',
                'title': item.get('title', '未命名链接'),
                'url': item.get('url', '#'),
                'icon': get_emoji_for_url(item.get('url', ''))
            }
            target_array.append(link_data)
        elif item.get('type') == 'folder':
            # 递归处理子文件夹
            process_folder_recursive(item, target_array)

def get_emoji_for_url(url):
    """
    根据URL返回相应的emoji图标
    
    参数:
        url: 链接URL
    
    返回:
        emoji: 对应的emoji图标
    """
    # 常见网站类型的emoji映射
    emoji_mapping = {
        # 通用类型
        'github': '💻',
        'youtube': '🎬',
        'bilibili': '📺',
        'baidu': '🔍',
        'google': '🔍',
        'microsoft': '🪟',
        'apple': '🍎',
        'amazon': '🛒',
        
        # 学术类型
        'scholar': '🎓',
        'arxiv': '📄',
        'cnki': '📚',
        'ieee': '📝',
        
        # 工具类型
        'pdf': '📄',
        'image': '🖼️',
        'photo': '📸',
        'music': '🎵',
        'video': '🎬',
        
        # 编程相关
        'python': '🐍',
        'java': '☕',
        'javascript': '⚡',
        'html': '🌐',
        
        # 办公相关
        'word': '📝',
        'excel': '📊',
        'ppt': '📑',
        'office': '🖋️',
    }
    
    # 默认图标
    default_emoji = '🔗'
    
    # 转换为小写进行匹配
    url_lower = url.lower()
    
    # 查找匹配的emoji
    for keyword, emoji in emoji_mapping.items():
        if keyword in url_lower:
            return emoji
    
    # 根据URL类型返回通用图标
    if any(x in url_lower for x in ['mail', 'email', '@']):
        return '📧'
    elif any(x in url_lower for x in ['news', 'article', 'blog']):
        return '📰'
    elif any(x in url_lower for x in ['book', 'read', 'novel']):
        return '📚'
    elif any(x in url_lower for x in ['map', 'location', 'place']):
        return '🗺️'
    elif any(x in url_lower for x in ['weather', 'forecast']):
        return '🌤️'
    elif any(x in url_lower for x in ['game', 'play', 'fun']):
        return '🎮'
    elif any(x in url_lower for x in ['ai', 'chat', 'bot', '智能']):
        return '🤖'
    elif any(x in url_lower for x in ['cloud', 'drive', 'storage']):
        return '☁️'
    
    return default_emoji

def generate_js_data(navigation_data):
    """
    生成JavaScript格式的导航数据字符串
    
    参数:
        navigation_data: 导航数据字典
    
    返回:
        js_data: JavaScript代码字符串
    """
    # 将Python字典转换为JavaScript对象字符串
    js_data = "const navigationData = "
    
    # 使用json.dumps转换，然后进行一些调整使其更符合JavaScript风格
    json_str = json.dumps(navigation_data, ensure_ascii=False, indent=4)
    
    # 修复缩进（4个空格改为2个空格）
    lines = json_str.split('\n')
    adjusted_lines = []
    for line in lines:
        indent_level = len(line) - len(line.lstrip())
        new_indent = '  ' * (indent_level // 4)
        adjusted_lines.append(new_indent + line.lstrip())
    
    js_data += '\n'.join(adjusted_lines)
    js_data += ';'  # 添加分号
    
    return js_data

def update_html_file(html_file, new_js_data):
    """
    更新HTML文件中的导航数据
    
    参数:
        html_file: HTML文件路径
        new_js_data: 新的JavaScript数据
    
    返回:
        success: 是否成功更新
    """
    try:
        # 读取HTML文件
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 使用正则表达式替换navigationData部分
        # 查找const navigationData = {...};
        pattern = r'const navigationData = \{[\s\S]*?\};'
        
        # 替换为新的数据
        new_html_content = re.sub(pattern, new_js_data, html_content, flags=re.MULTILINE)
        
        # 如果没有找到匹配的模式，添加到适当位置
        if new_html_content == html_content:
            # 找到script标签并在其内部添加数据
            script_pos = html_content.find('<script>')
            if script_pos != -1:
                insert_pos = script_pos + 8  # 在<script>之后插入
                new_html_content = html_content[:insert_pos] + '\n' + new_js_data + '\n' + html_content[insert_pos:]
            else:
                # 如果没有script标签，在body结束前添加
                body_end_pos = html_content.find('</body>')
                if body_end_pos != -1:
                    new_html_content = html_content[:body_end_pos] + '\n<script>\n' + new_js_data + '\n</script>\n' + html_content[body_end_pos:]
        
        # 写回HTML文件
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(new_html_content)
        
        print(f"✅ HTML文件已成功更新: {html_file}")
        return True
        
    except Exception as e:
        print(f"❌ 更新HTML文件失败: {e}")
        return False

def main():
    """
    主函数
    """
    # 文件路径
    json_file = 'pintree.json'
    html_file = 'static_navigation.html'
    
    # 确保文件存在
    if not os.path.exists(json_file):
        print(f"❌ JSON文件不存在: {json_file}")
        return
    
    if not os.path.exists(html_file):
        print(f"❌ HTML文件不存在: {html_file}")
        return
    
    # 1. 提取导航数据
    print("📊 正在提取导航数据...")
    navigation_data = extract_navigation_data(json_file)
    
    if not navigation_data:
        print("❌ 未提取到导航数据")
        return
    
    # 统计数据
    total_categories = len(navigation_data)
    total_subcategories = 0
    total_links = 0
    
    for category, subcategories in navigation_data.items():
        total_subcategories += len(subcategories)
        for subcat, links in subcategories.items():
            if isinstance(links, list):
                total_links += len(links)
    
    print(f"📈 提取结果: {total_categories}个分类, {total_subcategories}个子分类, {total_links}个链接")
    
    # 2. 生成JavaScript数据
    print("💻 正在生成JavaScript数据...")
    js_data = generate_js_data(navigation_data)
    
    # 3. 更新HTML文件
    print("🔄 正在更新HTML文件...")
    if update_html_file(html_file, js_data):
        print("🎉 更新完成！")
        print(f"📂 文件位置: {os.path.abspath(html_file)}")
    else:
        print("❌ 更新失败！")


if __name__ == "__main__":
    print("🚀 静态导航页面更新工具")
    print("======================\n")
    main()
    print("\n📝 提示: 请在浏览器中打开static_navigation.html查看更新后的导航页面")
