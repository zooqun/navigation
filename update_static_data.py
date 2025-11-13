#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
静态导航页面数据更新脚本

功能：从pintree.json文件读取数据，转换格式后更新到静态HTML文件中
使用方法：直接运行此脚本即可自动更新static_navigation_standalone.html文件
"""

import json
import os
import re
from datetime import datetime


def convert_json_format(pintree_data):
    """
    将pintree.json格式转换为导航页面所需的格式
    
    参数:
        pintree_data: 从pintree.json读取的原始数据
        
    返回:
        转换后的嵌套对象格式数据
    """
    navigation_data = {}
    
    print(f"调试信息: 输入数据类型: {type(pintree_data)}, 长度: {len(pintree_data) if isinstance(pintree_data, list) else 'N/A'}")
    
    # 定义一个辅助函数，用于递归处理文件夹内容
    def process_items(items, target_dict, category_prefix=""):
        """
        递归处理项目列表，将链接添加到目标字典中
        
        参数:
            items: 要处理的项目列表
            target_dict: 存储结果的字典
            category_prefix: 当前分类前缀
            
        返回:
            处理的链接数量
        """
        link_count = 0
        for item in items:
            if item.get('type') == 'link':
                # 确保分类存在
                category = category_prefix if category_prefix else "默认分类"
                if category not in target_dict:
                    target_dict[category] = []
                
                # 添加链接
                target_dict[category].append({
                    "type": "link",
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "icon": item.get("icon") or "🔗"
                })
                link_count += 1
            elif item.get('type') == 'folder':
                folder_title = item.get("title", "未命名文件夹")
                children = item.get("children", [])
                
                # 构建新的分类路径
                new_category = folder_title if not category_prefix else f"{category_prefix} - {folder_title}"
                
                # 递归处理子项目
                link_count += process_items(children, target_dict, new_category)
                
                # 记录添加的子分类
                if new_category in target_dict:
                    print(f"调试信息: 添加子分类: {new_category}, 链接数量: {len(target_dict[new_category])}")
        
        return link_count
    
    # 查找'Other bookmarks'文件夹
    other_bookmarks_folder = None
    for item in pintree_data:
        if item.get('type') == 'folder':
            title = item.get('title', '')
            # 检查是否是'Other bookmarks'或'其他书签'
            if title == 'Other bookmarks' or title == '其他书签':
                other_bookmarks_folder = item
                print(f"调试信息: 找到目标文件夹: {title}")
                print("调试信息: 按照用户要求，忽略该一级目录，直接处理其子内容")
                break
    
    # 处理逻辑
    if other_bookmarks_folder:
        # 获取子内容
        children = other_bookmarks_folder.get('children', [])
        print(f"调试信息: 子内容数量: {len(children)}")
        
        # 直接将子文件夹作为顶级分类处理
        for child in children:
            if child.get('type') == 'folder':
                # 获取子文件夹名称作为主分类
                main_category_name = child.get('title', '未命名文件夹')
                print(f"调试信息: 将子文件夹 '{main_category_name}' 作为顶级分类处理")
                
                # 为该分类创建存储结构
                navigation_data[main_category_name] = {}
                
                # 处理子文件夹内容，不添加前缀
                process_items(child.get('children', []), navigation_data[main_category_name], "")
            elif child.get('type') == 'link':
                # 处理直接链接，放入默认分类
                default_category = "默认分类"
                if default_category not in navigation_data:
                    navigation_data[default_category] = {}
                if default_category not in navigation_data[default_category]:
                    navigation_data[default_category][default_category] = []
                
                navigation_data[default_category][default_category].append({
                    "type": "link",
                    "title": child.get("title"),
                    "url": child.get("url"),
                    "icon": child.get("icon") or "🔗"
                })
    else:
        # 如果未找到目标文件夹，使用默认处理方式
        print("警告: 未找到'Other bookmarks'或'其他书签'文件夹，使用默认处理方式")
        for item in pintree_data:
            if item.get('type') == 'folder':
                folder_title = item.get('title', '未命名文件夹')
                navigation_data[folder_title] = {}
                process_items(item.get('children', []), navigation_data[folder_title], "")
    
    # 最后验证一下，确保没有'Other bookmarks'或'其他书签'作为顶级分类
    for category in list(navigation_data.keys()):
        if category == 'Other bookmarks' or category == '其他书签':
            print(f"警告: 发现顶级分类包含目标文件夹名称: {category}")
    
    return navigation_data
    
    # 如果没有从Other bookmarks找到数据，尝试处理其他文件夹
    if not navigation_data:
        print("警告: 未从Other bookmarks找到数据，尝试处理其他文件夹...")
        for top_item in pintree_data:
            if top_item.get('type') == 'folder' and top_item.get('title') != 'Other bookmarks':
                folder_title = top_item.get('title', '未命名文件夹')
                print(f"调试信息: 正在处理非Other bookmarks文件夹: {folder_title}")
                navigation_data[folder_title] = {}
                process_folder(top_item, navigation_data[folder_title])
                
                if navigation_data[folder_title]:
                    print(f"调试信息: 添加主分类: {folder_title}, 子分类数量: {len(navigation_data[folder_title])}")
    
    # 再次检查是否有未处理的深层嵌套数据
    if not navigation_data:
        print("警告: 未找到数据，尝试更全面的扫描...")
        
        # 尝试直接从根目录递归扫描所有文件夹
        def deep_scan(items, parent_name="根目录"):
            if not isinstance(items, list):
                return
                
            temp_data = {}
            links = []
            subfolders = []
            
            for item in items:
                if item.get('type') == 'link':
                    links.append({
                        'type': 'link',
                        'title': item.get('title', '未知标题'),
                        'url': item.get('url', '#'),
                        'icon': item.get('icon', '🔗')
                    })
                elif item.get('type') == 'folder':
                    subfolder_title = item.get('title', '未命名文件夹')
                    subfolders.append((subfolder_title, item))
            
            # 如果当前层级有链接，创建一个"直接链接"分类
            if links:
                temp_data[f"{parent_name}_直接链接"] = links
                print(f"调试信息: 深层扫描 - 在{parent_name}找到{len(links)}个直接链接")
            
            # 递归处理子文件夹
            for subfolder_title, subfolder in subfolders:
                if 'children' in subfolder:
                    child_data = deep_scan(subfolder['children'], subfolder_title)
                    if child_data:
                        temp_data[subfolder_title] = child_data
            
            return temp_data
        
        # 对顶级数据进行深层扫描
        deep_data = deep_scan(pintree_data)
        if deep_data:
            navigation_data["深层扫描结果"] = deep_data
            print(f"调试信息: 深层扫描找到数据，添加到'深层扫描结果'分类")
    
    print(f"调试信息: 转换完成，最终导航数据包含 {len(navigation_data)} 个主分类")
    return navigation_data


def update_html_file(html_file_path, navigation_data):
    """
    更新HTML文件中的导航数据
    
    参数:
        html_file_path: HTML文件路径
        navigation_data: 转换后的导航数据
        
    返回:
        bool: 更新是否成功
    """
    try:
        # 读取HTML文件
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 将导航数据转换为JavaScript字符串
        js_data = json.dumps(navigation_data, ensure_ascii=False, indent=2)
        
        # 使用正则表达式查找多行的navigationData定义
        import re
        
        # 尝试多种可能的模式
        patterns = [
            # 模式1: 单行const定义
            r'(const\s+navigationData\s*=\s*)\{[^}]*\};',
            # 模式2: 多行const定义
            r'(const\s+navigationData\s*=\s*)\{[\s\S]*?\};',
            # 模式3: 也支持let和var声明
            r'(let|var)\s+navigationData\s*=\s*\{[\s\S]*?\};'
        ]
        
        found_pattern = False
        for pattern in patterns:
            match = re.search(pattern, html_content, re.DOTALL)
            if match:
                # 构建替换字符串
                if match.group(1).strip().lower() in ['let', 'var']:
                    # 如果是let或var，保持原来的声明方式
                    replace_pattern = f"{match.group(1)} navigationData = {js_data};"
                else:
                    # 默认使用const
                    replace_pattern = f"{match.group(1)}{js_data};"
                
                # 替换匹配的内容
                new_html_content = re.sub(pattern, replace_pattern, html_content, flags=re.DOTALL)
                
                # 写入更新后的内容
                with open(html_file_path, 'w', encoding='utf-8') as f:
                    f.write(new_html_content)
                
                print("✅ HTML文件更新成功")
                found_pattern = True
                break
        
        if not found_pattern:
            # 如果没找到匹配的模式，尝试查找注释后的定义区域
            start_comment = "// 导航数据 - 直接嵌入在HTML中"
            end_marker = ";"
            
            if start_comment in html_content:
                start_idx = html_content.find("const navigationData", html_content.find(start_comment))
                if start_idx != -1:
                    end_idx = html_content.find(end_marker, start_idx)
                    if end_idx != -1:
                        # 替换整个navigationData定义
                        new_content = html_content[:start_idx] + f"const navigationData = {js_data};" + html_content[end_idx+1:]
                        
                        with open(html_file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        
                        print("✅ HTML文件更新成功（备用方法）")
                        found_pattern = True
            
            if not found_pattern:
                print("❌ 未找到需要替换的navigationData变量")
                # 打印一些调试信息以帮助定位问题
                if "navigationData" in html_content:
                    print("⚠️ HTML文件中存在navigationData，但格式与预期不符")
                return False
        
        # 更新版本信息（如果有）
        update_version_info(html_file_path)
        
        return True
            
    except Exception as e:
        print(f"❌ 更新HTML文件时出错: {str(e)}")
        import traceback
        print(f"错误详情: {traceback.format_exc()}")
        return False


def update_version_info(html_file_path):
    """
    更新HTML文件中的版本信息时间戳
    """
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 获取当前时间
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # 替换版本信息中的时间戳
        pattern = r'静态导航页面 v[\d.]+(.*?)\|'
        replacement = f'静态导航页面 v1.0 (更新时间: {current_time}) |'
        
        updated_content = re.sub(pattern, replacement, html_content)
        
        with open(html_file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
            
    except Exception as e:
        print(f"更新版本信息失败: {e}")


def main():
    """
    主函数
    """
    # 文件路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    pintree_json_path = os.path.join(current_dir, 'pintree.json')
    html_file_path = os.path.join(current_dir, 'static_navigation_standalone.html')
    
    # 检查文件是否存在
    if not os.path.exists(pintree_json_path):
        print(f"错误: 找不到pintree.json文件")
        return
    
    if not os.path.exists(html_file_path):
        print(f"错误: 找不到HTML文件")
        return
    
    # 读取pintree.json文件
    try:
        with open(pintree_json_path, 'r', encoding='utf-8') as f:
            pintree_data = json.load(f)
    except Exception as e:
        print(f"读取pintree.json文件失败: {e}")
        return
    
    # 转换数据格式
    print("正在转换数据格式...")
    navigation_data = convert_json_format(pintree_data)
    
    # 检查转换后的数据是否为空
    if not navigation_data:
        print("警告: 转换后的数据为空，请检查pintree.json文件格式")
        return
    
    # 打印数据统计信息
    category_count = len(navigation_data)
    total_links = 0
    for category, subcategories in navigation_data.items():
        subcategory_count = len(subcategories)
        for subcategory, links in subcategories.items():
            total_links += len(links)
    
    print(f"数据统计: {category_count} 个分类, {total_links} 个链接")
    
    # 更新HTML文件
    print("正在更新HTML文件...")
    if update_html_file(html_file_path, navigation_data):
        print(f"✅ 成功更新 {html_file_path}")
        print(f"更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print("❌ 更新HTML文件失败")


if __name__ == '__main__':
    print("=" * 60)
    print("静态导航页面数据更新工具")
    print("=" * 60)
    main()
    print("=" * 60)
    print("按任意键退出...")
    input()