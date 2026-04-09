import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, Alert, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';

const API_BASE = 'http://192.168.1.10:3000/api';

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
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedScore, setSelectedScore] = useState(5);
  const [desc, setDesc] = useState('');
  const [moods, setMoods] = useState([]);
  const [friends, setFriends] = useState([]);
  
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
  
  // Profile state
  const [profileUsername, setProfileUsername] = useState('');
  const [profileMoodId, setProfileMoodId] = useState('');
  const [profileBirthday, setProfileBirthday] = useState('');
  const [profileMbti, setProfileMbti] = useState('');
  
  // Friend search
  const [friendPhone, setFriendPhone] = useState('');
  const [friendMoodId, setFriendMoodId] = useState('');
  const [nearbyMode, setNearbyMode] = useState('phone');
  
  // Weather
  const [weather, setWeather] = useState({ temp: '--', desc: '获取中...' });
  
  useEffect(() => {
    const savedToken = localStorage.getItem('moodbloom_token');
    const savedUser = localStorage.getItem('moodbloom_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setPage('home');
      loadWeather();
      loadMoods();
      loadFriends();
    }
  }, []);
  
  async function doLogin() {
    if (!loginAccount || !loginPassword) { setAuthMsg('请填写账号和密码'); return; }
    setAuthMsg('登录中...');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginAccount, password: loginPassword })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('moodbloom_token', data.token);
        localStorage.setItem('moodbloom_user', JSON.stringify(data.user));
        setPage('home');
        loadWeather();
        loadMoods();
        loadFriends();
      } else {
        setAuthMsg(data.error || '登录失败');
      }
    } catch (e) { setAuthMsg('网络错误'); }
  }
  
  async function doRegister() {
    if (!regPhone || !regUsername || !regPassword) { setAuthMsg('请填写必填项'); return; }
    setAuthMsg('注册中...');
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone, username: regUsername, password: regPassword, mood_id: regMoodId, birthday: regBirthday, mbti: regMbti })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('moodbloom_token', data.token);
        localStorage.setItem('moodbloom_user', JSON.stringify(data.user));
        setPage('home');
        loadWeather();
        loadMoods();
        loadFriends();
      } else {
        setAuthMsg(data.error || '注册失败');
      }
    } catch (e) { setAuthMsg('网络错误'); }
  }
  
  async function loadWeather() {
    try {
      const res = await fetch(`${API_BASE}/weather?lat=39.9&lon=116.4`);
      const data = await res.json();
      setWeather({ temp: data.temp || '--', desc: (data.description || '') + ' · ' + (data.city || '北京') });
    } catch (e) {}
  }
  
  async function loadMoods() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/moods`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setMoods(data.data || []);
    } catch (e) {}
  }
  
  async function loadFriends() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/friends`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setFriends(data.friends || []);
    } catch (e) {}
  }
  
  async function submitMood() {
    if (!selectedMood) { Alert.alert('提示', '请选择心情'); return; }
    try {
      const res = await fetch(`${API_BASE}/moods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mood_category: selectedMood, mood_score: selectedScore, description: desc, visibility: 'public' })
      });
      if (res.ok) {
        Alert.alert('成功', '发布成功！');
        setSelectedMood(null);
        setDesc('');
        setSelectedScore(5);
        loadMoods();
        setPage('home');
      }
    } catch (e) { Alert.alert('错误', '网络错误'); }
  }
  
  async function addFriendByPhone() {
    if (!friendPhone) return;
    try {
      const res = await fetch(`${API_BASE}/friends/add-by-phone`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phone: friendPhone })
      });
      const data = await res.json();
      Alert.alert('提示', data.message || data.error);
      if (data.message) { setFriendPhone(''); loadFriends(); }
    } catch (e) { Alert.alert('错误', '网络错误'); }
  }
  
  async function addFriendByMoodId() {
    if (!friendMoodId) return;
    try {
      const res = await fetch(`${API_BASE}/friends/add-by-qr`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ qr_code: friendMoodId })
      });
      const data = await res.json();
      Alert.alert('提示', data.message || data.error);
      if (data.message) { setFriendMoodId(''); loadFriends(); }
    } catch (e) { Alert.alert('错误', '网络错误'); }
  }
  
  function saveProfile() {
    if (!user) return;
    const updated = { ...user, username: profileUsername || user.username, mood_id: profileMoodId || user.mood_id, birthday: profileBirthday || user.birthday, mbti: profileMbti || user.mbti };
    setUser(updated);
    localStorage.setItem('moodbloom_user', JSON.stringify(updated));
    Alert.alert('成功', '保存成功！');
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
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.authCard}>
          <Text style={styles.logo}>🌸</Text>
          <Text style={styles.authTitle}>MoodBloom</Text>
          <Text style={styles.authSub}>记录心情 · 遇见同频的TA</Text>
          <Text style={styles.errorMsg}>{authMsg}</Text>
          <TextInput style={styles.input} placeholder="手机号 / 心情号" value={loginAccount} onChangeText={setLoginAccount} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="密码" secureTextEntry value={loginPassword} onChangeText={setLoginPassword} />
          <TouchableOpacity style={styles.btn} onPress={doLogin}><Text style={styles.btnText}>登 录</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setAuthMsg(''); setPage('register'); }}><Text style={styles.link}>还没有账号？立即注册</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (page === 'register') {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.authCard}>
          <Text style={styles.logo}>🌸</Text>
          <Text style={styles.authTitle}>创建账号</Text>
          <Text style={styles.authSub}>开启你的心情之旅</Text>
          <Text style={styles.errorMsg}>{authMsg}</Text>
          <TextInput style={styles.input} placeholder="📱 手机号" value={regPhone} onChangeText={setRegPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="👤 用户名" value={regUsername} onChangeText={setRegUsername} />
          <TextInput style={styles.input} placeholder="✨ 心情号（可选）" value={regMoodId} onChangeText={setRegMoodId} />
          <TextInput style={styles.input} placeholder="🌟 出生日期 (YYYY-MM-DD)" value={regBirthday} onChangeText={setRegBirthday} />
          <View style={styles.mbtiSelect}>
            <Text style={styles.label}>🔮 MBTI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['', 'INTP', 'INTJ', 'INFP', 'INFJ', 'ENFP', 'ENTP', 'ISFP', 'ESFP', 'ISTP'].map(m => (
                <TouchableOpacity key={m} style={[styles.mbtiChip, regMbti === m && styles.mbtiChipActive]} onPress={() => setRegMbti(m)}>
                  <Text style={[styles.mbtiChipText, regMbti === m && styles.mbtiChipTextActive]}>{m || '未选'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TextInput style={styles.input} placeholder="🔒 密码（至少6位）" secureTextEntry value={regPassword} onChangeText={setRegPassword} />
          <TouchableOpacity style={styles.btn} onPress={doRegister}><Text style={styles.btnText}>注 册</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setAuthMsg(''); setPage('login'); }}><Text style={styles.link}>已有账号？返回登录</Text></TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
  
  // Home
  if (page === 'home') {
    const zodiacKey = user?.birthday ? getZodiac(user.birthday) : null;
    const zodiac = zodiacKey ? ZODIAC_DATA[zodiacKey] : null;
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.profileCard}>
            <View style={styles.profileLeft}>
              <Text style={styles.profileAvatar}>🌸</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.username || '你'}</Text>
              <Text style={styles.moodIdText}>✨ {user?.mood_id || '心情号未设置'}</Text>
              <View style={styles.tagRow}>
                {zodiac && <Text style={styles.tag}>{zodiac.icon} {zodiac.name}</Text>}
                {user?.mbti && <Text style={styles.tag}>{user.mbti}</Text>}
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openProfile}><Text>编辑</Text></TouchableOpacity>
          </View>
          
          <View style={styles.weatherCard}>
            <Text style={styles.weatherTemp}>{weather.temp}°</Text>
            <Text style={styles.weatherDesc}>{weather.desc}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{moods.length}</Text><Text style={styles.statLabel}>记录数</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{new Set(moods.map(m => new Date(m.created_at).toDateString())).size}</Text><Text style={styles.statLabel}>天数</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{friends.length}</Text><Text style={styles.statLabel}>好友数</Text></View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 最近心情</Text>
            {moods.length === 0 && <Text style={styles.empty}>暂无记录</Text>}
            {moods.slice(0, 3).map((m, i) => (
              <View key={i} style={styles.moodItem}>
                <Text style={styles.moodIcon}>{MOOD_ICONS[m.mood_category] || '🌸'}</Text>
                <View style={styles.moodInfo}>
                  <Text style={styles.moodTitle}>{MOOD_LABELS[m.mood_category] || m.mood_category} · {m.mood_score}分</Text>
                  <Text style={styles.moodDesc}>{m.description || '无描述'}</Text>
                  <Text style={styles.moodTime}>{new Date(m.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem}><Text style={styles.tabIcon}>🏠</Text><Text style={styles.tabLabel}>首页</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadMoods(); setPage('history'); }}><Text style={styles.tabIcon}>📅</Text><Text style={styles.tabLabel}>历史</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPage('newmood')}><Text style={styles.addBtnText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('analytics')}><Text style={styles.tabIcon}>🔮</Text><Text style={styles.tabLabel}>分析</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadFriends(); setPage('friends'); }}><Text style={styles.tabIcon}>👥</Text><Text style={styles.tabLabel}>好友</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // New Mood
  if (page === 'newmood') {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={styles.headerTitle}>记录心情</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>选择此刻心情</Text>
            <View style={styles.moodGrid}>
              {Object.entries(MOOD_ICONS).map(([key, icon]) => (
                <TouchableOpacity key={key} style={[styles.moodChip, selectedMood === key && styles.moodChipActive]} onPress={() => setSelectedMood(key)}>
                  <Text style={styles.moodChipIcon}>{icon}</Text>
                  <Text style={[styles.moodChipLabel, selectedMood === key && styles.moodChipLabelActive]}>{MOOD_LABELS[key]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>心情指数 <Text style={styles.scoreVal}>{selectedScore}</Text></Text>
            <View style={styles.scoreRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity key={n} style={[styles.scoreBtn, n <= selectedScore && styles.scoreBtnActive]} onPress={() => setSelectedScore(n)}>
                  <Text style={[styles.scoreBtnText, n <= selectedScore && styles.scoreBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>碎碎念</Text>
            <TextInput style={styles.textarea} placeholder="今天发生了什么？记录此刻的心情~" multiline value={desc} onChangeText={setDesc} />
          </View>
          
          <TouchableOpacity style={styles.btn} onPress={submitMood}><Text style={styles.btnText}>✨ 发布心情</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPage('home')}><Text style={styles.btnSecondaryText}>取消</Text></TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
  
  // History
  if (page === 'history') {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={styles.headerTitle}>历史记录</Text>
            <View style={{ width: 50 }} />
          </View>
          {moods.length === 0 && <Text style={styles.empty}>暂无记录</Text>}
          {moods.map((m, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.moodItem}>
                <Text style={styles.moodIcon}>{MOOD_ICONS[m.mood_category] || '🌸'}</Text>
                <View style={styles.moodInfo}>
                  <Text style={styles.moodTitle}>{MOOD_LABELS[m.mood_category] || m.mood_category} · {m.mood_score}分</Text>
                  <Text style={styles.moodDesc}>{m.description || '无描述'}</Text>
                  <Text style={styles.moodTime}>{new Date(m.created_at).toLocaleString('zh-CN')}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('home')}><Text style={styles.tabIcon}>🏠</Text><Text style={styles.tabLabel}>首页</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}><Text style={styles.tabIcon}>📅</Text><Text style={[styles.tabLabel, { color: '#E8A0BF' }]}>历史</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPage('newmood')}><Text style={styles.addBtnText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('analytics')}><Text style={styles.tabIcon}>🔮</Text><Text style={styles.tabLabel}>分析</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadFriends(); setPage('friends'); }}><Text style={styles.tabIcon}>👥</Text><Text style={styles.tabLabel}>好友</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Analytics
  if (page === 'analytics') {
    const zodiacKey = user?.birthday ? getZodiac(user.birthday) : null;
    const zodiac = zodiacKey ? ZODIAC_DATA[zodiacKey] : null;
    const luckies = ['大吉', '吉', '中吉', '小吉', '平'];
    const advices = { aries: '今日适合行动！', taurus: '今日适合理财', gemini: '今日适合交流', cancer: '今日适合陪伴家人', leo: '今日适合展现自我', virgo: '今日适合整理规划', libra: '今日适合社交人际', scorpio: '今日适合深度思考', sagittarius: '今日适合探索冒险', capricorn: '今日适合长远规划', aquarius: '今日适合创新突破', pisces: '今日适合艺术创作' };
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={styles.headerTitle}>🔮 心情分析</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌟 星座运势</Text>
            {zodiac ? (
              <>
                <View style={styles.zodiacDisplay}>
                  <Text style={styles.zodiacIcon}>{zodiac.icon}</Text>
                  <Text style={styles.zodiacName}>{zodiac.name}</Text>
                </View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>今日运势</Text><Text style={styles.infoValue}>{luckies[Math.floor(Math.random() * luckies.length)]}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>幸运颜色</Text><Text style={styles.infoValue}>{zodiac.color}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>心情建议</Text><Text style={styles.infoValue}>{advices[zodiacKey]}</Text></View>
              </>
            ) : (
              <Text style={styles.empty}>去个人资料设置生日后查看星座分析</Text>
            )}
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧠 MBTI 心情匹配</Text>
            {user?.mbti && MBTI_INFO[user.mbti] ? (
              <>
                <Text style={styles.mbtiType}>{user.mbti}</Text>
                <Text style={styles.mbtiName}>{MBTI_INFO[user.mbti].name}</Text>
                <View style={styles.traitRow}>
                  {MBTI_INFO[user.mbti].traits.map(t => <Text key={t} style={styles.trait}>{t}</Text>)}
                </View>
              </>
            ) : (
              <Text style={styles.empty}>去个人资料设置MBTI</Text>
            )}
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 心情统计</Text>
            <Text style={styles.empty}>共 {moods.length} 条心情记录</Text>
          </View>
        </ScrollView>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('home')}><Text style={styles.tabIcon}>🏠</Text><Text style={styles.tabLabel}>首页</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadMoods(); setPage('history'); }}><Text style={styles.tabIcon}>📅</Text><Text style={styles.tabLabel}>历史</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPage('newmood')}><Text style={styles.addBtnText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}><Text style={styles.tabIcon}>🔮</Text><Text style={[styles.tabLabel, { color: '#E8A0BF' }]}>分析</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadFriends(); setPage('friends'); }}><Text style={styles.tabIcon}>👥</Text><Text style={styles.tabLabel}>好友</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Friends
  if (page === 'friends') {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={styles.headerTitle}>👥 添加好友</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={styles.tabSelector}>
            <TouchableOpacity style={[styles.tabSel, nearbyMode === 'phone' && styles.tabSelActive]} onPress={() => setNearbyMode('phone')}><Text style={[styles.tabSelText, nearbyMode === 'phone' && styles.tabSelTextActive]}>📱 手机号</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tabSel, nearbyMode === 'moodid' && styles.tabSelActive]} onPress={() => setNearbyMode('moodid')}><Text style={[styles.tabSelText, nearbyMode === 'moodid' && styles.tabSelTextActive]}>✨ 心情号</Text></TouchableOpacity>
          </View>
          
          {nearbyMode === 'phone' ? (
            <View style={styles.card}>
              <TextInput style={styles.input} placeholder="输入好友手机号" value={friendPhone} onChangeText={setFriendPhone} keyboardType="phone-pad" />
              <TouchableOpacity style={styles.btn} onPress={addFriendByPhone}><Text style={styles.btnText}>添加好友</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <TextInput style={styles.input} placeholder="输入好友心情号" value={friendMoodId} onChangeText={setFriendMoodId} />
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#FFD700' }]} onPress={addFriendByMoodId}><Text style={styles.btnText}>添加好友</Text></TouchableOpacity>
            </View>
          )}
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>我的好友 ({friends.length})</Text>
            {friends.length === 0 && <Text style={styles.empty}>暂无好友</Text>}
            {friends.map((f, i) => (
              <View key={i} style={styles.friendItem}>
                <Text style={styles.friendAvatar}>🌸</Text>
                <View><Text style={styles.friendName}>{f.username}</Text><Text style={styles.friendId}>✨ {f.mood_id || f.id?.substring(0,8)}</Text></View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('home')}><Text style={styles.tabIcon}>🏠</Text><Text style={styles.tabLabel}>首页</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { loadMoods(); setPage('history'); }}><Text style={styles.tabIcon}>📅</Text><Text style={styles.tabLabel}>历史</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPage('newmood')}><Text style={styles.addBtnText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setPage('analytics')}><Text style={styles.tabIcon}>🔮</Text><Text style={styles.tabLabel}>分析</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}><Text style={styles.tabIcon}>👥</Text><Text style={[styles.tabLabel, { color: '#E8A0BF' }]}>好友</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Profile
  if (page === 'profile') {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPage('home')}><Text style={styles.backBtn}>← 返回</Text></TouchableOpacity>
            <Text style={styles.headerTitle}>个人资料</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>基本信息</Text>
            <TextInput style={styles.input} placeholder="用户名" value={profileUsername} onChangeText={setProfileUsername} />
            <TextInput style={styles.input} placeholder="✨ 心情号" value={profileMoodId} onChangeText={setProfileMoodId} />
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>星盘信息</Text>
            <TextInput style={styles.input} placeholder="🌟 出生日期 (YYYY-MM-DD)" value={profileBirthday} onChangeText={setProfileBirthday} />
            <View style={styles.mbtiSelect}>
              <Text style={styles.label}>🔮 MBTI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['', 'INTP', 'INTJ', 'INFP', 'INFJ', 'ENFP', 'ENTP', 'ISFP', 'ESFP', 'ISTP'].map(m => (
                  <TouchableOpacity key={m} style={[styles.mbtiChip, profileMbti === m && styles.mbtiChipActive]} onPress={() => setProfileMbti(m)}>
                    <Text style={[styles.mbtiChipText, profileMbti === m && styles.mbtiChipTextActive]}>{m || '未选'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  pageContent: { padding: 16, paddingBottom: 80 },
  centerPage: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  authCard: { padding: 20, alignItems: 'center', paddingTop: 60 },
  logo: { fontSize: 64, marginBottom: 8 },
  authTitle: { fontSize: 28, fontWeight: 'bold', color: '#E8A0BF', marginBottom: 4 },
  authSub: { fontSize: 14, color: '#8E8E8E', marginBottom: 20 },
  errorMsg: { color: '#ff6b6b', fontSize: 13, marginBottom: 8 },
  input: { width: '100%', padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fff', marginBottom: 12 },
  btn: { width: '100%', padding: 14, backgroundColor: '#E8A0BF', borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: { width: '100%', padding: 14, borderWidth: 1, borderColor: '#E8A0BF', borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: '#E8A0BF', fontSize: 16, fontWeight: '600' },
  link: { color: '#8E8E8E', fontSize: 13, marginTop: 16, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { fontSize: 15, color: '#E8A0BF' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F5D5E5' },
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
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  statNum: { fontSize: 26, fontWeight: 'bold', color: '#E8A0BF' },
  statLabel: { fontSize: 11, color: '#8E8E8E', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f5f5f5' },
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
  textarea: { minHeight: 100, padding: 12, fontSize: 14, backgroundColor: '#fafafa', borderRadius: 10, borderWidth: 1, borderColor: '#e8e8e8', textAlignVertical: 'top' },
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
});
