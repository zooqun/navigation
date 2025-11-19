import json
import re

# 读取pintree.json文件并提取导航数据
def extract_navigation_data():
    try:
        # 读取JSON文件
        with open('pintree.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 假设数据结构是嵌套的文件夹，我们需要提取到三级分类
        navigation_data = {}
        
        # 遍历顶层文件夹
        for item in data:
            if item.get('type') == 'folder' and 'children' in item:
                # 二级分类
                for subfolder in item.get('children', []):
                    if subfolder.get('type') == 'folder' and 'children' in subfolder:
                        category_name = subfolder.get('title')
                        navigation_data[category_name] = {}
                        
                        # 三级分类
                        for child_item in subfolder.get('children', []):
                            if child_item.get('type') == 'folder' and 'children' in child_item:
                                subcategory_name = child_item.get('title')
                                navigation_data[category_name][subcategory_name] = []
                                
                                # 收集链接
                                for link_item in child_item.get('children', []):
                                    if link_item.get('type') == 'link':
                                        # 简化链接数据
                                        simplified_link = {
                                            'type': link_item.get('type'),
                                            'title': link_item.get('title', '无标题'),
                                            'icon': link_item.get('icon', '🔗'),
                                            'url': link_item.get('url', '#')
                                        }
                                        navigation_data[category_name][subcategory_name].append(simplified_link)
        
        return navigation_data
    except Exception as e:
        print(f"解析JSON文件时出错: {e}")
        return {}

# 生成JavaScript数据字符串
def generate_js_data(navigation_data):
    # 使用JSON.dumps转换，但需要处理icon字段中的特殊字符
    js_data = json.dumps(navigation_data, ensure_ascii=False, indent=4)
    
    # 替换字符串中的图标URL为emoji
    # 简单的emoji映射
    icon_mapping = {
        'https://logo.clearbit.com/': '🔗',
        'https://favicon': '🖼️',
        'www.pkulaw.com': '🔍',
        'www.qcc.com': '💼',
        'wenshu.court.gov.cn': '⚖️',
        '12348.gov.cn': '📋',
        'cont.12315.cn': '📝',
        'ds.gov.cn': '📢',
        'neea.edu.cn': '🎓',
        'impta.com.cn': '📋',
        'hhpta.org.cn': '📋',
        'jiuyuanqu.gov.cn': '🏛️',
        'nmgjyyun.cn': '🎓',
        'rsj.baotou.gov.cn': '💼',
        'ipcrs.pbccrc.org.cn': '💳',
        'rev.gov.cn': '🏭',
        'bilibili.com': '🎬',
        '3dcontentcentral.com': '3️⃣',
        'sketchfab.com': '📐',
        'tv.cctv.com': '📺',
        'news.cn': '🔊',
        'ctext.org': '📚',
        'allhistory.com': '📜',
        'laozhaopian5.com': '🗺️',
        'onegreen.net': '🗺️',
        'guoxue123.com': '📚',
        'docuchina.cn': '🎥',
        'csdn.net': '💻',
        'zhihu.com': '🧠',
        'github.com': '🔧',
        'comsol.com': '🧲',
        'itblogcn.com': '🔧',
        'weather.codes': '🌤️',
        'sspai.com': '📱',
        'intel.cn': '⚡',
        'daoisms.org': '📜',
        'zhangzhiyong.cn': '🎓',
        'sohu.com': '💬',
        'txlzp.com': '🗺️',
        'kf.cn': '🏞️',
        'ifeng.com': '🎭',
        'ickoo.com.cn': '📚',
        'sciencenet.cn': '📋',
        'workercn.cn': '⚖️',
        'xh.5156edu.com': '👨🏼‍⚖️',
        '255star.com': '👸🏼',
        'cnki.net': '📊',
        'baike.baidu.com': '🗓️',
        'daoisms.org': '📜',
        'massgrave.dev': '📥',
        'ntcebm7.neea.edu.cn': '🎓',
        'getsimnum.caict.ac.cn': '📱',
        'ipc.court.gov.cn': '🏛️',
        'openai.com': '🤖',
        'google.com': '🔍',
        'bing.com': '🔍',
        'baidu.com': '🔍'
    }
    
    # 替换URL为emoji
    for url_part, emoji in icon_mapping.items():
        js_data = re.sub(f'"icon":\s*"[^"]*{re.escape(url_part)}[^"]*"', f'"icon": "{emoji}"', js_data)
    
    # 替换所有剩余的URL图标为默认图标
    js_data = re.sub(r'"icon":\s*"https?://[^"]*"', '"icon": "🔗"', js_data)
    
    return js_data

# 更新static_navigation.html文件
def update_static_html(js_data):
    try:
        # 读取现有的HTML文件
        with open('static_navigation.html', 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 找到并替换navigationData部分
        # 使用正则表达式匹配navigationData对象
        pattern = r'const\s+navigationData\s*=\s*\{[^\}]*\};'
        replacement = f'const navigationData = {js_data};'
        
        # 替换内容
        updated_html = re.sub(pattern, replacement, html_content, flags=re.DOTALL)
        
        # 写回文件
        with open('static_navigation.html', 'w', encoding='utf-8') as f:
            f.write(updated_html)
        
        print("成功更新static_navigation.html文件")
    except Exception as e:
        print(f"更新HTML文件时出错: {e}")

# 主函数
if __name__ == "__main__":
    print("开始提取导航数据...")
    navigation_data = extract_navigation_data()
    
    if navigation_data:
        print(f"成功提取数据，共{len(navigation_data)}个分类")
        js_data = generate_js_data(navigation_data)
        update_static_html(js_data)
        print("更新完成！")
    else:
        print("未找到有效数据")