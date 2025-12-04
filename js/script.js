// 粘贴/清空按钮逻辑
const pasteButton = document.getElementById('pasteButton');
const urlInput = document.getElementById('url');

// 更新按钮状态
function updatePasteButton() {
    if (urlInput.value.trim() === '') {
        pasteButton.innerHTML = '<i class="fas fa-paste"></i> 粘贴';
        pasteButton.className = 'paste-btn';
    } else {
        pasteButton.innerHTML = '<i class="fas fa-times"></i> 清空';
        pasteButton.className = 'clear-btn';
    }
}

// 初始更新按钮状态
updatePasteButton();

// 监听输入框变化
urlInput.addEventListener('input', function() {
    updatePasteButton();
    // 自动从输入内容中提取链接
    extractUrlFromText(this.value);
});

// 粘贴/清空按钮点击事件
pasteButton.addEventListener('click', async () => {
    if (urlInput.value.trim() === '') {
        // 粘贴功能
        try {
            const text = await navigator.clipboard.readText();
            urlInput.value = text;
            updatePasteButton();
            
            // 尝试从粘贴内容中提取链接
            extractUrlFromText(text);
        } catch (err) {
            console.error('无法读取剪贴板:', err);
            showError('无法读取剪贴板内容，请手动粘贴链接。');
        }
    } else {
        // 清空功能
        urlInput.value = '';
        updatePasteButton();
    }
});

// 从文本中提取URL
function extractUrlFromText(text) {
    // 匹配URL的正则表达式
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    
    if (matches && matches.length > 0) {
        // 找到第一个匹配的URL
        const url = matches[0];
        // 只有当当前输入框内容不等于提取的URL时才更新
        if (urlInput.value !== url) {
            urlInput.value = url;
            updatePasteButton();
            showSuccess(`已自动提取链接: ${url}`);
        }
    }
}

// 解析按钮点击事件
document.getElementById('parseButton').addEventListener('click', async () => {
    const url = urlInput.value.trim();
    
    // 先尝试从输入内容中提取链接
    extractUrlFromText(url);
    
    // 使用提取后的URL
    const finalUrl = urlInput.value.trim();
    
    // 隐藏之前的结果
    document.getElementById('video').classList.add('hidden');
    document.getElementById('additional_data').classList.add('hidden');
    
    if (!finalUrl) {
        showError('请输入视频链接。');
        return;
    }
    
    // 检查网络连接
    if (!navigator.onLine) {
        showError('网络连接不可用，请检查网络连接。');
        return;
    }
    
    // 显示加载状态
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loadingText').textContent = '正在解析视频，请稍候...';
    
    try {
        // 优化API尝试顺序：优先使用稳定的API4，其次API3
        const result4 = await parseWithAPI4(finalUrl);
        if (result4.success && result4.data.video_url) {
            displayResult(result4.data, 4);
        } else {
            // API 4 失败，尝试 API 3
            document.getElementById('loadingText').textContent = '正在尝试备用解析接口...';
            const result3 = await parseWithAPI3(finalUrl);
            if (result3.success && result3.data.video_url) {
                displayResult(result3.data, 3);
            } else {
                // API 3 失败，尝试 API 2
                document.getElementById('loadingText').textContent = '正在尝试第二个解析接口...';
                const result2 = await parseWithAPI2(finalUrl);
                if (result2.success && result2.data.video_url) {
                    displayResult(result2.data, 2);
                } else {
                    // API 2 失败，尝试 API 1
                    document.getElementById('loadingText').textContent = '正在尝试第一个解析接口...';
                    const result1 = await parseWithAPI1(finalUrl);
                    if (result1.success && result1.data.video_url) {
                        displayResult(result1.data, 1);
                    } else {
                        showError('所有解析接口都无法解析此链接，请检查链接是否正确或尝试其他视频。');
                    }
                }
            }
        }
    } catch (error) {
        console.error('解析过程中出错：', error);
        document.getElementById('loading').style.display = 'none';
        showError('解析过程中出错，请稍后重试。');
    }
});

// 使用第一个API解析 - 修复版本
async function parseWithAPI1(url) {
    try {
        const response = await fetch(`https://api.xinyew.cn/api/douyinjx?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        console.log('API1 返回:', result);
        
        if (result.code === 200 && result.data) {
            // 确保有视频数据
            const additionalData = result.data.additional_data && result.data.additional_data[0] ? result.data.additional_data[0] : {};
            
            // 优先使用 video_url (CDN链接)，其次 play_url
            let videoUrl = result.data.video_url || result.data.play_url;
            
            // 确保使用HTTPS
            if (videoUrl && videoUrl.startsWith('http:')) {
                videoUrl = videoUrl.replace('http:', 'https:');
            }
            
            if (!videoUrl) {
                return { success: false, data: {} };
            }
            
            return {
                success: true,
                data: {
                    video_url: videoUrl,
                    parse_time: result.data.parse_time || 'N/A',
                    nickname: additionalData.nickname || '未知',
                    signature: additionalData.signature || '',
                    desc: additionalData.desc || '',
                    avatar: additionalData.url || '',
                    // 保留所有备用URL
                    backup_urls: [
                        result.data.video_url,
                        result.data.play_url
                    ].filter(u => u && u !== videoUrl).map(u => u.startsWith('http:') ? u.replace('http:', 'https:') : u)
                }
            };
        } else {
            return { success: false, data: {} };
        }
    } catch (error) {
        console.error('第一个API解析失败:', error);
        return { success: false, data: {} };
    }
}

// 使用第二个API解析 - 修复版本
async function parseWithAPI2(url) {
    try {
        const response = await fetch(`https://gy.api.xiaotuo.net/jx?id=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        console.log('API2 返回:', result);
        
        if (result.success && result.media_type === 'video' && result.items && result.items.length > 0) {
            // 处理头像URL
            let avatarUrl = '';
            if (result.author && result.author.avatar) {
                if (typeof result.author.avatar === 'string') {
                    avatarUrl = result.author.avatar;
                } else if (result.author.avatar.urlList && result.author.avatar.urlList.length > 0) {
                    avatarUrl = result.author.avatar.urlList[0];
                }
            }
            
            // 获取视频URL并确保使用HTTPS
            let videoUrl = result.items[0].url;
            if (videoUrl && videoUrl.startsWith('http:')) {
                videoUrl = videoUrl.replace('http:', 'https:');
            }
            
            // 收集所有可能的视频URL作为备用
            const backupUrls = result.items.slice(1).map(item => {
                let url = item.url;
                if (url && url.startsWith('http:')) {
                    url = url.replace('http:', 'https:');
                }
                return url;
            }).filter(u => u);
            
            return {
                success: true,
                data: {
                    video_url: videoUrl,
                    parse_time: 'N/A',
                    nickname: result.author ? result.author.nickname : '未知',
                    signature: '',
                    desc: result.title || '',
                    avatar: avatarUrl,
                    backup_urls: backupUrls
                }
            };
        } else {
            return { success: false, data: {} };
        }
    } catch (error) {
        console.error('第二个API解析失败:', error);
        return { success: false, data: {} };
    }
}

// 使用第三个API解析 - 修复版本
async function parseWithAPI3(url) {
    try {
        const response = await fetch(`https://api.guiguiya.com/api/video_qsy/juhe?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        console.log('API3 返回:', result);
        
        if (result.code === 200 && result.data && result.data.url) {
            // 确保使用HTTPS
            let videoUrl = result.data.url;
            if (videoUrl && videoUrl.startsWith('http:')) {
                videoUrl = videoUrl.replace('http:', 'https:');
            }
            
            return {
                success: true,
                data: {
                    video_url: videoUrl,
                    parse_time: 'N/A',
                    nickname: result.data.author || '未知',
                    signature: '',
                    desc: result.data.title || '',
                    avatar: result.data.avatar || '',
                    backup_urls: []
                }
            };
        } else {
            return { success: false, data: {} };
        }
    } catch (error) {
        console.error('第三个API解析失败:', error);
        return { success: false, data: {} };
    }
}

// 使用第四个API解析 - 修复版本
async function parseWithAPI4(url) {
    try {
        const response = await fetch(`https://api.nxvav.cn/api/jiexi/?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        console.log('API4 返回:', result);
        
        if (result.code === 200 && result.data && result.data.url) {
            // 确保使用HTTPS
            let videoUrl = result.data.url;
            if (videoUrl && videoUrl.startsWith('http:')) {
                videoUrl = videoUrl.replace('http:', 'https:');
            }
            
            return {
                success: true,
                data: {
                    video_url: videoUrl,
                    parse_time: 'N/A',
                    nickname: result.data.author || '未知',
                    signature: '',
                    desc: result.data.title || '',
                    avatar: result.data.avatar || '',
                    backup_urls: []
                }
            };
        } else {
            return { success: false, data: {} };
        }
    } catch (error) {
        console.error('第四个API解析失败:', error);
        return { success: false, data: {} };
    }
}

// 显示解析结果 - 全新改进版本
function displayResult(data, apiSource) {
    // 隐藏加载状态
    document.getElementById('loading').style.display = 'none';
    
    // 清理之前的错误消息和备用选项
    const existingFallback = document.querySelector('.video-fallback');
    const existingBackup = document.querySelector('.backup-download');
    const existingManual = document.querySelector('.manual-download');
    if (existingFallback) existingFallback.remove();
    if (existingBackup) existingBackup.remove();
    if (existingManual) existingManual.remove();
    
    // 显示视频详情
    document.getElementById('video').classList.remove('hidden');
    document.getElementById('parse_time').textContent = data.parse_time || 'N/A';
    
    // 显示视频加载状态
    const videoLoading = document.getElementById('videoLoading');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoStatus = document.getElementById('video_status');
    
    videoLoading.classList.remove('hidden');
    videoStatus.textContent = '正在加载视频...';
    
    // 重置视频播放器
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
    videoPlayer.src = '';
    
    // 移除所有监听器
    const newVideoPlayer = videoPlayer.cloneNode(true);
    videoPlayer.parentNode.replaceChild(newVideoPlayer, videoPlayer);
    const player = document.getElementById('videoPlayer');
    
    // 配置视频播放器 - 关键修复
    player.removeAttribute('crossorigin'); // 移除crossorigin避免CORS问题
    player.setAttribute('preload', 'auto');
    player.setAttribute('playsinline', ''); // iOS兼容
    player.setAttribute('webkit-playsinline', ''); // 旧版Safari
    player.setAttribute('x5-video-player-type', 'h5'); // 腾讯X5内核
    player.setAttribute('x5-video-player-fullscreen', 'true');
    
    // 使用API返回的视频URL
    const videoUrl = data.video_url;
    console.log('设置视频URL:', videoUrl);
    console.log('备用URLs:', data.backup_urls);
    
    // 设置视频播放器源
    player.src = videoUrl;
    
    // 尝试加载视频
    let loadTimeout = null;
    let hasLoaded = false;
    
    // 加载超时检测
    loadTimeout = setTimeout(() => {
        if (!hasLoaded) {
            console.warn('视频加载超时');
            videoLoading.classList.add('hidden');
            videoStatus.textContent = '加载超时';
            showFallbackOptions([videoUrl, ...(data.backup_urls || [])], data.desc || 'video');
            showError('视频加载超时，可能由于网络问题或视频链接失效。您可以尝试下载视频。');
        }
    }, 15000); // 15秒超时
    
    // 监听视频加载成功
    player.addEventListener('loadeddata', () => {
        hasLoaded = true;
        clearTimeout(loadTimeout);
        videoLoading.classList.add('hidden');
        videoStatus.textContent = '已加载';
        console.log('视频加载成功');
        showSuccess('视频加载成功！点击播放按钮即可观看。');
    });
    
    player.addEventListener('loadedmetadata', () => {
        console.log('视频元数据加载成功');
        hasLoaded = true;
        clearTimeout(loadTimeout);
    });
    
    player.addEventListener('canplay', () => {
        videoStatus.textContent = '可以播放';
        videoLoading.classList.add('hidden');
    });
    
    // 监听视频加载错误
    player.addEventListener('error', (e) => {
        hasLoaded = true;
        clearTimeout(loadTimeout);
        console.error('视频加载错误:', e);
        console.error('错误代码:', player.error ? player.error.code : 'unknown');
        console.error('错误信息:', player.error ? player.error.message : 'unknown');
        
        videoLoading.classList.add('hidden');
        videoStatus.textContent = '加载失败';
        
        // 获取所有可用的URL
        const allUrls = [videoUrl, ...(data.backup_urls || [])].filter((url, index, self) => 
            url && self.indexOf(url) === index
        );
        
        showFallbackOptions(allUrls, data.desc || 'video');
        
        let errorMsg = '视频无法在浏览器中播放';
        if (player.error) {
            switch (player.error.code) {
                case 1:
                    errorMsg = '视频加载被中止';
                    break;
                case 2:
                    errorMsg = '网络错误导致视频加载失败';
                    break;
                case 3:
                    errorMsg = '视频解码失败';
                    break;
                case 4:
                    errorMsg = '视频格式不支持或视频URL无效';
                    break;
            }
        }
        showError(`${errorMsg}，但您可以尝试下载视频到本地观看。`);
    });
    
    // 尝试加载视频
    player.load();
    
    // 设置下载按钮
    document.getElementById('downloadBtn').onclick = () => {
        const allUrls = [videoUrl, ...(data.backup_urls || [])].filter((url, index, self) => 
            url && self.indexOf(url) === index
        );
        downloadVideo(allUrls[0], data.desc || 'video', allUrls.slice(1));
    };
    
    // 显示作者信息
    document.getElementById('additional_data').classList.remove('hidden');
    document.getElementById('nickname').textContent = data.nickname || '未知';
    document.getElementById('signature').textContent = data.signature || '暂无签名';
    document.getElementById('desc').textContent = data.desc || '暂无描述';
    
    // 设置头像，添加错误处理
    const avatar = document.getElementById('avatar');
    if (data.avatar) {
        avatar.src = data.avatar;
    } else {
        avatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYc8L3RleHQ+PC9zdmc+';
    }
    
    // 显示成功消息
    showSuccess(`视频解析成功！使用的API: ${apiSource}，正在加载视频...`);
}

// 显示备用选项（视频加载失败时）
function showFallbackOptions(videoUrls, desc) {
    const videoContainer = document.querySelector('.video-container');
    const existingFallback = document.querySelector('.video-fallback');
    
    // 避免重复添加
    if (existingFallback) {
        return;
    }
    
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'video-fallback';
    
    // 过滤掉重复的URL
    const uniqueUrls = [...new Set(videoUrls.filter(u => u))];
    
    let downloadButtons = '';
    uniqueUrls.forEach((url, index) => {
        const buttonText = uniqueUrls.length > 1 ? `下载链接 ${index + 1}` : '下载视频';
        downloadButtons += `
            <button class="fallback-download-btn" data-url="${url}" data-desc="${desc}" data-index="${index}">
                <i class="fas fa-download"></i> ${buttonText}
            </button>
        `;
    });
    
    fallbackDiv.innerHTML = `
        <div class="fallback-message">
            <p><i class="fas fa-exclamation-triangle"></i> 视频无法在线播放</p>
            <p class="fallback-tips">可能原因：防盗链限制、CORS跨域问题、或视频格式不兼容</p>
            <p class="fallback-tips"><strong>解决方案：</strong>点击下面的按钮下载视频到本地观看</p>
            <div class="download-options">
                ${downloadButtons}
            </div>
        </div>
    `;
    videoContainer.appendChild(fallbackDiv);
    
    // 设置备用下载按钮
    fallbackDiv.querySelectorAll('.fallback-download-btn').forEach(button => {
        button.onclick = () => {
            const url = button.getAttribute('data-url');
            const desc = button.getAttribute('data-desc');
            const index = parseInt(button.getAttribute('data-index'));
            
            // 获取其他URL作为备用
            const otherUrls = uniqueUrls.filter((u, i) => i !== index);
            downloadVideo(url, desc, otherUrls);
        };
    });
}

// 改进的下载功能 - 处理防盗链403问题
function downloadVideo(primaryUrl, filename = 'video', backupUrls = []) {
    try {
        // 清理文件名
        const cleanFilename = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50) || 'video';
        
        console.log('开始下载:', primaryUrl);
        
        // 检测是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 尝试使用fetch下载（可以避免某些防盗链问题）
        if (isMobile) {
            // 移动端直接显示说明，因为fetch可能被CORS阻止
            showMobileDownloadInstructions(primaryUrl, cleanFilename, backupUrls);
        } else {
            // PC端尝试fetch下载
            attemptFetchDownload(primaryUrl, cleanFilename, backupUrls);
        }
        
    } catch (error) {
        console.error('下载失败:', error);
        showError('下载功能遇到问题，请查看下方的替代方案。');
        showAlternativeDownloadMethods(primaryUrl, cleanFilename, backupUrls);
    }
}

// 尝试使用fetch下载（避免防盗链）
async function attemptFetchDownload(url, filename, backupUrls = []) {
    try {
        showSuccess('正在准备下载，请稍候...');
        
        // 尝试fetch下载
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        // 获取blob
        const blob = await response.blob();
        
        // 创建下载链接
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${filename}.mp4`;
        document.body.appendChild(link);
        link.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        }, 100);
        
        showSuccess('下载已开始！请查看浏览器下载管理器。');
        
    } catch (error) {
        console.error('Fetch下载失败:', error);
        
        // Fetch失败，显示替代方案
        showAlternativeDownloadMethods(url, filename, backupUrls);
    }
}

// 显示移动端下载说明
function showMobileDownloadInstructions(url, filename, backupUrls = []) {
    const videoActions = document.querySelector('.video-actions');
    const existingInstructions = document.querySelector('.download-instructions');
    
    if (existingInstructions) {
        existingInstructions.remove();
    }
    
    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'download-instructions mobile-download';
    
    instructionsDiv.innerHTML = `
        <div class="instruction-content">
            <p><i class="fas fa-mobile-alt"></i> <strong>移动端下载指南：</strong></p>
            <div class="warning-box">
                <p><i class="fas fa-exclamation-triangle"></i> 由于视频平台的防盗链限制（403错误），直接下载会被阻止。</p>
            </div>
            <p><strong>推荐方法（最有效）：</strong></p>
            <ol>
                <li><strong>复制视频链接</strong>，点击下面的按钮复制</li>
                <li><strong>使用专业下载工具</strong>：
                    <ul>
                        <li>Android: ADM下载器、IDM+、迅雷</li>
                        <li>iOS: Documents、Alook浏览器</li>
                    </ul>
                </li>
                <li>在下载工具中<strong>粘贴链接</strong>即可开始下载</li>
            </ol>
            <div class="copy-link-section">
                <button class="copy-link-btn" data-url="${url}">
                    <i class="fas fa-copy"></i> 复制视频链接
                </button>
            </div>
            <p><strong>备选方法：</strong></p>
            <ol>
                <li>使用电脑浏览器访问本网站（成功率更高）</li>
                <li>返回原平台（抖音/快手）APP中保存视频</li>
            </ol>
        </div>
    `;
    
    videoActions.appendChild(instructionsDiv);
    
    // 设置复制链接按钮
    const copyBtn = instructionsDiv.querySelector('.copy-link-btn');
    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(url);
            copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制链接';
            copyBtn.style.background = 'linear-gradient(to right, #00b894, #00a085)';
            showSuccess('视频链接已复制到剪贴板！请在下载工具中粘贴使用。');
            
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> 复制视频链接';
                copyBtn.style.background = '';
            }, 3000);
        } catch (err) {
            // 如果clipboard API失败，显示链接让用户手动复制
            showFallbackCopyMethod(url);
        }
    };
}

// 显示替代下载方案
function showAlternativeDownloadMethods(url, filename, backupUrls = []) {
    const videoActions = document.querySelector('.video-actions');
    const existingInstructions = document.querySelector('.download-instructions');
    
    if (existingInstructions) {
        existingInstructions.remove();
    }
    
    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'download-instructions alternative-download';
    
    const allUrls = [url, ...backupUrls].filter((u, i, self) => u && self.indexOf(u) === i);
    
    instructionsDiv.innerHTML = `
        <div class="instruction-content">
            <p><i class="fas fa-exclamation-circle"></i> <strong>下载遇到问题（403防盗链限制）</strong></p>
            <div class="warning-box">
                <p>视频平台的防盗链机制阻止了直接下载。这是正常现象，以下是解决方案：</p>
            </div>
            
            <div class="solution-section">
                <p><strong>✅ 方案1：使用专业下载工具（推荐）</strong></p>
                <p class="solution-desc">专业下载工具可以绕过防盗链限制</p>
                <ul class="tool-list">
                    <li><strong>Windows:</strong> IDM、迅雷、Free Download Manager</li>
                    <li><strong>Mac:</strong> Downie、Folx</li>
                    <li><strong>Android:</strong> ADM、IDM+</li>
                    <li><strong>iOS:</strong> Documents by Readdle、Alook浏览器</li>
                </ul>
                <button class="copy-link-btn" data-url="${url}">
                    <i class="fas fa-copy"></i> 复制视频链接
                </button>
            </div>
            
            <div class="solution-section">
                <p><strong>✅ 方案2：使用在线解析下载网站</strong></p>
                <p class="solution-desc">搜索"抖音视频下载"找到其他在线工具</p>
            </div>
            
            <div class="solution-section">
                <p><strong>✅ 方案3：返回原平台APP</strong></p>
                <p class="solution-desc">在抖音/快手等APP内直接保存视频</p>
            </div>
            
            ${allUrls.length > 1 ? `
            <div class="backup-urls-section">
                <p><strong>备用链接：</strong></p>
                ${allUrls.map((u, i) => `
                    <button class="backup-copy-btn" data-url="${u}">
                        <i class="fas fa-link"></i> 复制链接 ${i + 1}
                    </button>
                `).join('')}
            </div>
            ` : ''}
        </div>
    `;
    
    videoActions.appendChild(instructionsDiv);
    
    // 设置所有复制按钮
    instructionsDiv.querySelectorAll('.copy-link-btn, .backup-copy-btn').forEach(btn => {
        btn.onclick = async () => {
            const urlToCopy = btn.getAttribute('data-url');
            try {
                await navigator.clipboard.writeText(urlToCopy);
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> 已复制';
                btn.style.background = 'linear-gradient(to right, #00b894, #00a085)';
                showSuccess('链接已复制！请在下载工具中粘贴使用。');
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = '';
                }, 3000);
            } catch (err) {
                showFallbackCopyMethod(urlToCopy);
            }
        };
    });
    
    showError('直接下载被防盗链阻止（403错误），请使用上述替代方案。');
}

// 显示备用复制方法（当clipboard API不可用时）
function showFallbackCopyMethod(url) {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'fallback-copy-box';
    fallbackDiv.innerHTML = `
        <div class="fallback-copy-content">
            <p><strong>请手动复制以下链接：</strong></p>
            <textarea readonly class="url-textarea">${url}</textarea>
            <button class="close-fallback-btn">
                <i class="fas fa-times"></i> 关闭
            </button>
        </div>
    `;
    
    document.body.appendChild(fallbackDiv);
    
    // 自动选中文本
    const textarea = fallbackDiv.querySelector('.url-textarea');
    textarea.select();
    
    // 关闭按钮
    fallbackDiv.querySelector('.close-fallback-btn').onclick = () => {
        fallbackDiv.remove();
    };
    
    // 点击背景关闭
    fallbackDiv.onclick = (e) => {
        if (e.target === fallbackDiv) {
            fallbackDiv.remove();
        }
    };
}


// 显示错误消息
function showError(message) {
    // 移除之前的消息
    const existingError = document.querySelector('.error-message');
    const existingSuccess = document.querySelector('.success-message');
    if (existingError) existingError.remove();
    if (existingSuccess) existingSuccess.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    document.querySelector('.card').appendChild(errorDiv);
    
    // 隐藏加载状态
    document.getElementById('loading').style.display = 'none';
    
    // 5秒后自动移除错误消息
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 8000);
}

// 显示成功消息
function showSuccess(message) {
    // 移除之前的消息
    const existingError = document.querySelector('.error-message');
    const existingSuccess = document.querySelector('.success-message');
    if (existingError) existingError.remove();
    if (existingSuccess) existingSuccess.remove();
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    document.querySelector('.card').appendChild(successDiv);
    
    // 3秒后自动移除成功消息
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// 移动端优化：添加触摸事件支持
document.addEventListener('DOMContentLoaded', function() {
    // 为所有按钮添加触摸反馈
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
    
    // 输入框优化
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.fontSize = '16px'; // 防止iOS缩放
        });
    });
});

// 初始更新按钮状态
updatePasteButton();
