import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CharacterData } from "../domain/characterData";
import { exportExternalCharacterData } from "../domain/characterFormatAdapter";
import type { SystemPackage } from "../domain/systemPackage";
import { buildDholDelivery, DHOL_ADAPTER_ID, normalizeDholRoomCode, sendDholDelivery } from "../export/dholDelivery";
import "../styles/dhol-export.css";

const roomCodeStorageKey = "pbdh_dhol_last_room_code";

export function DholExportDialog({ data, systemPackage, onClose }: { data: CharacterData; systemPackage: SystemPackage; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const retryRef = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const [roomCode, setRoomCode] = useState(() => {
    try { return localStorage.getItem(roomCodeStorageKey) ?? ""; } catch { return ""; }
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const code = normalizeDholRoomCode(roomCode);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending || code.length !== 6) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const adapter = systemPackage.characterFormatAdapters?.find((item) => item.ID === DHOL_ADAPTER_ID);
      if (!adapter) throw new Error("当前系统包缺少 dhSheet Format 导出适配器。");
      const converted = await exportExternalCharacterData(data, adapter, systemPackage);
      if ("error" in converted) throw new Error(converted.error.text);
      const delivery = buildDholDelivery(data, converted.document, systemPackage);
      const fingerprint = JSON.stringify({ code, delivery });
      const requestId = retryRef.current?.fingerprint === fingerprint ? retryRef.current.requestId : crypto.randomUUID();
      retryRef.current = { fingerprint, requestId };
      const sent = await sendDholDelivery(code, requestId, delivery);
      try { localStorage.setItem(roomCodeStorageKey, code); } catch { /* Storage is optional. */ }
      setResult(`${sent.action === "created" ? "已新增" : "已覆盖"}：${sent.name}`);
      retryRef.current = null;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "角色投递失败。");
    } finally {
      setSending(false);
    }
  };

  return <dialog
    ref={dialogRef}
    className="dhol-export-dialog"
    aria-labelledby="dhol-export-title"
    onCancel={(event) => { event.preventDefault(); if (!sending) onClose(); }}
  >
    <form onSubmit={(event) => void send(event)}>
      <header className="dhol-export-dialog__header">
        <h2 id="dhol-export-title">发送到在线面板</h2>
        <p>当前角色：{String(data.character.values["character-name"] || "（未命名角色）")}</p>
      </header>
      <div className="dhol-export-dialog__body">
        <label htmlFor="dhol-room-code">房间码</label>
        <input
          id="dhol-room-code"
          value={roomCode}
          onChange={(event) => { setRoomCode(normalizeDholRoomCode(event.target.value).slice(0, 6)); setError(null); setResult(null); }}
          maxLength={6}
          placeholder="例如 ABC123"
          autoComplete="off"
          autoFocus
          disabled={sending}
        />
        <p className="dhol-export-dialog__hint">同名角色再次发送会覆盖在线面板中的整张角色卡及资源状态。头像不会发送。</p>
        {error && <p className="dhol-export-dialog__error" role="alert">{error}</p>}
        {result && <p className="dhol-export-dialog__success" role="status">{result}</p>}
      </div>
      <footer className="dhol-export-dialog__actions">
        <button type="button" className="icon-button secondary-button" onClick={onClose} disabled={sending}>关闭</button>
        <button type="submit" className="icon-button" disabled={sending || code.length !== 6}>{sending ? "发送中…" : "发送"}</button>
      </footer>
    </form>
  </dialog>;
}
