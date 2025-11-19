/**
 * iMyShare风格导航页脚本 v2.0
 * 实现卡片式布局、分类筛选和搜索功能
 */

// 全局变量
let allResources = [];
let filteredResources = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentCategory = 'all';

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
        await loadResources();
        renderResources();
        initializeEventListeners();
        updateStats();
        setupBackToTop();
        setCurrentYear();
    } catch (error) {
        console.error('初始化失败:', error);
        showError('加载资源失败，请刷新页面重试');
    }
}

/**
 * 加载资源数据
 */
async function loadResources() {
    const response = await fetch('pintree.json');
    if (!response.ok) {
        throw new Error('无法加载资源数据');
    }
    
    const data = await response.json();
    allResources = parseBookmarksData(data);
    filteredResources = [...allResources];
}

/**
 * 解析书签数据
 * @param {Array} data - 原始书签数据
 * @returns {Array} - 解析后的资源数组
 */
function parseBookmarksData(data) {
    const resources = [];
    
    data.forEach(item => {
        if (item.title === "Bookmarks bar" && item.children) {
            item.children.forEach(folder => {
                if (folder.children) {
                    const category = getCategoryFromFolder(folder.title);
                    folder.children.forEach(child => {
                        if (child.type === 'link') {
                            resources.push({
                                id: generateId(),
                                title: child.title,
                                url: child.url,
                                icon: child.icon,
                                category: category,
                                tags: extractTags(child.title),
                                description: generateDescription(child.title, category),
                                timestamp: child.addDate
                            });
                        } else if (child.type === 'folder' && child.children) {
                            // 处理子文件夹
                            const subCategory = getCategoryFromFolder(child.title);
                            child.children.forEach(subChild => {
                                if (subChild.type === 'link') {
                                    resources.push({
                                        id: generateId(),
                                        title: subChild.title,
                                        url: subChild.url,
                                        icon: subChild.icon,
                                        category: subCategory || category,
                                        tags: extractTags(subChild.title),
                                        description: generateDescription(subChild.title, subCategory || category),
                                        timestamp: subChild.addDate
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
    
    return resources.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * 根据文件夹名称获取分类
 * @param {string} folderName - 文件夹名称
 * @returns {string} - 分类标识
 */
function getCategoryFromFolder(folderName) {
    const categoryMap = {
        'ToGo': 'tools',
        'ToStudy': 'study',
        '写作': 'study'
    };
    
    return categoryMap[folderName] || 'resources';
}

/**
 * 从标题提取标签
 * @param {string} title - 资源标题
 * @returns {Array} - 标签数组
 */
function extractTags(title) {
    const tags = [];
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('ai') || titleLower.includes('人工智能')) tags.push('AI');
    if (titleLower.includes('免费')) tags.push('免费');
    if (titleLower.includes('在线')) tags.push('在线工具');
    if (titleLower.includes('下载')) tags.push('下载');
    if (titleLower.includes('视频')) tags.push('视频');
    if (titleLower.includes('音乐')) tags.push('音乐');
    if (titleLower.includes('图片') || titleLower.includes('图像')) tags.push('图片');
    if (titleLower.includes('学习') || titleLower.includes('教育')) tags.push('学习');
    if (titleLower.includes('开发') || titleLower.includes('编程')) tags.push('开发');
    if (titleLower.includes('设计')) tags.push('设计');
    
    return tags.length > 0 ? tags : ['实用工具'];
}

/**
 * 生成资源描述
 * @param {string} title - 资源标题
 * @param {string} category - 分类
 * @returns {string} - 描述文本
 */
function generateDescription(title, category) {
    const descriptions = {
        'tools': '实用的在线工具，提升工作效率',
        'study': '学习资源，助力知识积累',
        'entertainment': '娱乐资源，丰富休闲时光',
        'resources': '精选资源，发现更多可能'
    };
    
    return descriptions[category] || '精选实用资源，值得收藏';
}

/**
 * 渲染资源卡片
 */
function renderResources() {
    const grid = document.getElementById('resources-grid');
    const startIndex = 0;
    const endIndex = currentPage * itemsPerPage;
    const resourcesToShow = filteredResources.slice(startIndex, endIndex);
    
    if (currentPage === 1) {
        grid.innerHTML = '';
    }
    
    if (resourcesToShow.length === 0) {
        grid.innerHTML = '<div class="no-results">没有找到匹配的资源</div>';
        return;
    }
    
    resourcesToShow.forEach(resource => {
        const card = createResourceCard(resource);
        grid.appendChild(card);
    });
    
    // 显示/隐藏加载更多按钮
    const loadMoreBtn = document.getElementById('load-more');
    if (endIndex < filteredResources.length) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

/**
 * 创建资源卡片
 * @param {Object} resource - 资源数据
 * @returns {HTMLElement} - 卡片元素
 */
function createResourceCard(resource) {
    const card = document.createElement('a');
    card.className = 'resource-card';
    card.href = resource.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    
    card.innerHTML = `
        <img class="card-icon" src="${getIconUrl(resource)}" alt="${resource.title}" onerror="this.src='https://www.google.com/s2/favicons?domain=${new URL(resource.url).hostname}&sz=64'">
        <div class="card-title">${escapeHtml(resource.title)}</div>
        <div class="card-description">${resource.description}</div>
        <div class="card-tags">
            ${resource.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
        </div>
        <div class="card-meta">
            <span class="card-category">${getCategoryName(resource.category)}</span>
            <span class="card-date">${formatDate(resource.timestamp)}</span>
        </div>
    `;
    
    return card;
}

/**
 * 获取图标URL
 * @param {Object} resource - 资源数据
 * @returns {string} - 图标URL
 */
function getIconUrl(resource) {
    if (resource.icon) {
        return resource.icon;
    }
    
    try {
        const hostname = new URL(resource.url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch (e) {
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEwIDEzYTUgNSAwIDAgMCA3LjU0LjU0bDMtM2E1IDUgMCAwIDAtNy4wNy03LjA3bC0xLjcyIDEuNzEiLz48cGF0aCBkPSJNMTQgMTFhNSA1IDAgMCAwLTcuNTQtLjU0bC0zIDNhNSA1IDAgMCAwIDcuMDcgNy4wN2wxLjcxLTEuNzEiLz48L3N2Zz4=';
    }
}

/**
 * 获取分类名称
 * @param {string} category - 分类标识
 * @returns {string} - 分类显示名称
 */
function getCategoryName(category) {
    const categoryNames = {
        'tools': '工具',
        'study': '学习',
        'entertainment': '娱乐',
        'resources': '资源'
    };
    
    return categoryNames[category] || '其他';
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
 * 初始化事件监听器
 */
function initializeEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    searchInput.addEventListener('input', debounce(performSearch, 300));
    searchBtn.addEventListener('click', performSearch);
    
    // 分类标签
    const categoryTabs = document.querySelectorAll('.tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            currentPage = 1;
            filterResources();
        });
    });
    
    // 加载更多
    const loadMoreBtn = document.querySelector('.load-more-btn');
    loadMoreBtn.addEventListener('click', loadMore);
}

/**
 * 搜索功能
 */
function performSearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    currentPage = 1;
    filterResources(query);
}

/**
 * 筛选资源
 * @param {string} query - 搜索查询
 */
function filterResources(query = '') {
    if (!query && currentCategory === 'all') {
        filteredResources = [...allResources];
    } else {
        filteredResources = allResources.filter(resource => {
            const matchesSearch = !query || 
                resource.title.toLowerCase().includes(query) ||
                resource.description.toLowerCase().includes(query) ||
                resource.tags.some(tag => tag.toLowerCase().includes(query));
            
            const matchesCategory = currentCategory === 'all' || resource.category === currentCategory;
            
            return matchesSearch && matchesCategory;
        });
    }
    
    renderResources();
    updateStats();
}

/**
 * 加载更多
 */
function loadMore() {
    currentPage++;
    renderResources();
}

/**
 * 更新统计信息
 */
function updateStats() {
    const totalCount = document.getElementById('total-count');
    totalCount.textContent = filteredResources.length;
}

/**
 * 设置返回顶部
 */
function setupBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * 设置当前年份
 */
function setCurrentYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
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
    const grid = document.getElementById('resources-grid');
    grid.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>正在加载资源...</p>
        </div>
    `;
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    const grid = document.getElementById('resources-grid');
    grid.innerHTML = `<div class="error">${message}</div>`;
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