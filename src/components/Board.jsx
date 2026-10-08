import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { K, RC, uid, H_CYCLE, H_LABEL, ROUTES, ENDS, FIN } from "../lib/model.js";
import { computeBasic, layoutLinks, routeChoices, defaultRoute, sameGeo } from "../lib/geometry.js";
import AutoText from "./AutoText.jsx";
import { Wire } from "./Wire.jsx";

export default function Board({ web, editing, update, focusKey, setFocusKey }) {
  const boardRef = useRef(null), finRef = useRef(null), cardRefs = useRef({});
  const webRef = useRef(web); webRef.current = web;
  const [geo, setGeo] = useState(null);
  const [linkFrom, setLinkFrom] = useState(null);
  const [sel, setSel] = useState(null);

  const measure = useCallback(() => {
    const b = boardRef.current; if (!b) return;
    const br = b.getBoundingClientRect();
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left - br.left), y: Math.round(r.top - br.top), w: Math.round(r.width), h: Math.round(r.height) }; };
    const cards = {};
    for (const [k, el] of Object.entries(cardRefs.current)) if (el && webRef.current.cards[k]) cards[k] = rect(el);
    const g = { cards, fin: finRef.current ? rect(finRef.current) : null, w: Math.round(br.width), h: Math.round(br.height) };
    setGeo((prev) => (prev && sameGeo(prev, g) ? prev : g));
  }, []);

  useLayoutEffect(() => { measure(); });
  const cardSig = Object.keys(web.cards).sort().join("|");
  useEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (boardRef.current) ro.observe(boardRef.current);
    Object.values(cardRefs.current).forEach((el) => el && ro.observe(el));
    if (finRef.current) ro.observe(finRef.current);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure, web.rows, web.cols, cardSig, editing, web.showFinale]);

  useEffect(() => { if (!editing) { setLinkFrom(null); setSel(null); } }, [editing]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setLinkFrom(null); setSel(null); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const basic = computeBasic(web, geo);
  const links = layoutLinks(web, geo);
  const setCard = (k, patch) => update((w) => { w.cards[k] = { ...w.cards[k], ...patch }; return w; }, true);
  const move = (k, dr, dc) => update((w) => {
    const [r, c] = RC(k); const t = K(r + dr, c + dc);
    const a = w.cards[k], b = w.cards[t];
    if (b) w.cards[k] = b; else delete w.cards[k];
    w.cards[t] = a;
    const sw = (x) => (x === k ? t : x === t ? k : x);
    w.links = w.links.map((l) => ({ ...l, from: sw(l.from), to: sw(l.to) }));
    return w;
  });
  const removeCard = (k) => update((w) => { delete w.cards[k]; return w; });
  const addCard = (k) => { update((w) => { w.cards[k] = { title: "", body: "" }; return w; }); setFocusKey(k); };
  const finishLink = (to) => {
    const from = linkFrom; setLinkFrom(null);
    if (!from || from === to) return;
    const existing = web.links.find((l) => l.from === from && l.to === to);
    if (existing) { setSel(existing.id); return; }
    const id = uid();
    update((w) => { w.links.push({ id, from, to, ...defaultRoute(w, from, to) }); return w; });
    setSel(id);
  };
  const setLink = (id, patch) => update((w) => { w.links = w.links.map((l) => (l.id === id ? { ...l, ...patch } : l)); return w; });
  const delLink = (id) => { update((w) => { w.links = w.links.filter((l) => l.id !== id); return w; }); setSel(null); };

  const firstInCol = {}, lastInCol = {};
  for (let c = 0; c < web.cols; c++) for (let r = 0; r < web.rows; r++) if (web.cards[K(r, c)]) { if (!firstInCol[c]) firstInCol[c] = K(r, c); lastInCol[c] = K(r, c); }

  const colMin = 190, gap = 40;
  const minWidth = web.cols * colMin + (web.cols - 1) * gap + 68;
  const finInset = web.cols > 1 ? `calc(${50 / web.cols}% + 22px)` : "0px";
  const titleOf = (k) => (k === FIN ? (web.finale.title || "Finale") : ((web.cards[k] && web.cards[k].title) || "Untitled clue"));

  const cells = [];
  for (let r = 0; r < web.rows; r++) for (let c = 0; c < web.cols; c++) {
    const k = K(r, c), card = web.cards[k];
    const style = { gridRow: r + 1, gridColumn: c + 1 };
    if (!card) {
      cells.push(editing && !linkFrom
        ? <div key={k} style={style}><button className="add" onClick={() => addCard(k)}>+ Add clue</button></div>
        : <div key={k} style={style} className="empty" />);
      continue;
    }
    const cls = "card" + (firstInCol[c] === k ? " entry" : "") + (linkFrom === k ? " src" : "");
    cells.push(
      <div key={k} style={style} className={cls} ref={(el) => { cardRefs.current[k] = el; }}>
        {editing ? (
          <>
            <AutoText className="ct" value={card.title} placeholder="Clue title" autoFocus={focusKey === k} onChange={(v) => setCard(k, { title: v })} />
            <AutoText className="cb" value={card.body} placeholder="What the PCs learn here…" onChange={(v) => setCard(k, { body: v })} />
            {web.showFinale && lastInCol[c] === k && (
              <label className="bendrow finchk">
                <input type="checkbox" id={"fin-" + c} checked={!web.finOff[c]}
                  onChange={(e) => { const on = e.target.checked; update((w) => { if (on) delete w.finOff[c]; else w.finOff[c] = true; return w; }); }} />
                <span>Line to finale</span>
              </label>
            )}
            <div className="tools">
              <button className="tool" aria-label="Move up" disabled={r === 0} onClick={() => move(k, -1, 0)}>↑</button>
              <button className="tool" aria-label="Move down" disabled={r === web.rows - 1} onClick={() => move(k, 1, 0)}>↓</button>
              <button className="tool" aria-label="Move left" disabled={c === 0} onClick={() => move(k, 0, -1)}>←</button>
              <button className="tool" aria-label="Move right" disabled={c === web.cols - 1} onClick={() => move(k, 0, 1)}>→</button>
              <button className="tool txt" onClick={() => { setSel(null); setLinkFrom(k); }}>Link…</button>
              <button className="tool del" onClick={() => removeCard(k)}>Delete</button>
            </div>
            {linkFrom && linkFrom !== k && <button className="pick" onClick={() => finishLink(k)}><span>Link here</span></button>}
          </>
        ) : (
          <>
            {card.title && <h3>{card.title}</h3>}
            {card.body && <p>{card.body}</p>}
          </>
        )}
      </div>
    );
  }

  const selLink = sel && links.find((o) => o.l.id === sel);

  return (
    <>
      {linkFrom && (
        <div className="linkbar" role="status">
          <span>Linking from <b>{titleOf(linkFrom)}</b>. Tap the clue it leads to.</span>
          <button className="btn" onClick={() => setLinkFrom(null)}>Cancel</button>
        </div>
      )}
      <div className="scroller">
        <div className="board" ref={boardRef} style={{ minWidth }}>
          {geo && (
            <svg className="wires" width={geo.w} height={geo.h} aria-hidden="true">
              {basic.v.map((l) => l.on
                ? <line key={"v" + l.key} className="w" x1={l.x} x2={l.x} y1={l.y1} y2={l.y2} />
                : editing && <line key={"v" + l.key} className="ghost" x1={l.x} x2={l.x} y1={l.y1} y2={l.y2} />)}
              {basic.f.map((l) => l.on
                ? <path key={"f" + l.c} className="w" d={l.d} />
                : editing && <path key={"f" + l.c} className="ghost" d={l.d} />)}
              {basic.h.map((l) => {
                if (l.dir === "none") return editing ? <line key={"h" + l.key} className="ghost" x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} /> : null;
                const arrow = { line: "none", right: "end", left: "start", both: "both" }[l.dir];
                return <Wire key={"h" + l.key} pts={[[l.x1, l.y], [l.x2, l.y]]} arrow={arrow} />;
              })}
              {links.map((o) => <Wire key={o.l.id} pts={o.pts} arrow={o.l.arrow} />)}
            </svg>
          )}

          <div className="head">
            <div className="kicker">Investigative Web</div>
            {editing
              ? <input className="title" id="web-name" aria-label="Web title" value={web.name} onChange={(e) => { const v = e.target.value; update((w) => { w.name = v; return w; }, true); }} />
              : <h2 className="title">{web.name}</h2>}
          </div>

          <div className="grid" style={{ gridTemplateColumns: `repeat(${web.cols}, minmax(${colMin}px, 1fr))` }}>
            {cells}
          </div>

          {web.showFinale && (
            <div className="finrow" style={{ paddingInline: finInset }}>
              {editing && <div className="finlabel">Finale</div>}
              <div className={"card finale"} ref={finRef}>
                {editing ? (
                  <>
                    <AutoText className="ct" value={web.finale.title} placeholder="Finale title" onChange={(v) => update((w) => { w.finale.title = v; return w; }, true)} />
                    <AutoText className="cb" value={web.finale.body} placeholder="Where every thread leads…" onChange={(v) => update((w) => { w.finale.body = v; return w; }, true)} />
                    {linkFrom && <button className="pick" onClick={() => finishLink(FIN)}><span>Link here</span></button>}
                  </>
                ) : (
                  <>
                    {web.finale.title && <h3>{web.finale.title}</h3>}
                    {web.finale.body && <p>{web.finale.body}</p>}
                  </>
                )}
              </div>
            </div>
          )}

          {editing && geo && !linkFrom && (
            <>
              {basic.v.map((l) => (
                <button key={"cv" + l.key} className={"ctl" + (l.on ? " on" : "")} style={{ left: l.x, top: l.my }}
                  aria-label={l.on ? "Cut vertical link" : "Connect vertically"}
                  onClick={() => update((w) => { if (w.vOff[l.key]) delete w.vOff[l.key]; else w.vOff[l.key] = true; return w; })}>
                  {l.on ? "×" : "+"}
                </button>
              ))}
              {basic.h.map((l) => (
                <button key={"ch" + l.key} className={"ctl" + (l.dir !== "none" ? " on" : "")} style={{ left: (l.x1 + l.x2) / 2, top: l.y }}
                  aria-label={`Side link: ${l.dir}. Click to change`}
                  onClick={() => update((w) => { const next = H_CYCLE[(H_CYCLE.indexOf(w.h[l.key] || "none") + 1) % H_CYCLE.length]; if (next === "none") delete w.h[l.key]; else w.h[l.key] = next; return w; })}>
                  {H_LABEL[l.dir]}
                </button>
              ))}
              {basic.f.map((l) => (
                <button key={"cf" + l.c} className={"ctl" + (l.on ? " on" : "")} style={{ left: l.x, top: l.my }}
                  aria-label={l.on ? "Cut link to finale" : "Connect to finale"}
                  onClick={() => update((w) => { if (w.finOff[l.c]) delete w.finOff[l.c]; else w.finOff[l.c] = true; return w; })}>
                  {l.on ? "×" : "+"}
                </button>
              ))}
              {links.map((o) => (
                <button key={"cl" + o.l.id} className={"ctl chip" + (sel === o.l.id ? " on" : "")} style={{ left: o.mx, top: o.my }}
                  aria-label={`Edit link from ${titleOf(o.l.from)} to ${titleOf(o.l.to)}`}
                  onClick={() => setSel(sel === o.l.id ? null : o.l.id)}>✎</button>
              ))}
              {selLink && (
                <div className="pop" style={{ left: Math.max(8, Math.min(selLink.mx - 125, geo.w - 258)), top: selLink.my + 18 }}>
                  <div className="ptitle">{titleOf(selLink.l.from)} → {titleOf(selLink.l.to)}</div>
                  {routeChoices(selLink.l).length > 0 && (
                    <div>
                      <div className="plbl">Route</div>
                      <div className="opts">
                        {routeChoices(selLink.l).map((r) => (
                          <button key={r} aria-pressed={selLink.l.route === r || (r === "jumpR" && routeChoices(selLink.l).length === 2 && !["jumpL", "jumpR"].includes(selLink.l.route))}
                            onClick={() => setLink(selLink.l.id, { route: r })}>{ROUTES[r]}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="plbl">Arrows</div>
                    <div className="opts">
                      {Object.entries(ENDS).map(([a, label]) => (
                        <button key={a} aria-pressed={selLink.l.arrow === a} onClick={() => setLink(selLink.l.id, { arrow: a })}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="prow">
                    <button className="btn warn" onClick={() => delLink(selLink.l.id)}>Delete link</button>
                    <button className="btn primary" onClick={() => setSel(null)}>Done</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
