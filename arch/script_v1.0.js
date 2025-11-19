/**
 * 导航页面脚本 v1.0
 * 用于解析JSON数据并生成导航页面内容
 */

// 设置当前年份
document.getElementById('current-year').textContent = new Date().getFullYear();

// 主函数：加载并处理书签数据
async function loadBookmarks() {
    try {
        // 获取书签数据
        const response = await fetch('pintree.json');
        if (!response.ok) {
            throw new Error('无法加载书签数据');
        }
        
        const bookmarks = await response.json();
        const container = document.getElementById('bookmarks-container');
        
        // 清除加载提示
        container.innerHTML = '';
        
        // 处理书签数据
        bookmarks.forEach(item => {
            if (item.title === "Bookmarks bar") {
                // 处理书签栏内容
                processChildren(item.children, container);
            }
        });
        
        // 初始化搜索功能
        initSearch();
        
    } catch (error) {
        console.error('加载书签时出错:', error);
        document.getElementById('bookmarks-container').innerHTML = `
            <div class="error">
                <p>加载书签数据时出错</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * 处理子项（文件夹或链接）
 * @param {Array} children - 子项数组
 * @param {HTMLElement} parent - 父容器元素
 * @param {number} level - 嵌套层级
 */
function processChildren(children, parent, level = 0) {
    if (!children || children.length === 0) return;
    
    children.forEach(item => {
        if (item.type === 'folder') {
            // 创建文件夹元素
            const folderElement = createFolderElement(item, level);
            parent.appendChild(folderElement);
            
            // 处理子文件夹和链接
            const folderContent = folderElement.querySelector('.folder-content');
            processChildren(item.children, folderContent, level + 1);
        }
    });
}

/**
 * 创建文件夹元素
 * @param {Object} folder - 文件夹数据
 * @param {number} level - 嵌套层级
 * @returns {HTMLElement} - 文件夹DOM元素
 */
function createFolderElement(folder, level) {
    const folderDiv = document.createElement('div');
    folderDiv.className = level > 0 ? 'folder subfolder' : 'folder';
    
    // 创建文件夹头部
    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';
    folderHeader.innerHTML = `
        <i class="fas fa-folder"></i>
        <div class="folder-title">${escapeHTML(folder.title)}</div>
        <i class="fas fa-chevron-down"></i>
    `;
    
    // 创建文件夹内容容器
    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';
    
    // 先处理子文件夹
    if (folder.children) {
        const folderItems = folder.children.filter(item => item.type === 'folder');
        folderItems.forEach(subFolder => {
            const subFolderElement = createFolderElement(subFolder, level + 1);
            folderContent.appendChild(subFolderElement);
        });
        
        // 再处理链接
        const linkItems = folder.children.filter(item => item.type === 'link');
        linkItems.forEach(link => {
            const linkElement = createLinkElement(link);
            folderContent.appendChild(linkElement);
        });
    }
    
    // 添加点击事件以展开/折叠文件夹
    folderHeader.addEventListener('click', () => {
        folderContent.style.display = folderContent.style.display === 'none' ? 'grid' : 'none';
        const icon = folderHeader.querySelector('.fa-chevron-down, .fa-chevron-up');
        if (icon) {
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        }
    });
    
    folderDiv.appendChild(folderHeader);
    folderDiv.appendChild(folderContent);
    
    return folderDiv;
}

/**
 * 创建链接元素
 * @param {Object} link - 链接数据
 * @returns {HTMLElement} - 链接DOM元素
 */
function createLinkElement(link) {
    const linkElement = document.createElement('a');
    linkElement.className = 'bookmark';
    linkElement.href = link.url;
    linkElement.target = '_blank';
    linkElement.rel = 'noopener noreferrer';
    
    // 创建图标
    const icon = document.createElement('img');
    icon.className = 'bookmark-icon';
    
    // 尝试使用提供的图标，如果失败则使用备用方案
    if (link.icon) {
        icon.src = link.icon;
    } else {
        icon.src = getFaviconUrl(link.url);
    }
    
    icon.alt = '';
    icon.onerror = function() {
        // 如果图标加载失败，尝试使用Google的favicon服务
        this.src = getFaviconUrl(link.url);
        
        // 如果仍然失败，使用默认图标
        this.onerror = function() {
            // 使用Font Awesome图标作为最后的备用方案
            const defaultIcon = document.createElement('i');
            defaultIcon.className = 'fas fa-link bookmark-icon';
            this.parentNode.replaceChild(defaultIcon, this);
        };
    };
    
    // 创建标题
    const title = document.createElement('div');
    title.className = 'bookmark-title';
    title.textContent = link.title;
    
    linkElement.appendChild(icon);
    linkElement.appendChild(title);
    
    return linkElement;
}

/**
 * 初始化搜索功能
 */
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // 搜索函数
    const performSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
        const allBookmarks = document.querySelectorAll('.bookmark');
        const allFolders = document.querySelectorAll('.folder');
        
        if (query === '') {
            // 重置显示
            allBookmarks.forEach(bookmark => {
                bookmark.style.display = '';
            });
            allFolders.forEach(folder => {
                folder.style.display = '';
                folder.querySelector('.folder-content').style.display = '';
            });
            return;
        }
        
        // 搜索书签
        allBookmarks.forEach(bookmark => {
            const title = bookmark.querySelector('.bookmark-title').textContent.toLowerCase();
            const url = bookmark.href.toLowerCase();
            
            if (title.includes(query) || url.includes(query)) {
                bookmark.style.display = '';
                
                // 确保父文件夹可见
                let parent = bookmark.parentElement;
                while (parent && !parent.classList.contains('container')) {
                    if (parent.classList.contains('folder-content')) {
                        parent.style.display = 'grid';
                    }
                    if (parent.classList.contains('folder')) {
                        parent.style.display = '';
                    }
                    parent = parent.parentElement;
                }
            } else {
                bookmark.style.display = 'none';
            }
        });
        
        // 隐藏空文件夹
        allFolders.forEach(folder => {
            const visibleBookmarks = folder.querySelectorAll('.bookmark[style="display: none;"]');
            const visibleSubfolders = folder.querySelectorAll('.folder[style="display: none;"]');
            
            if (visibleBookmarks.length === 0 && visibleSubfolders.length === 0) {
                folder.style.display = 'none';
            }
        });
    };
    
    // 添加事件监听器
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

/**
 * 获取网站图标URL
 * @param {string} url - 网站URL
 * @returns {string} - 图标URL
 */
function getFaviconUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch (e) {
        // 如果URL解析失败，返回默认图标
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OTYgNTEyIj48cGF0aCBmaWxsPSIjNjQ3NDhiIiBkPSJNMzA1IDM4NGgtODBjLTEzLjMgMC0yNC0xMC43LTI0LTI0VjE5MmgtODcuN2MtMTcuOCAwLTI2LjctMjEuNS0xNC4xLTM0LjFMMjQyLjMgNS43YzcuNS03LjUgMTkuOC03LjUgMjcuMyAwbDE0NC4xIDE0NC4xYzEyLjYgMTIuNiAzLjcgMzQuMS0xNC4xIDM0LjFIMzEydjE2OGMwIDEzLjMtMTAuNyAyNC0yNCAyNHoiPjwvcGF0aD48L3N2Zz4=';
    }
}

/**
 * 转义HTML特殊字符
 * @param {string} text - 需要转义的文本
 * @returns {string} - 转义后的文本
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', loadBookmarks);