// 粘贴/清空按钮逻辑
const pasteButton = document.getElementById('pasteButton');
const urlInput = document.getElementById('url');

// 检测移动端和浏览器
function detectPlatform() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isProblematicBrowser = /Via|XBrowser|Edge|Edg\//i.test(navigator.userAgent);
    
    return { isMobile, isProblematicBrowser };
}

// 显示移动端下载提示
function showMobileDownloadTip() {
    const neverShow = localStorage.getItem('neverShowDownloadTip');
    if (!neverShow) {
        setTimeout(() => {
            document.getElementById('mobileDownloadTip').classList.remove('hidden');
        }, 1000);
    }
}

// 显示浏览器警告
function showBrowserWarning() {
    const { isProblematicBrowser } = detectPlatform();
    if (isProblematicBrowser) {
        document.getElementById('browserWarning').classList.remove('hidden');
    }
}

// 初始化平台检测
function initPlatformDetection() {
    const { isMobile } = detectPlatform();
    
    if (isMobile) {
        showMobileDownloadTip();
        // 移动端默认显示下载指南
        document.getElementById('mobileGuide').classList.remove('hidden');
    }
    
    showBrowserWarning();
    
    // 设置提示关闭事件
    document.getElementById('closeTip').addEventListener('click', () => {
        document.getElementById('mobileDownloadTip').classList.add('hidden');
    });
    
    document.getElementById('neverShowTip').addEventListener('click', () => {
        localStorage.setItem('neverShowDownloadTip', 'true');
        document.getElementById('mobileDownloadTip').classList.add('hidden');
    });
    
    document.getElementById('closeWarning').addEventListener('click', () => {
        document.getElementById('browserWarning').classList.add('hidden');
    });
    
    // 移动端帮助按钮
    document.getElementById('mobileHelpBtn').addEventListener('click', () => {
        const guide = document.getElementById('mobileGuide');
        guide.classList.toggle('hidden');
    });
}

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
        // 自动选择API：依次尝试四个API
        const result = await parseWithAPI1(finalUrl);
        if (result.success && result.data.video_url) {
            displayResult(result.data, 1);
        } else {
            // API 1 失败或没有视频链接，尝试 API 2
            document.getElementById('loadingText').textContent = '正在尝试备用解析接口...';
            const result2 = await parseWithAPI2(finalUrl);
            if (result2.success && result2.data.video_url) {
                displayResult(result2.data, 2);
            } else {
                // API 2 失败或没有视频链接，尝试 API 3
                document.getElementById('loadingText').textContent = '正在尝试第三个解析接口...';
                const result3 = await parseWithAPI3(finalUrl);
                if (result3.success && result3.data.video_url) {
                    displayResult(result3.data, 3);
                } else {
                    // API 3 失败或没有视频链接，尝试 API 4
                    document.getElementById('loadingText').textContent = '正在尝试第四个解析接口...';
                    const result4 = await parseWithAPI4(finalUrl);
                    if (result4.success && result4.data.video_url) {
                        displayResult(result4.data, 4);
                    } else {
                        showError('四个API都无法解析此链接，请检查链接是否正确或尝试其他平台。');
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

// 使用第一个API解析 - 修复：优先使用 play_url
async function parseWithAPI1(url) {
    try {
        const response = await fetch(`https://api.xinyew.cn/api/douyinjx?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        console.log('API1 返回:', result);
        
        if (result.code === 200) {
            // 优先使用 play_url，因为它是有签名的播放地址
            const videoUrl = result.data.play_url || result.data.video_url;
            
            return {
                success: true,
                data: {
                    video_url: videoUrl,
                    parse_time: result.data.parse_time,
                    nickname: result.data.additional_data[0].nickname,
                    signature: result.data.additional_data[0].signature,
                    desc: result.data.additional_data[0].desc,
                    avatar: result.data.additional_data[0].url,
                    play_url: result.data.play_url,
                    original_video_url: result.data.video_url // 保留原始URL备用
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

// 使用第二个API解析
async function parseWithAPI2(url) {
    try {
        // 使用HTTPS端点
        const response = await fetch(`https://gy.api.xiaotuo.net/jx?id=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        console.log('API2 返回:', result);
        
        if (result.success && result.media_type === 'video') {
            // 处理头像URL
            let avatarUrl = '';
            if (result.author && result.author.avatar) {
                if (typeof result.author.avatar === 'string') {
                    avatarUrl = result.author.avatar;
                } else if (result.author.avatar.urlList && result.author.avatar.urlList.length > 0) {
                    avatarUrl = result.author.avatar.urlList[0];
                }
            }
            
            return {
                success: true,
                data: {
                    video_url: result.items[0].url,
                    parse_time: 'N/A',
                    nickname: result.author ? result.author.nickname : '未知',
                    signature: '',
                    desc: result.title || '',
                    avatar: avatarUrl
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

// 使用第三个API解析
async function parseWithAPI3(url) {
    try {
        const response = await fetch(`https://api.guiguiya.com/api/video_qsy/juhe?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        console.log('API3 返回:', result);
        
        if (result.code === 200) {
            return {
                success: true,
                data: {
                    video_url: result.data.url,
                    parse_time: 'N/A',
                    nickname: result.data.author,
                    signature: '',
                    desc: result.data.title,
                    avatar: result.data.avatar
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

// 使用第四个API解析 - 新增API
async function parseWithAPI4(url) {
    try {
        const response = await fetch(`https://api.nxvav.cn/api/jiexi/?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        console.log('API4 返回:', result);
        
        if (result.code === 200) {
            // 将HTTP链接转换为HTTPS
            let videoUrl = result.data.url;
            if (videoUrl.startsWith('http:')) {
                videoUrl = videoUrl.replace('http:', 'https:');
            }
            
            return {
                success: true,
                data: {
                    video_url: videoUrl,
                    parse_time: 'N/A',
                    nickname: result.data.author,
                    signature: '',
                    desc: result.data.title,
                    avatar: result.data.avatar
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

// 显示解析结果
function displayResult(data, apiSource) {
    // 隐藏加载状态
    document.getElementById('loading').style.display = 'none';
    
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
    
    // 设置视频播放器源，添加跨域属性
    videoPlayer.setAttribute('crossorigin', 'anonymous');
    videoPlayer.setAttribute('preload', 'auto');
    
    // 使用API返回的视频URL
    const videoUrl = data.video_url;
    console.log('设置视频URL:', videoUrl);
    
    // 设置视频播放器源
    videoPlayer.src = videoUrl;
    videoPlayer.load();
    
    // 监听视频加载事件
    videoPlayer.addEventListener('loadeddata', () => {
        videoLoading.classList.add('hidden');
        videoStatus.textContent = '已加载';
        console.log('视频加载成功');
        showSuccess('视频加载成功！点击播放按钮即可观看。');
    });
    
    videoPlayer.addEventListener('canplay', () => {
        videoStatus.textContent = '可以播放';
    });
    
    videoPlayer.addEventListener('error', (e) => {
        console.error('视频加载错误:', e);
        videoLoading.classList.add('hidden');
        videoStatus.textContent = '加载失败';
        
        // 显示备用下载选项
        const videoUrls = [videoUrl];
        if (data.original_video_url && data.original_video_url !== videoUrl) {
            videoUrls.push(data.original_video_url);
        }
        if (data.play_url && data.play_url !== videoUrl) {
            videoUrls.push(data.play_url);
        }
        
        showFallbackOptions(videoUrls, data.desc || 'video');
        showError('视频加载失败，但您仍然可以下载视频。');
    });
    
    // 设置下载按钮 - 使用移动端优化的下载功能
    document.getElementById('downloadBtn').onclick = () => {
        mobileDownloadVideo(videoUrl, data.desc || 'video');
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

// 移动端优化的下载功能
function mobileDownloadVideo(videoUrl, filename = 'video') {
    const { isMobile } = detectPlatform();
    
    // 清理文件名，移除非法字符
    const cleanFilename = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50) || 'video';
    
    // 修复视频URL - 确保使用HTTPS
    let finalUrl = videoUrl;
    if (window.location.protocol === 'https:' && videoUrl.startsWith('http:')) {
        finalUrl = videoUrl.replace('http:', 'https:');
    }
    
    if (isMobile) {
        // 移动端策略：直接打开链接，让用户手动下载
        const newTab = window.open(finalUrl, '_blank');
        
        // 显示移动端下载提示
        showMobileDownloadTip();
        
        if (!newTab || newTab.closed || typeof newTab.closed == 'undefined') {
            showError('新窗口被阻止，请允许弹窗或长按下面的链接手动下载。');
            
            // 提供手动下载链接
            const manualDownload = document.createElement('div');
            manualDownload.className = 'manual-download';
            manualDownload.innerHTML = `
                <p>如果下载没有开始，请 <a href="${finalUrl}" target="_blank">点击这里打开视频</a> 然后长按视频选择下载</p>
            `;
            document.querySelector('.video-actions').appendChild(manualDownload);
        } else {
            showSuccess('视频已在新窗口打开，请长按视频选择"下载视频"');
        }
    } else {
        // 桌面端策略：尝试直接下载
        try {
            const a = document.createElement('a');
            a.href = finalUrl;
            a.download = `${cleanFilename}_${Date.now()}.mp4`;
            a.target = '_blank';
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
            }, 100);
            
            showSuccess('下载已开始，请查看浏览器下载列表。');
        } catch (error) {
            console.error('下载失败:', error);
            window.open(finalUrl, '_blank');
            showError('自动下载失败，视频已在新窗口打开，请右键另存为。');
        }
    }
}

// 显示备用选项（仅在视频加载失败时显示）
function showFallbackOptions(videoUrls, desc) {
    const videoContainer = document.querySelector('.video-container');
    const existingFallback = document.querySelector('.video-fallback');
    if (!existingFallback) {
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'video-fallback';
        
        let downloadButtons = '';
        videoUrls.forEach((url, index) => {
            const buttonText = videoUrls.length > 1 ? `下载视频 ${index + 1}` : '下载视频';
            downloadButtons += `
                <button class="fallback-download-btn" data-url="${url}" data-desc="${desc}">
                    <i class="fas fa-download"></i> ${buttonText}
                </button>
            `;
        });
        
        fallbackDiv.innerHTML = `
            <div class="fallback-message">
                <p><i class="fas fa-exclamation-triangle"></i> 视频无法在线播放</p>
                <p class="fallback-tips">提示：您仍然可以下载视频到本地观看</p>
                <div class="download-options">
                    ${downloadButtons}
                </div>
                <button class="fallback-try-again-btn">
                    <i class="fas fa-redo"></i> 重新解析
                </button>
            </div>
        `;
        videoContainer.appendChild(fallbackDiv);
        
        // 设置备用下载按钮
        fallbackDiv.querySelectorAll('.fallback-download-btn').forEach(button => {
            button.onclick = () => {
                const url = button.getAttribute('data-url');
                const desc = button.getAttribute('data-desc');
                mobileDownloadVideo(url, desc);
            };
        });
        
        // 设置重新解析按钮
        fallbackDiv.querySelector('.fallback-try-again-btn').onclick = () => {
            document.getElementById('parseButton').click();
        };
    }
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
    }, 5000);
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
    
    // 初始化平台检测
    initPlatformDetection();
});

// 初始更新按钮状态
updatePasteButton();