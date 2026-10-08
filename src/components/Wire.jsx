// SVG wire with optional arrowheads.
export function Head({ x, y, dx, dy }) {
  const bx = x - dx * 13, by = y - dy * 13, px = -dy * 8, py = dx * 8;
  return <polygon className="tip" points={`${x},${y} ${bx + px},${by + py} ${bx - px},${by - py}`} />;
}
export function Wire({ pts, arrow }) {
  const p = pts.map((q) => [...q]);
  const heads = [];
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };
  if (arrow === "end" || arrow === "both") {
    const n = p.length - 1, [dx, dy] = unit(p[n - 1], p[n]);
    heads.push({ x: p[n][0] - dx, y: p[n][1] - dy, dx, dy });
    p[n] = [p[n][0] - dx * 7, p[n][1] - dy * 7];
  }
  if (arrow === "start" || arrow === "both") {
    const [dx, dy] = unit(p[1], p[0]);
    heads.push({ x: p[0][0] - dx, y: p[0][1] - dy, dx, dy });
    p[0] = [p[0][0] - dx * 7, p[0][1] - dy * 7];
  }
  return (
    <g>
      <path className="w" d={"M" + p.map((q) => q.join(" ")).join(" L")} />
      {heads.map((h, i) => <Head key={i} {...h} />)}
    </g>
  );
}

