import React, { useRef, useState } from 'react';
import { telegramProof } from '../services/telegramBrowser';
import { Button } from './Button';
import type { ProgressSync, SyncState } from '../services/cloudProgress';

type Props = { client: Pick<ProgressSync, 'signIn' | 'joinPilot' | 'signInTelegram' | 'registerFree' | 'signOut' | 'linkTelegram' | 'retry' | 'useCloudCopy'>; state: SyncState; onExport: () => void; hasLocalAnswers: boolean };
const createPersonalCode = () => 'ORI-' + Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g)!.join('-');
const isPilotCode = (code: string) => /^PILOT/i.test(code.trim());

export const ProgressAccess = ({ client, state, onExport, hasLocalAnswers }: Props) => {
  const [code, setCode] = useState('');
  const [pilotRecovery, setPilotRecovery] = useState('');
  const [pilotConsent, setPilotConsent] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const recoveryText = useRef<HTMLElement>(null);
  const copyRecovery = async () => {
    try {
      await navigator.clipboard.writeText(pilotRecovery);
      setCopyMessage('Код скопирован.');
    } catch {
      const selection = window.getSelection();
      if (selection && recoveryText.current) {
        const range = document.createRange(); range.selectNodeContents(recoveryText.current);
        selection.removeAllRanges(); selection.addRange(range);
      }
      setCopyMessage('Не удалось скопировать автоматически. Скопируй выделенный код вручную.');
    }
  };
  const pilot = isPilotCode(code);
  const [newCode, setNewCode] = useState('');
  const [registrationConsent, setRegistrationConsent] = useState(false);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [telegramError, setTelegramError] = useState('');
  return <main className="min-h-screen max-w-lg mx-auto px-6 py-16 flex flex-col justify-center gap-6">
    <p className="text-sm tracking-widest text-amber-200">ORIENTA · ПУТЬ ГЕРОЯ</p>
    <h1 className="text-3xl font-serif text-white">Продолжи свой путь</h1>
    <p className="text-slate-300">Введи приглашение от наставника или код своего профиля. Личный код поможет продолжить с другого устройства.</p>
    <form onSubmit={event => { event.preventDefault(); if (pilot) { if (pilotConsent && pilotRecovery) void client.joinPilot(code, pilotRecovery); } else void client.signIn(code); }} className="space-y-4">
      <label className="block text-slate-100" htmlFor="access-code">Код входа</label>
      <input id="access-code" name="access-code" type="text" value={code} onChange={event => {
        const next = event.target.value;
        if (isPilotCode(next) && !pilotRecovery) setPilotRecovery(createPersonalCode());
        if (!isPilotCode(next)) { setPilotConsent(false); setCopyMessage(''); }
        setCode(next);
      }} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={100}
        className="w-full rounded-xl p-4 bg-slate-800 border border-slate-500 text-white font-mono" placeholder="ORI-…" aria-describedby="code-help" disabled={state.status === 'checking'} />
      <p id="code-help" className="text-sm text-slate-400">Личный код открывает твои ответы. Его нельзя передавать другим.</p>
      {pilot && <section aria-label="Личный код восстановления" className="space-y-3">
        <p>Это твой личный код на случай смены устройства. Сейчас вводить его не нужно. Сохрани его и никому не показывай.</p>
        <code ref={recoveryText} className="block break-all select-all rounded-xl bg-slate-800 p-3">{pilotRecovery}</code>
        <Button type="button" variant="secondary" disabled={!pilotRecovery} onClick={() => { void copyRecovery(); }}>Скопировать личный код</Button>
        {copyMessage && <p role="status">{copyMessage}</p>}
        <label className="flex items-start gap-3"><input type="checkbox" checked={pilotConsent} onChange={e => setPilotConsent(e.target.checked)} /><span>Я сохранил личный код и согласен, чтобы мой прогресс хранился на сервере Ориенты в России. Не буду вводить настоящие имена и личные сведения.</span></label>
      </section>}
      <Button type="submit" fullWidth variant="fantasy" disabled={!code.trim() || state.status === 'checking' || (pilot && (!pilotConsent || !pilotRecovery))}>{state.status === 'checking' ? 'Подключаемся…' : pilot ? 'Войти в поток' : 'Войти по коду'}</Button>
    </form>
    {state.registrationAvailable && <section aria-label="Бесплатная регистрация" className="border-t border-slate-700 pt-5 space-y-4"><h2 className="text-xl">Новый бесплатный профиль</h2><p>Имя, телефон и почта не нужны. Профиль сохранит вводную и архетип. Полный курс подключается отдельно, оплата сейчас не работает.</p>{!newCode ? <Button variant="secondary" onClick={() => { setNewCode(createPersonalCode()); }}>Подготовить мой код</Button> : <><p>Сохрани код в надёжном месте. Он открывает твой профиль с другого устройства. Не публикуй и не отправляй его другим. Без кода и связанного Telegram восстановить доступ не получится.</p><code className="block break-all select-all rounded-xl bg-slate-800 p-3">{newCode}</code><label className="flex gap-3"><input type="checkbox" checked={registrationConsent} onChange={e => setRegistrationConsent(e.target.checked)} /><span>Я сохранил код и хочу создать профиль на сервере Ориенты в России. Подтверждённые мной ответы и псевдоним будут сохраняться там; вводную перенесу отдельно. Не буду вводить настоящие имена и личные сведения.</span></label><Button disabled={!registrationConsent || registrationBusy} onClick={async () => { setRegistrationBusy(true); setRegistrationError(''); try { await client.registerFree(newCode); } catch(error) { setRegistrationError((error as Error).message); } finally { setRegistrationBusy(false); } }}>{registrationBusy ? 'Создаём профиль…' : 'Создать бесплатный профиль'}</Button></>}{registrationError && <p role="alert">{registrationError}</p>}</section>}
    {state.telegramAvailable && <section className="space-y-3"><p className="text-sm text-slate-300">Уже связал Telegram с профилем? В мини-приложении можно войти без повторного ввода кода. Подписанные данные аккаунта Telegram будут проверены сервером Ориенты.</p><Button variant="secondary" disabled={state.status === 'checking'} onClick={async () => { try { setTelegramError(''); await client.signInTelegram(await telegramProof()); } catch (error) { setTelegramError((error as Error).message); } }}>Войти через Telegram</Button></section>}
    {telegramError && <p role="alert">{telegramError}</p>}
    {state.message && <p role="alert" className="text-amber-200">{state.message}</p>}
    {state.status === 'error' && <Button variant="secondary" onClick={() => { void client.retry(); }}>Повторить подключение</Button>}
    {hasLocalAnswers && <div className="border-t border-slate-700 pt-5 space-y-3">
      <p className="text-sm text-slate-300">На устройстве есть ответы. При входе откроется сохранение выбранного ученика. Скачай копию, если хочешь оставить текущий вариант.</p>
      <Button variant="secondary" onClick={onExport}>Скачать ответы с устройства</Button>
    </div>}
  </main>;
};

export const ProgressAccount = ({ client, state, onExport }: Omit<Props, 'hasLocalAnswers'>) => {
  const [linkConfirm, setLinkConfirm] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  if (state.status === 'local') return null;
  const messages: Partial<Record<SyncState['status'], string>> = {
    saved: 'Прогресс сохранён в облаке', pending: 'Сохраняем прогресс…', offline: 'Нет связи с облаком. Ответы пока на этом устройстве.',
    conflict: 'На другом устройстве появилось новое сохранение. Твои текущие ответы не отправлены.',
  };
  return <section aria-label="Личный прогресс" className="max-w-5xl mx-auto px-6 py-3 text-sm print-hidden border-b border-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className={['offline', 'conflict'].includes(state.status) ? 'text-amber-200' : 'text-slate-300'}>{messages[state.status] || state.message}</p>
      <button className="underline text-slate-300" onClick={() => { if (state.dirty) onExport(); void client.signOut(); }}>Выйти из профиля</button>
    </div>
    {state.telegramAvailable && <div className="mt-4 space-y-3"><button className="underline" onClick={() => setLinkConfirm(true)}>Связать профиль с Telegram</button>{linkConfirm && <div className="rounded-xl border border-slate-600 p-4 space-y-3"><p>Делай это в мини-приложении Telegram после входа по своему личному коду. Подписанные данные Telegram будут отправлены на сервер Ориенты для проверки и связи с этим профилем. Затем этот Telegram сможет открывать твои сохранённые ответы. Старую связь с другим профилем заменить нельзя.</p><Button disabled={linkBusy || state.status !== 'saved' || state.dirty} onClick={async () => { setLinkBusy(true); try { const result = await client.linkTelegram(await telegramProof()); setLinkMessage(result.linked ? 'Telegram связан. На другом устройстве открой то же мини-приложение и нажми «Войти через Telegram».' : 'Связь не подтверждена.'); setLinkConfirm(false); } catch (error) { setLinkMessage((error as Error).message); } finally { setLinkBusy(false); } }}>Это мой Telegram, связать</Button><button className="underline ml-4" onClick={() => setLinkConfirm(false)}>Отмена</button></div>}{linkMessage && <p role="status">{linkMessage}</p>}</div>}
    {!state.cacheAvailable && <p role="alert" className="text-amber-200 mt-2">На устройстве не удалось сохранить запасную копию. Скачай ответы перед закрытием страницы.</p>}
    {state.status === 'offline' && <div className="flex flex-wrap gap-4 mt-3"><button className="underline" onClick={() => { void client.retry(); }}>Повторить сохранение</button><button className="underline" onClick={onExport}>Скачать ответы</button><p className="text-slate-400">При выходе несохранённые ответы скачаются файлом.</p></div>}
    {state.status === 'conflict' && <div className="space-y-3 mt-3">
      <p className="text-slate-300">Перед открытием облачной версии скачается копия текущих ответов.</p>
      <div className="flex flex-wrap gap-4"><Button variant="secondary" onClick={onExport}>Скачать мои ответы</Button><Button onClick={() => { onExport(); client.useCloudCopy(); }}>Открыть облачную версию</Button></div>
    </div>}
  </section>;
};
