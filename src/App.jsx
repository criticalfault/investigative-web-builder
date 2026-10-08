import { useState, useEffect, useRef, useCallback } from "react";
import { MAX_COLS, MAX_ROWS, RC, uid, blankWeb, clone, load, normalize, prune, STORE } from "./lib/model.js";
import Board from "./components/Board.jsx";
import SharePanel from "./components/SharePanel.jsx";

export default function App() {
  const [lib, setLib] = useState(load);
  const [editing, setEditing] = useState(true);
  const [share, setShare] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const [, force] = useState(0);
  const hist = useRef([]), lastPush = useRef(0);
  const web = lib.webs.find((w) => w.id === lib.currentId) || lib.webs[0];

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(lib)); } catch (e) {} }, [lib]);
  useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(null), 3000); return () => clearTimeout(t); }, [confirm]);

  const update = useCallback((fn, coalesce = false) => {
    setLib((prev) => {
      const cur = prev.webs.find((w) => w.id === prev.currentId) || prev.webs[0];
      const now = Date.now();
      if (!coalesce || now - lastPush.current > 900) {
        hist.current.push({ id: cur.id, web: cur });
        if (hist.current.length > 100) hist.current.shift();
      }
      lastPush.current = coalesce ? now : 0;
      const next = prune(fn(clone(cur)));
      return { ...prev, webs: prev.webs.map((w) => (w.id === cur.id ? next : w)) };
    });
    force((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    const h = hist.current.pop(); if (!h) return;
    lastPush.current = 0;
    setLib((prev) => ({ ...prev, currentId: prev.webs.some((w) => w.id === h.id) ? h.id : prev.currentId, webs: prev.webs.map((w) => (w.id === h.id ? h.web : w)) }));
    force((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z" && tag !== "input" && tag !== "textarea") { e.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const addWeb = (w) => setLib((prev) => ({ webs: [...prev.webs, w], currentId: w.id }));
  const deleteWeb = () => {
    if (confirm !== "web") { setConfirm("web"); return; }
    setConfirm(null);
    setLib((prev) => {
      let webs = prev.webs.filter((w) => w.id !== prev.currentId);
      if (!webs.length) webs = [blankWeb()];
      return { webs, currentId: webs[0].id };
    });
  };
  const rowHas = (r) => Object.keys(web.cards).some((k) => RC(k)[0] === r);
  const colHas = (c) => Object.keys(web.cards).some((k) => RC(k)[1] === c);
  const removeRow = () => {
    if (web.rows <= 1) return;
    if (rowHas(web.rows - 1) && confirm !== "row") { setConfirm("row"); return; }
    setConfirm(null); update((w) => { w.rows -= 1; return w; });
  };
  const removeCol = () => {
    if (web.cols <= 1) return;
    if (colHas(web.cols - 1) && confirm !== "col") { setConfirm("col"); return; }
    setConfirm(null); update((w) => { w.cols -= 1; return w; });
  };

  return (
    <>
      <div className="bar">
        <div className="group">
          <select id="web-picker" aria-label="Choose web" value={web.id} onChange={(e) => { const id = e.target.value; setLib((p) => ({ ...p, currentId: id })); }}>
            {lib.webs.map((w) => <option key={w.id} value={w.id}>{w.name || "Untitled Web"}</option>)}
          </select>
          <button className="btn" onClick={() => addWeb(blankWeb())}>New</button>
          <button className="btn" onClick={() => { const c = clone(web); c.id = uid(); c.name = web.name + " (copy)"; addWeb(c); }}>Duplicate</button>
          <button className={"btn" + (confirm === "web" ? " warn" : "")} onClick={deleteWeb}>{confirm === "web" ? "Delete web?" : "Delete"}</button>
        </div>
        {editing && (
          <div className="group">
            <span className="lbl">Rows</span>
            <button className={"btn" + (confirm === "row" ? " warn" : "")} aria-label="Remove last row" disabled={web.rows <= 1} onClick={removeRow}>{confirm === "row" ? "Remove row?" : "−"}</button>
            <span className="count">{web.rows}</span>
            <button className="btn" aria-label="Add row" disabled={web.rows >= MAX_ROWS} onClick={() => update((w) => { w.rows += 1; return w; })}>+</button>
            <span className="lbl" style={{ marginLeft: 8 }}>Columns</span>
            <button className={"btn" + (confirm === "col" ? " warn" : "")} aria-label="Remove last column" disabled={web.cols <= 1} onClick={removeCol}>{confirm === "col" ? "Remove column?" : "−"}</button>
            <span className="count">{web.cols}</span>
            <button className="btn" aria-label="Add column" disabled={web.cols >= MAX_COLS} onClick={() => update((w) => { w.cols += 1; return w; })}>+</button>
            <button className="btn" aria-pressed={web.showFinale} style={{ marginLeft: 8 }} onClick={() => update((w) => { w.showFinale = !w.showFinale; return w; })}>
              {web.showFinale ? "Finale: on" : "Finale: off"}
            </button>
          </div>
        )}
        <div className="spacer" />
        <div className="group">
          <button className="btn" disabled={!hist.current.length} onClick={undo}>Undo</button>
          <button className="btn" aria-pressed={share} onClick={() => setShare((s) => !s)}>{share ? "Close export" : "Export / Import"}</button>
          <div className="seg" role="group" aria-label="Mode">
            <button aria-pressed={editing} onClick={() => setEditing(true)}>Edit</button>
            <button aria-pressed={!editing} onClick={() => { setEditing(false); setShare(false); }}>Present</button>
          </div>
        </div>
      </div>
      {share && <SharePanel web={web} onImport={(d) => { const w = normalize(d); w.id = uid(); addWeb(w); }} />}
      {editing && <p className="hint">Round buttons set the basic links: between stacked clues they connect or cut, between side-by-side clues they cycle none, line, →, ← and ↔. For anything else, press <b>Link…</b> on a clue and tap where it leads. Tap ✎ on a link to change its route or arrows. Your webs save in this browser.</p>}
      <Board web={web} editing={editing} update={update} focusKey={focusKey} setFocusKey={setFocusKey} />
    </>
  );
}
