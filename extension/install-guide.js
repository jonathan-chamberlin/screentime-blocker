function setEmojiFavicon(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '52px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(emoji, 32, 35);

  const icon = document.querySelector('link[rel="icon"]') || document.createElement('link');
  icon.rel = 'icon';
  icon.href = canvas.toDataURL('image/png');
  document.head.appendChild(icon);
}

setEmojiFavicon('🔧');
document.title = 'Enable App Detection - ' + APP_NAME;

