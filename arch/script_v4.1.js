/**
 * 导航页面主脚本 - 处理新的JSON层级结构
 * 版本: v4.1 (修复缓存问题)
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
     * 加载JSON数据 - 修复缓存问题
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
            console.log('顶级分类数量:', this.data.length);
            
            // 显示数据概览
            this.data.forEach((item, index) => {
                console.log(`分类 ${index + 1}: ${item.title} (${item.type})`);
                if (item.children) {
                    console.log(`  子项目数量: ${item.children.length}`);
                }
            });
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
        
        console.log('扁平化资源数量:', this.allResources.length);
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

        console.log('开始渲染一级导航，数据长度:', this.data.length);

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
                
                console.log(`添加一级导航: ${item.title}`);
            }
        });
    }

    /**
     * 设置默认分类
     */
    setDefaultCategory() {
        console.log('设置默认分类');
        const firstFolder = this.data.find(item => item.type === 'folder');
        if (firstFolder) {
            const firstIndex = this.data.indexOf(firstFolder);
            console.log('默认分类:', firstFolder.title);
            this.selectPrimaryCategory(firstFolder, firstIndex);
        }
    }

    /**
     * 选择一级分类
     */
    selectPrimaryCategory(category, index) {
        console.log('选择一级分类:', category.title);
        
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
        console.log('渲染二级导航:', primaryCategory.title);
        
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
                    this.selectTertiaryCategory(item, index, link);
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
        console.log('选择二级分类:', category.title);
        
        this.currentSecondary = category;
        this.currentTertiary = null;
        
        // 更新二级导航状态
        document.querySelectorAll('.secondary-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        linkElement.classList.add('active');
        
        // 显示该分类的内容
        this.renderContent(category);
        
        // 更新面包屑
        this.updateBreadcrumb([this.currentPrimary.title, category.title]);
        
        // 更新统计
        this.updateStats();
    }

    /**
     * 选择三级分类
     */
    selectTertiaryCategory(category, index, linkElement) {
        console.log('选择三级分类:', category.title);
        
        this.currentTertiary = category;
        
        // 更新三级导航状态
        document.querySelectorAll('.tertiary-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        linkElement.classList.add('active');
        
        // 显示该分类的内容
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
        console.log('渲染内容:', category.title);
        
        const contentGrid = document.getElementById('contentGrid');
        const contentTitle = document.getElementById('contentTitle');
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('emptyState');
        
        // 显示加载状态
        loading.style.display = 'block';
        contentGrid.style.display = 'none';
        emptyState.style.display = 'none';
        
        // 模拟加载延迟
        setTimeout(() => {
            loading.style.display = 'none';
            
            // 获取所有链接资源
            const resources = this.getAllLinks(category);
            console.log('资源数量:', resources.length);
            
            contentTitle.textContent = category.title;
            
            if (resources.length === 0) {
                contentGrid.style.display = 'none';
                emptyState.style.display = 'block';
            } else {
                contentGrid.style.display = 'grid';
                emptyState.style.display = 'none';
                
                // 渲染资源卡片
                contentGrid.innerHTML = resources.map(resource => this.createResourceCard(resource)).join('');
            }
        }, 300);
    }

    /**
     * 获取分类下的所有链接
     */
    getAllLinks(category) {
        const links = [];
        
        const traverse = (items) => {
            items.forEach(item => {
                if (item.type === 'link') {
                    links.push(item);
                } else if (item.type === 'folder' && item.children) {
                    traverse(item.children);
                }
            });
        };
        
        if (category.children) {
            traverse(category.children);
        }
        
        return links;
    }

    /**
     * 创建资源卡片
     */
    createResourceCard(resource) {
        const description = this.extractDescription(resource);
        const addDate = this.formatDate(resource.addDate);
        
        return `
            <div class="resource-card">
                <div class="resource-icon">
                    <img src="${resource.icon || 'https://logo.clearbit.com/clearbit.com'}" alt="${resource.title}" onerror="this.src='https://logo.clearbit.com/clearbit.com'">
                </div>
                <div class="resource-content">
                    <h3 class="resource-title">
                        <a href="${resource.url}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(resource.title)}</a>
                    </h3>
                    ${description ? `<p class="resource-description">${this.escapeHtml(description)}</p>` : ''}
                    <div class="resource-meta">
                        <span class="resource-date">${addDate}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 处理搜索
     */
    handleSearch() {
        const searchTerm = this.searchTerm.toLowerCase().trim();
        
        if (!searchTerm) {
            // 如果搜索为空，显示当前分类的内容
            if (this.currentTertiary) {
                this.renderContent(this.currentTertiary);
            } else if (this.currentSecondary) {
                this.renderContent(this.currentSecondary);
            } else if (this.currentPrimary) {
                this.renderContent(this.currentPrimary);
            }
            return;
        }
        
        // 搜索所有资源
        const results = this.allResources.filter(resource => {
            const title = resource.title.toLowerCase();
            const url = resource.url.toLowerCase();
            const categoryPath = resource.categoryPath.toLowerCase();
            
            return title.includes(searchTerm) || 
                   url.includes(searchTerm) || 
                   categoryPath.includes(searchTerm);
        });
        
        // 显示搜索结果
        this.renderSearchResults(results, searchTerm);
    }

    /**
     * 渲染搜索结果
     */
    renderSearchResults(results, searchTerm) {
        const contentGrid = document.getElementById('contentGrid');
        const contentTitle = document.getElementById('contentTitle');
        const emptyState = document.getElementById('emptyState');
        
        contentTitle.textContent = `搜索结果: "${searchTerm}"`;
        
        if (results.length === 0) {
            contentGrid.style.display = 'none';
            emptyState.style.display = 'block';
            emptyState.querySelector('h3').textContent = '未找到相关资源';
            emptyState.querySelector('p').textContent = `没有找到与 "${searchTerm}" 相关的资源`;
        } else {
            contentGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            
            contentGrid.innerHTML = results.map(resource => this.createResourceCard(resource)).join('');
        }
        
        // 更新面包屑
        this.updateBreadcrumb(['搜索结果']);
        
        // 更新统计
        this.updateStats(results.length);
    }

    /**
     * 更新面包屑
     */
    updateBreadcrumb(path) {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = path.map((item, index) => {
            if (index === path.length - 1) {
                return `<span class="breadcrumb-item current">${item}</span>`;
            }
            return `<span class="breadcrumb-item">${item}</span><span class="breadcrumb-separator">></span>`;
        }).join('');
    }

    /**
     * 更新统计信息
     */
    updateStats(searchResultCount = null) {
        const categoryCount = document.getElementById('categoryCount');
        const resourceCount = document.getElementById('resourceCount');
        
        if (searchResultCount !== null) {
            resourceCount.textContent = searchResultCount;
            return;
        }
        
        // 计算当前分类下的资源数量
        let categoryCountNum = 0;
        let resourceCountNum = 0;
        
        if (this.currentPrimary) {
            if (this.currentPrimary.children) {
                categoryCountNum = this.currentPrimary.children.filter(item => item.type === 'folder').length;
                resourceCountNum = this.getAllLinks(this.currentPrimary).length;
            }
        }
        
        categoryCount.textContent = categoryCountNum;
        resourceCount.textContent = resourceCountNum;
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
    extractDescription(resource) {
        if (resource.description) {
            return resource.description;
        }
        
        // 从URL中提取域名作为描述
        try {
            const url = new URL(resource.url);
            return url.hostname;
        } catch (e) {
            return '';
        }
    }

    /**
     * 格式化日期
     */
    formatDate(timestamp) {
        if (!timestamp) return '';
        
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString('zh-CN');
        } catch (e) {
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
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        const contentGrid = document.getElementById('contentGrid');
        const emptyState = document.getElementById('emptyState');
        
        contentGrid.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.querySelector('h3').textContent = '加载失败';
        emptyState.querySelector('p').textContent = message;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化导航应用...');
    new NavigationApp();
});