document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.getElementById('gallery');
    const pagination = document.getElementById('pagination');
    const mainNav = document.getElementById('mainNav');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchScopeBtn = document.getElementById('searchScopeBtn');
    const themeToggle = document.getElementById('themeToggle');
    const imageModal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modalImg');
    const downloadBtn = document.getElementById('downloadBtn');
    const promptModal = document.getElementById('prompt-modal');
    const promptDisplay = document.getElementById('prompt-display');
    const promptText = document.getElementById('prompt-text');
    const copyPromptBtn = document.getElementById('copy-prompt-btn');
    const columnSlider = document.getElementById('columnSlider');

    let currentGroupIndex = 0, currentCategoryIndex = 0, currentPage = 1;
    let columns = 5;
    const itemsPerPage = 50;
    let isSearching = false, searchResults = [];
    let searchInCurrentCategory = false;
    let currentPrompt = '';

    function repositionItems() {
        if (!gallery.offsetParent) return;

        const galleryWidth = gallery.offsetWidth;
        let numColumns = columns;

        if (window.innerWidth <= 768) {
            numColumns = 2;
        } else if (window.innerWidth <= 1200) {
            numColumns = 4;
        }
        
        const gap = window.innerWidth <= 900 ? 15 : 20;
        const itemWidth = (galleryWidth - (numColumns - 1) * gap) / numColumns;
        const columnHeights = new Array(numColumns).fill(0);
        const items = gallery.querySelectorAll(".case-item");

        items.forEach(item => {
            item.style.width = `${itemWidth}px`;
            let minHeight = Math.min(...columnHeights);
            let columnIndex = columnHeights.indexOf(minHeight);
            item.style.top = `${minHeight}px`;
            item.style.left = `${columnIndex * (itemWidth + gap)}px`;
            columnHeights[columnIndex] += item.offsetHeight + gap;
        });
        gallery.style.height = `${Math.max(...columnHeights)}px`;
    }

    async function renderGallery() {
        gallery.style.height = 'auto'; 
        gallery.innerHTML = '<div class="loading-spinner"></div>';
    
        const casesToRender = isSearching ? searchResults : caseData[currentGroupIndex]?.categories[currentCategoryIndex]?.cases;
    
        if (!casesToRender || casesToRender.length === 0) {
            gallery.innerHTML = `<p style="text-align:center; width: 100%;">${isSearching ? "未找到匹配的案例。" : "此分类下暂无案例。"}</p>`;
            gallery.style.height = '50px';
            renderPagination(0);
            return;
        }
    
        gallery.innerHTML = '';
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedCases = casesToRender.slice(startIndex, startIndex + itemsPerPage);
    
        const imageLoadPromises = paginatedCases.map(caseItem => new Promise(resolve => {
            const { src, prompt } = caseItem;
            const caseDiv = document.createElement("div");
            caseDiv.className = "case-item";
    
            const imageContainer = document.createElement("div");
            imageContainer.className = "image-container";
    
            const img = document.createElement("img");
            img.src = src;
            img.alt = src.split('/').pop().replace(/\.[^/.]+$/, "");
            img.onload = resolve;
            img.onerror = resolve; 
    
            imageContainer.appendChild(img);
            imageContainer.onclick = () => openImageModal(src);
    
            const caseInfo = document.createElement("div");
            caseInfo.className = "case-info";
    
            const caseName = document.createElement("p");
            caseName.className = "case-name";
            caseName.textContent = img.alt;
    
            const promptBtn = document.createElement("button");
            promptBtn.className = "expand-prompt-btn";
            promptBtn.textContent = "查看提示";
            promptBtn.onclick = () => openPromptModal(prompt);
    
            caseInfo.appendChild(caseName);
            caseInfo.appendChild(promptBtn);
            caseDiv.appendChild(imageContainer);
            caseDiv.appendChild(caseInfo);
            gallery.appendChild(caseDiv);
        }));
    
        await Promise.all(imageLoadPromises);
        requestAnimationFrame(() => {
            repositionItems();
        });
        renderPagination(casesToRender.length);
    }
    
    function renderPagination(totalItems) {
        pagination.innerHTML = '';
        if (totalItems <= itemsPerPage) {
            pagination.style.display = 'none';
            return;
        }
        pagination.style.display = 'flex';
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        const jumpToPage = (targetPage) => {
            const pageNum = parseInt(targetPage, 10);
            if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
                const jumpInput = document.getElementById('page-jump-input');
                if (jumpInput) {
                    jumpInput.style.borderColor = 'red';
                    setTimeout(() => { jumpInput.style.borderColor = '' }, 1500);
                }
            } else {
                currentPage = pageNum;
                renderGallery();
            }
        };

        const createButton = (text, page, isDisabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.disabled = isDisabled;
            if (isActive) btn.classList.add('active');
            if (page) btn.onclick = () => jumpToPage(page);
            return btn;
        };

        pagination.appendChild(createButton('上一页', currentPage - 1, currentPage === 1));

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pagination.appendChild(createButton(i, i, false, i === currentPage));
            }
        } else {
            const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
            let lastPage = 0;
            Array.from(pages).sort((a, b) => a - b).forEach(page => {
                if (page > 0 && page <= totalPages) {
                    if (page > lastPage + 1) {
                        const ellipsis = document.createElement('span');
                        ellipsis.textContent = '...';
                        ellipsis.className = 'pagination-ellipsis';
                        pagination.appendChild(ellipsis);
                    }
                    pagination.appendChild(createButton(page, page, false, page === currentPage));
                    lastPage = page;
                }
            });
        }

        pagination.appendChild(createButton('下一页', currentPage + 1, currentPage === totalPages));

        if (totalPages > 7) {
            const jumpContainer = document.createElement('div');
            jumpContainer.className = 'pagination-jump';
            jumpContainer.innerHTML = `<span>到第</span><input type="number" id="page-jump-input" min="1" max="${totalItems}"><span>页</span><button>确定</button>`;
            const input = jumpContainer.querySelector('input');
            const btn = jumpContainer.querySelector('button');
            btn.onclick = () => jumpToPage(input.value);
            input.onkeydown = (e) => { if (e.key === 'Enter') jumpToPage(input.value); };
            pagination.appendChild(jumpContainer);
        }
    }

    function renderNavigation() {
        const groupOrder = ['案例咒语', '个性代码', '风格代码'];
        
        caseData.sort((a, b) => {
            const indexA = groupOrder.indexOf(a.group);
            const indexB = groupOrder.indexOf(b.group);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        const dynamicNavs = mainNav.querySelectorAll('.dynamic-nav-group');
        dynamicNavs.forEach(nav => nav.remove());

        caseData.forEach((groupData, groupIndex) => {
            const groupLi = document.createElement("li");
            groupLi.className = "nav-group dynamic-nav-group";

            const groupBtn = document.createElement("button");
            groupBtn.className = "group-btn";
            
            const groupNameSpan = document.createElement("span");
            groupNameSpan.textContent = groupData.group;
            groupBtn.appendChild(groupNameSpan);
            
            groupBtn.onclick = () => {
                if (currentGroupIndex !== groupIndex) {
                    currentGroupIndex = groupIndex;
                    currentCategoryIndex = 0;
                    currentPage = 1;
                    clearSearch();
                    renderAll();
                }
            };
            groupLi.appendChild(groupBtn);

            if (groupData.categories && groupData.categories.length > 0) {
                const categoryList = document.createElement("ul");
                categoryList.className = "category-list";
                groupData.categories.forEach((categoryData, categoryIndex) => {
                    const categoryLi = document.createElement("li");
                    const categoryBtn = document.createElement("button");
                    categoryBtn.textContent = categoryData.name;
                    categoryBtn.className = "category-btn";
                    categoryBtn.onclick = () => {
                        currentGroupIndex = groupIndex;
                        currentCategoryIndex = categoryIndex;
                        currentPage = 1;
                        clearSearch();
                        updateNavActiveState();
                        renderGallery();
                    };
                    categoryLi.appendChild(categoryBtn);
                    categoryList.appendChild(categoryLi);
                });
                groupLi.appendChild(categoryList);
            }
            mainNav.appendChild(groupLi);
        });

        const staticProductNav = document.getElementById('static-nav-product');
        if (staticProductNav) {
            mainNav.appendChild(staticProductNav);
        }
        updateNavActiveState();
    }

    function updateNavActiveState() {
        document.querySelectorAll(".dynamic-nav-group .group-btn, .dynamic-nav-group .category-btn").forEach(btn => btn.classList.remove("active"));
        if (isSearching && !searchInCurrentCategory) {
            return;
        }
        const dynamicNavs = Array.from(mainNav.querySelectorAll('.dynamic-nav-group'));
        const currentGroupLi = dynamicNavs[currentGroupIndex];
        if (currentGroupLi) {
            const groupBtn = currentGroupLi.querySelector(".group-btn");
            if (groupBtn) groupBtn.classList.add("active");
            const categoryList = currentGroupLi.querySelector(".category-list");
            if (categoryList) {
                const categoryBtn = categoryList.children[currentCategoryIndex]?.querySelector(".category-btn");
                if (categoryBtn) categoryBtn.classList.add("active");
            }
        }
    }
    
    function openImageModal(src) { modalImg.src = src; downloadBtn.href = src; downloadBtn.download = src.split('/').pop(); imageModal.classList.remove('hidden'); }
    function openPromptModal(prompt) { currentPrompt = prompt; promptText.textContent = currentPrompt; promptDisplay.style.display = 'flex'; promptModal.classList.remove('hidden'); }
    function closeModal(modalElement) { modalElement.classList.add('hidden'); }

    function performSearch() {
        const query = searchInput.value.trim().toUpperCase();
        if (!query) {
            clearSearch();
            renderAll();
            return;
        }
        isSearching = true;
        searchResults = [];
        
        let sourceData = [];
        if (searchInCurrentCategory) {
            sourceData = caseData[currentGroupIndex]?.categories[currentCategoryIndex]?.cases || [];
        } else {
            sourceData = caseData.flatMap(group => group.categories.flatMap(cat => cat.cases));
        }

        searchResults = sourceData.filter(caseItem => {
            const imageName = caseItem.src.toUpperCase();
            const promptText = caseItem.prompt.toUpperCase();
            return imageName.includes(query) || promptText.includes(query);
        });
        currentPage = 1;
        updateNavActiveState();
        renderGallery();
    }

    function clearSearch() { isSearching = false; searchInput.value = ''; searchResults = []; }
    function applyTheme(theme) { document.body.classList.toggle('dark', theme === 'dark'); }
    
    searchBtn.onclick = performSearch;
    searchInput.addEventListener('keydown', (e) => (e.key === 'Enter') && performSearch());
    searchScopeBtn.addEventListener('click', () => {
        searchInCurrentCategory = !searchInCurrentCategory;
        searchScopeBtn.classList.toggle('active', searchInCurrentCategory);
        searchScopeBtn.title = searchInCurrentCategory ? '在当前分类下搜索' : '全局搜索';
        if (isSearching) {
            performSearch();
        }
    });

    themeToggle.onclick = () => { const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark'; applyTheme(newTheme); localStorage.setItem('theme', newTheme); };
    document.querySelectorAll('.close-modal-btn').forEach(btn => btn.onclick = (e) => closeModal(e.target.closest('.modal-overlay')));
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.onclick = (e) => (e.target === modal) && closeModal(modal));
    copyPromptBtn.onclick = () => { navigator.clipboard.writeText(currentPrompt).then(() => { const originalText = copyPromptBtn.textContent; copyPromptBtn.textContent = '复制成功!'; setTimeout(() => { copyPromptBtn.textContent = originalText; }, 1500); }); };
    document.addEventListener('keydown', (e) => (e.key === 'Escape') && document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(closeModal));
    
    columnSlider.addEventListener('input', () => {
        columns = parseInt(columnSlider.value, 10);
        localStorage.setItem('galleryColumns', columns);
        requestAnimationFrame(repositionItems);
    });
    
    function init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);

        const savedColumns = localStorage.getItem('galleryColumns');
        if (savedColumns) {
            columns = parseInt(savedColumns, 10);
            columnSlider.value = columns;
        } else {
            columnSlider.value = columns;
        }

        renderAll();
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                requestAnimationFrame(repositionItems);
            }, 250);
        });
    }

    function renderAll() {
        renderNavigation();
        renderGallery();
    }
    
    init();
});