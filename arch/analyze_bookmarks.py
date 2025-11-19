#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
书签结构分析工具
用于准确解析pintree.json文件并输出其完整的书签层次结构
"""
import json
import os


def parse_bookmark_structure(bookmarks_data, indent=0, show_links=False):
    """
    递归解析书签结构
    
    参数:
        bookmarks_data: 书签数据（列表或字典）
        indent: 缩进级别，用于格式化输出
        show_links: 是否显示链接（False表示只统计数量）
    
    返回:
        structure: 格式化的书签结构字符串
        stats: 统计信息字典
    """
    structure = []
    stats = {
        'folders': 0,
        'links': 0,
        'total_depth': indent
    }
    
    # 确保数据是列表格式
    if isinstance(bookmarks_data, dict):
        bookmarks_data = [bookmarks_data]
    
    links_in_this_level = []
    folders_in_this_level = []
    
    for item in bookmarks_data:
        if isinstance(item, dict):
            # 处理文件夹
            if item.get('type') == 'folder':
                stats['folders'] += 1
                folder_title = item.get('title', '未命名文件夹')
                folders_in_this_level.append({
                    'title': folder_title,
                    'children': item.get('children', [])
                })
            # 处理链接
            elif item.get('type') == 'link':
                stats['links'] += 1
                if show_links:
                    link_title = item.get('title', '未命名链接')
                    links_in_this_level.append(link_title)
    
    # 先输出文件夹
    for folder in folders_in_this_level:
        structure.append(' ' * indent + f"📁 {folder['title']}")
        # 递归处理子项
        if folder['children']:
            child_structure, child_stats = parse_bookmark_structure(
                folder['children'], indent + 2, show_links
            )
            structure.extend(child_structure)
            stats['folders'] += child_stats['folders']
            stats['links'] += child_stats['links']
            stats['total_depth'] = max(stats['total_depth'], child_stats['total_depth'])
    
    # 然后输出链接（如果需要）
    if show_links and links_in_this_level:
        # 如果链接太多，只显示数量
        if len(links_in_this_level) > 5:
            structure.append(' ' * indent + f"🔗 包含 {len(links_in_this_level)} 个链接")
        else:
            for link_title in links_in_this_level:
                structure.append(' ' * indent + f"🔗 {link_title}")
    elif not show_links and stats['links'] > 0 and indent > 0:
        # 不显示链接时，只在非顶层显示数量信息
        structure.append(' ' * indent + f"🔗 包含链接")
    
    return structure, stats


def get_root_folder(bookmarks_data):
    """
    获取根文件夹信息
    分析数据结构，找出实际的根文件夹
    """
    # 检查数据是否为列表且非空
    if isinstance(bookmarks_data, list) and bookmarks_data:
        # 检查第一个元素是否包含children
        if len(bookmarks_data) == 1 and isinstance(bookmarks_data[0], dict):
            # 情况1: 根节点是单个对象，可能直接包含children
            if 'children' in bookmarks_data[0]:
                return bookmarks_data[0].get('title', '根文件夹'), bookmarks_data[0]['children']
        
        # 情况2: 列表中的元素可能是顶级文件夹
        # 检查是否所有元素都是folder类型
        all_folders = all(item.get('type') == 'folder' for item in bookmarks_data if isinstance(item, dict))
        if all_folders:
            return '根文件夹', bookmarks_data
    
    # 默认返回
    return '根文件夹', bookmarks_data


def analyze_json_file(file_path):
    """
    分析JSON文件并输出书签结构
    """
    try:
        # 读取文件
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"\n📋 开始分析文件: {os.path.basename(file_path)}")
        print(f"📊 文件大小: {os.path.getsize(file_path)} 字节")
        
        # 获取根文件夹信息
        root_title, root_children = get_root_folder(data)
        
        print(f"\n🏗️  书签结构 ({root_title}):")
        # 设置show_links=False以避免输出被截断
        structure, stats = parse_bookmark_structure(root_children, show_links=False)
        
        # 输出结构
        for line in structure:
            print(line)
        
        # 输出每个顶级文件夹的详细信息
        print(f"\n📊 详细分类统计:")
        for item in root_children:
            if isinstance(item, dict) and item.get('type') == 'folder':
                title = item.get('title', '未命名文件夹')
                _, child_stats = parse_bookmark_structure(item.get('children', []), 0, False)
                print(f"  - {title}: {child_stats['folders']}个子文件夹, {child_stats['links']}个链接")
        
        print(f"\n📈 统计信息:")
        print(f"  文件夹总数: {stats['folders']}")
        print(f"  链接总数: {stats['links']}")
        print(f"  最大嵌套深度: {stats['total_depth']}")
        
        # 输出详细的顶级分类信息
        print(f"\n🔍 顶级分类详情:")
        for item in root_children:
            if isinstance(item, dict) and item.get('type') == 'folder':
                title = item.get('title', '未命名文件夹')
                children_count = len(item.get('children', []))
                print(f"  - {title}: {children_count} 个项目")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON解析错误: {e}")
        return False
    except Exception as e:
        print(f"❌ 分析出错: {e}")
        return False


if __name__ == "__main__":
    # 主程序
    json_file_path = "pintree.json"
    
    if os.path.exists(json_file_path):
        analyze_json_file(json_file_path)
    else:
        # 尝试使用绝对路径
        abs_path = os.path.abspath(json_file_path)
        if os.path.exists(abs_path):
            analyze_json_file(abs_path)
        else:
            print(f"❌ 文件不存在: {json_file_path}")
