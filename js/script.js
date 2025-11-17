// 粘贴/清空按钮逻辑
const pasteButton = document.getElementById('pasteButton');
const urlInput = document.getElementById('url');

// 存储所有API的解析结果
let apiResults = [];

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
    
    // 显示加载状态
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loadingText').textContent = '正在解析视频，请稍候...';
    
    try {
        // 清空之前的结果
        apiResults = [];
        
        // 并行调用三个API
        document.getElementById('loadingText').textContent = '正在调用解析接口...';
        const [result1, result2, result3] = await Promise.allSettled([
            parseWithAPI1(finalUrl),
            parseWithAPI2(finalUrl),
            parseWithAPI3(finalUrl)
        ]);
        
        // 收集所有成功的结果
        if (result1.status === 'fulfilled' && result1.value.success) {
            apiResults.push({...result1.value, api: 1});
        }
        if (result2.status === 'fulfilled' && result2.value.success) {
            apiResults.push({...result2.value, api: 2});
        }
        if (result3.status === 'fulfilled' && result3.value.success) {
            apiResults.push({...result3.value, api: 3});
        }
        
        if (apiResults.length > 0) {
            // 显示第一个API的结果
            displayResult(apiResults[0].data, apiResults[0].api, 0);
        } else {
            showError('所有API都无法解析此链接，请检查链接是否正确或尝试其他平台。');
        }
    } catch (error) {
        console.error('解析过程中出错：', error);
        document.getElementById('loading').style.display = 'none';
        showError('解析过程中出错，请稍后重试。');
    }
});

// 使用第一个API解析
async function parseWithAPI1(url) {
    try {
        const response = await fetch(`https://api.xinyew.cn/api/douyinjx?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        if (result.code === 200) {
            return {
                success: true,
                data: {
                    video_url: result.data.video_url,
                    play_url: result.data.play_url,
                    parse_time: result.data.parse_time,
                    nickname: result.data.additional_data[0].nickname,
                    signature: result.data.additional_data[0].signature,
                    desc: result.data.additional_data[0].desc,
                    avatar: result.data.additional_data[0].url
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
        const response = await fetch(`https://gy.api.xiaotuo.net/jx?id=${encodeURIComponent(url)}`);
        const result = await response.json();
        
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
                    play_url: result.items[0].url,
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
        
        if (result.code === 200) {
            return {
                success: true,
                data: {
                    video_url: result.data.url,
                    play_url: result.data.url,
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

// 显示解析结果
function displayResult(data, apiSource, resultIndex) {
    // 隐藏加载状态
    document.getElementById('loading').style.display = 'none';
    
    // 显示视频详情
    document.getElementById('video').classList.remove('hidden');
    document.getElementById('parse_time').textContent = data.parse_time;
    
    // 显示视频加载状态
    const videoLoading = document.getElementById('videoLoading');
    videoLoading.classList.remove('hidden');
    
    // 设置视频播放器源
    const videoPlayer = document.getElementById('videoPlayer');
    const videoStatus = document.getElementById('video_status');
    
    // 尝试使用play_url（如果有），否则使用video_url
    const videoUrl = data.play_url || data.video_url;
    videoPlayer.src = videoUrl;
    videoStatus.textContent = '加载中...';
    
    // 监听视频加载事件
    const onLoadedData = () => {
        videoLoading.classList.add('hidden');
        videoStatus.textContent = '已加载';
        showSuccess(`视频解析成功！使用API${apiSource}，点击播放按钮即可观看。`);
    };
    
    const onCanPlay = () => {
        videoStatus.textContent = '可以播放';
    };
    
    const onError = (e) => {
        console.error('视频加载错误:', e);
        
        // 移除当前事件监听器
        videoPlayer.removeEventListener('loadeddata', onLoadedData);
        videoPlayer.removeEventListener('canplay', onCanPlay);
        videoPlayer.removeEventListener('error', onError);
        
        // 尝试下一个API结果
        if (resultIndex < apiResults.length - 1) {
            videoStatus.textContent = `API${apiSource}加载失败，尝试下一个...`;
            setTimeout(() => {
                displayResult(apiResults[resultIndex + 1].data, apiResults[resultIndex + 1].api, resultIndex + 1);
            }, 1000);
        } else {
            videoLoading.classList.add('hidden');
            videoStatus.textContent = '加载失败';
            showError('所有视频源都加载失败，请尝试下载视频。');
        }
    };
    
    // 添加事件监听器
    videoPlayer.addEventListener('loadeddata', onLoadedData);
    videoPlayer.addEventListener('canplay', onCanPlay);
    videoPlayer.addEventListener('error', onError);
    
    // 设置下载按钮
    document.getElementById('downloadBtn').onclick = () => {
        downloadVideo(data.video_url);
    };
    
    // 显示作者信息
    document.getElementById('additional_data').classList.remove('hidden');
    document.getElementById('nickname').textContent = data.nickname || '未知';
    document.getElementById('signature').textContent = data.signature || '暂无签名';
    document.getElementById('desc').textContent = data.desc || '暂无描述';
    
    // 设置头像，添加错误处理
    const avatar = document.getElementById('avatar');
    avatar.src = data.avatar || '';
}

// 下载视频
function downloadVideo(videoUrl) {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
}

// 初始更新按钮状态
updatePasteButton();