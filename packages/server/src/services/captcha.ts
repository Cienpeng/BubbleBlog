export function generateCaptchaSVG(): { text: string; svg: string } {
  const chars = '23456789abcdefghkmnpqrstuvwxyzABCDEFGHKMNPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < 4; i++) {
    text += chars[Math.floor(Math.random() * chars.length)];
  }

  const width = 120;
  const height = 40;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Background
  svg += `<rect width="100%" height="100%" fill="#f3f4f6" rx="8"/>`;

  // Draw some noise lines
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const stroke = `rgb(${Math.floor(Math.random()*150)}, ${Math.floor(Math.random()*150)}, ${Math.floor(Math.random()*150)})`;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1.5" opacity="0.4"/>`;
  }

  // Draw noise dots
  for (let i = 0; i < 35; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 1.5;
    const fill = `rgb(${Math.floor(Math.random()*150)}, ${Math.floor(Math.random()*150)}, ${Math.floor(Math.random()*150)})`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.3"/>`;
  }

  // Draw letters
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = 15 + i * 26 + (Math.random() * 6 - 3);
    const y = 28 + (Math.random() * 6 - 3);
    const angle = Math.random() * 30 - 15; // rotate angle between -15 and 15 degrees
    const fontSize = 22 + Math.random() * 4;
    const fill = `rgb(${Math.floor(Math.random()*100)}, ${Math.floor(Math.random()*100)}, ${Math.floor(Math.random()*100)})`;
    svg += `<text x="${x}" y="${y}" fill="${fill}" font-size="${fontSize}" font-family="monospace" font-weight="bold" transform="rotate(${angle} ${x} ${y})">${char}</text>`;
  }

  svg += `</svg>`;
  return { text, svg };
}
