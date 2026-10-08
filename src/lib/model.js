// Data model: webs, cards, links, persistence helpers.

export const STORE = "investigative-web.v1";
export const K = (r, c) => `${r},${c}`;
export const RC = (k) => k.split(",").map(Number);
export const uid = () => Math.random().toString(36).slice(2, 10);
export const MAX_COLS = 6, MAX_ROWS = 14;
export const H_CYCLE = ["none", "line", "right", "left", "both"];
export const H_LABEL = { none: "+", line: "—", right: "→", left: "←", both: "↔" };
export const ROUTES = { drop: "Down & across", step: "Side step", jumpL: "Left gutter", jumpR: "Right gutter" };
export const ENDS = { none: "No arrows", end: "Arrow at target", start: "Arrow at source", both: "Both ends" };
export const FIN = "finale";

export function sampleWeb() {
  const t = (title, body) => ({ title, body });
  return {
    id: uid(), name: "The Missing Clerk (sample)", rows: 5, cols: 3, showFinale: true,
    cards: {
      "0,0": t("Unpaid Debts", "A moneylender on the market's lower terraces has runners asking after Tavin."),
      "1,0": t("Old Habits", "Tavin used to keep crooked ledgers for the moneylender, but walked away at the start of the season."),
      "2,0": t("Honest Work", "Tavin took a night clerk's post at a lumber yard on the east edge of camp."),
      "3,0": t("The Lumber Yard", "Unknown to the owners, the yard foreman skims tallies on timber bound for the warcamps and leans on his clerks to cover it. Tavin grew close to another clerk there, Mira."),
      "4,0": t("The Overlook", "Tavin and Mira often mention their favorite spot after a shift: an abandoned watch post above the chasms."),
      "0,1": t("Family Ties", "Tavin's brother Joss sells flatbread from a stall near the north gate."),
      "1,1": t("Hard Feelings", "Joss has two kids and counted on the coin Tavin used to send home."),
      "2,1": t("New Company", "Joss thinks Tavin dropped his family for a girl from work. Her name is Mira, and she rents a room near the yard."),
      "3,1": t("Ransacked Room", "Mira's room has been turned over. Torn ledger pages are scattered across the floor."),
      "0,2": t("Card Night", "Tavin plays cards most evenings behind a cookhouse with a handful of regulars."),
      "1,2": t("Kept Quiet", "One of the players admits Tavin was scared someone would \"check the books.\""),
      "2,2": t("Questions", "Two of the highprince's auditors questioned the players last week. They think Tavin's already been taken."),
      "3,2": t("Still Looking", "Asking around reveals the auditors haven't found Tavin yet. They're searching the market for anyone who's seen him."),
      "4,2": t("Closing In", "The auditors have pieced together the ledger pages and the gossip. They're watching the roads near the chasm edge."),
    },
    vOff: {}, finOff: {},
    h: { "2,0": "left", "3,0": "both", "3,1": "left" },
    links: [
      { id: uid(), from: "3,1", to: "4,2", route: "drop", arrow: "end" },
      { id: uid(), from: "0,2", to: "2,2", route: "jumpR", arrow: "none" },
    ],
    finale: t("Caught at the Overlook", "Following the auditors or searching the chasm edge leads to the old watch post. The party arrives as the auditors' hired guards drag Tavin and Mira out. The guards accuse the PCs of helping the thieves, and attack!"),
  };
}
export function blankWeb() {
  return { id: uid(), name: "Untitled Web", rows: 4, cols: 3, showFinale: true, cards: {}, vOff: {}, h: {}, finOff: {}, links: [], finale: { title: "", body: "" } };
}
export function normalize(w) {
  const b = blankWeb();
  const out = { ...b, ...w };
  out.rows = Math.max(1, Math.min(MAX_ROWS, +out.rows || b.rows));
  out.cols = Math.max(1, Math.min(MAX_COLS, +out.cols || b.cols));
  for (const k of ["cards", "vOff", "h", "finOff"]) if (typeof out[k] !== "object" || !out[k]) out[k] = {};
  if (!Array.isArray(out.links)) out.links = [];
  if (out.bend && typeof out.bend === "object") {
    for (const [from, to] of Object.entries(out.bend)) out.links.push({ id: uid(), from, to, route: "drop", arrow: "end" });
  }
  delete out.bend;
  out.links = out.links.filter((l) => l && l.from && l.to).map((l) => ({ id: l.id || uid(), from: l.from, to: l.to, route: ROUTES[l.route] ? l.route : "drop", arrow: ENDS[l.arrow] ? l.arrow : "none" }));
  if (!out.finale || typeof out.finale !== "object") out.finale = { title: "", body: "" };
  out.showFinale = out.showFinale !== false;
  out.name = String(out.name || "Untitled Web");
  return prune(out);
}
export function prune(w) {
  const inside = (k) => { const [r, c] = RC(k); return r < w.rows && c < w.cols; };
  for (const m of ["cards", "vOff", "h"]) for (const k of Object.keys(w[m])) if (!inside(k)) delete w[m][k];
  for (const k of Object.keys(w.h)) { const [, c] = RC(k); if (c >= w.cols - 1) delete w.h[k]; }
  for (const k of Object.keys(w.finOff)) if (+k >= w.cols) delete w.finOff[k];
  w.links = (w.links || []).filter((l) => w.cards[l.from] && l.from !== l.to && (l.to === FIN ? w.showFinale : !!w.cards[l.to]));
  return w;
}
export function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.webs) && d.webs.length) {
        const webs = d.webs.map(normalize);
        return { webs, currentId: webs.some((w) => w.id === d.currentId) ? d.currentId : webs[0].id };
      }
    }
  } catch (e) {}
  const s = sampleWeb();
  return { webs: [s], currentId: s.id };
}
export const clone = (o) => JSON.parse(JSON.stringify(o));

