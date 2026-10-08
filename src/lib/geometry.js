// Turns measured card positions into wire paths.
import { K, RC, FIN } from "./model.js";

export const sideY = (R) => R.y + Math.min(R.h / 2, 34);

// Which route styles make sense for a link.
export function routeChoices(l) {
  if (l.to === FIN) return [];
  const [, c1] = RC(l.from), [, c2] = RC(l.to);
  return c1 === c2 ? ["jumpL", "jumpR"] : ["drop", "step", "jumpL", "jumpR"];
}
export function defaultRoute(web, from, to) {
  if (to === FIN) return { route: "drop", arrow: "none" };
  const [r1, c1] = RC(from), [r2, c2] = RC(to);
  if (c1 === c2) return { route: c1 === 0 ? "jumpL" : "jumpR", arrow: "none" };
  return { route: r2 > r1 ? "drop" : "step", arrow: "end" };
}

// Turn a link into orthogonal points. Gutter x positions are adjusted later so parallel lines don't overlap.
export function routeLink(l, geo) {
  const C = geo.cards, A = C[l.from];
  if (!A) return null;
  const ax = A.x + A.w / 2;
  if (l.to === FIN) {
    const F = geo.fin; if (!F) return null;
    if (ax > F.x + 18 && ax < F.x + F.w - 18) return { pts: [[ax, A.y + A.h], [ax, F.y]] };
    const ty = F.y + Math.min(40, F.h / 2);
    return { pts: [[ax, A.y + A.h], [ax, ty], [ax < F.x ? F.x : F.x + F.w, ty]] };
  }
  const B = C[l.to]; if (!B) return null;
  const bx = B.x + B.w / 2, ay = sideY(A), by = sideY(B);
  let route = l.route;
  const sameCol = Math.abs(ax - bx) < 4;
  if (sameCol && (route === "drop" || route === "step")) route = "jumpR";
  if (route === "drop") {
    const down = by > A.y + A.h / 2;
    const sy = down ? A.y + A.h : A.y;
    if (ax > B.x + 8 && ax < B.x + B.w - 8) return { pts: [[ax, sy], [ax, down ? B.y : B.y + B.h]] };
    return { pts: [[ax, sy], [ax, by], [bx > ax ? B.x : B.x + B.w, by]] };
  }
  if (route === "step") {
    const right = bx > ax;
    const ae = right ? A.x + A.w : A.x, be = right ? B.x : B.x + B.w;
    const gx = (ae + be) / 2;
    return { pts: [[ae, ay], [gx, ay], [gx, by], [be, by]], lane: { kind: "step", base: gx, sign: 1 } };
  }
  const R = route === "jumpR";
  const ae = R ? A.x + A.w : A.x, be = R ? B.x + B.w : B.x;
  const gx = R ? Math.max(ae, be) + 13 : Math.min(ae, be) - 13;
  return { pts: [[ae, ay], [gx, ay], [gx, by], [be, by]], lane: { kind: route, base: gx, sign: R ? 1 : -1 } };
}

export function layoutLinks(web, geo) {
  if (!geo) return [];
  const out = [];
  for (const l of web.links) { const r = routeLink(l, geo); if (r) out.push({ ...r, l }); }
  // Assign lanes: links sharing a gutter whose vertical spans overlap get spread apart.
  const groups = {};
  for (const o of out) if (o.lane) (groups[o.lane.kind + ":" + Math.round(o.lane.base / 10)] ||= []).push(o);
  for (const g of Object.values(groups)) {
    const lanes = [];
    for (const o of g) {
      const y1 = Math.min(o.pts[1][1], o.pts[2][1]) - 6, y2 = Math.max(o.pts[1][1], o.pts[2][1]) + 6;
      let i = 0;
      while (lanes[i] && lanes[i].some(([a, b]) => a < y2 && y1 < b)) i++;
      (lanes[i] ||= []).push([y1, y2]);
      const off = o.lane.kind === "step" ? (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 8 : o.lane.sign * i * 8;
      o.pts[1][0] += off; o.pts[2][0] += off;
    }
  }
  for (const o of out) {
    // chip sits on the longest segment
    let best = 0, mx = 0, my = 0;
    for (let i = 0; i < o.pts.length - 1; i++) {
      const [x1, y1] = o.pts[i], [x2, y2] = o.pts[i + 1];
      const len = Math.abs(x2 - x1) + Math.abs(y2 - y1);
      if (len > best) { best = len; mx = (x1 + x2) / 2; my = (y1 + y2) / 2; }
    }
    o.mx = mx; o.my = my;
  }
  return out;
}

export function computeBasic(web, geo) {
  const out = { v: [], h: [], f: [] };
  if (!geo) return out;
  const C = geo.cards;
  for (let c = 0; c < web.cols; c++) {
    const rows = [];
    for (let r = 0; r < web.rows; r++) if (C[K(r, c)]) rows.push(r);
    for (let i = 0; i < rows.length - 1; i++) {
      const a = K(rows[i], c), A = C[a], B = C[K(rows[i + 1], c)];
      const x = A.x + A.w / 2;
      out.v.push({ key: a, on: !web.vOff[a], x, y1: A.y + A.h / 2, y2: B.y + B.h / 2, my: (A.y + A.h + B.y) / 2 });
    }
    if (rows.length && geo.fin) {
      const L = C[K(rows[rows.length - 1], c)], F = geo.fin;
      const x = L.x + L.w / 2, y0 = L.y + L.h / 2;
      let d;
      if (x > F.x + 18 && x < F.x + F.w - 18) d = `M${x} ${y0} V${F.y}`;
      else { const ty = F.y + Math.min(40, F.h / 2); d = `M${x} ${y0} V${ty} H${x < F.x ? F.x : F.x + F.w}`; }
      out.f.push({ c, on: !web.finOff[c], d, x, my: (L.y + L.h + F.y) / 2 });
    }
  }
  for (let r = 0; r < web.rows; r++) for (let c = 0; c < web.cols - 1; c++) {
    const a = K(r, c), A = C[a], B = C[K(r, c + 1)];
    if (!A || !B) continue;
    const top = Math.max(A.y, B.y), bot = Math.min(A.y + A.h, B.y + B.h);
    const y = bot > top ? (top + bot) / 2 : (A.y + A.h / 2 + B.y + B.h / 2) / 2;
    out.h.push({ key: a, dir: web.h[a] || "none", x1: A.x + A.w, x2: B.x, y });
  }
  return out;
}

export function sameGeo(a, b) {
  const near = (p, q) => (!p && !q) || (p && q && Math.abs(p.x - q.x) <= 1 && Math.abs(p.y - q.y) <= 1 && Math.abs(p.w - q.w) <= 1 && Math.abs(p.h - q.h) <= 1);
  if (Math.abs(a.w - b.w) > 1 || Math.abs(a.h - b.h) > 1 || !near(a.fin, b.fin)) return false;
  const ka = Object.keys(a.cards), kb = Object.keys(b.cards);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => near(a.cards[k], b.cards[k]));
}

