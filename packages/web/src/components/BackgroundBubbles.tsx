import { useBackground } from '@/hooks/useBackground';

export default function BackgroundBubbles() {
  const { backgroundImage } = useBackground();

  return (
    <>
      {/* Scrollable top 2/5 custom background header */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] overflow-hidden -z-10 pointer-events-none">
        {backgroundImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        ) : (
          /* Default: match the main page background */
          <div className="absolute inset-0 bg-[#f8f9fc] dark:bg-black" />
        )}
        
        {/* Wavy curve transition at the bottom of the top background */}
        <div className="absolute bottom-0 left-0 right-0 leading-[0]">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="w-full h-[60px] sm:h-[90px] text-[#f8f9fc] dark:text-black fill-current"
          >
            <path d="M0,32 C320,100 640,10 960,80 C1120,110 1280,70 1440,32 L1440,120 L0,120 Z" />
          </svg>
        </div>
      </div>

      {/* Fixed base layer and floating gradient bubbles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
        {/* Background base layer — always present */}
        <div className="absolute inset-0 bg-[#f8f9fc] dark:bg-black" />

        <div className="absolute -top-32 -right-20 w-[450px] h-[450px] rounded-full animate-bubble-float opacity-70 dark:opacity-20"
          style={{ background: 'radial-gradient(circle at 40% 40%, rgba(99,150,255,0.08), rgba(99,150,255,0.01))' }} />
        <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full animate-bubble-float-slow opacity-70 dark:opacity-15"
          style={{ background: 'radial-gradient(circle at 60% 60%, rgba(200,120,255,0.06), rgba(200,120,255,0.01))' }} />
        <div className="absolute top-1/2 right-1/4 w-[200px] h-[200px] rounded-full animate-bubble-float-delayed opacity-60 dark:opacity-10"
          style={{ background: 'radial-gradient(circle at 30% 30%, rgba(80,200,180,0.05), transparent)' }} />
      </div>
    </>
  );
}
