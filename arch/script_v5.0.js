/**
 * 导航页面脚本 v5.0
 * 功能：处理层级降级显示，忽略一级目录，将二级目录作为一级目录显示
 */

class NavigationApp {
    constructor() {
        this.jsonData = [];
        this.flattenedResources = [];
        this.currentPrimaryCategory = null;
        this.currentSecondaryCategory = null;
        this.currentTertiaryCategory = null;
        
        // 初始化应用
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.renderNavigation();
            
            // 默认选中第一个一级分类（原二级目录）
            if (this.jsonData.length > 0) {
                this.selectPrimaryCategory(this.jsonData[0].title);
            }
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('页面初始化失败，请刷新页面重试');
        }
    }

    /**
     * 加载JSON数据
     */
    async loadData() {
        try {
            // 添加时间戳防止缓存
            const timestamp = new Date().getTime();
            const response = await fetch(`pintree.json?t=${timestamp}`);
            
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('原始数据:', data);
            
            // 处理层级降级：忽略一级目录，将二级目录作为一级目录
            this.jsonData = this.transformDataStructure(data);
            console.log('转换后的数据:', this.jsonData);
            
            // 扁平化资源用于搜索
            this.flattenedResources = this.flattenResources(this.jsonData);
            console.log('扁平化资源数量:', this.flattenedResources.length);
            
        } catch (error) {
            console.error('数据加载失败:', error);
            throw new Error('数据加载失败，请检查网络连接');
        }
    }

    /**
     * 转换数据结构：忽略一级目录，将二级目录作为一级目录
     * @param {Array} originalData - 原始数据
     * @returns {Array} 转换后的数据
     */
    transformDataStructure(originalData) {
        let transformedData = [];
        
        // 遍历原始数据的一级目录
        originalData.forEach(rootItem => {
            if (rootItem.type === 'folder' && rootItem.children) {
                // 将一级目录的子目录提升为一级目录
                rootItem.children.forEach(childItem => {
                    if (childItem.type === 'folder') {
                        // 创建新的一级目录（原二级目录）
                        const newPrimaryCategory = {
                            type: childItem.type,
                            addDate: childItem.addDate,
                            title: childItem.title,
                            children: []
                        };
                        
                        // 处理原三级目录，现在作为二级目录
                        if (childItem.children) {
                            childItem.children.forEach(grandChildItem => {
                                if (grandChildItem.type === 'folder') {
                                    // 文件夹：作为新的二级目录
                                    newPrimaryCategory.children.push({
                                        type: grandChildItem.type,
                                        addDate: grandChildItem.addDate,
                                        title: grandChildItem.title,
                                        children: grandChildItem.children || []
                                    });
                                } else if (grandChildItem.type === 'link') {
                                    // 链接：直接添加到当前目录
                                    newPrimaryCategory.children.push(grandChildItem);
                                }
                            });
                        }
                        
                        transformedData.push(newPrimaryCategory);
                    }
                });
            }
        });
        
        return transformedData;
    }

    /**
     * 扁平化资源用于搜索
     * @param {Array} data - 层级数据
     * @returns {Array} 扁平化的资源数组
     */
    flattenResources(data) {
        const resources = [];
        
        const traverse = (items, primaryCategory = '', secondaryCategory = '', tertiaryCategory = '') => {
            items.forEach(item => {
                if (item.type === 'link') {
                    resources.push({
                        ...item,
                        primaryCategory,
                        secondaryCategory,
                        tertiaryCategory
                    });
                } else if (item.type === 'folder' && item.children) {
                    const currentCategory = tertiaryCategory || secondaryCategory || primaryCategory;
                    traverse(item.children, primaryCategory, secondaryCategory, item.title);
                }
            });
        };
        
        data.forEach(primaryItem => {
            if (primaryItem.children) {
                traverse(primaryItem.children, primaryItem.title, '', '');
            }
        });
        
        return resources;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }

        // 返回顶部按钮
        const backToTopBtn = document.getElementById('backToTop');
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // 监听滚动事件显示/隐藏返回顶部按钮
        window.addEventListener('scroll', () => {
            if (backToTopBtn) {
                if (window.pageYOffset > 300) {
                    backToTopBtn.style.display = 'block';
                } else {
                    backToTopBtn.style.display = 'none';
                }
            }
        });
    }

    /**
     * 渲染导航
     */
    renderNavigation() {
        this.renderPrimaryNavigation();
    }

    /**
     * 渲染一级导航（原二级目录）
     */
    renderPrimaryNavigation() {
        const primaryNav = document.getElementById('primaryNavigation');
        if (!primaryNav) return;

        primaryNav.innerHTML = '';

        this.jsonData.forEach(item => {
            const navItem = document.createElement('div');
            navItem.className = 'primary-nav-item';
            navItem.innerHTML = `
                <a href="#" class="nav-link" data-category="${item.title}">
                    <i class="icon">📁</i>
                    <span>${item.title}</span>
                </a>
            `;

            const link = navItem.querySelector('.nav-link');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectPrimaryCategory(item.title);
            });

            primaryNav.appendChild(navItem);
        });
    }

    /**
     * 选择一级分类（原二级目录）
     * @param {string} categoryTitle - 分类标题
     */
    selectPrimaryCategory(categoryTitle) {
        this.currentPrimaryCategory = categoryTitle;
        this.currentSecondaryCategory = null;
        this.currentTertiaryCategory = null;

        // 更新导航状态
        this.updateNavigationState();

        // 渲染二级导航
        this.renderSecondaryNavigation();

        // 更新面包屑
        this.updateBreadcrumbs();

        // 显示统计信息
        this.updateStatistics();
    }

    /**
     * 渲染二级导航（原三级目录）
     */
    renderSecondaryNavigation() {
        const secondaryNav = document.getElementById('secondaryNavigation');
        const contentArea = document.getElementById('contentArea');
        
        if (!secondaryNav || !contentArea) return;

        const primaryCategory = this.jsonData.find(item => item.title === this.currentPrimaryCategory);
        
        if (!primaryCategory || !primaryCategory.children || primaryCategory.children.length === 0) {
            secondaryNav.innerHTML = '<div class="empty-state">暂无分类</div>';
            contentArea.innerHTML = '<div class="empty-state">暂无内容</div>';
            return;
        }

        // 渲染二级导航
        secondaryNav.innerHTML = '';
        
        primaryCategory.children.forEach(item => {
            if (item.type === 'folder') {
                const navItem = document.createElement('div');
                navItem.className = 'secondary-nav-item';
                navItem.innerHTML = `
                    <a href="#" class="nav-link" data-category="${item.title}">
                        <i class="icon">📁</i>
                        <span>${item.title}</span>
                    </a>
                `;

                const link = navItem.querySelector('.nav-link');
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectSecondaryCategory(item.title);
                });

                secondaryNav.appendChild(navItem);
            }
        });

        // 默认选中第一个二级分类
        const firstSecondaryCategory = primaryCategory.children.find(item => item.type === 'folder');
        if (firstSecondaryCategory) {
            this.selectSecondaryCategory(firstSecondaryCategory.title);
        } else {
            // 如果没有二级分类，直接显示内容
            this.renderContent(primaryCategory.children);
        }
    }

    /**
     * 选择二级分类
     * @param {string} categoryTitle - 分类标题
     */
    selectSecondaryCategory(categoryTitle) {
        this.currentSecondaryCategory = categoryTitle;
        this.currentTertiaryCategory = null;

        // 更新导航状态
        this.updateNavigationState();

        // 渲染内容
        const primaryCategory = this.jsonData.find(item => item.title === this.currentPrimaryCategory);
        if (primaryCategory && primaryCategory.children) {
            const secondaryCategory = primaryCategory.children.find(item => item.title === categoryTitle);
            if (secondaryCategory && secondaryCategory.children) {
                this.renderContent(secondaryCategory.children);
            }
        }

        // 更新面包屑
        this.updateBreadcrumbs();
    }

    /**
     * 渲染内容区域
     * @param {Array} items - 要渲染的项目数组
     */
    renderContent(items) {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;

        if (!items || items.length === 0) {
            contentArea.innerHTML = '<div class="empty-state">暂无内容</div>';
            return;
        }

        // 分组显示：文件夹和链接分开
        const folders = items.filter(item => item.type === 'folder');
        const links = items.filter(item => item.type === 'link');

        let html = '';

        // 显示文件夹
        if (folders.length > 0) {
            html += '<div class="content-section">';
            html += '<h3 class="section-title">📁 分类</h3>';
            html += '<div class="folder-grid">';
            
            folders.forEach(folder => {
                html += `
                    <div class="folder-card" onclick="app.selectTertiaryCategory('${folder.title}')">
                        <div class="folder-icon">📁</div>
                        <div class="folder-title">${folder.title}</div>
                        <div class="folder-count">${folder.children ? folder.children.length : 0} 项</div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        }

        // 显示链接
        if (links.length > 0) {
            html += '<div class="content-section">';
            html += '<h3 class="section-title">🔗 资源</h3>';
            html += '<div class="resource-grid">';
            
            links.forEach(link => {
                const description = this.extractDescription(link.title);
                html += `
                    <div class="resource-card">
                        <div class="resource-icon">
                            <img src="${link.icon || 'https://logo.clearbit.com/' + new URL(link.url).hostname}" 
                                 alt="${link.title}" onerror="this.src='https://via.placeholder.com/32x32/4CAF50/FFFFFF?text=🔗'">
                        </div>
                        <div class="resource-content">
                            <h4 class="resource-title">
                                <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a>
                            </h4>
                            <p class="resource-description">${description}</p>
                            <div class="resource-meta">
                                <span class="resource-date">${this.formatDate(link.addDate)}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        }

        contentArea.innerHTML = html;
    }

    /**
     * 选择三级分类（显示具体链接）
     * @param {string} categoryTitle - 分类标题
     */
    selectTertiaryCategory(categoryTitle) {
        this.currentTertiaryCategory = categoryTitle;

        // 查找并显示三级分类的内容
        const primaryCategory = this.jsonData.find(item => item.title === this.currentPrimaryCategory);
        if (primaryCategory && primaryCategory.children) {
            const secondaryCategory = primaryCategory.children.find(item => item.title === this.currentSecondaryCategory);
            if (secondaryCategory && secondaryCategory.children) {
                const tertiaryCategory = secondaryCategory.children.find(item => item.title === categoryTitle);
                if (tertiaryCategory && tertiaryCategory.children) {
                    this.renderContent(tertiaryCategory.children);
                }
            }
        }

        // 更新面包屑
        this.updateBreadcrumbs();
    }

    /**
     * 处理搜索
     * @param {string} query - 搜索关键词
     */
    handleSearch(query) {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;

        if (!query.trim()) {
            // 如果搜索为空，恢复原来的显示
            if (this.currentSecondaryCategory) {
                this.selectSecondaryCategory(this.currentSecondaryCategory);
            } else if (this.currentPrimaryCategory) {
                this.selectPrimaryCategory(this.currentPrimaryCategory);
            }
            return;
        }

        const searchResults = this.flattenedResources.filter(resource => 
            resource.title.toLowerCase().includes(query.toLowerCase()) ||
            resource.primaryCategory.toLowerCase().includes(query.toLowerCase()) ||
            resource.secondaryCategory.toLowerCase().includes(query.toLowerCase()) ||
            resource.tertiaryCategory.toLowerCase().includes(query.toLowerCase())
        );

        this.renderSearchResults(searchResults, query);
    }

    /**
     * 渲染搜索结果
     * @param {Array} results - 搜索结果
     * @param {string} query - 搜索关键词
     */
    renderSearchResults(results, query) {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;

        if (results.length === 0) {
            contentArea.innerHTML = `
                <div class="search-no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>未找到相关结果</h3>
                    <p>没有找到与 "${query}" 相关的内容</p>
                    <button onclick="app.clearSearch()" class="btn-clear-search">清除搜索</button>
                </div>
            `;
            return;
        }

        let html = `
            <div class="search-results-header">
                <h3>🔍 搜索结果</h3>
                <p>找到 ${results.length} 个与 "${query}" 相关的结果</p>
                <button onclick="app.clearSearch()" class="btn-clear-search">清除搜索</button>
            </div>
            <div class="search-results">
        `;

        results.forEach(result => {
            const description = this.extractDescription(result.title);
            const categoryPath = [result.primaryCategory, result.secondaryCategory, result.tertiaryCategory]
                .filter(Boolean)
                .join(' > ');
            
            html += `
                <div class="search-result-item">
                    <div class="search-result-icon">
                        <img src="${result.icon || 'https://logo.clearbit.com/' + new URL(result.url).hostname}" 
                             alt="${result.title}" onerror="this.src='https://via.placeholder.com/32x32/4CAF50/FFFFFF?text=🔗'">
                    </div>
                    <div class="search-result-content">
                        <h4 class="search-result-title">
                            <a href="${result.url}" target="_blank" rel="noopener noreferrer">${result.title}</a>
                        </h4>
                        <p class="search-result-description">${description}</p>
                        <div class="search-result-meta">
                            <span class="search-result-category">📂 ${categoryPath}</span>
                            <span class="search-result-date">${this.formatDate(result.addDate)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        contentArea.innerHTML = html;
    }

    /**
     * 清除搜索
     */
    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // 恢复到搜索前的状态
        if (this.currentSecondaryCategory) {
            this.selectSecondaryCategory(this.currentSecondaryCategory);
        } else if (this.currentPrimaryCategory) {
            this.selectPrimaryCategory(this.currentPrimaryCategory);
        }
    }

    /**
     * 更新导航状态
     */
    updateNavigationState() {
        // 更新一级导航状态
        document.querySelectorAll('#primaryNavigation .nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.category === this.currentPrimaryCategory) {
                link.classList.add('active');
            }
        });

        // 更新二级导航状态
        document.querySelectorAll('#secondaryNavigation .nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.category === this.currentSecondaryCategory) {
                link.classList.add('active');
            }
        });
    }

    /**
     * 更新面包屑导航
     */
    updateBreadcrumbs() {
        const breadcrumbs = document.getElementById('breadcrumbs');
        if (!breadcrumbs) return;

        let html = '<a href="#" onclick="app.goHome()">🏠 首页</a>';
        
        if (this.currentPrimaryCategory) {
            html += ` > <a href="#" onclick="app.selectPrimaryCategory('${this.currentPrimaryCategory}')">${this.currentPrimaryCategory}</a>`;
        }
        
        if (this.currentSecondaryCategory) {
            html += ` > <a href="#" onclick="app.selectSecondaryCategory('${this.currentSecondaryCategory}')">${this.currentSecondaryCategory}</a>`;
        }
        
        if (this.currentTertiaryCategory) {
            html += ` > <span>${this.currentTertiaryCategory}</span>`;
        }

        breadcrumbs.innerHTML = html;
    }

    /**
     * 返回首页
     */
    goHome() {
        this.currentPrimaryCategory = null;
        this.currentSecondaryCategory = null;
        this.currentTertiaryCategory = null;
        
        // 清除搜索
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // 恢复初始状态
        if (this.jsonData.length > 0) {
            this.selectPrimaryCategory(this.jsonData[0].title);
        }
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        const statsElement = document.getElementById('statistics');
        if (!statsElement) return;

        let totalCategories = 0;
        let totalResources = 0;

        this.jsonData.forEach(category => {
            totalCategories++;
            if (category.children) {
                category.children.forEach(subCategory => {
                    if (subCategory.children) {
                        subCategory.children.forEach(item => {
                            if (item.type === 'link') {
                                totalResources++;
                            }
                        });
                    }
                });
            }
        });

        statsElement.innerHTML = `
            <div class="stat-item">
                <span class="stat-number">${totalCategories}</span>
                <span class="stat-label">一级分类</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${this.flattenedResources.length}</span>
                <span class="stat-label">资源总数</span>
            </div>
        `;
    }

    /**
     * 提取描述信息
     * @param {string} title - 标题
     * @returns {string} 描述信息
     */
    extractDescription(title) {
        // 简单的描述提取，可以根据需要改进
        if (title.includes('-')) {
            const parts = title.split('-');
            return parts[parts.length - 1].trim();
        }
        if (title.includes('：')) {
            const parts = title.split('：');
            return parts[parts.length - 1].trim();
        }
        return title;
    }

    /**
     * 格式化日期
     * @param {number} timestamp - 时间戳
     * @returns {string} 格式化后的日期
     */
    formatDate(timestamp) {
        if (!timestamp) return '未知时间';
        
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                return '今天';
            } else if (diffDays === 1) {
                return '昨天';
            } else if (diffDays < 7) {
                return `${diffDays}天前`;
            } else if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `${weeks}周前`;
            } else if (diffDays < 365) {
                const months = Math.floor(diffDays / 30);
                return `${months}个月前`;
            } else {
                const years = Math.floor(diffDays / 365);
                return `${years}年前`;
            }
        } catch (error) {
            return '未知时间';
        }
    }

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait) {
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
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>出错了</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-retry">刷新页面</button>
                </div>
            `;
        }
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NavigationApp();
});