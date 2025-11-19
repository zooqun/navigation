/**
 * 层级导航脚本 v3.0
 * 实现一级目录置顶、左侧子目录、右侧内容的层级关系
 */

// 全局变量
let bookmarksData = [];
let currentPrimaryCategory = null;
let currentSecondaryCategory = null;
let allBookmarks = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * 初始化应用
 */
async function initializeApp() {
    try {
        showLoading();
        await loadBookmarksData();
        renderPrimaryNavigation();
        initializeEventListeners();
        updateTotalStats();
        hideLoading();
    } catch (error) {
        console.error('初始化失败:', error);
        showError('加载书签数据失败，请刷新页面重试');
    }
}

/**
 * 加载书签数据
 */
async function loadBookmarksData() {
    const response = await fetch('pintree.json');
    if (!response.ok) {
        throw new Error('无法加载书签数据');
    }
    
    const data = await response.json();
    bookmarksData = parseBookmarksStructure(data);
    console.log('解析后的书签结构:', bookmarksData);
}

/**
 * 解析书签结构，建立层级关系
 * @param {Array} data - 原始JSON数据
 * @returns {Array} - 解析后的层级结构
 */
function parseBookmarksStructure(data) {
    const structure = [];
    
    // 查找 Bookmarks bar
    const bookmarksBar = data.find(item => item.title === "Bookmarks bar");
    if (bookmarksBar && bookmarksBar.children) {
        bookmarksBar.children.forEach(primaryFolder => {
            if (primaryFolder.type === 'folder') {
                const primaryCategory = {
                    id: generateId(),
                    title: primaryFolder.title,
                    children: [],
                    bookmarks: []
                };
                
                // 处理一级目录的子项
                if (primaryFolder.children) {
                    primaryFolder.children.forEach(subItem => {
                        if (subItem.type === 'folder') {
                            // 子文件夹
                            const subCategory = {
                                id: generateId(),
                                title: subItem.title,
                                parent: primaryCategory.title,
                                bookmarks: []
                            };
                            
                            // 处理子文件夹中的书签
                            if (subItem.children) {
                                subItem.children.forEach(bookmark => {
                                    if (bookmark.type === 'link') {
                                        subCategory.bookmarks.push({
                                            id: generateId(),
                                            title: bookmark.title,
                                            url: bookmark.url,
                                            icon: bookmark.icon,
                                            timestamp: bookmark.addDate,
                                            category: primaryCategory.title,
                                            subcategory: subItem.title
                                        });
                                    }
                                });
                            }
                            
                            primaryCategory.children.push(subCategory);
                        } else if (subItem.type === 'link') {
                            // 直接在一级目录下的书签
                            primaryCategory.bookmarks.push({
                                id: generateId(),
                                title: subItem.title,
                                url: subItem.url,
                                icon: subItem.icon,
                                timestamp: subItem.addDate,
                                category: primaryCategory.title,
                                subcategory: null
                            });
                        }
                    });
                }
                
                structure.push(primaryCategory);
            }
        });
    }
    
    return structure;
}

/**
 * 渲染一级目录导航
 */
function renderPrimaryNavigation() {
    const primaryNavList = document.getElementById('primary-nav-list');
    primaryNavList.innerHTML = '';
    
    bookmarksData.forEach((category, index) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        
        link.href = '#';
        link.textContent = category.title;
        link.dataset.category = category.title;
        link.dataset.categoryId = category.id;
        
        // 默认选中第一个分类
        if (index === 0) {
            link.classList.add('active');
            currentPrimaryCategory = category.title;
            renderSecondaryNavigation(category.title);
            renderContent(category.title);
        }
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handlePrimaryCategoryClick(category.title);
        });
        
        li.appendChild(link);
        primaryNavList.appendChild(li);
    });
}

/**
 * 渲染左侧子目录导航
 * @param {string} primaryCategory - 一级分类名称
 */
function renderSecondaryNavigation(primaryCategory) {
    const category = bookmarksData.find(cat => cat.title === primaryCategory);
    const secondaryNavList = document.getElementById('secondary-nav-list');
    const currentPrimaryTitle = document.getElementById('current-primary-title');
    const subcategoryCount = document.getElementById('subcategory-count');
    
    if (!category) return;
    
    // 更新标题
    currentPrimaryTitle.textContent = category.title;
    subcategoryCount.textContent = category.children.length;
    
    // 清空并重新渲染子目录
    secondaryNavList.innerHTML = '';
    
    // 添加"全部"选项
    const allLi = document.createElement('li');
    const allLink = document.createElement('a');
    allLink.href = '#';
    allLink.innerHTML = '<i class="fas fa-th-large"></i> 全部';
    allLink.classList.add('active');
    allLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleSecondaryCategoryClick(null);
    });
    allLi.appendChild(allLink);
    secondaryNavList.appendChild(allLi);
    
    // 添加子分类
    category.children.forEach(subCategory => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        
        link.href = '#';
        link.innerHTML = `<i class="fas fa-folder"></i> ${subCategory.title}`;
        link.dataset.subcategory = subCategory.title;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleSecondaryCategoryClick(subCategory.title);
        });
        
        li.appendChild(link);
        secondaryNavList.appendChild(li);
    });
}

/**
 * 渲染内容区域
 * @param {string} primaryCategory - 一级分类
 * @param {string} secondaryCategory - 二级分类（可选）
 */
function renderContent(primaryCategory, secondaryCategory = null) {
    const category = bookmarksData.find(cat => cat.title === primaryCategory);
    const contentGrid = document.getElementById('content-grid');
    const currentPath = document.getElementById('current-path');
    const bookmarkCount = document.getElementById('bookmark-count');
    const noContent = document.getElementById('no-content');
    
    if (!category) return;
    
    // 更新路径显示
    if (secondaryCategory) {
        currentPath.textContent = `${primaryCategory} > ${secondaryCategory}`;
    } else {
        currentPath.textContent = primaryCategory;
    }
    
    // 获取要显示的书签
    let bookmarks = [];
    
    if (secondaryCategory) {
        // 显示特定子分类的书签
        const subCategory = category.children.find(sub => sub.title === secondaryCategory);
        if (subCategory) {
            bookmarks = subCategory.bookmarks;
        }
    } else {
        // 显示该一级分类下的所有书签（包括直接书签和所有子分类的书签）
        bookmarks = [...category.bookmarks];
        category.children.forEach(subCategory => {
            bookmarks = bookmarks.concat(subCategory.bookmarks);
        });
    }
    
    // 更新书签计数
    bookmarkCount.textContent = bookmarks.length;
    
    // 清空内容区域
    contentGrid.innerHTML = '';
    
    if (bookmarks.length === 0) {
        noContent.classList.add('visible');
        return;
    }
    
    noContent.classList.remove('visible');
    
    // 渲染书签卡片
    bookmarks.forEach(bookmark => {
        const card = createBookmarkCard(bookmark);
        contentGrid.appendChild(card);
    });
}

/**
 * 创建书签卡片
 * @param {Object} bookmark - 书签数据
 * @returns {HTMLElement} - 卡片元素
 */
function createBookmarkCard(bookmark) {
    const card = document.createElement('a');
    card.className = 'bookmark-card';
    card.href = bookmark.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    
    const iconUrl = getIconUrl(bookmark);
    const description = generateDescription(bookmark.title);
    const date = formatDate(bookmark.timestamp);
    
    card.innerHTML = `
        <div class="bookmark-header">
            <img class="bookmark-icon" src="${iconUrl}" alt="${bookmark.title}" onerror="this.src='https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64'">
            <h3 class="bookmark-title">${escapeHtml(bookmark.title)}</h3>
        </div>
        <p class="bookmark-description">${description}</p>
        <div class="bookmark-meta">
            <span class="bookmark-url">${new URL(bookmark.url).hostname}</span>
            <span class="bookmark-date">${date}</span>
        </div>
    `;
    
    return card;
}

/**
 * 处理一级分类点击
 * @param {string} categoryTitle - 分类标题
 */
function handlePrimaryCategoryClick(categoryTitle) {
    // 更新激活状态
    document.querySelectorAll('.primary-nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-category="${categoryTitle}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    currentPrimaryCategory = categoryTitle;
    currentSecondaryCategory = null;
    
    // 重新渲染子目录和内容
    renderSecondaryNavigation(categoryTitle);
    renderContent(categoryTitle);
}

/**
 * 处理二级分类点击
 * @param {string} subcategoryTitle - 子分类标题（null表示全部）
 */
function handleSecondaryCategoryClick(subcategoryTitle) {
    currentSecondaryCategory = subcategoryTitle;
    
    // 更新激活状态
    document.querySelectorAll('.secondary-nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    if (subcategoryTitle) {
        const activeLink = document.querySelector(`[data-subcategory="${subcategoryTitle}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    } else {
        document.querySelector('.secondary-nav a').classList.add('active');
    }
    
    // 重新渲染内容
    renderContent(currentPrimaryCategory, subcategoryTitle);
}

/**
 * 初始化事件监听器
 */
function initializeEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    searchInput.addEventListener('input', debounce(performSearch, 300));
    searchBtn.addEventListener('click', performSearch);
    
    // 搜索框回车事件
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

/**
 * 搜索功能
 */
function performSearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    
    if (!query) {
        // 如果搜索框为空，显示当前分类的内容
        renderContent(currentPrimaryCategory, currentSecondaryCategory);
        return;
    }
    
    // 在所有书签中搜索
    const allBookmarks = [];
    bookmarksData.forEach(category => {
        category.bookmarks.forEach(bookmark => allBookmarks.push(bookmark));
        category.children.forEach(subCategory => {
            subCategory.bookmarks.forEach(bookmark => allBookmarks.push(bookmark));
        });
    });
    
    const filteredBookmarks = allBookmarks.filter(bookmark => {
        return bookmark.title.toLowerCase().includes(query) ||
               bookmark.url.toLowerCase().includes(query) ||
               bookmark.category.toLowerCase().includes(query) ||
               (bookmark.subcategory && bookmark.subcategory.toLowerCase().includes(query));
    });
    
    // 显示搜索结果
    displaySearchResults(filteredBookmarks, query);
}

/**
 * 显示搜索结果
 * @param {Array} results - 搜索结果
 * @param {string} query - 搜索查询
 */
function displaySearchResults(results, query) {
    const contentGrid = document.getElementById('content-grid');
    const currentPath = document.getElementById('current-path');
    const bookmarkCount = document.getElementById('bookmark-count');
    const noContent = document.getElementById('no-content');
    
    // 更新路径显示
    currentPath.textContent = `搜索结果: "${query}"`;
    bookmarkCount.textContent = results.length;
    
    // 清空内容区域
    contentGrid.innerHTML = '';
    
    if (results.length === 0) {
        noContent.classList.add('visible');
        return;
    }
    
    noContent.classList.remove('visible');
    
    // 渲染搜索结果
    results.forEach(bookmark => {
        const card = createBookmarkCard(bookmark);
        contentGrid.appendChild(card);
    });
}

/**
 * 更新总统计信息
 */
function updateTotalStats() {
    let totalBookmarks = 0;
    bookmarksData.forEach(category => {
        totalBookmarks += category.bookmarks.length;
        category.children.forEach(subCategory => {
            totalBookmarks += subCategory.bookmarks.length;
        });
    });
    
    document.getElementById('total-bookmarks').textContent = totalBookmarks;
}

/**
 * 获取图标URL
 * @param {Object} bookmark - 书签数据
 * @returns {string} - 图标URL
 */
function getIconUrl(bookmark) {
    if (bookmark.icon) {
        return bookmark.icon;
    }
    
    try {
        const hostname = new URL(bookmark.url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch (e) {
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEwIDEzYTUgNSAwIDAgMCA3LjU0LjU0bDMtM2E1IDUgMCAwIDAtNy4wNy03LjA3bC0xLjcyIDEuNzEiLz48cGF0aCBkPSJNMTQgMTFhNSA1IDAgMCAwLTcuNTQtLjU0bC0zIDNhNSA1IDAgMCAwIDcuMDcgNy4wN2wxLjcxLTEuNzEiLz48L3N2Zz4=';
    }
}

/**
 * 生成描述文本
 * @param {string} title - 书签标题
 * @returns {string} - 描述文本
 */
function generateDescription(title) {
    if (title.length > 50) {
        return title.substring(0, 50) + '...';
    }
    return title;
}

/**
 * 格式化日期
 * @param {number} timestamp - 时间戳
 * @returns {string} - 格式化日期
 */
function formatDate(timestamp) {
    if (!timestamp) return '未知';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return '最近';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}月前`;
    
    return `${Math.floor(diffDays / 365)}年前`;
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间
 * @returns {Function} - 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 显示加载状态
 */
function showLoading() {
    document.getElementById('loading-spinner').classList.add('visible');
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    document.getElementById('loading-spinner').classList.remove('visible');
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    const contentGrid = document.getElementById('content-grid');
    contentGrid.innerHTML = `<div class="error">${message}</div>`;
    document.getElementById('no-content').classList.add('visible');
}

/**
 * 生成唯一ID
 * @returns {string} - 唯一ID
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * HTML转义
 * @param {string} text - 要转义的文本
 * @returns {string} - 转义后的文本
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}