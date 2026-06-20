import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBackground } from '@/hooks/useBackground';
import { IconCheck, IconClose } from '@/components/Icons';
import { adminApi } from '@/lib/api';
import { api } from '@/lib/api';
import ImageCropperModal from '@/components/admin/ImageCropperModal';


interface Settings {
  background_image: string;
  [key: string]: string;
}

interface CarouselImage {
  id: number;
  image_url: string;
  sort_order: number;
}

export default function Appearance() {
  const { updateToken } = useAuth();
  const { refresh: refreshBg } = useBackground();
  const [settings, setSettings] = useState<Settings>({ background_image: '' });
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [bgUrl, setBgUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const carouselInputRef = useRef<HTMLInputElement | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');
  const [cropTarget, setCropTarget] = useState<'background' | 'carousel'>('background');
  const [uploadMsg, setUploadMsg] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, carouselRes] = await Promise.all([
        api.get<Record<string, string>>('/api/settings'),
        adminApi.get<CarouselImage[]>('/api/admin/carousel'),
      ]);
      setSettings(settingsRes as Settings);
      setBgUrl(settingsRes.background_image || '');
      if (carouselRes.newToken) updateToken(carouselRes.newToken);
      setImages(carouselRes.data || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [updateToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileChange = (target: 'background' | 'carousel') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropTarget(target);
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

  const handleCrop = async (blob: Blob) => {
    setCropperOpen(false);
    setUploadMsg('正在上传图片...');
    try {
      const formData = new FormData();
      formData.append('file', blob, cropTarget === 'background' ? 'background.jpg' : 'carousel.jpg');
      
      const { data, newToken } = await adminApi.upload<{ filename: string }>('/api/media/upload', formData);
      if (newToken) updateToken(newToken);
      
      const uploadedUrl = `/media/${data.filename}`;
      if (cropTarget === 'background') {
        setBgUrl(uploadedUrl);
        setUploadMsg('背景图已生成，点击保存生效');
      } else {
        const addRes = await adminApi.post<CarouselImage>('/api/admin/carousel', {
          image_url: uploadedUrl,
          sort_order: images.length,
        });
        if (addRes.newToken) updateToken(addRes.newToken);
        
        // Refresh default carousel list
        const carouselRes = await adminApi.get<CarouselImage[]>('/api/admin/carousel');
        if (carouselRes.newToken) updateToken(carouselRes.newToken);
        setImages(carouselRes.data || []);
        setUploadMsg('轮播图上传并保存成功');
      }
      setTimeout(() => setUploadMsg(''), 3000);
    } catch (err: any) {
      setUploadMsg(err.message || '图片上传失败');
    }
  };

  const saveBgUrl = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { newToken } = await adminApi.put<Record<string, string>>('/api/settings', {
        background_image: bgUrl,
      });
      if (newToken) updateToken(newToken);
      refreshBg();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [bgUrl, updateToken, refreshBg]);

  const addImage = useCallback(async () => {
    if (!newImageUrl.trim()) return;
    setAdding(true);
    try {
      const { data, newToken } = await adminApi.post<CarouselImage>('/api/admin/carousel', {
        image_url: newImageUrl.trim(),
        sort_order: images.length,
      });
      if (newToken) updateToken(newToken);
      setImages(prev => [...prev, data]);
      setNewImageUrl('');
    } catch (err) {
      console.error('Failed to add image:', err);
    } finally {
      setAdding(false);
    }
  }, [newImageUrl, images.length, updateToken]);

  const removeImage = useCallback(async (id: number) => {
    try {
      const { newToken } = await adminApi.delete(`/api/admin/carousel/${id}`);
      if (newToken) updateToken(newToken);
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  }, [updateToken]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-32 bg-white/20 dark:bg-white/[0.03] rounded-xl" />
        <div className="h-32 bg-white/20 dark:bg-white/[0.03] rounded-2xl" />
        <div className="h-48 bg-white/20 dark:bg-white/[0.03] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">外观设置</h1>
            <p className="text-sm text-gray-400 mt-1">自定义博客的视觉外观</p>
          </div>
          {uploadMsg && (
            <span className="text-xs text-brand bg-brand/10 dark:bg-brand/20 px-3 py-1 rounded-full animate-pulse font-bold">
              {uploadMsg}
            </span>
          )}
        </div>
      </div>

      {/* Background image */}
      <section className="glass rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-text-primary dark:text-white">背景图片</h2>
          <p className="text-xs text-gray-400 mt-0.5">设置首页和详情页的背景图片 URL。支持图床链接。</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={bgUrl}
              onChange={e => setBgUrl(e.target.value)}
              placeholder="https://example.com/background.jpg"
              className="flex-1 px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
            />
            <button
              onClick={saveBgUrl}
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 shadow-md shadow-brand/25 whitespace-nowrap"
            >
              {saved ? '已保存' : saving ? '保存中...' : '保存'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => bgInputRef.current?.click()}
              className="text-xs text-brand hover:underline font-bold"
            >
              上传本地背景图片并裁剪 (16:9)...
            </button>
            <input
              type="file"
              ref={bgInputRef}
              accept="image/*"
              onChange={handleFileChange('background')}
              className="hidden"
            />
          </div>
        </div>
        {bgUrl && (
          <div className="rounded-2xl overflow-hidden h-32 bg-black/[0.02] dark:bg-white/[0.02]">
            <img src={bgUrl} alt="背景预览" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        {!bgUrl && (
          <div className="rounded-2xl h-24 flex items-center justify-center bg-black/[0.01] dark:bg-white/[0.01] border border-dashed border-black/5 dark:border-white/[0.05]">
            <span className="text-xs text-gray-300 dark:text-gray-600">暂无背景图片</span>
          </div>
        )}
      </section>

      {/* Carousel management */}
      <section className="glass rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-white">默认轮播图</h2>
            <p className="text-xs text-gray-400 mt-0.5">文章详情页顶部默认展示的图片轮播。没有设置文章专属轮播图的文章会使用这里的图片。</p>
          </div>
          <span className="text-xs font-bold text-gray-400 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
            {images.length}/5 张
          </span>
        </div>

        {/* Add new */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addImage()}
              placeholder="图片 URL（支持图床链接）"
              className="flex-1 px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-sm text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
            />
            <button
              onClick={addImage}
              disabled={adding || !newImageUrl.trim()}
              className="px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-sm font-medium text-text-primary dark:text-white/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              + 添加
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => carouselInputRef.current?.click()}
              className="text-xs text-brand hover:underline font-bold"
            >
              上传本地轮播图片并裁剪 (16:6)...
            </button>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              * 上传第 6 张将自动覆盖最旧的一张
            </span>
            <input
              type="file"
              ref={carouselInputRef}
              accept="image/*"
              onChange={handleFileChange('carousel')}
              className="hidden"
            />
          </div>
        </div>

        {/* Image list */}
        <div className="space-y-2">
          {images.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-xs text-gray-300 dark:text-gray-600">暂无轮播图片</p>
              <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">系统将使用内置渐变作为默认轮播</p>
            </div>
          )}
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] group"
            >
              <div className="w-16 h-10 rounded-xl overflow-hidden bg-black/[0.03] dark:bg-white/[0.03] flex-shrink-0">
                {!img.image_url.startsWith('__DEFAULT_GRADIENT_') ? (
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand/30 to-link/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary dark:text-white/80 truncate">
                  {img.image_url.startsWith('__DEFAULT_GRADIENT_') ? `内置渐变 #${idx + 1}` : img.image_url}
                </p>
                <p className="text-[10px] text-gray-400">排序: {img.sort_order}</p>
              </div>
              <button
                onClick={() => removeImage(img.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-like hover:bg-like/5 opacity-0 group-hover:opacity-100 transition-all"
              >
                <IconClose size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperSrc}
        cropType="rect"
        aspectRatio={cropTarget === 'background' ? 16 / 9 : 16 / 6}
        onCrop={handleCrop}
        onClose={() => setCropperOpen(false)}
      />
    </div>
  );
}
