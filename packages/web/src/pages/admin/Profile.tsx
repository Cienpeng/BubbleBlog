import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { IconSave, IconUser } from '@/components/Icons';

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
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || '');
      setTags(data.tags?.map(t => t.name) || []);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, [updateToken]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Save profile
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const { data, newToken } = await adminApi.put<UserProfile>('/api/admin/profile', {
        display_name: displayName,
        bio,
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

  // Add tag
  const addTag = () => {
    const name = tagInput.trim();
    if (name && !tags.includes(name)) {
      setTags(prev => [...prev, name]);
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-xl">
        <div className="h-8 w-32 bg-white/20 dark:bg-white/[0.03] rounded-xl" />
        <div className="h-48 bg-white/20 dark:bg-white/[0.03] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">个人资料</h1>
        <p className="text-sm text-gray-400 mt-1">
          用户名：{profile?.username} · 注册于 {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : ''}
        </p>
      </div>

      {/* Profile form */}
      <form onSubmit={saveProfile} className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-text-primary dark:text-white">编辑资料</h2>

        {/* Avatar */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">头像</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.05] flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <IconUser size={28} />
                </div>
              )}
            </div>
            <input
              type="text"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="头像 URL（图床链接）"
              className="flex-1 px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
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

      {/* Password change */}
      <form onSubmit={changePassword} className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-text-primary dark:text-white">修改密码</h2>

        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">当前密码</label>
          <input
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            placeholder="输入当前密码"
            className="w-full px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">新密码</label>
          <input
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="至少 8 位字符"
            className="w-full px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">确认新密码</label>
          <input
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            placeholder="再次输入新密码"
            className="w-full px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
          />
        </div>

        {pwMsg && (
          <p className={`text-xs ${pwError ? 'text-like' : 'text-brand'}`}>{pwMsg}</p>
        )}

        <button
          type="submit"
          disabled={savingPw}
          className="px-5 py-2.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-sm font-medium text-text-primary dark:text-white/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
        >
          {savingPw ? '更新中...' : '更新密码'}
        </button>
      </form>
    </div>
  );
}
