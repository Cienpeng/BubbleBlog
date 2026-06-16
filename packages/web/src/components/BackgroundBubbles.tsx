import { useBackground } from '@/hooks/useBackground';

export default function BackgroundBubbles() {
  const { backgroundImage } = useBackground();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100 dark:opacity-20 dark:brightness-[0.2]"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9fc] via-[#eef0f5] to-[#e8ecf2] dark:bg-black" />
      )}

      <div className="absolute -top-32 -right-20 w-[450px] h-[450px] rounded-full animate-bubble-float opacity-70 dark:opacity-20"
        style={{ background: 'radial-gradient(circle at 40% 40%, rgba(99,150,255,0.08), rgba(99,150,255,0.01))' }} />
      <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full animate-bubble-float-slow opacity-70 dark:opacity-15"
        style={{ background: 'radial-gradient(circle at 60% 60%, rgba(200,120,255,0.06), rgba(200,120,255,0.01))' }} />
      <div className="absolute top-1/2 right-1/4 w-[200px] h-[200px] rounded-full animate-bubble-float-delayed opacity-60 dark:opacity-10"
        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(80,200,180,0.05), transparent)' }} />
    </div>
  );
}
