// Draws the TikTok-style overlay and DROP label onto a recorded frame.
const heart = (g, x, y, s) => {
  g.beginPath();
  g.moveTo(x, y + s * 0.3);
  g.bezierCurveTo(x - s * 0.9, y - s * 0.3, x - s * 0.4, y - s, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.4, y - s, x + s * 0.9, y - s * 0.3, x, y + s * 0.3);
  g.fill();
};

export function drawOverlay(g, w, h, { kit, t, time }) {
  const u = w / 100;
  const font = (px, weight = 600) => `${weight} ${px}px "Plus Jakarta Sans", "Noto Sans Khmer", sans-serif`;
  g.save();
  g.fillStyle = "#fff";
  g.shadowColor = "rgba(0,0,0,0.6)";
  g.shadowBlur = u;
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.font = font(3.4 * u);
  g.globalAlpha = 0.65;
  g.fillText(t("following"), w / 2 - 11 * u, 5 * u);
  g.globalAlpha = 1;
  g.fillText(t("forYou"), w / 2 + 11 * u, 5 * u);
  g.fillRect(w / 2 + 6 * u, 7.4 * u, 10 * u, 0.6 * u);
  const rx = w - 8 * u;
  heart(g, rx, h - 52 * u, 3.6 * u);
  g.font = font(2.8 * u);
  g.fillText("12.4K", rx, h - 46 * u);
  g.beginPath();
  g.arc(rx, h - 37 * u, 3.2 * u, 0, Math.PI * 2);
  g.fill();
  g.fillText("318", rx, h - 31 * u);
  g.beginPath();
  g.moveTo(rx - 3 * u, h - 20 * u);
  g.lineTo(rx + 3 * u, h - 23 * u);
  g.lineTo(rx - 3 * u, h - 26 * u);
  g.closePath();
  g.fill();
  g.textAlign = "left";
  g.font = font(3.4 * u, 700);
  g.fillText("@yourcrew · Phnom Penh", 4 * u, h - 16 * u);
  g.font = font(3 * u, 500);
  g.fillText(`${kit.kit_name} #boomdrop #fyp`.slice(0, 48), 4 * u, h - 11 * u);
  g.fillText(`♪ ${kit.song}`.slice(0, 44), 4 * u, h - 6 * u);
  if (time >= kit.drop_second && time < kit.drop_second + 1.4) {
    const p = Math.min(1, (time - kit.drop_second) / 0.25);
    g.textAlign = "center";
    g.font = `900 ${18 * u * (0.6 + 0.4 * p)}px "Outfit", sans-serif`;
    g.shadowColor = "rgba(255,42,133,0.9)";
    g.shadowBlur = 6 * u;
    g.fillStyle = "#FFD043";
    g.fillText("DROP", w / 2, h / 2);
  }
  g.restore();
}
