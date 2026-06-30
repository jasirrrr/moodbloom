import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Image, Modal, Animated, SafeAreaView, Platform, Dimensions, Linking, Share, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, useAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio'; // 从 expo-av 迁移到 expo-audio
import { API_BASE } from './config';

const MOOD_ICONS = {
  happy: '☀️', calm: '🌿', sad: '🌧️', anxious: '😰',
  angry: '😡', excited: '🎉', grateful: '🙏', tired: '😴',
};

const MOOD_LABELS = {
  happy: '小确幸', calm: '很平静', sad: '有点丧', anxious: '焦虑中',
  angry: '气呼呼', excited: '超开心', grateful: '感恩', tired: '累了',
};

const MBTI_INFO = {
  INTP: { name: '逻辑学家', traits: ['逻辑', '好奇', '独立'] },
  INTJ: { name: '建筑师', traits: ['战略', '独立', '理性'] },
  INFP: { name: '调停者', traits: ['理想', '共情', '真诚'] },
  INFJ: { name: '提倡者', traits: ['洞察', '理想', '温暖'] },
  ENFP: { name: '竞选者', traits: ['热情', '创意', '可能性'] },
  ENTP: { name: '辩论家', traits: ['机智', '创新', '活泼'] },
  ISFP: { name: '探险家', traits: ['艺术', '自由', '好奇'] },
  ESFP: { name: '表演者', traits: ['活力', '热情', '社交'] },
  ISTP: { name: '鉴赏家', traits: ['实用', '逻辑', '冒险'] },
};

const ZODIAC_DATA = {
  aries: { name: '白羊座', icon: '♈', color: '红色' },
  taurus: { name: '金牛座', icon: '♉', color: '金色' },
  gemini: { name: '双子座', icon: '♊', color: '浅蓝' },
  cancer: { name: '巨蟹座', icon: '♋', color: '白色' },
  leo: { name: '狮子座', icon: '♌', color: '金色' },
  virgo: { name: '处女座', icon: '♍', color: '棕色' },
  libra: { name: '天秤座', icon: '♎', color: '粉色' },
  scorpio: { name: '天蝎座', icon: '♏', color: '深红' },
  sagittarius: { name: '射手座', icon: '♐', color: '紫色' },
  capricorn: { name: '摩羯座', icon: '♑', color: '灰色' },
  aquarius: { name: '水瓶座', icon: '♒', color: '蓝色' },
  pisces: { name: '双鱼座', icon: '♓', color: '海蓝' },
};

function getZodiac(birthday) {
  if (!birthday) return null;
  const d = new Date(birthday);
  const m = d.getMonth() + 1, day = d.getDate();
  if ((m===3&&day>=21)||(m===4&&day<=19)) return 'aries';
  if ((m===4&&day>=20)||(m===5&&day<=20)) return 'taurus';
  if ((m===5&&day>=21)||(m===6&&day<=21)) return 'gemini';
  if ((m===6&&day>=22)||(m===7&&day<=22)) return 'cancer';
  if ((m===7&&day>=23)||(m===8&&day<=22)) return 'leo';
  if ((m===8&&day>=23)||(m===9&&day<=22)) return 'virgo';
  if ((m===9&&day>=23)||(m===10&&day<=23)) return 'libra';
  if ((m===10&&day>=24)||(m===11&&day<=22)) return 'scorpio';
  if ((m===11&&day>=23)||(m===12&&day<=21)) return 'sagittarius';
  if ((m===12&&day>=22)||(m===1&&day<=19)) return 'capricorn';
  if ((m===1&&day>=20)||(m===2&&day<=18)) return 'aquarius';
  return 'pisces';
}


export default function App() {
  const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedScore, setSelectedScore] = useState(5);
  const [desc, setDesc] = useState('');
  const [moods, setMoods] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]); // { uri, type: 'image' | 'video' | 'audio', uploadedUrl? }
  const [uploading, setUploading] = useState(false);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  // expo-audio hooks（替代原有的 isRecording/recording/playingAudio state）
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioPlayer = useAudioPlayer('');

  
  // Auth state
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regMoodId, setRegMoodId] = useState('');
  const [regBirthday, setRegBirthday] = useState('');
  const [regMbti, setRegMbti] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  
  // Forgot password state
  const [resetPhone, setResetPhone] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetNewPwd, setResetNewPwd] = useState('');
  
  // Profile state
  const [profileUsername, setProfileUsername] = useState('');
  const [profileMoodId, setProfileMoodId] = useState('');
  const [profileBirthday, setProfileBirthday] = useState('');
  const [profileMbti, setProfileMbti] = useState('');
  
  // AI Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [bouncyValue] = useState(new Animated.Value(0));
  
  // Settings
  const [appTheme, setAppTheme] = useState('auto');
  const [notifications, setNotifications] = useState('all');

  // 动态主题：根据 appTheme 和系统颜色方案计算实际深/浅色
  const isDark = useMemo(() => {
    if (appTheme === 'dark') return true;
    if (appTheme === 'light') return false;
    return systemColorScheme === 'dark'; // 'auto' 跟随系统
  }, [appTheme, systemColorScheme]);

  const themeColors = useMemo(() => ({
    bg: isDark ? '#1a1a2e' : '#FFF8F0',
    card: isDark ? '#2d2d42' : '#ffffff',
    cardBorder: isDark ? '#3d3d5c' : '#f5f5f5',
    text: isDark ? '#f0f0f0' : '#333333',
    subText: isDark ? '#aaaaaa' : '#8E8E8E',
    inputBg: isDark ? '#252540' : '#ffffff',
    inputBorder: isDark ? '#4d4d6c' : '#e0e0e0',
  }), [isDark]);
  
  // Weather
  const [weather, setWeather] = useState({ temp: '--', desc: '获取中...' });
  
  // Share
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingMood, setSharingMood] = useState(null);
  
  // AI Buddy name
  const [buddyName, setBuddyName] = useState('暖暖');
  
  // Mood detail page
  const [detailMood, setDetailMood] = useState(null);
  
  // Image/Video full-screen viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null); // { uri, type }
  
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await AsyncStorage.getItem('moodbloom_token');
        const savedUser = await AsyncStorage.getItem('moodbloom_user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setPage('home');
          loadWeather(savedToken);
          loadMoods(savedToken);
        }
      } catch (e) {
        console.warn('恢复会话失败', e);
      }
    }
    restoreSession();
  }, []);

  // 【Bug修复】通用的带鉴权 fetch 辅助函数
  // 自动注入 Authorization header，统一处理 401 Token 过期
  // 返回 Response 对象；若返回 null 表示 401 已处理（调用方应直接 return）
  async function authFetch(url, options = {}, overrideToken = null) {
    const authToken = overrideToken || token;
    // 没有 token 时不再发请求，直接返回 null（会话已失效或尚未登录）
    if (!authToken) return null;
    const finalHeaders = { ...options.headers };
    // 注入 Authorization header
    finalHeaders['Authorization'] = `Bearer ${authToken}`;
    const finalOptions = { ...options, headers: finalHeaders };
    const res = await fetch(url, finalOptions);
    // Token 过期或无效 → 清除本地会话，跳转登录页
    if (res.status === 401) {
      console.warn('Token 过期或无效，需要重新登录');
      await AsyncStorage.removeItem('moodbloom_token');
      await AsyncStorage.removeItem('moodbloom_user');
      setToken(null);
      setUser(null);
      setMoods([]);
      setChatMessages([]);
      setPage('login');
      return null;
    }
    return res;
  }

  async function doLogin() {
    if (!loginAccount || !loginPassword) { setAuthMsg('请填写账号和密码'); return; }
    setAuthMsg('登录中...');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginAccount, password: loginPassword }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('moodbloom_token', data.token);
        await AsyncStorage.setItem('moodbloom_user', JSON.stringify(data.user));
        setPage('home');
        loadWeather(data.token);
        loadMoods(data.token);
      } else {
        setAuthMsg(data.error || '登录失败');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setAuthMsg('连接超时，请检查网络后重试');
      } else {
        setAuthMsg('网络错误，请稍后重试');
      }
    }
  }
  
  async function doRegister() {
    if (!regPhone || !regUsername || !regPassword) { setAuthMsg('请填写必填项'); return; }
    setAuthMsg('注册中...');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone, username: regUsername, password: regPassword, mood_id: regMoodId, birthday: regBirthday, mbti: regMbti }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('moodbloom_token', data.token);
        await AsyncStorage.setItem('moodbloom_user', JSON.stringify(data.user));
        setPage('home');
        loadWeather(data.token);
        loadMoods(data.token);
      } else {
        setAuthMsg(data.error || '注册失败');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setAuthMsg('连接超时，请检查网络后重试');
      } else {
        setAuthMsg('网络错误，请稍后重试');
      }
    }
  }
  
  async function loadWeather(currentToken) {
    try {
      // 请求定位权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 39.9, lon = 116.4; // 北京兜底坐标
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        } catch (locErr) {
          // 定位失败，使用北京兜底坐标
        }
      }
      const authToken = currentToken || token;
      const controller = new AbortController();
      const weatherTimeout = setTimeout(() => controller.abort(), 10000);
      // 【Bug修复】使用 authFetch 统一处理 401 Token 过期（天气接口 token 可选，但过期仍需处理）
      const res = await authFetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}`, { signal: controller.signal }, authToken);
      clearTimeout(weatherTimeout);
      // authFetch 返回 null 表示 Token 过期已跳转登录页
      if (!res) return;
      const data = await res.json();
      setWeather({ temp: data.temp || '--', desc: (data.description || '') + ' · ' + (data.city || '当前位置') });
    } catch (e) {
      setWeather({ temp: '--', desc: '天气获取失败' });
    }
  }
  
  async function loadMoods(currentToken) {
    const authToken = currentToken || token;
    if (!authToken) return;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
      const res = await authFetch(`${API_BASE}/moods`, { signal: controller.signal }, authToken);
      clearTimeout(timeout);

      // authFetch 返回 null 表示 401 已处理（Token 过期跳转登录页），直接退出
      if (!res) return;

      // 【Bug修复】非 200 响应不清空现有数据，保持上次加载的结果
      // 避免因服务端错误导致日记列表被静默清空显示"暂无记录"
      if (!res.ok) {
        console.warn('加载心情列表失败，状态码:', res.status);
        return;
      }

      const data = await res.json();
      setMoods(data.data || []);
    } catch (e) {
      console.warn('加载心情列表失败', e.message);
      // 【Bug修复】网络异常时不清空已有数据，保持上次加载的结果
    }
  }
  
  async function shareMood(mood, platform) {
    // 先在后端创建分享记录
    let shareUrl = `https://nuannuanxinqing.com/share/${mood.id}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
      const res = await authFetch(`${API_BASE}/shares/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood_id: mood.id, share_type: platform }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      // Token 过期时 authFetch 已跳转登录页，分享流程终止
      if (!res) return;
      const data = await res.json();
      if (data.share_url) shareUrl = data.share_url;
    } catch (e) {
      // 后端失败不影响分享，继续用默认 URL
    }

    const moodLabel = MOOD_LABELS[mood.mood_category] || mood.mood_category;
    const moodIcon = MOOD_ICONS[mood.mood_category] || '🌸';
    const shareText = `${moodIcon} 我今天的心情是「${moodLabel}」${mood.mood_score}分${mood.description ? '\n"' + mood.description + '"' : ''}\n\n来暖暖记录你的心情~ ${shareUrl}`;

    setShareModalVisible(false);

    if (platform === 'copy') {
      // 复制链接（文字）到剪贴板
      try {
        await Clipboard.setStringAsync(shareText);
        Alert.alert('✅ 复制成功', '分享内容已复制，打开微信/抖音粘贴即可~');
      } catch (e) {
        Alert.alert('提示', '复制失败，请手动复制：\n' + shareText);
      }
    } else {
      // 微信/抖音：调用系统分享弹窗
      try {
        await Share.share({
          message: shareText,
          url: shareUrl, // iOS 可额外提供 URL
        }, {
          dialogTitle: '分享心情',
        });
      } catch (e) {
        // 用户取消分享或失败时静默处理
        if (e.message && !e.message.includes('cancel')) {
          Alert.alert('提示', '分享失败，请稍后重试');
        }
      }
    }
  }

  function openShareModal(mood) {
    setSharingMood(mood);
    setShareModalVisible(true);
  }

  async function pickImages() {
    try {
      // 请求相册权限
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('需要权限', '请在设置中允许访问相册');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 9 - mediaFiles.filter(f => f.type === 'image').length,
      });
      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(a => ({ uri: a.uri, type: 'image' }));
        setMediaFiles(prev => [...prev, ...newFiles].slice(0, 9));
      }
    } catch (e) { Alert.alert('错误', '选择图片失败'); }
  }

  async function takePhoto() {
    try {
      // 先检查是否有可用相机（iPad 模拟器或某些设备可能没有）
      const available = await ImagePicker.getCameraPermissionsAsync();
      
      // 请求相机权限
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('需要权限', '请在设置中允许访问相机');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        cameraType: useFrontCamera ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      });
      if (!result.canceled && result.assets) {
        const newFile = { uri: result.assets[0].uri, type: 'image' };
        setMediaFiles(prev => [...prev, newFile].slice(0, 9));
      }
    } catch (e) {
      console.log('takePhoto error:', e);
      // 相机不可用时降级为相册选择
      Alert.alert(
        '拍照不可用',
        '当前设备相机无法使用，请从相册选择图片',
        [
          { text: '取消', style: 'cancel' },
          { text: '打开相册', onPress: pickImages },
        ]
      );
    }
  }

  function removeMedia(index) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  }

  // 【expo-audio 迁移】使用 useAudioRecorder hook 替代 Audio.Recording
  async function startVoiceRecording() {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('需要权限', '请在设置中允许访问麦克风');
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert('录音失败', '无法开始录音，请稍后再试');
    }
  }

  // 【expo-audio 迁移】使用 recorder.stop() 和 recorder.uri 替代 recording.stopAndUnloadAsync()
  async function stopVoiceRecording() {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        setMediaFiles(prev => [...prev, { uri, type: 'audio' }].slice(0, 9));
      }
    } catch (e) {
      Alert.alert('录音出错', '保存录音失败');
    }
  }

  // 【expo-audio 迁移】使用 useAudioPlayer hook 替代 Audio.Sound.createAsync
  function playAudio(uri) {
    try {
      if (audioPlayer.playing) {
        audioPlayer.pause();
        return;
      }
      audioPlayer.replace(uri);
      audioPlayer.play();
    } catch (e) {
      Alert.alert('播放失败', '无法播放语音记录');
    }
  }

  async function uploadMedia() {
    const urls = [];
    for (const file of mediaFiles) {
      if (file.uploadedUrl) {
        urls.push({ type: file.type, url: file.uploadedUrl });
        continue;
      }
      try {
        const formData = new FormData();
        const uriParts = file.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        if (file.type === 'image') {
          formData.append('images', { uri: file.uri, type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`, name: `photo.${fileType}` });
        } else if (file.type === 'video') {
          formData.append('video', { uri: file.uri, type: `video/${fileType}`, name: `video.${fileType}` });
        } else if (file.type === 'audio') {
          formData.append('audio', { uri: file.uri, type: 'audio/mp4', name: `voice.m4a` });
        }
        const endpoint = file.type === 'image' ? '/upload/image' : file.type === 'video' ? '/upload/video' : '/upload/audio';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), file.type === 'video' ? 60000 : 30000);
        // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
        const res = await authFetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        // Token 过期时 authFetch 已跳转登录页，终止上传流程
        if (!res) return urls;
        const data = await res.json();
        if (file.type === 'image' && data.urls) {
          data.urls.forEach(url => urls.push({ type: 'image', url }));
        } else if (data.url) {
          urls.push({ type: file.type === 'audio' ? 'audio' : 'video', url: data.url });
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          Alert.alert('提示', '上传超时，请检查网络后重试');
        }
        console.warn('上传失败', e);
      }
    }
    return urls;
  }

  async function submitMood() {
    if (!selectedMood) { Alert.alert('提示', '请选择心情'); return; }
    setUploading(true);
    try {
      // 先上传媒体文件
      let media = [];
      if (mediaFiles.length > 0) {
        media = await uploadMedia();
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
      const res = await authFetch(`${API_BASE}/moods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood_category: selectedMood, mood_score: selectedScore, description: desc, media, visibility: 'public' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      // Token 过期时 authFetch 已跳转登录页，终止提交
      if (!res) { setUploading(false); return; }
      if (res.ok) {
        Alert.alert('成功', '发布成功！');
        setSelectedMood(null);
        setDesc('');
        setSelectedScore(5);
        setMediaFiles([]);
        loadMoods();
        setPage('home');
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('提示', data.error || '发布失败，请稍后重试');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        Alert.alert('提示', '连接超时，请检查网络后重试');
      } else {
        Alert.alert('错误', '网络错误');
      }
    }
    setUploading(false);
  }
  
  async function saveProfile() {
    if (!user) return;
    const updated = { ...user, username: profileUsername || user.username, mood_id: profileMoodId || user.mood_id, birthday: profileBirthday || user.birthday, mbti: profileMbti || user.mbti };
    setUser(updated);
    try {
      await AsyncStorage.setItem('moodbloom_user', JSON.stringify(updated));
      // 同步到服务器
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
      const res = await authFetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileUsername || user.username,
          mood_id: profileMoodId || user.mood_id,
          birthday: profileBirthday || user.birthday,
          mbti: profileMbti || user.mbti,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      // Token 过期时 authFetch 已跳转登录页
      if (!res) return;
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          await AsyncStorage.setItem('moodbloom_user', JSON.stringify(data.user));
        }
        Alert.alert('✅', '资料已保存');
      } else {
        Alert.alert('保存成功', '本地已更新，服务器同步失败，下次登录可能恢复旧数据');
      }
    } catch (e) {
      // 网络失败时仍保留本地数据，不影响体验
      Alert.alert('✅', '资料已保存（本地）');
    }
  }
  
  async function doResetPassword() {
    if (!resetPhone || !resetNewPwd) { setAuthMsg('请填写手机号和新密码'); return; }
    if (resetNewPwd.length < 6) { setAuthMsg('新密码至少6位'); return; }
    setAuthMsg('重置中...');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone, username: resetUsername || undefined, new_password: resetNewPwd }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.message) {
        Alert.alert('成功', data.message, [{ text: '去登录', onPress: () => { setAuthMsg(''); setPage('login'); } }]);
      } else {
        setAuthMsg(data.error || '重置失败');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setAuthMsg('连接超时，请检查网络后重试');
      } else {
        setAuthMsg('网络错误');
      }
    }
  }
  
  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
      const res = await authFetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: chatMessages, buddyName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      // Token 过期时 authFetch 已跳转登录页，终止聊天请求
      if (!res) { setChatLoading(false); return; }
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || `${buddyName}暂时回不过来~ 🌙` }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `网络有点问题，${buddyName}晚点再找你~ 🌸` }]);
    }
    setChatLoading(false);
  }
  
  async function loadSettings() {
    try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
    const res = await authFetch(`${API_BASE}/settings`, { signal: controller.signal });
    clearTimeout(timeout);
    // Token 过期时 authFetch 已跳转登录页
    if (!res) return;
    const data = await res.json();
      setAppTheme(data.theme || 'auto');
      setNotifications(data.notifications || 'all');
    } catch (e) {
      console.warn('加载设置失败', e.message);
    }
  }
  
  async function saveSettings(key, value) {
    try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
    const res = await authFetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    // Token 过期时 authFetch 已跳转登录页
    if (!res) return;
    const data = await res.json();
      if (res.ok) {
        if (key === 'theme') setAppTheme(value);
        if (key === 'notifications') setNotifications(value);
        // 用户可感知的反馈
        Alert.alert('', '✅ 已保存');
      } else {
        Alert.alert('提示', data.error || '保存失败');
      }
    } catch (e) {
      Alert.alert('错误', '网络错误，保存失败');
    }
  }
  
  
  async function deleteAccount() {
    try {
      Alert.alert(
        '⚠️ 删除账号',
        '此操作将永久删除你的账号和所有心情记录，且无法恢复。\n\n确定要继续吗？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确认删除',
            style: 'destructive',
            onPress: async () => {
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                // 【Bug修复】使用 authFetch 替代原始 fetch，统一处理 401
                const res = await authFetch(`${API_BASE}/auth/delete-account`, {
                  method: 'DELETE',
                  signal: controller.signal,
                });
                clearTimeout(timeout);
                // Token 过期时 authFetch 已跳转登录页
                if (!res) return;
                if (res.ok) {
                  Alert.alert('已删除', '账号及所有数据已删除');
                  setToken(null); setUser(null); setMoods([]); setChatMessages([]);
                  AsyncStorage.removeItem('moodbloom_token');
                  AsyncStorage.removeItem('moodbloom_user');
                  setPage('login');
                } else {
                  const data = await res.json().catch(() => ({}));
                  Alert.alert('提示', data.error || '删除失败');
                }
              } catch (e) {
                if (e.name === 'AbortError') {
                  Alert.alert('提示', '连接超时，请检查网络后重试');
                } else {
                  Alert.alert('错误', '网络错误');
                }
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('错误', '操作失败');
    }
  }

  function openProfile() {
    setProfileUsername(user?.username || '');
    setProfileMoodId(user?.mood_id || '');
    setProfileBirthday(user?.birthday || '');
    setProfileMbti(user?.mbti || '');
    setPage('profile');
  }
  
  // Pages
  if (page === 'login') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.authCard}>
          <Text style={styles.logo}>🌸</Text>
          <Text style={styles.authTitle}>暖暖</Text>
          <Text style={styles.authSub}>记录心情 · 陪伴你的每一天</Text>
          <Text style={styles.errorMsg}>{authMsg}</Text>
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="手机号 / 心情号" value={loginAccount} onChangeText={setLoginAccount} keyboardType="phone-pad" />
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="密码" secureTextEntry value={loginPassword} onChangeText={setLoginPassword} />
          <TouchableOpacity style={styles.btn} onPress={doLogin}><Text style={styles.btnText}>登 录</Text></TouchableOpacity>
          <View style={styles.authLinks}>
            <TouchableOpacity onPress={() => { setAuthMsg(''); setResetPhone(''); setResetUsername(''); setResetNewPwd(''); setPage('forgot'); }}><Text style={styles.link}>忘记密码？</Text></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setAuthMsg(''); setPage('register'); }}><Text style={styles.link}>还没有账号？立即注册</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setPage('privacy')}><Text style={[styles.link, { fontSize: 11, color: '#999', marginTop: 12 }]}>《隐私政策》</Text></TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#E8A0BF', backgroundColor: '#FFF5F8' }}
            onPress={() => { setLoginAccount('13800001111'); setLoginPassword('Test1234!'); }}
          >
            <Text style={{ fontSize: 13, color: '#E8A0BF', fontWeight: '500', textAlign: 'center' }}>👆 体验演示账号</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (page === 'forgot') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.registerCard}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.logo}>🔐</Text>
          <Text style={styles.authTitle}>找回密码</Text>
          <Text style={styles.authSub}>通过验证信息重置密码</Text>
          <Text style={styles.errorMsg}>{authMsg}</Text>
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="📱 手机号" value={resetPhone} onChangeText={setResetPhone} keyboardType="phone-pad" maxLength={11} />
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="👤 用户名（可选，增加安全性）" value={resetUsername} onChangeText={setResetUsername} />
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="🔒 新密码（至少6位）" secureTextEntry value={resetNewPwd} onChangeText={setResetNewPwd} />
          <TouchableOpacity style={styles.btn} onPress={doResetPassword}><Text style={styles.btnText}>重置密码</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setAuthMsg(''); setPage('login'); }}><Text style={styles.link}>想起密码了？返回登录</Text></TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }
  
  if (page === 'register') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.registerCard}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <Text style={styles.logo}>🌸</Text>
          <Text style={styles.authTitle}>创建账号</Text>
          <Text style={styles.authSub}>开启你的心情之旅</Text>
          <Text style={styles.errorMsg}>{authMsg}</Text>
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="📱 手机号" value={regPhone} onChangeText={setRegPhone} keyboardType="phone-pad" />
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="👤 用户名" value={regUsername} onChangeText={setRegUsername} />
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="✨ 心情号（可选）" value={regMoodId} onChangeText={setRegMoodId} />
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="🌟 出生日期（可选，YYYY-MM-DD）" value={regBirthday} onChangeText={setRegBirthday} />
          <View style={styles.mbtiSelect}>
            <Text style={styles.label}>🔮 MBTI</Text>
            <View style={styles.mbtiChipRow}>
              {['', 'INTP', 'INTJ', 'INFP', 'INFJ', 'ENFP', 'ENTP', 'ISFP', 'ESFP', 'ISTP'].map(m => (
                <TouchableOpacity key={m} style={[styles.mbtiChip, regMbti === m && styles.mbtiChipActive]} onPress={() => setRegMbti(m)}>
                  <Text style={[styles.mbtiChipText, regMbti === m && styles.mbtiChipTextActive]}>{m || '未选'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="🔒 密码（至少6位）" secureTextEntry value={regPassword} onChangeText={setRegPassword} />
          <TouchableOpacity style={styles.btn} onPress={doRegister}><Text style={styles.btnText}>注 册</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setAuthMsg(''); setPage('login'); }}><Text style={styles.link}>已有账号？返回登录</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setPage('privacy')}><Text style={[styles.link, { fontSize: 11, color: '#999', marginTop: 12 }]}>《隐私政策》</Text></TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }
  
  // Home
  if (page === 'home') {
    const zodiacKey = user?.birthday ? getZodiac(user.birthday) : null;
    const zodiac = zodiacKey ? ZODIAC_DATA[zodiacKey] : null;
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* 首页顶栏：标题 */}
        <View style={[styles.homeTopBar, { backgroundColor: themeColors.bg }]}>
          <Text style={styles.homeTitle}>🌸 暖暖</Text>
        </View>
        
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={[styles.profileCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.profileLeft}>
              <Text style={styles.profileAvatar}>🌸</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>{user?.username || '你'}</Text>
              <Text style={styles.moodIdText}>✨ {user?.mood_id || '心情号未设置'}</Text>
              <View style={styles.tagRow}>
                {zodiac && <Text style={styles.tag}>{zodiac.icon} {zodiac.name}</Text>}
                {user?.mbti && <Text style={styles.tag}>{user.mbti}</Text>}
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openProfile}><Text>编辑</Text></TouchableOpacity>
          </View>
          
          {/* 🌸 AI 心情伙伴 */}
          <TouchableOpacity style={styles.aiBuddyCard} onPress={() => setPage('chat')} activeOpacity={0.9}>
            <View style={styles.aiBuddyLeft}>
              <View style={styles.aiBuddyAvatar}>
                <Text style={styles.aiBuddyEmoji}>🌸</Text>
                <View style={styles.aiBuddyFloat}>
                  <Text style={styles.aiBuddyFloatText}>Hi~</Text>
                </View>
              </View>
              <View style={styles.aiBuddyInfo}>
                <Text style={styles.aiBuddyName}>{buddyName} · 心情伙伴</Text>
                <Text style={styles.aiBuddyDesc}>今天心情怎么样？来和我聊聊吧~</Text>
              </View>
            </View>
            <View style={styles.aiBuddyArrow}>
              <Text style={styles.aiBuddyArrowText}>›</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.weatherCard}>
            <Text style={styles.weatherTemp}>{weather.temp}°</Text>
            <Text style={styles.weatherDesc}>{weather.desc}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}><Text style={styles.statNum}>{moods.length}</Text><Text style={styles.statLabel}>记录数</Text></View>
            <View style={[styles.statCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}><Text style={styles.statNum}>{new Set(moods.map(m => new Date(m.created_at).toDateString())).size}</Text><Text style={styles.statLabel}>天数</Text></View>
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>📝 最近心情</Text>
            {moods.length === 0 && <Text style={[styles.empty, { color: themeColors.subText }]}>暂无记录</Text>}
            {moods.slice(0, 3).map((m, i) => (
              <TouchableOpacity key={i} style={styles.moodItem} activeOpacity={0.7} onPress={() => { setDetailMood({ ...m, _fromPage: 'home' }); setPage('moodDetail'); }}>
                <Text style={styles.moodIcon}>{MOOD_ICONS[m.mood_category] || '🌸'}</Text>
                <View style={styles.moodInfo}>
                  <Text style={[styles.moodTitle, { color: themeColors.text }]}>{MOOD_LABELS[m.mood_category] || m.mood_category} · {m.mood_score}分</Text>
                  <Text style={[styles.moodDesc, { color: themeColors.subText }]} numberOfLines={1}>{m.description || '无描述'}</Text>
                  {m.media && m.media.length > 0 && (
                    <View style={styles.moodMediaRow}>
                      {m.media.slice(0, 3).map((med, j) => (
                        med.type === 'audio' ? (
                          <View key={j} style={styles.moodAudioBadge}>
                            <Text style={{ fontSize: 10 }}>🎙️</Text>
                          </View>
                        ) : med.type === 'image' ? (
                          <Image key={j} source={{ uri: `${API_BASE.replace('/api', '')}${med.url}`, cache: 'force-cache' }} style={styles.moodMediaThumb} resizeMode="cover" fadeDuration={200} />
                        ) : (
                          <View key={j} style={styles.moodVideoBadge}>
                            <Text style={{ fontSize: 10 }}>🎬</Text>
                          </View>
                        )
                      ))}
                      {m.media.length > 3 && <Text style={styles.mediaMore}>+{m.media.length - 3}</Text>}
                    </View>
                  )}
                  <View style={styles.moodFooter}>
                    <Text style={styles.moodTime}>{new Date(m.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</Text>
                    <TouchableOpacity style={styles.shareBtn} onPress={(e) => { e.stopPropagation(); openShareModal(m); }}>
                      <Text style={styles.shareBtnText}>🔗 分享</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        <View style={[styles.tabBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.cardBorder }]}>
          <TouchableOpacity style={styles.tabItem}><Text style={styles.tabIcon}>🏠</Text><Text style={[styles.tabLabel, { color: '#E8A0BF' }]}>首页</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadMoods(token); setPage('history'); }}><Text style={styles.tabIcon}>📔</Text><Text style={styles.tabLabel}>日记本</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPage('newmood')}><Text style={styles.addBtnText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('analytics')}><Text style={styles.tabIcon}>🔮</Text><Text style={styles.tabLabel}>分析</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadSettings(); setPage('settings'); }}><Text style={styles.tabIcon}>⚙️</Text><Text style={styles.tabLabel}>设置</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // New Mood
  if (page === 'newmood') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>记录心情</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>选择此刻心情</Text>
            <View style={styles.moodGrid}>
              {Object.entries(MOOD_ICONS).map(([key, icon]) => (
                <TouchableOpacity key={key} style={[styles.moodChip, selectedMood === key && styles.moodChipActive]} onPress={() => setSelectedMood(key)}>
                  <Text style={styles.moodChipIcon}>{icon}</Text>
                  <Text style={[styles.moodChipLabel, selectedMood === key && styles.moodChipLabelActive]}>{MOOD_LABELS[key]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>心情指数 <Text style={styles.scoreVal}>{selectedScore}</Text></Text>
            <View style={styles.scoreRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity key={n} style={[styles.scoreBtn, n <= selectedScore && styles.scoreBtnActive]} onPress={() => setSelectedScore(n)}>
                  <Text style={[styles.scoreBtnText, n <= selectedScore && styles.scoreBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>碎碎念</Text>
            <TextInput style={[styles.textarea, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="今天发生了什么？记录此刻的心情~" multiline value={desc} onChangeText={setDesc} />
            {/* 媒体预览区 */}
            {mediaFiles.length > 0 && (
              <View style={styles.mediaPreview}>
                {mediaFiles.map((file, i) => (
                  <View key={i} style={styles.mediaThumb}>
                    {file.type === 'audio' ? (
                      <View style={styles.audioThumb}>
                        <Text style={styles.audioThumbIcon}>🎙️</Text>
                        <Text style={styles.audioThumbLabel}>语音</Text>
                      </View>
                    ) : file.type === 'image' ? (
                      <Image source={{ uri: file.uri }} style={styles.mediaThumbImg} />
                    ) : (
                      <View style={styles.videoThumb}>
                        <Text style={styles.videoThumbIcon}>🎬</Text>
                        <Text style={styles.videoThumbText}>视频</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.mediaRemove} onPress={() => removeMedia(i)}>
                      <Text style={styles.mediaRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {/* 媒体选择按钮 */}
            <View style={styles.mediaActions}>
              <TouchableOpacity style={styles.mediaBtn} onPress={pickImages}>
                <Text style={styles.mediaBtnText}>🖼️ 相册</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
                <Text style={styles.mediaBtnText}>📷 拍照</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mediaBtn, useFrontCamera && styles.mediaBtnActive]} onPress={() => setUseFrontCamera(prev => !prev)}>
                <Text style={[styles.mediaBtnText, useFrontCamera && styles.mediaBtnActiveText]}>{useFrontCamera ? '🤳 前置' : '📷 后置'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaBtn, recorder.isRecording && styles.mediaBtnRecording]}
                onPress={recorder.isRecording ? stopVoiceRecording : startVoiceRecording}
              >
                <Text style={[styles.mediaBtnText, recorder.isRecording && styles.mediaBtnActiveText]}>
                  {recorder.isRecording ? '⏹ 停止' : '🎙️ 语音'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.mediaCount}>{mediaFiles.length}/9</Text>
            </View>
          </View>
          
          <TouchableOpacity style={[styles.btn, uploading && styles.btnDisabled]} onPress={submitMood} disabled={uploading}>
            <Text style={styles.btnText}>{uploading ? '上传中...' : '✨ 发布心情'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPage('home')}><Text style={styles.btnSecondaryText}>取消</Text></TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
  
  // History (日记本)
  if (page === 'history') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>📔 日记本</Text>
            <View style={{ width: 50 }} />
          </View>
          {moods.length === 0 && <Text style={[styles.empty, { color: themeColors.subText }]}>暂无记录，去记录你的第一条心情吧~</Text>}
          {moods.map((m, i) => (
            <TouchableOpacity key={i} style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]} activeOpacity={0.7} onPress={() => { setDetailMood({ ...m, _fromPage: 'history' }); setPage('moodDetail'); }}>
              <View style={styles.moodItem}>
                <Text style={styles.moodIcon}>{MOOD_ICONS[m.mood_category] || '🌸'}</Text>
                <View style={styles.moodInfo}>
                  <Text style={[styles.moodTitle, { color: themeColors.text }]}>{MOOD_LABELS[m.mood_category] || m.mood_category} · {m.mood_score}分</Text>
                  <Text style={[styles.moodDesc, { color: themeColors.subText }]} numberOfLines={2}>{m.description || '无描述'}</Text>
                  {m.media && m.media.length > 0 && (
                    <View style={styles.moodMediaRow}>
                      {m.media.slice(0, 3).map((med, j) => (
                        med.type === 'audio' ? (
                          <View key={j} style={styles.moodAudioBadge}>
                            <Text style={{ fontSize: 10 }}>🎙️</Text>
                          </View>
                        ) : med.type === 'image' ? (
                          <Image key={j} source={{ uri: `${API_BASE.replace('/api', '')}${med.url}`, cache: 'force-cache' }} style={styles.moodMediaThumb} resizeMode="cover" fadeDuration={200} />
                        ) : (
                          <View key={j} style={styles.moodVideoBadge}>
                            <Text style={{ fontSize: 10 }}>🎬</Text>
                          </View>
                        )
                      ))}
                      {m.media.length > 3 && <Text style={styles.mediaMore}>+{m.media.length - 3}</Text>}
                    </View>
                  )}
                  <View style={styles.moodFooter}>
                    <Text style={styles.moodTime}>{new Date(m.created_at).toLocaleString('zh-CN')}</Text>
                    <TouchableOpacity style={styles.shareBtn} onPress={(e) => { e.stopPropagation(); openShareModal(m); }}>
                      <Text style={styles.shareBtnText}>🔗 分享</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* 分享 Modal */}
        <Modal
          visible={shareModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShareModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShareModalVisible(false)}>
            <View style={styles.shareModal}>
              <View style={styles.shareModalHandle} />
              <Text style={styles.shareModalTitle}>分享这条心情</Text>
              {sharingMood && (
                <View style={styles.shareMoodPreview}>
                  <Text style={styles.shareMoodIcon}>{MOOD_ICONS[sharingMood.mood_category] || '🌸'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareMoodLabel}>{MOOD_LABELS[sharingMood.mood_category] || sharingMood.mood_category} · {sharingMood.mood_score}分</Text>
                    {sharingMood.description ? <Text style={styles.shareMoodDesc} numberOfLines={2}>{sharingMood.description}</Text> : null}
                  </View>
                </View>
              )}
              <Text style={styles.shareModalSubtitle}>分享到</Text>
              <View style={styles.sharePlatformRow}>
                <TouchableOpacity style={styles.sharePlatformBtn} onPress={() => shareMood(sharingMood, 'wechat')}>
                  <View style={[styles.sharePlatformIcon, { backgroundColor: '#07C160' }]}>
                    <Text style={{ fontSize: 28 }}>💬</Text>
                  </View>
                  <Text style={styles.sharePlatformLabel}>微信</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sharePlatformBtn} onPress={() => shareMood(sharingMood, 'douyin')}>
                  <View style={[styles.sharePlatformIcon, { backgroundColor: '#000' }]}>
                    <Text style={{ fontSize: 28 }}>🎵</Text>
                  </View>
                  <Text style={styles.sharePlatformLabel}>抖音</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sharePlatformBtn} onPress={() => shareMood(sharingMood, 'copy')}>
                  <View style={[styles.sharePlatformIcon, { backgroundColor: '#E8A0BF' }]}>
                    <Text style={{ fontSize: 28 }}>📋</Text>
                  </View>
                  <Text style={styles.sharePlatformLabel}>复制链接</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.shareModalCancel} onPress={() => setShareModalVisible(false)}>
                <Text style={styles.shareModalCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        
        <View style={[styles.tabBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.cardBorder }]}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('home')}><Text style={styles.tabIcon}>🏠</Text><Text style={styles.tabLabel}>首页</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}><Text style={styles.tabIcon}>📔</Text><Text style={[styles.tabLabel, { color: '#E8A0BF' }]}>日记本</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPage('newmood')}><Text style={styles.addBtnText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('analytics')}><Text style={styles.tabIcon}>🔮</Text><Text style={styles.tabLabel}>分析</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadSettings(); setPage('settings'); }}><Text style={styles.tabIcon}>⚙️</Text><Text style={styles.tabLabel}>设置</Text></TouchableOpacity>
        </View>
      </View>
    );
  }



  // Mood Detail (心情详情)
  if (page === 'moodDetail' && detailMood) {
    const dm = detailMood;
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage(dm._fromPage || 'home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>📔 心情详情</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailIcon}>{MOOD_ICONS[dm.mood_category] || '🌸'}</Text>
              <View style={styles.detailHeaderInfo}>
                <Text style={[styles.detailMoodLabel, { color: themeColors.text }]}>{MOOD_LABELS[dm.mood_category] || dm.mood_category}</Text>
                <Text style={styles.detailScore}>心情指数 {dm.mood_score}/10</Text>
              </View>
            </View>
            
            {/* 评分可视化 */}
            <View style={styles.detailScoreBar}>
              <View style={[styles.detailScoreFill, { width: `${dm.mood_score * 10}%` }]} />
            </View>
            
            <View style={styles.detailTimeRow}>
              <Text style={[styles.detailTime, { color: themeColors.subText }]}>📅 {new Date(dm.created_at).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
          
          {dm.description && (
            <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>💭 心情文字</Text>
              <Text style={[styles.detailDescText, { color: themeColors.text }]}>{dm.description}</Text>
            </View>
          )}
          
          {dm.media && dm.media.length > 0 && (
            <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>🖼️ 媒体</Text>
              <View style={styles.detailMediaGrid}>
                {dm.media.map((med, j) => {
                  const mediaUri = med.url ? `${API_BASE.replace('/api', '')}${med.url}` : '';
                  return med.type === 'audio' ? (
                    <TouchableOpacity
                      key={j}
                      style={[styles.audioPlayCard, { backgroundColor: themeColors.card }]}
                      onPress={() => playAudio(mediaUri)}
                    >
                      <Text style={styles.audioPlayIcon}>{audioPlayer.playing ? '⏸' : '▶️'}</Text>
                      <Text style={[styles.audioPlayText, { color: themeColors.text }]}>语音记录</Text>
                    </TouchableOpacity>
                  ) : med.type === 'image' ? (
                    <TouchableOpacity key={j} activeOpacity={0.9} onPress={() => { setViewingMedia({ uri: mediaUri, type: 'image' }); setImageViewerVisible(true); }}>
                      <Image source={{ uri: mediaUri, cache: 'force-cache' }} style={[styles.detailMediaImg, { backgroundColor: '#f0f0f0' }]} resizeMode="cover" fadeDuration={200} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity key={j} activeOpacity={0.9} onPress={() => { setViewingMedia({ uri: mediaUri, type: 'video' }); setImageViewerVisible(true); }}>
                      <View style={styles.detailVideoWrap}>
                        <Image source={{ uri: mediaUri, cache: 'force-cache' }} style={styles.detailVideoThumb} resizeMode="cover" fadeDuration={200} />
                        <View style={styles.detailVideoPlay}>
                          <Text style={{ fontSize: 24, color: '#fff' }}>▶</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          
          <TouchableOpacity style={styles.shareBtnLarge} onPress={() => openShareModal(dm)}>
            <Text style={styles.shareBtnLargeText}>🔗 分享这条心情</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* 分享 Modal */}
        <Modal
          visible={shareModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShareModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShareModalVisible(false)}>
            <View style={styles.shareModal}>
              <View style={styles.shareModalHandle} />
              <Text style={styles.shareModalTitle}>分享这条心情</Text>
              {sharingMood && (
                <View style={styles.shareMoodPreview}>
                  <Text style={styles.shareMoodIcon}>{MOOD_ICONS[sharingMood.mood_category] || '🌸'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareMoodLabel}>{MOOD_LABELS[sharingMood.mood_category] || sharingMood.mood_category} · {sharingMood.mood_score}分</Text>
                    {sharingMood.description ? <Text style={styles.shareMoodDesc} numberOfLines={2}>{sharingMood.description}</Text> : null}
                  </View>
                </View>
              )}
              <Text style={styles.shareModalSubtitle}>分享到</Text>
              <View style={styles.sharePlatformRow}>
                <TouchableOpacity style={styles.sharePlatformBtn} onPress={() => shareMood(sharingMood, 'wechat')}>
                  <View style={[styles.sharePlatformIcon, { backgroundColor: '#07C160' }]}>
                    <Text style={{ fontSize: 28 }}>💬</Text>
                  </View>
                  <Text style={styles.sharePlatformLabel}>微信</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sharePlatformBtn} onPress={() => shareMood(sharingMood, 'douyin')}>
                  <View style={[styles.sharePlatformIcon, { backgroundColor: '#000' }]}>
                    <Text style={{ fontSize: 28 }}>🎵</Text>
                  </View>
                  <Text style={styles.sharePlatformLabel}>抖音</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sharePlatformBtn} onPress={() => shareMood(sharingMood, 'copy')}>
                  <View style={[styles.sharePlatformIcon, { backgroundColor: '#E8A0BF' }]}>
                    <Text style={{ fontSize: 28 }}>📋</Text>
                  </View>
                  <Text style={styles.sharePlatformLabel}>复制链接</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.shareModalCancel} onPress={() => setShareModalVisible(false)}>
                <Text style={styles.shareModalCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        
        {/* 全屏图片/视频查看 */}
        <Modal visible={imageViewerVisible} transparent={true} animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity style={styles.imageViewerClose} onPress={() => setImageViewerVisible(false)}>
              <Text style={styles.imageViewerCloseText}>✕</Text>
            </TouchableOpacity>
            {viewingMedia?.type === 'image' && (
              <Image source={{ uri: viewingMedia.uri }} style={styles.imageViewerImg} resizeMode="contain" />
            )}
            {viewingMedia?.type === 'video' && (
              <View style={styles.imageViewerVideoWrap}>
                <Text style={{ color: '#fff', fontSize: 16 }}>🎬 视频播放</Text>
                <Text style={{ color: '#999', fontSize: 13, marginTop: 8 }}>暂不支持视频播放，敬请期待</Text>
              </View>
            )}
          </View>
        </Modal>
      </View>
    );
  }


  // Analytics
  if (page === 'analytics') {
    const zodiacKey = user?.birthday ? getZodiac(user.birthday) : null;
    const zodiac = zodiacKey ? ZODIAC_DATA[zodiacKey] : null;
    const luckies = ['大吉', '吉', '中吉', '小吉', '平'];
    const advices = { aries: '今日适合行动！', taurus: '今日适合理财', gemini: '今日适合交流', cancer: '今日适合陪伴家人', leo: '今日适合展现自我', virgo: '今日适合整理规划', libra: '今日适合社交人际', scorpio: '今日适合深度思考', sagittarius: '今日适合探索冒险', capricorn: '今日适合长远规划', aquarius: '今日适合创新突破', pisces: '今日适合艺术创作' };
    // 按日期+星座固定运势，同一天同一星座结果不变
    const todayStr = new Date().toISOString().slice(0, 10); // "2026-05-06"
    const fortuneSeed = todayStr.split('-').reduce((acc, v) => acc + parseInt(v), 0) + (zodiacKey ? zodiacKey.length : 0);
    const todayLucky = luckies[fortuneSeed % luckies.length];
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>🔮 心情分析</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>🌟 星座运势</Text>
            {zodiac ? (
              <>
                <View style={styles.zodiacDisplay}>
                  <Text style={styles.zodiacIcon}>{zodiac.icon}</Text>
                  <Text style={styles.zodiacName}>{zodiac.name}</Text>
                </View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>今日运势</Text><Text style={styles.infoValue}>{todayLucky}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>幸运颜色</Text><Text style={styles.infoValue}>{zodiac.color}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>心情建议</Text><Text style={styles.infoValue}>{advices[zodiacKey]}</Text></View>
              </>
            ) : (
              <Text style={[styles.empty, { color: themeColors.subText }]}>去个人资料设置生日后查看星座分析</Text>
            )}
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>🧠 MBTI 心情匹配</Text>
            {user?.mbti && MBTI_INFO[user.mbti] ? (
              <>
                <Text style={styles.mbtiType}>{user.mbti}</Text>
                <Text style={styles.mbtiName}>{MBTI_INFO[user.mbti].name}</Text>
                <View style={styles.traitRow}>
                  {MBTI_INFO[user.mbti].traits.map(t => <Text key={t} style={styles.trait}>{t}</Text>)}
                </View>
              </>
            ) : (
              <Text style={[styles.empty, { color: themeColors.subText }]}>去个人资料设置MBTI</Text>
            )}
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>💡 好心情建议</Text>
            {(() => {
              // 统计每种心情出现次数
              const moodCounts = {};
              moods.forEach(m => {
                const cat = m.mood_category;
                moodCounts[cat] = (moodCounts[cat] || 0) + 1;
              });
              // 找出最频繁的心情大类
              const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
              if (sorted.length === 0) {
                return <Text style={[styles.empty, { color: themeColors.subText }]}>先记下一些心情吧，我会根据你的状态，温柔地给你一些小建议~ 🌸</Text>;
              }
              // 针对每种心情给出建议
              const MOOD_ADVICE = {
                happy: { title: '让快乐多留一会儿呀~', tips: ['把此刻的小确幸写下来，下次不开心的时候翻出来看看 📖', '找个喜欢的人说说，快乐会变成两份呢 💛', '趁着心情好，去做一件一直想做的小事吧~'], icon: '☀️' },
                calm: { title: '这份平静，真的很珍贵', tips: ['安静的时候适合听听内心的声音，它在告诉你什么？🎵', '泡一杯热茶或咖啡，慢慢感受这份安宁 ☕', '把这份平静存进心里，以后焦虑了就拿出来回味一下'], icon: '🌿' },
                sad: { title: '想哭就哭吧，没关系的', tips: ['允许自己难过，情绪也需要被好好安放呀 💕', '抱抱自己，告诉自己：我已经很努力了 🤗', '试试写下心里的话，不用写给谁看，写出来就会好一些 ✏️'], icon: '🌧️' },
                anxious: { title: '慢慢来，不着急的', tips: ['跟着呼吸一起数：吸气…呼气…再重复几次，会好一些的 🌊', '出去走走吧，哪怕只是到楼下转一圈，风会帮你带走一些杂念', '把担心的事一条条写下来，有时候写出来就没那么可怕了'], icon: '😰' },
                angry: { title: '先抱抱生气的自己吧', tips: ['生气说明你在乎呀，但别让气伤了自己 🫂', '先离开那个环境，喝杯水，让身体先放松下来', '找个信任的人倾诉一下，别一个人扛着'], icon: '😡' },
                excited: { title: '这份开心，值得被记住', tips: ['拍个照或者录段语音，记录下此刻的开心 ✨', '把兴奋的事说给重要的人听，让他们也感受你的快乐', '趁着这股劲儿去做点有意义的事，能量满满的你最棒了'], icon: '🎉' },
                grateful: { title: '感恩的心，最温柔了', tips: ['今天有没有想感谢的人？告诉他吧，这句话会温暖他一整天 💛', '写下三件感恩的小事，坚持一周，你会发现世界变得柔软了', '用一个小小的善意回报身边人，温暖会一直传递下去~'], icon: '🙏' },
                tired: { title: '辛苦了，好好休息一下吧', tips: ['今晚早点躺下吧，什么都别想，给身体一个充电的机会 🌙', '泡个热水澡，或者暖一杯牛奶，让身体慢慢放松下来', '不赶时间的时候，允许自己慢一点，这不算偷懒哦 💤'], icon: '😴' },
              };
              return sorted.slice(0, 3).map(([cat, count]) => {
                const advice = MOOD_ADVICE[cat] || MOOD_ADVICE.calm;
                return (
                  <View key={cat} style={styles.adviceItem}>
                    <View style={styles.adviceHeader}>
                      <Text style={styles.adviceIcon}>{advice.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adviceTitle}>{advice.title}</Text>
                        <Text style={styles.adviceCount}>最近记录 {count} 次</Text>
                      </View>
                    </View>
                    {advice.tips.map((tip, ti) => (
                      <View key={ti} style={styles.adviceTipRow}>
                        <Text style={styles.adviceTipBullet}>•</Text>
                        <Text style={styles.adviceTipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                );
              });
            })()}
          </View>
        </ScrollView>
        <View style={[styles.tabBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.cardBorder }]}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('home')}><Text style={styles.tabIcon}>🏠</Text><Text style={styles.tabLabel}>首页</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadMoods(token); setPage('history'); }}><Text style={styles.tabIcon}>📔</Text><Text style={styles.tabLabel}>日记本</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPage('newmood')}><Text style={styles.addBtnText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}><Text style={styles.tabIcon}>🔮</Text><Text style={[styles.tabLabel, { color: '#E8A0BF' }]}>分析</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadSettings(); setPage('settings'); }}><Text style={styles.tabIcon}>⚙️</Text><Text style={styles.tabLabel}>设置</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Settings
  if (page === 'settings') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>⚙️ 设置</Text>
            <View style={{ width: 50 }} />
          </View>
          
          {/* 主题设置 */}
          <View style={[styles.settingCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={styles.settingSectionTitle}>🎨 外观</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingIcon}>🌗</Text>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: themeColors.text }]}>主题模式</Text>
              </View>
            </View>
            <View style={styles.themeSelector}>
              {[
                { key: 'auto', label: '跟随系统', icon: '🔄' },
                { key: 'light', label: '浅色模式', icon: '☀️' },
                { key: 'dark', label: '深色模式', icon: '🌙' },
              ].map(t => (
                <TouchableOpacity key={t.key} style={[styles.themeOption, appTheme === t.key && styles.themeOptionActive]} onPress={() => saveSettings('theme', t.key)}>
                  <Text>{t.icon}</Text>
                  <Text style={[styles.themeOptionText, appTheme === t.key && styles.themeOptionTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* 通知设置 */}
          <View style={[styles.settingCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={styles.settingSectionTitle}>🔔 通知</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingIcon}>📱</Text>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: themeColors.text }]}>消息通知</Text>
              </View>
            </View>
            <View style={styles.themeSelector}>
              {[
                { key: 'all', label: '全部通知' },
                { key: 'important', label: '仅重要' },
                { key: 'off', label: '关闭' },
              ].map(t => (
                <TouchableOpacity key={t.key} style={[styles.themeOption, notifications === t.key && styles.themeOptionActive]} onPress={() => saveSettings('notifications', t.key)}>
                  <Text style={[styles.themeOptionText, notifications === t.key && styles.themeOptionTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* 关于 */}
          <View style={[styles.settingCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <View style={styles.settingRow}>
              <Text style={styles.settingIcon}>🌸</Text>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: themeColors.text }]}>关于暖暖</Text>
                <Text style={[styles.settingDesc, { color: themeColors.subText }]}>版本 1.0.3</Text>
              </View>
            </View>
          </View>
          
          {/* 删除账号 */}
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#ff4757', marginTop: 20 }]} onPress={deleteAccount}>
            <Text style={styles.btnText}>🗑️ 删除账号</Text>
          </TouchableOpacity>
          
          {/* 退出登录 */}
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#ff6b6b', marginTop: 20 }]} onPress={() => {
            Alert.alert('退出登录', '确定要退出吗？', [
              { text: '取消', style: 'cancel' },
              { text: '退出', style: 'destructive', onPress: () => {
                setToken(null); setUser(null); setMoods([]); setChatMessages([]);
                AsyncStorage.removeItem('moodbloom_token');
                AsyncStorage.removeItem('moodbloom_user');
                setPage('login');
              }}
            ]);
          }}>
            <Text style={styles.btnText}>退出登录</Text>
          </TouchableOpacity>

          {/* ICP 备案号 */}
          <TouchableOpacity
            onPress={() => Linking.openURL('https://beian.miit.gov.cn/')}
            style={{ alignItems: 'center', marginTop: 24, marginBottom: 12, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 12, color: '#aaa' }}>浙ICP备2025191976号</Text>
          </TouchableOpacity>

        </ScrollView>
        <View style={[styles.tabBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.cardBorder }]}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('home')}><Text style={styles.tabIcon}>🏠</Text><Text style={styles.tabLabel}>首页</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadMoods(token); setPage('history'); }}><Text style={styles.tabIcon}>📔</Text><Text style={styles.tabLabel}>日记本</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPage('newmood')}><Text style={styles.addBtnText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('analytics')}><Text style={styles.tabIcon}>🔮</Text><Text style={styles.tabLabel}>分析</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}><Text style={styles.tabIcon}>⚙️</Text><Text style={[styles.tabLabel, { color: '#E8A0BF' }]}>设置</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  

  // Privacy Policy
  if (page === 'privacy') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPage('login')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>隐私政策</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={styles.pageContent}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#E8A0BF', textAlign: 'center' }}>🌸 暖暖心语 隐私政策</Text>
          <Text style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 4 }}>更新日期：2026年4月29日</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 20 }}>一、我们收集的信息</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>为了提供心情记录和AI陪伴服务，我们会收集以下信息：</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>1. <Text style={{ fontWeight: 'bold' }}>账号信息</Text>：手机号、昵称，用于注册和登录。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>2. <Text style={{ fontWeight: 'bold' }}>心情记录</Text>：你选择的心情类别、评分、文字描述、图片和视频，用于记录你的心情。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>3. <Text style={{ fontWeight: 'bold' }}>设备信息</Text>：位置信息（仅用于天气服务），设备型号和系统版本。</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 20 }}>二、我们如何使用信息</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>1. 提供心情记录、AI聊天、天气展示等核心功能。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>2. 改善产品体验和功能。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>3. 不会将你的个人信息出售给第三方。</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 20 }}>三、信息存储与安全</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>1. 你的数据存储在我们位于香港的服务器上，采用HTTPS加密传输。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>2. 我们使用行业标准的安全措施保护你的数据。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>3. 密码经过加密存储，我们无法查看你的原始密码。</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 20 }}>四、信息共享</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>除以下情况外，我们不会与你以外的任何人共享你的个人信息：</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>1. 经过你的明确授权（如分享心情）。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>2. 法律法规要求。</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 20 }}>五、你的权利</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>1. 你可以随时在App内查看、修改你的个人资料。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>2. 你可以随时删除你的心情记录。</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>3. 你可以联系我们删除你的账号和所有数据。</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 20 }}>六、未成年人保护</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>我们非常重视未成年人保护。如果你未满14周岁，请在监护人的陪同下阅读本政策并在取得同意后使用本服务。</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 20 }}>七、政策更新</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>我们可能会不时更新本隐私政策。更新后我们会在App内通知你，或在本页面更新日期。</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 20 }}>八、联系我们</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>如果你对本隐私政策有任何疑问，请通过以下方式联系我们：</Text>
          <Text style={{ fontSize: 14, color: '#333', marginTop: 4 }}>邮箱：385731175@qq.com</Text>
        </ScrollView>
      </View>
    );
  }

  // AI Chat
  if (page === 'chat') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <View style={styles.chatHeaderCenter}>
              <Text style={styles.chatHeaderAvatar}>🌸</Text>
              <View>
                <TouchableOpacity onLongPress={() => {
                  Alert.prompt(
                    '给心情伙伴起个名字',
                    '输入你喜欢的名字',
                    [
                      { text: '取消', style: 'cancel' },
                      { text: '确定', onPress: (name) => { if (name && name.trim()) { setBuddyName(name.trim()); } } }
                    ],
                    'plain-text',
                    buddyName
                  );
                }}>
                  <Text style={styles.chatHeaderName}>{buddyName}</Text>
                </TouchableOpacity>
                <Text style={styles.chatHeaderStatus}>在线 · 心情伙伴</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => {
              Alert.prompt(
                '给心情伙伴起个名字',
                '输入你喜欢的名字',
                [
                  { text: '取消', style: 'cancel' },
                  { text: '确定', onPress: (name) => { if (name && name.trim()) { setBuddyName(name.trim()); } } }
                ],
                'plain-text',
                buddyName
              );
            }} style={styles.chatEditNameBtn}>
              <Text style={styles.chatEditNameText}>✏️</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.chatMessages} contentContainerStyle={styles.chatMessagesContent} ref={chatEndRef}
            onContentSizeChange={() => chatEndRef.current?.scrollToEnd({ animated: true })}>
            {chatMessages.length === 0 && (
              <View style={styles.chatWelcome}>
                <View style={styles.chatWelcomeAvatar}><Text style={{ fontSize: 56 }}>🌸</Text></View>
                <Text style={styles.chatWelcomeName}>我是{buddyName}</Text>
                <Text style={styles.chatWelcomeDesc}>你的 AI 心情伙伴~</Text>
                <Text style={styles.chatWelcomeHint}>试试和我说：{'\n'}「今天有点不开心」「给我一个建议」{'\n'}长按名字也可以给我改名哦~</Text>
              </View>
            )}
            {chatMessages.map((msg, i) => (
              <View key={i} style={[styles.chatMsgRow, msg.role === 'user' && styles.chatMsgRowRight]}>
                {msg.role === 'assistant' && (
                  <View style={styles.chatMsgAvatar}><Text style={{ fontSize: 28 }}>🌸</Text></View>
                )}
                <View style={[styles.chatBubble, msg.role === 'user' ? styles.chatBubbleUser : [styles.chatBubbleAI, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]]}>
                  <Text style={[styles.chatBubbleText, msg.role === 'user' ? styles.chatBubbleTextUser : { color: themeColors.text }]}>{msg.content}</Text>
                </View>
                {msg.role === 'user' && (
                  <View style={styles.chatMsgAvatar}><Text style={{ fontSize: 28 }}>🌸</Text></View>
                )}
              </View>
            ))}
            {chatLoading && (
              <View style={styles.chatMsgRow}>
                <View style={styles.chatMsgAvatar}><Text style={{ fontSize: 28 }}>🌸</Text></View>
                <View style={[styles.chatBubble, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}><Text style={styles.chatTyping}>{buddyName}正在思考...</Text></View>
              </View>
            )}
          </ScrollView>
          <View style={[styles.chatInputBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.cardBorder }]}>
            <TextInput style={[styles.chatInput, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder={`和${buddyName}说点什么...`} value={chatInput} onChangeText={setChatInput} multiline maxLength={500} editable={!chatLoading} />
            <TouchableOpacity style={[styles.chatSendBtn, !chatInput.trim() && styles.chatSendBtnDisabled]} onPress={sendChatMessage} disabled={!chatInput.trim() || chatLoading}>
              <Text style={styles.chatSendText}>{chatLoading ? '...' : '发送'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }
  
  // Profile
  if (page === 'profile') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>个人资料</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>基本信息</Text>
            <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="用户名" value={profileUsername} onChangeText={setProfileUsername} />
            <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="✨ 心情号" value={profileMoodId} onChangeText={setProfileMoodId} />
          </View>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>星盘信息</Text>
            <TextInput style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder="🌟 出生日期 (YYYY-MM-DD)" value={profileBirthday} onChangeText={setProfileBirthday} />
            <View style={styles.mbtiSelect}>
              <Text style={styles.label}>🔮 MBTI</Text>
              <View style={styles.mbtiChipRow}>
                {['', 'INTP', 'INTJ', 'INFP', 'INFJ', 'ENFP', 'ENTP', 'ISFP', 'ESFP', 'ISTP'].map(m => (
                  <TouchableOpacity key={m} style={[styles.mbtiChip, profileMbti === m && styles.mbtiChipActive]} onPress={() => setProfileMbti(m)}>
                    <Text style={[styles.mbtiChipText, profileMbti === m && styles.mbtiChipTextActive]}>{m || '未选'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.btn} onPress={saveProfile}><Text style={styles.btnText}>保存资料</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPage('home')}><Text style={styles.btnSecondaryText}>返回</Text></TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
  
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' }, // 背景由动态 themeColors.bg 覆盖
  pageContent: { padding: 16, paddingBottom: 80 },
  centerPage: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  authCard: { padding: 20, alignItems: 'center', paddingTop: 60 },
  registerCard: { padding: 24, paddingTop: 50, paddingBottom: 40 },
  logo: { fontSize: 64, marginBottom: 8 },
  authTitle: { fontSize: 28, fontWeight: 'bold', color: '#E8A0BF', marginBottom: 4 },
  authSub: { fontSize: 14, color: '#8E8E8E', marginBottom: 20 },
  errorMsg: { color: '#ff6b6b', fontSize: 13, marginBottom: 8 },
  input: { width: '100%', paddingVertical: 14, paddingHorizontal: 14, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, marginBottom: 12, minHeight: 48 },
  btn: { width: '100%', padding: 14, backgroundColor: '#E8A0BF', borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: { width: '100%', padding: 14, borderWidth: 1, borderColor: '#E8A0BF', borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: '#E8A0BF', fontSize: 16, fontWeight: '600' },
  link: { color: '#8E8E8E', fontSize: 13, marginTop: 16, textAlign: 'center' },
  authLinks: { width: '100%', alignItems: 'flex-end' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: Platform.OS === 'android' ? 18 : 46, paddingBottom: 8 },
  backBtn: { fontSize: 16, color: '#E8A0BF', paddingVertical: 6, paddingHorizontal: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  profileCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F5D5E5' },
  profileLeft: { marginRight: 12 },
  profileAvatar: { fontSize: 48 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: 'bold' },
  moodIdText: { fontSize: 12, color: '#E8A0BF', marginTop: 2 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  tag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(232,160,191,0.15)', color: '#9B59B6' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E8A0BF', borderRadius: 8 },
  weatherCard: { backgroundColor: '#E8A0BF', borderRadius: 16, padding: 20, marginBottom: 12 },
  weatherTemp: { fontSize: 44, fontWeight: 'bold', color: '#fff' },
  weatherDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  statNum: { fontSize: 26, fontWeight: 'bold', color: '#E8A0BF' },
  statLabel: { fontSize: 11, color: '#8E8E8E', marginTop: 2 },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f5f5f5' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  empty: { textAlign: 'center', color: '#999', paddingVertical: 20, fontSize: 13 },
  moodItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  moodIcon: { fontSize: 32, marginRight: 10 },
  moodInfo: { flex: 1 },
  moodTitle: { fontSize: 15, fontWeight: '500' },
  moodDesc: { fontSize: 13, color: '#8E8E8E', marginTop: 2 },
  moodTime: { fontSize: 11, color: '#bbb', marginTop: 2 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodChip: { width: '30%', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: '#f9f9f9', borderWidth: 2, borderColor: 'transparent' },
  moodChipActive: { borderColor: '#E8A0BF', backgroundColor: '#FFF5F8' },
  moodChipIcon: { fontSize: 28 },
  moodChipLabel: { fontSize: 12, color: '#8E8E8E', marginTop: 4 },
  moodChipLabelActive: { color: '#E8A0BF', fontWeight: '500' },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  scoreBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  scoreBtnActive: { backgroundColor: '#E8A0BF' },
  scoreBtnText: { fontSize: 12, fontWeight: '600', color: '#999' },
  scoreBtnTextActive: { color: '#fff' },
  scoreVal: { color: '#E8A0BF', fontSize: 20 },
  textarea: { minHeight: 120, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e8e8e8', textAlignVertical: 'top', lineHeight: 22 },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 6, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: '#8E8E8E', marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8A0BF', alignItems: 'center', justifyContent: 'center', marginTop: -16, shadowColor: '#E8A0BF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3 },
  addBtnText: { fontSize: 20 },
  tabSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabSel: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center' },
  tabSelActive: { backgroundColor: '#E8A0BF' },
  tabSelText: { fontSize: 13, color: '#666' },
  tabSelTextActive: { color: '#fff', fontWeight: '600' },
  friendItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  friendAvatar: { fontSize: 36 },
  friendName: { fontSize: 15, fontWeight: '500' },
  friendId: { fontSize: 11, color: '#8E8E8E' },
  zodiacDisplay: { alignItems: 'center', paddingVertical: 16 },
  zodiacIcon: { fontSize: 52 },
  zodiacName: { fontSize: 20, fontWeight: 'bold', marginTop: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 13, color: '#8E8E8E' },
  infoValue: { fontSize: 13, fontWeight: '500' },
  mbtiType: { fontSize: 36, fontWeight: 'bold', color: '#3498DB', textAlign: 'center' },
  mbtiName: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', marginTop: 4 },
  traitRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  trait: { fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(52,152,219,0.1)', color: '#3498DB' },
  mbtiSelect: { marginBottom: 12 },
  label: { fontSize: 13, color: '#8E8E8E', marginBottom: 8 },
  mbtiChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8 },
  mbtiChipActive: { backgroundColor: '#3498DB' },
  mbtiChipText: { fontSize: 12, color: '#666' },
  mbtiChipTextActive: { color: '#fff', fontWeight: '600' },
  mbtiChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mediaPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  mediaThumb: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  mediaThumbImg: { width: '100%', height: '100%' },
  videoThumb: { width: '100%', height: '100%', backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  videoThumbIcon: { fontSize: 24 },
  videoThumbText: { fontSize: 10, color: '#fff', marginTop: 2 },
  mediaRemove: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  mediaRemoveText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  mediaActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  mediaBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF0F5', borderWidth: 1, borderColor: '#F5D5E5' },
  mediaBtnText: { fontSize: 13, color: '#E8A0BF' },
  mediaCount: { fontSize: 12, color: '#bbb', marginLeft: 'auto' },
  btnDisabled: { opacity: 0.6 },
  moodMediaRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  moodMediaThumb: { width: 50, height: 50, borderRadius: 8 },
  moodVideoBadge: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  mediaMore: { fontSize: 11, color: '#E8A0BF', alignSelf: 'center', marginLeft: 2 },
  // AI Buddy Card (首页)
  aiBuddyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'linear-gradient(135deg, #FFF5F8 0%, #F0E6FF 100%)', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F5D5E5' },
  aiBuddyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  aiBuddyAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFE8F0', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  aiBuddyEmoji: { fontSize: 32 },
  aiBuddyFloat: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  aiBuddyFloatText: { fontSize: 9, fontWeight: 'bold' },
  aiBuddyInfo: { marginLeft: 14 },
  aiBuddyName: { fontSize: 16, fontWeight: '600', color: '#333' },
  aiBuddyDesc: { fontSize: 12, color: '#999', marginTop: 3 },
  aiBuddyArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F5D5E5', justifyContent: 'center', alignItems: 'center' },
  aiBuddyArrowText: { fontSize: 20, color: '#E8A0BF', fontWeight: '300' },
  // Chat
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingTop: Platform.OS === 'android' ? 18 : 46 },
  chatHeaderCenter: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  chatHeaderAvatar: { fontSize: 28, marginRight: 8 },
  chatHeaderName: { fontSize: 16, fontWeight: '600' },
  chatHeaderStatus: { fontSize: 11, color: '#4CAF50', textAlign: 'center' },
  chatMessages: { flex: 1, backgroundColor: '#FFF8F0' },
  chatMessagesContent: { padding: 16, paddingBottom: 10 },
  chatWelcome: { alignItems: 'center', paddingVertical: 60 },
  chatWelcomeAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFE8F0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  chatWelcomeName: { fontSize: 22, fontWeight: 'bold', color: '#E8A0BF' },
  chatWelcomeDesc: { fontSize: 14, color: '#999', marginTop: 6 },
  chatWelcomeHint: { fontSize: 13, color: '#bbb', marginTop: 20, textAlign: 'center', lineHeight: 22 },
  chatMsgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, maxWidth: '85%' },
  chatMsgRowRight: { alignSelf: 'flex-end' },
  chatMsgAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFE8F0', justifyContent: 'center', alignItems: 'center', marginHorizontal: 6 },
  chatBubble: { padding: 12, borderRadius: 18, maxWidth: '80%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0' },
  chatBubbleAI: { borderBottomLeftRadius: 6 },
  chatBubbleUser: { backgroundColor: '#E8A0BF', borderBottomRightRadius: 6, borderWidth: 0 },
  chatBubbleText: { fontSize: 15, color: '#333', lineHeight: 22 },
  chatBubbleTextUser: { color: '#fff' },
  chatTyping: { fontSize: 14, color: '#bbb', fontStyle: 'italic' },
  chatInputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingBottom: 24 },
  chatInput: { flex: 1, minHeight: 38, maxHeight: 100, paddingVertical: 8, paddingHorizontal: 14, fontSize: 15, backgroundColor: '#f8f8f8', borderRadius: 20, borderWidth: 1, borderColor: '#e8e8e8', textAlignVertical: 'top', lineHeight: 21 },
  chatSendBtn: { minWidth: 60, height: 38, borderRadius: 19, backgroundColor: '#E8A0BF', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  chatSendBtnDisabled: { backgroundColor: '#ddd' },
  chatSendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  // Settings
  settingCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f5f5f5' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  settingIcon: { fontSize: 24, marginRight: 12 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '500', color: '#333' },
  settingDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  settingArrow: { fontSize: 22, color: '#ccc', fontWeight: '300' },
  settingSectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 8, textTransform: 'uppercase' },
  themeSelector: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4 },
  themeOption: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#f9f9f9', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  themeOptionActive: { borderColor: '#E8A0BF', backgroundColor: '#FFF5F8' },
  themeOptionText: { fontSize: 12, color: '#666', marginTop: 2 },
  themeOptionTextActive: { color: '#E8A0BF', fontWeight: '600' },
  // Home Top Bar
  homeTopBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
  homeTitle: { fontSize: 22, fontWeight: '700', color: '#E8A0BF' },
  // Mood Footer (日记本分享行)
  moodFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  shareBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#FFF0F5', borderWidth: 1, borderColor: '#F5D5E5' },
  shareBtnText: { fontSize: 12, color: '#E8A0BF', fontWeight: '500' },
  // Share Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  shareModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  shareModalHandle: { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  shareModalTitle: { fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 16 },
  shareMoodPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#F5D5E5' },
  shareMoodIcon: { fontSize: 36, marginRight: 12 },
  shareMoodLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  shareMoodDesc: { fontSize: 13, color: '#999', marginTop: 3 },
  shareModalSubtitle: { fontSize: 13, color: '#999', marginBottom: 12 },
  sharePlatformRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 20 },
  sharePlatformBtn: { alignItems: 'center' },
  sharePlatformIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sharePlatformLabel: { fontSize: 13, color: '#333' },
  shareModalCancel: { alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  shareModalCancelText: { fontSize: 16, color: '#999' },
  // Mood Detail
  detailCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 10, borderWidth: 1, borderColor: '#f5f5f5' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailIcon: { fontSize: 48, marginRight: 16 },
  detailHeaderInfo: { flex: 1 },
  detailMoodLabel: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  detailScoreBar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  detailScoreFill: { height: '100%', backgroundColor: '#E8A0BF', borderRadius: 4 },
  detailScore: { fontSize: 14, color: '#E8A0BF', marginTop: 4 },
  detailTimeRow: { flexDirection: 'row', alignItems: 'center' },
  detailTime: { fontSize: 13, color: '#999' },
  detailDescText: { fontSize: 15, lineHeight: 24, color: '#555', paddingVertical: 4 },
  detailMediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailMediaImg: { width: 110, height: 110, borderRadius: 12 },
  imageViewerOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  imageViewerClose: { position: 'absolute', top: Platform.OS === 'android' ? 36 : 56, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  imageViewerCloseText: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  imageViewerImg: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  imageViewerVideoWrap: { justifyContent: 'center', alignItems: 'center' },
  detailVideoWrap: { width: 110, height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  detailVideoThumb: { width: '100%', height: '100%', position: 'absolute' },
  detailVideoPlay: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  shareBtnLarge: { width: '100%', padding: 14, backgroundColor: '#FFF0F5', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F5D5E5', marginTop: 10 },
  shareBtnLargeText: { fontSize: 16, fontWeight: '600', color: '#E8A0BF' },
  // Mood Advice (好心情建议)
  adviceItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  adviceIcon: { fontSize: 24, marginRight: 10 },
  adviceTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  adviceCount: { fontSize: 12, color: '#bbb', marginTop: 2 },
  adviceTipRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3, paddingLeft: 4 },
  adviceTipBullet: { fontSize: 14, color: '#E8A0BF', marginRight: 8, marginTop: 1 },
  adviceTipText: { fontSize: 13, color: '#666', lineHeight: 20, flex: 1 },
  // Chat Edit Name Button
  chatEditNameBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center' },
  chatEditNameText: { fontSize: 14 },
  // Camera & Audio Styles
  mediaBtnActive: { backgroundColor: '#E8A0BF', borderColor: '#E8A0BF' },
  mediaBtnActiveText: { color: '#fff' },
  mediaBtnRecording: { backgroundColor: '#ff4757', borderColor: '#ff4757' },
  audioThumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center' },
  audioThumbIcon: { fontSize: 24 },
  audioThumbLabel: { fontSize: 11, color: '#E8A0BF', marginTop: 4 },
  moodAudioBadge: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center' },
  audioPlayCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#F5D5E5', marginTop: 8, width: '100%' },
  audioPlayIcon: { fontSize: 28, marginRight: 12 },
  audioPlayText: { fontSize: 15, fontWeight: '600' },
});
