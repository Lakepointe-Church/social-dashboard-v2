// ─────────────────────────────────────────────────────────────────────────────
// PlatformIcon — Official brand SVG icons for each social platform
// ─────────────────────────────────────────────────────────────────────────────

function FacebookIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1877F2"/>
      <path d="M16.5 12H13.5V9.75C13.5 9.06 13.806 8.25 15 8.25H16.5V5.625C16.5 5.625 15.15 5.25 13.65 5.25C11.1 5.25 9.75 6.75 9.75 9.375V12H7.5V15H9.75V22.5H13.5V15H15.75L16.5 12Z" fill="white"/>
    </svg>
  );
}

function InstagramIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
      <circle cx="17" cy="7" r="1.2" fill="white"/>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
    </svg>
  );
}

function YouTubeIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#FF0000"/>
      <path d="M21.5 7.5C21.5 7.5 21.3 6.3 20.7 5.7C19.9 4.9 19 4.9 18.6 4.9C16.1 4.7 12 4.7 12 4.7C12 4.7 7.9 4.7 5.4 4.9C5 4.9 4.1 4.9 3.3 5.7C2.7 6.3 2.5 7.5 2.5 7.5C2.5 7.5 2.3 8.9 2.3 10.3V11.6C2.3 13 2.5 14.4 2.5 14.4C2.5 14.4 2.7 15.6 3.3 16.2C4.1 17 5.2 17 5.6 17.1C7 17.2 12 17.3 12 17.3C12 17.3 16.1 17.3 18.6 17C19 17 19.9 16.9 20.7 16.2C21.3 15.6 21.5 14.4 21.5 14.4C21.5 14.4 21.7 13 21.7 11.6V10.3C21.7 8.9 21.5 7.5 21.5 7.5ZM10.1 13.7V8.3L15.3 11L10.1 13.7Z" fill="white"/>
    </svg>
  );
}

function TikTokIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#010101"/>
      <path d="M19.5 8.5C18.1 8.5 16.9 7.6 16.4 6.3C16.2 5.9 16.2 5.4 16.1 5H13.5V15.3C13.5 16.2 12.8 17 11.9 17C11 17 10.3 16.3 10.3 15.3C10.3 14.4 11 13.6 11.9 13.6C12.1 13.6 12.3 13.7 12.5 13.7V11C12.3 11 12.1 11 11.9 11C9.5 11 7.5 13 7.5 15.3C7.5 17.7 9.5 19.7 11.9 19.7C14.3 19.7 16.3 17.7 16.3 15.3V10.5C17.3 11.2 18.4 11.5 19.5 11.5V8.5Z" fill="white"/>
      <path d="M19 8.1C18.5 8.4 17.4 8.2 16.8 7.2C17.3 7.2 18.8 7.9 19 8.1Z" fill="#69C9D0"/>
      <path d="M16.1 5C16.1 5.1 16.2 5.2 16.2 5.3C16.2 5.2 16.1 5.1 16.1 5Z" fill="#EE1D52"/>
    </svg>
  );
}

const ICONS = { facebook: FacebookIcon, instagram: InstagramIcon, youtube: YouTubeIcon, tiktok: TikTokIcon };

export default function PlatformIcon({ platform, size = 28 }) {
  const Icon = ICONS[platform?.toLowerCase()];
  if (!Icon) return <span className="text-2xl">{platform?.[0]?.toUpperCase()}</span>;
  return <Icon size={size} />;
}
