import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from './Button';
import { buildProfilePdf, loadProfilePdfFonts, PROFILE_PDF_FILENAME } from '../services/profilePdf';
import type { ProfilePdfFonts, ProfilePdfModel } from '../services/profilePdf';

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url; link.download = file.name;
  document.body.append(link);
  link.click(); link.remove();
  // iOS may hand the Blob to another process; allow it time to read it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function ProfilePdfActions({ model }: { model: ProfilePdfModel }) {
  const [fonts, setFonts] = useState<ProfilePdfFonts | null>(null);
  const [retry, setRetry] = useState(0), [error, setError] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setError(false);
    loadProfilePdfFonts(abort.signal).then(setFonts, () => { if (!abort.signal.aborted) setError(true); });
    return () => abort.abort();
  }, [retry]);
  const save = () => {
    if (!fonts) { if (error) setRetry(r => r + 1); return; }
    try {
      const bytes = buildProfilePdf(model, fonts);
      const file = new File([bytes.buffer as ArrayBuffer], PROFILE_PDF_FILENAME, { type: 'application/pdf' });
      const mobileApple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (mobileApple && navigator.canShare?.({ files: [file] }) && navigator.share) {
        // No await before the native call: retain Safari's user activation.
        navigator.share({ files: [file] }).catch((e: unknown) => {
          if (!(e instanceof DOMException && e.name === 'AbortError')) { try { saveFile(file); } catch { setError(true); } }
        });
      } else saveFile(file);
    } catch { setError(true); }
  };
  return <div className="atlas-export">
    <Button variant="fantasy" disabled={!fonts && !error} onClick={save}><Download className="w-5 h-5" aria-hidden="true" />{fonts ? 'Скачать PDF' : error ? 'Повторить загрузку PDF' : 'Готовим PDF…'}</Button>
    <Button variant="secondary" onClick={() => window.print()}><Printer className="w-5 h-5" aria-hidden="true" />Печать</Button>
    {error && <p role="alert" className="atlas-error">Не удалось подготовить PDF. Можно повторить попытку или воспользоваться печатью.</p>}
  </div>;
}
