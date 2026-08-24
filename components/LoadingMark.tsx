export default function LoadingMark({ size = 56 }: { size?: number }) {
  return (
    <div>
      <style>{`
        @keyframes ftLoadingMarkPulse { 0%, 100% { opacity: 0.55; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1); } }
        .ft-loading-mark { animation: ftLoadingMarkPulse 1.3s ease-in-out infinite; }
      `}</style>
      <svg className="ft-loading-mark" width={size} height={size} viewBox="0 0 512 512" fill="none">
        <defs>
          <linearGradient id="ftLoadingBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8FF7C0" />
            <stop offset="100%" stopColor="#5FD8FF" />
          </linearGradient>
        </defs>
        <rect x="110" y="246" width="292" height="20" rx="10" fill="currentColor" />
        <rect x="86" y="186" width="34" height="140" rx="12" fill="url(#ftLoadingBar)" />
        <rect x="392" y="186" width="34" height="140" rx="12" fill="url(#ftLoadingBar)" />
        <rect x="60" y="210" width="26" height="92" rx="10" fill="url(#ftLoadingBar)" opacity="0.85" />
        <rect x="426" y="210" width="26" height="92" rx="10" fill="url(#ftLoadingBar)" opacity="0.85" />
      </svg>
    </div>
  );
}
