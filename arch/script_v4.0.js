/**
 * 导航页面主脚本 - 处理新的JSON层级结构
 * 版本: v4.0
 * 功能: 支持多级嵌套、动态导航、智能搜索
 */

class NavigationApp {
    constructor() {
        this.data = [];
        this.currentPrimary = null;
        this.currentSecondary = null;
        this.currentTertiary = null;
        this.searchTerm = '';
        this.allResources = [];
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.renderPrimaryNav();
            this.setDefaultCategory();
            this.setupBackToTop();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('数据加载失败，请刷新页面重试');
        }
    }

    /**
     * 加载JSON数据
     */
    async loadData() {
        try {
            // 添加时间戳参数以避免缓存
            const timestamp = new Date().getTime();
            const response = await fetch(`pintree.json?t=${timestamp}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.flattenResources();
            console.log('数据加载成功:', this.data);
            console.log('数据加载时间:', new Date().toLocaleString());
        } catch (error) {
            console.error('加载数据失败:', error);
            throw error;
        }
    }

    /**
     * 扁平化所有资源，便于搜索
     */
    flattenResources() {
        this.allResources = [];
        
        const traverse = (items, path = []) => {
            items.forEach(item => {
                const currentPath = [...path, item.title];
                
                if (item.type === 'link') {
                    this.allResources.push({
                        ...item,
                        path: currentPath,
                        categoryPath: path.join(' > ')
                    });
                } else if (item.type === 'folder' && item.children) {
                    traverse(item.children, currentPath);
                }
            });
        };

        this.data.forEach(rootItem => {
            traverse([rootItem], []);
        });
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        searchInput.addEventListener('input', this.debounce((e) => {
            this.searchTerm = e.target.value.trim();
            this.handleSearch();
        }, 300));

        searchBtn.addEventListener('click', () => {
            this.handleSearch();
        });

        // 回车搜索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // 返回顶部
        document.getElementById('backToTop').addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /**
     * 渲染一级导航
     */
    renderPrimaryNav() {
        const primaryNav = document.getElementById('primaryNav');
        primaryNav.innerHTML = '';

        this.data.forEach((item, index) => {
            if (item.type === 'folder') {
                const li = document.createElement('li');
                li.className = 'nav-item';
                
                const link = document.createElement('a');
                link.className = 'nav-link';
                link.textContent = item.title;
                link.href = '#';
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectPrimaryCategory(item, index);
                });

                li.appendChild(link);
                primaryNav.appendChild(li);
            }
        });
    }

    /**
     * 设置默认分类
     */
    setDefaultCategory() {
        const firstFolder = this.data.find(item => item.type === 'folder');
        if (firstFolder) {
            const firstIndex = this.data.indexOf(firstFolder);
            this.selectPrimaryCategory(firstFolder, firstIndex);
        }
    }

    /**
     * 选择一级分类
     */
    selectPrimaryCategory(category, index) {
        this.currentPrimary = category;
        this.currentSecondary = null;
        this.currentTertiary = null;
        
        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach((link, i) => {
            link.classList.toggle('active', i === index);
        });

        // 渲染二级导航
        this.renderSecondaryNav(category);
        
        // 显示所有资源
        this.renderContent(category);
        
        // 更新面包屑
        this.updateBreadcrumb([category.title]);
        
        // 更新统计
        this.updateStats();
    }

    /**
     * 渲染二级导航
     */
    renderSecondaryNav(primaryCategory) {
        const secondaryNav = document.getElementById('secondaryNav');
        const currentCategoryTitle = document.getElementById('currentCategory');
        
        currentCategoryTitle.textContent = primaryCategory.title;
        secondaryNav.innerHTML = '';

        if (!primaryCategory.children) return;

        primaryCategory.children.forEach((item, index) => {
            if (item.type === 'folder') {
                const li = document.createElement('li');
                li.className = 'secondary-nav-item';
                
                const link = document.createElement('a');
                link.className = 'secondary-nav-link';
                link.href = '#';
                link.textContent = item.title;
                
                // 检查是否有子分类
                const hasChildren = item.children && item.children.some(child => child.type === 'folder');
                if (hasChildren) {
                    link.classList.add('has-children');
                }
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectSecondaryCategory(item, index, link);
                });

                li.appendChild(link);
                
                // 如果有子分类，添加三级导航
                if (hasChildren) {
                    const tertiaryNav = this.createTertiaryNav(item);
                    li.appendChild(tertiaryNav);
                }
                
                secondaryNav.appendChild(li);
            }
        });
    }

    /**
     * 创建三级导航
     */
    createTertiaryNav(secondaryCategory) {
        const tertiaryNav = document.createElement('ul');
        tertiaryNav.className = 'tertiary-nav';
        
        secondaryCategory.children.forEach((item, index) => {
            if (item.type === 'folder') {
                const li = document.createElement('li');
                li.className = 'tertiary-nav-item';
                
                const link = document.createElement('a');
                link.className = 'tertiary-nav-link';
                link.href = '#';
                link.textContent = item.title;
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectTertiaryCategory(item, index);
                });

                li.appendChild(link);
                tertiaryNav.appendChild(li);
            }
        });
        
        return tertiaryNav;
    }

    /**
     * 选择二级分类
     */
    selectSecondaryCategory(category, index, linkElement) {
        this.currentSecondary = category;
        this.currentTertiary = null;
        
        // 更新二级导航状态
        document.querySelectorAll('.secondary-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        linkElement.classList.add('active');
        
        // 切换子菜单展开状态
        const hasChildren = category.children && category.children.some(child => child.type === 'folder');
        if (hasChildren) {
            linkElement.classList.toggle('expanded');
            const tertiaryNav = linkElement.parentElement.querySelector('.tertiary-nav');
            if (tertiaryNav) {
                tertiaryNav.classList.toggle('show');
            }
        }
        
        // 渲染内容
        this.renderContent(category);
        
        // 更新面包屑
        this.updateBreadcrumb([this.currentPrimary.title, category.title]);
        
        // 更新统计
        this.updateStats();
    }

    /**
     * 选择三级分类
     */
    selectTertiaryCategory(category, index) {
        this.currentTertiary = category;
        
        // 更新三级导航状态
        document.querySelectorAll('.tertiary-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // 渲染内容
        this.renderContent(category);
        
        // 更新面包屑
        this.updateBreadcrumb([this.currentPrimary.title, this.currentSecondary.title, category.title]);
        
        // 更新统计
        this.updateStats();
    }

    /**
     * 渲染内容
     */
    renderContent(category) {
        const contentGrid = document.getElementById('contentGrid');
        const contentTitle = document.getElementById('contentTitle');
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('emptyState');
        
        // 显示加载状态
        contentGrid.style.display = 'none';
        emptyState.style.display = 'none';
        loading.style.display = 'block';
        
        setTimeout(() => {
            loading.style.display = 'none';
            
            const resources = this.extractResources(category);
            
            if (resources.length === 0) {
                contentGrid.style.display = 'none';
                emptyState.style.display = 'block';
                contentTitle.textContent = category.title;
            } else {
                contentGrid.style.display = 'grid';
                emptyState.style.display = 'none';
                contentTitle.textContent = category.title;
                
                contentGrid.innerHTML = '';
                resources.forEach(resource => {
                    const card = this.createResourceCard(resource);
                    contentGrid.appendChild(card);
                });
            }
            
            this.updateStats();
        }, 300);
    }

    /**
     * 提取资源
     */
    extractResources(category) {
        const resources = [];
        
        const traverse = (items, path = []) => {
            items.forEach(item => {
                const currentPath = [...path, item.title];
                
                if (item.type === 'link') {
                    resources.push({
                        ...item,
                        path: currentPath,
                        categoryPath: path.join(' > ')
                    });
                } else if (item.type === 'folder' && item.children) {
                    traverse(item.children, currentPath);
                }
            });
        };

        if (category.children) {
            traverse(category.children, [category.title]);
        }
        
        return resources;
    }

    /**
     * 创建资源卡片
     */
    createResourceCard(resource) {
        const card = document.createElement('div');
        card.className = 'resource-card';
        
        const iconHtml = resource.icon ? 
            `<img src="${resource.icon}" alt="${resource.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
            '';
        
        const fallbackIcon = `<div class="resource-icon">🔗</div>`;
        
        const description = this.extractDescription(resource.url) || resource.categoryPath || '';
        
        card.innerHTML = `
            <div class="resource-header">
                <div class="resource-icon">
                    ${iconHtml}
                    ${!resource.icon ? fallbackIcon : ''}
                </div>
                <div>
                    <div class="resource-title" title="${resource.title}">${resource.title}</div>
                    <div class="resource-url">${new URL(resource.url).hostname}</div>
                </div>
            </div>
            ${description ? `<div class="resource-description">${description}</div>` : ''}
            <div class="resource-meta">
                <span class="resource-category">${resource.categoryPath || '未分类'}</span>
                <span>${this.formatDate(resource.addDate)}</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            window.open(resource.url, '_blank');
        });
        
        return card;
    }

    /**
     * 处理搜索
     */
    handleSearch() {
        if (!this.searchTerm) {
            // 如果搜索词为空，恢复到当前分类
            if (this.currentTertiary) {
                this.renderContent(this.currentTertiary);
            } else if (this.currentSecondary) {
                this.renderContent(this.currentSecondary);
            } else if (this.currentPrimary) {
                this.renderContent(this.currentPrimary);
            }
            return;
        }
        
        const results = this.searchResources(this.searchTerm);
        this.renderSearchResults(results);
    }

    /**
     * 搜索资源
     */
    searchResources(term) {
        const lowerTerm = term.toLowerCase();
        
        return this.allResources.filter(resource => {
            const titleMatch = resource.title.toLowerCase().includes(lowerTerm);
            const urlMatch = resource.url.toLowerCase().includes(lowerTerm);
            const categoryMatch = resource.categoryPath.toLowerCase().includes(lowerTerm);
            
            return titleMatch || urlMatch || categoryMatch;
        });
    }

    /**
     * 渲染搜索结果
     */
    renderSearchResults(results) {
        const contentGrid = document.getElementById('contentGrid');
        const contentTitle = document.getElementById('contentTitle');
        const emptyState = document.getElementById('emptyState');
        
        contentTitle.textContent = `搜索结果 - "${this.searchTerm}"`;
        
        if (results.length === 0) {
            contentGrid.style.display = 'none';
            emptyState.style.display = 'block';
            emptyState.querySelector('h3').textContent = '未找到相关资源';
            emptyState.querySelector('p').textContent = '尝试使用其他关键词搜索';
        } else {
            contentGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            
            contentGrid.innerHTML = '';
            results.forEach(resource => {
                const card = this.createResourceCard(resource);
                contentGrid.appendChild(card);
            });
        }
        
        this.updateBreadcrumb(['搜索结果']);
        this.updateStats(results.length);
    }

    /**
     * 更新面包屑
     */
    updateBreadcrumb(path) {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = '';
        
        path.forEach((item, index) => {
            const span = document.createElement('span');
            span.className = 'breadcrumb-item';
            
            if (index < path.length - 1) {
                const link = document.createElement('a');
                link.className = 'breadcrumb-link';
                link.textContent = item;
                link.href = '#';
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateToBreadcrumbLevel(index);
                });
                span.appendChild(link);
            } else {
                span.textContent = item;
            }
            
            breadcrumb.appendChild(span);
        });
    }

    /**
     * 导航到面包屑层级
     */
    navigateToBreadcrumbLevel(level) {
        if (level === 0) {
            // 返回一级分类
            this.setDefaultCategory();
        } else if (level === 1 && this.currentSecondary) {
            // 返回二级分类
            this.selectSecondaryCategory(this.currentSecondary, 0, document.querySelector('.secondary-nav-link.active'));
        }
    }

    /**
     * 更新统计信息
     */
    updateStats(resourceCount = null) {
        const categoryCount = document.getElementById('categoryCount');
        const resourceCountEl = document.getElementById('resourceCount');
        
        if (this.currentPrimary) {
            const subCategories = this.currentPrimary.children ? 
                this.currentPrimary.children.filter(item => item.type === 'folder').length : 0;
            categoryCount.textContent = subCategories;
        }
        
        if (resourceCount !== null) {
            resourceCountEl.textContent = resourceCount;
        } else if (this.currentPrimary) {
            const resources = this.extractResources(this.currentPrimary);
            resourceCountEl.textContent = resources.length;
        }
    }

    /**
     * 设置返回顶部按钮
     */
    setupBackToTop() {
        const backToTopBtn = document.getElementById('backToTop');
        
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        });
    }

    /**
     * 提取描述信息
     */
    extractDescription(url) {
        try {
            const hostname = new URL(url).hostname;
            const descriptions = {
                'github.com': '开源代码托管平台',
                'zhihu.com': '知识问答社区',
                'bilibili.com': '视频分享平台',
                'csdn.net': '技术博客平台',
                'juejin.cn': '技术社区',
                'sspai.com': '效率工具分享',
                'allhistory.com': '历史知识平台',
                'news.cn': '新闻资讯',
                'cctv.com': '央视网视频内容',
                'pkulaw.com': '法律法规数据库',
                'qcc.com': '企业信息查询',
                'court.gov.cn': '法院相关信息',
                '12348.gov.cn': '法律服务平台',
                '12315.cn': '市场监管相关'
            };
            
            return descriptions[hostname] || '';
        } catch (error) {
            return '';
        }
    }

    /**
     * 格式化日期
     */
    formatDate(timestamp) {
        if (!timestamp) return '';
        
        try {
            const date = new Date(parseInt(timestamp));
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) {
                return '今天';
            } else if (diffDays < 7) {
                return `${diffDays}天前`;
            } else if (diffDays < 30) {
                return `${Math.floor(diffDays / 7)}周前`;
            } else if (diffDays < 365) {
                return `${Math.floor(diffDays / 30)}个月前`;
            } else {
                return `${Math.floor(diffDays / 365)}年前`;
            }
        } catch (error) {
            return '';
        }
    }

    /**
     * 防抖函数
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
     */
    showError(message) {
        const contentGrid = document.getElementById('contentGrid');
        const emptyState = document.getElementById('emptyState');
        
        contentGrid.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.querySelector('h3').textContent = '出错了';
        emptyState.querySelector('p').textContent = message;
        emptyState.querySelector('.empty-icon').textContent = '❌';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new NavigationApp();
});