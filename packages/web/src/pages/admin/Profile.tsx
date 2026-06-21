import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { IconSave, IconUser, IconCheck } from '@/components/Icons';
import ImageCropperModal from '@/components/admin/ImageCropperModal';

const IconGithub = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const IconMail = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IconBilibili = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="2" y="6" width="20" height="14" rx="4" />
    <path d="M7 2l3 4M17 2l-3 4" />
    <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M9 16c1 1.5 5 1.5 6 0" />
  </svg>
);

const IconTwitter = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);


interface UserProfile {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  last_active_at: string;
  created_at: string;
  tags: { id: number; name: string; slug: string }[];
}

export default function Profile() {
  const { updateToken } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Editor preferences (stored locally)
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem('editor_autosave_enabled') !== 'false');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('editor_font_size') || '16px');
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('editor_focus_mode') === 'true');
  const [editorTheme, setEditorTheme] = useState(() => localStorage.getItem('editor_theme') || 'classic');

  // Social links (stored in bio column as JSON)
  const [github, setGithub] = useState('');
  const [emailLink, setEmailLink] = useState('');
  const [bilibili, setBilibili] = useState('');
  const [twitter, setTwitter] = useState('');
  const [savingSocials, setSavingSocials] = useState(false);
  const [socialsMsg, setSocialsMsg] = useState('');
  const [activeSocialEdit, setActiveSocialEdit] = useState<'github' | 'email' | 'bilibili' | 'twitter' | null>(null);
  const [socialInputVal, setSocialInputVal] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState(false);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    try {
      const { data, newToken } = await adminApi.get<UserProfile>('/api/admin/profile');
      if (newToken) updateToken(newToken);
      setProfile(data);
      setDisplayName(data.display_name || '');
      setAvatarUrl(data.avatar_url || '');
      setTags(data.tags?.map(t => t.name) || []);

      // Parse bio and socials from bio column
      const rawBio = data.bio || '';
      try {
        const parsed = JSON.parse(rawBio);
        if (parsed && typeof parsed === 'object' && ('bio' in parsed || 'github' in parsed)) {
          setBio(parsed.bio || '');
          setGithub(parsed.github || '');
          setEmailLink(parsed.email || '');
          setBilibili(parsed.bilibili || '');
          setTwitter(parsed.twitter || '');
          return;
        }
      } catch (e) {
        // Fallback if not JSON
      }
      setBio(rawBio);
      setGithub('');
      setEmailLink('');
      setBilibili('');
      setTwitter('');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, [updateToken]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropperSrc(reader.result);
        setCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAvatarCrop = async (blob: Blob) => {
    setCropperOpen(false);
    setSavingProfile(true);
    setProfileMsg('正在上传头像...');
    try {
      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');
      const { data, newToken } = await adminApi.upload<{ filename: string }>('/api/media/upload', formData);
      if (newToken) updateToken(newToken);
      setAvatarUrl(`/media/${data.filename}`);
      setProfileMsg('头像已生成，保存资料后生效');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      setProfileMsg(err.message || '头像上传失败');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save profile
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const serializedBio = JSON.stringify({
        bio: bio,
        github,
        email: emailLink,
        bilibili,
        twitter,
      });

      const { data, newToken } = await adminApi.put<UserProfile>('/api/admin/profile', {
        display_name: displayName,
        bio: serializedBio,
        avatar_url: avatarUrl,
        tags,
      });
      if (newToken) updateToken(newToken);
      setProfile(data);
      setProfileMsg('保存成功');
      setTimeout(() => setProfileMsg(''), 2000);
    } catch (err: any) {
      setProfileMsg(err.message || '保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save socials
  const saveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSocials(true);
    setSocialsMsg('');
    try {
      const serializedBio = JSON.stringify({
        bio: bio,
        github,
        email: emailLink,
        bilibili,
        twitter,
      });

      const { data, newToken } = await adminApi.put<UserProfile>('/api/admin/profile', {
        display_name: displayName,
        bio: serializedBio,
        avatar_url: avatarUrl,
        tags,
      });
      if (newToken) updateToken(newToken);
      setProfile(data);
      setSocialsMsg('社交链接保存成功');
      setTimeout(() => setSocialsMsg(''), 2000);
    } catch (err: any) {
      setSocialsMsg(err.message || '保存失败');
    } finally {
      setSavingSocials(false);
    }
  };

  const handleConfirmSocial = () => {
    if (!activeSocialEdit) return;
    if (activeSocialEdit === 'github') setGithub(socialInputVal);
    else if (activeSocialEdit === 'email') setEmailLink(socialInputVal);
    else if (activeSocialEdit === 'bilibili') setBilibili(socialInputVal);
    else if (activeSocialEdit === 'twitter') setTwitter(socialInputVal);
    setActiveSocialEdit(null);
  };

  // Add tag
  const addTag = () => {
    const name = tagInput.trim();
    if (name) {
      if (tags.length >= 10) {
        alert('最多只能添加 10 个标签');
        return;
      }
      if (!tags.includes(name)) {
        setTags(prev => [...prev, name]);
      }
    }
    setTagInput('');
  };

  // Change password
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwError(false);

    if (!currentPw) {
      setPwMsg('请输入当前密码'); setPwError(true); return;
    }
    if (!newPw) {
      setPwMsg('请输入新密码'); setPwError(true); return;
    }
    if (newPw.length < 8) {
      setPwMsg('新密码至少 8 位'); setPwError(true); return;
    }
    if (newPw !== confirmPw) {
      setPwMsg('两次输入的新密码不一致'); setPwError(true); return;
    }

    setSavingPw(true);
    try {
      const { newToken } = await adminApi.put('/api/admin/password', {
        current_password: currentPw,
        new_password: newPw,
      });
      if (newToken) updateToken(newToken);
      setPwMsg('密码已更新');
      setPwError(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err: any) {
      setPwMsg(err.message || '密码修改失败');
      setPwError(true);
    } finally {
      setSavingPw(false);
    }
  };

  const saveEditorPrefs = (key: string, value: string | boolean) => {
    localStorage.setItem(key, String(value));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-xl">
        <div className="h-8 w-32 bg-white/20 dark:bg-white/[0.03] rounded-xl" />
        <div className="h-48 bg-white/20 dark:bg-white/[0.03] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">个人设置</h1>
        <p className="text-sm text-gray-400 mt-1">
          用户名：{profile?.username} · 注册于 {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {/* Column 1: Profile Form */}
        <form onSubmit={saveProfile} className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-text-primary dark:text-white">编辑资料</h2>

          {/* Avatar */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">头像</label>
            <div className="flex items-center gap-4">
              <div 
                onClick={() => avatarInputRef.current?.click()}
                className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.05] flex-shrink-0 cursor-pointer group/avatar hover:border-brand/30 transition-all"
                title="点击上传本地头像"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <IconUser size={28} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white font-bold">更换</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="头像 URL（图床链接）"
                  className="w-full px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-xs text-brand hover:underline font-bold"
                  >
                    上传本地图片并裁剪...
                  </button>
                </div>
              </div>

              <input
                type="file"
                ref={avatarInputRef}
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">显示名称</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="你的公开名称"
              className="w-full px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">简介</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="简单介绍一下自己..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">标签（技能 / 兴趣）</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light">
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags(prev => prev.filter(x => x !== t))}
                    className="hover:text-like transition-colors ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="输入标签后按回车添加"
                className="flex-1 px-4 py-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                + 添加
              </button>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between pt-2">
            {profileMsg && (
              <span className={`text-xs ${profileMsg.startsWith('保存') ? 'text-brand' : 'text-like'}`}>
                {profileMsg}
              </span>
            )}
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 shadow-md shadow-brand/25"
            >
              <IconSave size={14} />
              {savingProfile ? '保存中...' : '保存资料'}
            </button>
          </div>
        </form>

        {/* Column 2: Editor Preferences */}
        <div className="glass rounded-2xl p-6 flex flex-col h-full">
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-white">编辑器偏好设置</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">配置写作面板的行为（数据存于本地）</p>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-4 pt-4">
            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">草稿自动保存</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">在撰写文章时自动保存草稿</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !autoSave;
                  setAutoSave(nextVal);
                  saveEditorPrefs('editor_autosave_enabled', nextVal);
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSave ? 'bg-brand' : 'bg-black/10 dark:bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoSave ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Focus Mode */}
            <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">写作专注模式</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">开始编写时隐去非必要侧边栏</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !focusMode;
                  setFocusMode(nextVal);
                  saveEditorPrefs('editor_focus_mode', nextVal);
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  focusMode ? 'bg-brand' : 'bg-black/10 dark:bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    focusMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Font Size */}
            <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">编辑器字号</h3>
                <span className="text-xs text-brand font-extrabold bg-brand/10 px-1.5 py-0.5 rounded">{fontSize}</span>
              </div>
              <div className="flex gap-2">
                {['14px', '15px', '16px', '18px'].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setFontSize(sz);
                      saveEditorPrefs('editor_font_size', sz);
                    }}
                    className={`flex-1 py-1 text-xs rounded-xl border transition-colors ${
                      fontSize === sz
                        ? 'border-brand text-brand bg-brand/5 dark:bg-brand/10 font-bold'
                        : 'border-black/5 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    {sz.replace('px', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Theme */}
            <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-3.5 space-y-2">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white">编辑器高亮主题</h3>
              <div className="flex gap-2">
                {[
                  { value: 'classic', label: '默认' },
                  { value: 'github', label: 'GitHub' },
                  { value: 'one-dark', label: 'One Dark' }
                ].map(thm => (
                  <button
                    key={thm.value}
                    type="button"
                    onClick={() => {
                      setEditorTheme(thm.value);
                      saveEditorPrefs('editor_theme', thm.value);
                    }}
                    className={`flex-1 py-1 text-xs rounded-xl border transition-colors ${
                      editorTheme === thm.value
                        ? 'border-brand text-brand bg-brand/5 dark:bg-brand/10 font-bold'
                        : 'border-black/5 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    {thm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Password Form & Social Links */}
        {/* Column 3: Password Form & Social Links */}
        <div className="flex flex-col h-full gap-6">
          {/* Password form */}
          <form onSubmit={changePassword} className="glass rounded-2xl p-5 space-y-3" autoComplete="off">
            <h2 className="text-base font-bold text-text-primary dark:text-white">修改密码</h2>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">当前密码</label>
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="输入当前密码"
                autoComplete="new-password"
                className="w-full px-4 py-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">新密码</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="至少 8 位字符"
                autoComplete="new-password"
                className="w-full px-4 py-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">确认新密码</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="再次输入新密码"
                autoComplete="new-password"
                className="w-full px-4 py-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
              />
            </div>

            {pwMsg && (
              <p className={`text-xs ${pwError ? 'text-like' : 'text-brand'}`}>{pwMsg}</p>
            )}

            <button
              type="submit"
              disabled={savingPw}
              className="px-5 py-2 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-sm font-medium text-text-primary dark:text-white/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
            >
              {savingPw ? '更新中...' : '更新密码'}
            </button>
          </form>

          {/* Social Links form */}
          <form onSubmit={saveSocials} className="glass rounded-2xl p-5 mt-auto space-y-3">
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">社交主页链接</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">点击下方图标编辑链接，高亮表示已填写</p>
            </div>

            {/* Social Buttons Row */}
            <div className="grid grid-cols-4 gap-2 py-0.5">
              {[
                { key: 'github', label: 'GitHub', value: github, icon: <IconGithub className="w-4 h-4" /> },
                { key: 'email', label: '邮箱', value: emailLink, icon: <IconMail className="w-4 h-4" /> },
                { key: 'bilibili', label: 'B站', value: bilibili, icon: <IconBilibili className="w-4 h-4" /> },
                { key: 'twitter', label: 'Twitter', value: twitter, icon: <IconTwitter className="w-4 h-4" /> },
              ].map(item => {
                const hasValue = !!item.value;
                const isEditing = activeSocialEdit === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (activeSocialEdit === item.key) {
                        setActiveSocialEdit(null);
                      } else {
                        setActiveSocialEdit(item.key as any);
                        setSocialInputVal(item.value);
                      }
                    }}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-xl border text-center transition-all ${
                      hasValue
                        ? 'border-brand text-brand bg-brand/5 dark:bg-brand/10 font-bold shadow-[0_0_10px_rgba(93,172,129,0.1)]'
                        : 'border-black/5 dark:border-white/5 text-gray-400 dark:text-gray-500 hover:text-text-primary dark:hover:text-white hover:bg-black/[0.01] dark:hover:bg-white/[0.01]'
                    } ${
                      isEditing
                        ? 'ring-2 ring-brand border-transparent'
                        : ''
                    }`}
                    title={`编辑 ${item.label} 链接`}
                  >
                    {item.icon}
                    <span className="text-[9px] mt-1 font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Conditional Input Box */}
            {activeSocialEdit && (
              <div className="p-2.5 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-black/5 dark:border-white/5 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-text-primary dark:text-white">
                    配置 {
                      activeSocialEdit === 'github' ? 'GitHub' :
                      activeSocialEdit === 'email' ? '电子邮箱' :
                      activeSocialEdit === 'bilibili' ? '哔哩哔哩' : 'Twitter / X'
                    } 链接
                  </span>
                  {socialInputVal && (
                    <button
                      type="button"
                      onClick={() => setSocialInputVal('')}
                      className="text-[10px] text-like hover:underline"
                    >
                      清空
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type={activeSocialEdit === 'email' ? 'email' : 'text'}
                    value={socialInputVal}
                    onChange={e => setSocialInputVal(e.target.value)}
                    placeholder={
                      activeSocialEdit === 'github' ? 'https://github.com/用户名' :
                      activeSocialEdit === 'email' ? 'email@domain.com' :
                      activeSocialEdit === 'bilibili' ? 'https://space.bilibili.com/用户UID' : 'https://twitter.com/用户名'
                    }
                    className="flex-1 px-3 py-1 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 outline-none text-xs text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleConfirmSocial())}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmSocial}
                    className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-dark transition-colors flex-shrink-0 shadow shadow-brand/20 active:scale-90"
                    title="保存此链接"
                  >
                    <IconCheck size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              {socialsMsg && (
                <span className="text-[11px] text-brand font-semibold">
                  {socialsMsg}
                </span>
              )}
              <button
                type="submit"
                disabled={savingSocials}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 shadow-md shadow-brand/25 ml-auto"
              >
                {savingSocials ? '保存中...' : '保存所有链接'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperSrc}
        cropType="circle"
        aspectRatio={1}
        onCrop={handleAvatarCrop}
        onClose={() => setCropperOpen(false)}
      />
    </div>
  );
}
