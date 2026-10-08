import { useState, useRef } from "react";

export default function SharePanel({ web, onImport }) {
  const [msg, setMsg] = useState(null);
  const [paste, setPaste] = useState("");
  const outRef = useRef(null);
  const json = JSON.stringify({ ...web, id: undefined }, null, 2);
  const copy = async () => {
    try { await navigator.clipboard.writeText(json); setMsg({ t: "Copied to clipboard." }); }
    catch (e) { outRef.current.select(); setMsg({ t: "Text selected. Copy it with your keyboard or the share menu." }); }
  };
  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (web.name || "investigative-web").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const doImport = (text) => {
    try { const d = JSON.parse(text); onImport(d); setPaste(""); setMsg({ t: "Imported as a new web." }); }
    catch (e) { setMsg({ t: "That isn't valid web JSON. Paste the full text from Export.", err: true }); }
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => doImport(String(rd.result)); rd.readAsText(f);
    e.target.value = "";
  };
  return (
    <div className="panel">
      <div>
        <h4>Export this web</h4>
        <p>Copy the text and paste it somewhere safe, or into Import on another device.</p>
        <textarea id="export-json" ref={outRef} readOnly value={json} onFocus={(e) => e.target.select()} />
        <div className="row">
          <button className="btn primary" onClick={copy}>Copy</button>
          <button className="btn" onClick={download}>Download .json</button>
        </div>
      </div>
      <div>
        <h4>Import a web</h4>
        <p>Paste exported text, or pick a saved .json file. It's added as a new web.</p>
        <textarea id="import-json" value={paste} placeholder='{"name": "…", "cards": { … } }' onChange={(e) => setPaste(e.target.value)} />
        <div className="row">
          <button className="btn primary" disabled={!paste.trim()} onClick={() => doImport(paste)}>Import</button>
          <label className="btn" htmlFor="import-file">Choose file…</label>
          <input id="import-file" type="file" accept=".json,application/json,text/plain" hidden onChange={onFile} />
          {msg && <span className={"msg" + (msg.err ? " err" : "")}>{msg.t}</span>}
        </div>
      </div>
    </div>
  );
}
