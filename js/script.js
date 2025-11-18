// 粘贴/清空按钮逻辑
const pasteButton = document.getElementById('pasteButton');
const urlInput = document.getElementById('url');

// Cloudflare Worker 代理地址 - 替换为你的实际 Worker 地址
const WORKER_URL = 'https://spjx.zgmeaw-f24.workers.dev/'; // 需要替换

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
        setTimeout(() => {
            const mobileGuide = document.getElementById('mobileGuide');
            if (mobileGuide) {
                mobileGuide.classList.remove('hidden');
            }
        }, 500);
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
    
    // 修复移动端帮助按钮
    initMobileHelpButton();
}

// 修复移动端帮助按钮
function initMobileHelpButton() {
    const mobileHelpBtn = document.getElementById('mobileHelpBtn');
    
    // 移除之前的事件监听器，避免重复绑定
    const newHelpBtn = mobileHelpBtn.cloneNode(true);
    mobileHelpBtn.parentNode.replaceChild(newHelpBtn, mobileHelpBtn);
    
    // 重新绑定事件
    document.getElementById('mobileHelpBtn').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileGuide();
    });
    
    // 添加触摸事件支持
    document.getElementById('mobileHelpBtn').addEventListener('touchend', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileGuide();
    });
}

// 切换移动端指南显示状态
function toggleMobileGuide() {
    const guide = document.getElementById('mobileGuide');
    if (guide) {
        guide.classList.toggle('hidden');
    }
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
        // 使用 Worker 代理解析
        const result = await parseWithWorker(finalUrl);
        if (result.success && result.data.video_url) {
            displayResult(result.data);
        } else {
            showError('无法解析此链接，请检查链接是否正确或尝试其他平台。');
        }
    } catch (error) {
        console.error('解析过程中出错：', error);
        document.getElementById('loading').style.display = 'none';
        showError('解析过程中出错，请稍后重试。');
    }
});

// 使用 Worker 代理解析
async function parseWithWorker(url) {
    try {
        // 先尝试直接解析
        const apis = [
            `https://api.xinyew.cn/api/douyinjx?url=${encodeURIComponent(url)}`,
            `https://gy.api.xiaotuo.net/jx?id=${encodeURIComponent(url)}`,
            `https://api.guiguiya.com/api/video_qsy/juhe?url=${encodeURIComponent(url)}`,
            `https://api.nxvav.cn/api/jiexi/?url=${encodeURIComponent(url)}`
        ];
        
        for (let i = 0; i < apis.length; i++) {
            try {
                const apiUrl = apis[i];
                console.log(`尝试API ${i + 1}:`, apiUrl);
                
                // 使用 Worker 代理 API 请求
                const workerApiUrl = `${WORKER_URL}/proxy/api?url=${encodeURIComponent(apiUrl)}`;
                const response = await fetch(workerApiUrl);
                const result = await response.json();
                
                console.log(`API ${i + 1} 返回:`, result);
                
                if ((result.code === 200 || result.success) && (result.data?.video_url || result.data?.url || result.items?.[0]?.url)) {
                    // 处理不同API的响应格式
                    let videoUrl, nickname, signature, desc, avatar;
                    
                    if (result.data?.play_url) {
                        // API1 格式
                        videoUrl = result.data.play_url || result.data.video_url;
                        nickname = result.data.additional_data?.[0]?.nickname || '未知';
                        signature = result.data.additional_data?.[0]?.signature || '';
                        desc = result.data.additional_data?.[0]?.desc || '';
                        avatar = result.data.additional_data?.[0]?.url || '';
                    } else if (result.items?.[0]?.url) {
                        // API2 格式
                        videoUrl = result.items[0].url;
                        nickname = result.author?.nickname || '未知';
                        signature = '';
                        desc = result.title || '';
                        avatar = typeof result.author?.avatar === 'string' ? result.author.avatar : 
                                 (result.author?.avatar?.urlList?.[0] || '');
                    } else if (result.data?.url) {
                        // API3/4 格式
                        videoUrl = result.data.url;
                        nickname = result.data.author || '未知';
                        signature = '';
                        desc = result.data.title || '';
                        avatar = result.data.avatar || '';
                    }
                    
                    if (videoUrl) {
                        return {
                            success: true,
                            data: {
                                video_url: videoUrl,
                                parse_time: result.data?.parse_time || 'N/A',
                                nickname: nickname,
                                signature: signature,
                                desc: desc,
                                avatar: avatar,
                                original_url: videoUrl
                            }
                        };
                    }
                }
            } catch (apiError) {
                console.error(`API ${i + 1} 失败:`, apiError);
                continue;
            }
        }
        
        return { success: false, data: {} };
    } catch (error) {
        console.error('Worker解析失败:', error);
        return { success: false, data: {} };
    }
}

// 显示解析结果
function displayResult(data) {
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
    
    // 设置视频播放器属性
    videoPlayer.setAttribute('crossorigin', 'anonymous');
    videoPlayer.setAttribute('preload', 'none');
    videoPlayer.setAttribute('referrerpolicy', 'no-referrer');
    
    // 使用 Worker 代理视频流
    const proxyVideoUrl = `${WORKER_URL}/proxy/video?url=${encodeURIComponent(data.video_url)}`;
    console.log('使用代理视频URL:', proxyVideoUrl);
    
    // 加载视频
    loadVideoWithRetry(proxyVideoUrl, videoPlayer, videoLoading, videoStatus);
    
    // 设置下载按钮
    document.getElementById('downloadBtn').onclick = () => {
        createProxyDownloadPage(data.video_url, data.desc || 'video');
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
    showSuccess('视频解析成功！正在加载视频...');
}

// 加载视频并重试
function loadVideoWithRetry(videoUrl, videoElement, loadingElement, statusElement, retryCount = 0) {
    const maxRetries = 2;
    
    videoElement.onloadeddata = () => {
        loadingElement.classList.add('hidden');
        statusElement.textContent = '已加载';
        showSuccess('视频加载成功！');
    };

    videoElement.onerror = (e) => {
        console.error(`视频加载错误 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, e);
        
        if (retryCount < maxRetries) {
            statusElement.textContent = `加载失败，正在重试... (${retryCount + 1}/${maxRetries + 1})`;
            setTimeout(() => {
                const retryUrl = videoUrl + (videoUrl.includes('?') ? '&' : '?') + `retry=${Date.now()}`;
                videoElement.src = retryUrl;
                videoElement.load();
                loadVideoWithRetry(videoUrl, videoElement, loadingElement, statusElement, retryCount + 1);
            }, 1000 * (retryCount + 1));
        } else {
            loadingElement.classList.add('hidden');
            statusElement.textContent = '加载失败';
            showFallbackOptions([videoUrl], document.getElementById('desc').textContent || 'video');
            showError('视频加载失败，但您仍然可以尝试下载。');
        }
    };

    statusElement.textContent = `正在加载... (尝试 ${retryCount + 1}/${maxRetries + 1})`;
    videoElement.src = videoUrl;
    videoElement.load();
}

// 创建代理下载页面
function createProxyDownloadPage(videoUrl, filename = 'video') {
    // 清理文件名
    const cleanFilename = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50) || 'video';
    
    // 使用 Worker 代理的视频URL
    const proxyVideoUrl = `${WORKER_URL}/proxy/video?url=${encodeURIComponent(videoUrl)}`;
    const directDownloadUrl = `${WORKER_URL}/proxy/video?url=${encodeURIComponent(videoUrl)}&download=true`;
    
    // 创建下载页面内容
    const downloadHTML = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>视频下载 - AW解析器</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
                }
                body {
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    margin: 0;
                    padding: 20px;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .container {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                }
                h1 {
                    color: #ff0050;
                    margin-bottom: 15px;
                    font-size: 1.5rem;
                }
                .video-preview {
                    width: 100%;
                    max-width: 300px;
                    margin: 15px auto;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #000;
                }
                .video-preview video {
                    width: 100%;
                    border-radius: 8px;
                }
                .download-section {
                    margin: 20px 0;
                }
                .download-btn {
                    background: linear-gradient(to right, #00b894, #00a085);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 15px 25px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    margin: 10px 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    text-decoration: none;
                }
                .manual-download {
                    margin-top: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    font-size: 14px;
                }
                .manual-download a {
                    color: #ff0050;
                    font-weight: bold;
                    text-decoration: none;
                    display: block;
                    margin: 5px 0;
                    padding: 10px;
                    background: white;
                    border-radius: 5px;
                    word-break: break-all;
                }
                .tips {
                    margin-top: 15px;
                    font-size: 12px;
                    color: #666;
                }
                .mobile-tips {
                    background: #e3f2fd;
                    padding: 10px;
                    border-radius: 8px;
                    margin: 10px 0;
                    font-size: 13px;
                }
                .url-box {
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 8px;
                    margin: 10px 0;
                    text-align: left;
                }
                .url-box input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1><i class="fas fa-download"></i> 视频下载</h1>
                <p>选择以下方式下载视频到您的设备</p>
                
                <div class="video-preview">
                    <video controls crossorigin="anonymous">
                        <source src="${proxyVideoUrl}" type="video/mp4">
                        您的浏览器不支持视频播放
                    </video>
                </div>
                
                <div class="download-section">
                    <a href="${directDownloadUrl}" class="download-btn" download="${cleanFilename}.mp4">
                        <i class="fas fa-download"></i> 直接下载视频
                    </a>
                    
                    <div class="mobile-tips">
                        <strong>移动端提示：</strong>
                        <p>1. 长按视频选择"下载视频"</p>
                        <p>2. 或点击浏览器菜单中的下载选项</p>
                    </div>
                </div>
                
                <div class="manual-download">
                    <p><strong>备用下载方法：</strong></p>
                    <div class="url-box">
                        <p>复制此链接到下载工具：</p>
                        <input type="text" value="${directDownloadUrl}" readonly id="downloadUrl">
                        <button onclick="copyUrl()" style="margin-top: 5px; padding: 5px 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">复制链接</button>
                    </div>
                </div>
            </div>

            <script>
                function copyUrl() {
                    const input = document.getElementById('downloadUrl');
                    input.select();
                    input.setSelectionRange(0, 99999);
                    document.execCommand('copy');
                    alert('下载链接已复制到剪贴板');
                }
                
                // 自动尝试复制链接
                setTimeout(() => {
                    try {
                        copyUrl();
                    } catch (e) {
                        console.log('自动复制失败');
                    }
                }, 1000);
            </script>
        </body>
        </html>
    `;
    
    // 打开新窗口并写入内容
    const downloadWindow = window.open('', '_blank');
    if (downloadWindow) {
        downloadWindow.document.write(downloadHTML);
        downloadWindow.document.close();
        showSuccess('下载页面已打开，请选择下载方式。');
    } else {
        // 如果弹窗被阻止，在当前页面显示下载链接
        showError('弹窗被阻止，请允许弹窗或使用手动下载。');
        const manualDownload = document.createElement('div');
        manualDownload.className = 'manual-download';
        manualDownload.innerHTML = `
            <p>请 <a href="${directDownloadUrl}" target="_blank" download="${cleanFilename}.mp4">点击这里下载视频</a></p>
            <p>或复制链接: <input type="text" value="${directDownloadUrl}" readonly style="width: 100%; padding: 5px; margin: 5px 0;"></p>
        `;
        document.querySelector('.video-actions').appendChild(manualDownload);
    }
}

// 显示备用选项
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
                createProxyDownloadPage(url, desc);
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
    const existingError = document.querySelector('.error-message');
    const existingSuccess = document.querySelector('.success-message');
    if (existingError) existingError.remove();
    if (existingSuccess) existingSuccess.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    document.querySelector('.card').appendChild(errorDiv);
    
    document.getElementById('loading').style.display = 'none';
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// 显示成功消息
function showSuccess(message) {
    const existingError = document.querySelector('.error-message');
    const existingSuccess = document.querySelector('.success-message');
    if (existingError) existingError.remove();
    if (existingSuccess) existingSuccess.remove();
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    document.querySelector('.card').appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// 移动端优化
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
            this.style.fontSize = '16px';
        });
    });
    
    // 初始化平台检测
    initPlatformDetection();
});

// 初始更新按钮状态
updatePasteButton();