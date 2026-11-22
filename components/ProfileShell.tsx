import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProfileSession } from '../services/profileSession';
import { apiBase } from '../services/apiBase';
import { readFreeProgress } from '../services/freeProgress';
import { ProgressAccess, ProgressAccount } from './ProgressAccount';
import { GuideView } from './GuideView';
import { Button } from './Button';
import { ARCHETYPES } from '../types';

export const ProfileShell = () => {
 const base=apiBase(import.meta.env.VITE_PROGRESS_API_URL);
 const client=useMemo(()=>new ProfileSession(base),[base]);
 const [state,setState]=useState(client.state), [message,setMessage]=useState(''), [course,setCourse]=useState<any>(null),[guide,setGuide]=useState(false);
 const host=useRef<HTMLDivElement>(null);
 const [candidate]=useState(()=>{try{return readFreeProgress(localStorage);}catch{return null;}});
 useEffect(()=>{const stop=client.subscribe(s=>setState({...s}));void client.start();return()=>{stop();client.dispose();};},[client]);
 useEffect(()=>{
   if(!course||!host.current)return;
   let stopped=false,cleanup:(()=>void)|undefined;
   const url=URL.createObjectURL(new Blob([course.script],{type:'text/javascript'}));
   const style=document.createElement('style');style.textContent=course.css;document.head.appendChild(style);
   window.__ORIENTA_API=base;window.__ORIENTA_LESSONS=course.lessons;
   void import(/* @vite-ignore */ url).then(mod=>{if(!stopped&&host.current)cleanup=mod.mount(host.current);}).catch(()=>{setMessage('Не удалось открыть модуль. Вернись в профиль и повтори.');});
   return()=>{stopped=true;cleanup?.();URL.revokeObjectURL(url);style.remove();delete window.__ORIENTA_LESSONS;delete window.__ORIENTA_API;};
 },[course,base]);
 const onExport=()=>{const blob=new Blob([JSON.stringify(client.snapshot || candidate,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Ориента-профиль.json';a.click();URL.revokeObjectURL(url);};
 if(course)return <><button className="p-4 underline" onClick={()=>{setCourse(null);void client.retry();}}>← Вернуться в лагерь</button>{message&&<p role="alert">{message}</p>}<div ref={host}/></>;
 if(!state.learnerId||state.status==='signed-out')return <div className="adventure profile-access"><ProgressAccess client={client} state={state} onExport={onExport} hasLocalAnswers={!!candidate?.result}/></div>;
 const result=client.snapshot?.payload?.state?.testResult;
 const archetype=result&&Object.prototype.hasOwnProperty.call(ARCHETYPES,result.scoreType)?ARCHETYPES[result.scoreType as keyof typeof ARCHETYPES]:null;
 if(guide&&archetype)return <div className="adventure"><GuideView archetype={result.scoreType} onBack={()=>setGuide(false)} onStartCourse={()=>setGuide(false)} actionLabel="Вернуться в лагерь"/></div>;
 const canTransfer=candidate?.result&&!result&&(!client.snapshot?.payload?.testDraft?.step||client.snapshot.payload.testDraft.step==='start');
 return <main className="adventure profile-camp-view"><ProgressAccount client={client} state={state} onExport={onExport}/><section className="max-w-3xl mx-auto p-6 py-12 space-y-6"><h1 className="text-3xl font-serif">Мой лагерь</h1><p>Он доступен с другого устройства по твоему личному коду. Бесплатный профиль и доступ к полному курсу — разные вещи.</p>{message&&<p role="alert">{message}</p>}{archetype?<article className="p-6 bg-slate-900 rounded-xl"><h2 className="text-2xl">{archetype.title}</h2><p>{result.heroName||'Твой герой'}</p><p>Архетип сохранён в профиле.</p><Button variant="secondary" onClick={()=>setGuide(true)}>Посмотреть мой архетип</Button></article>:<p>Архетип пока не сохранён. Пройди бесплатную вводную и вернись сюда.</p>}
 {canTransfer&&<section className="border border-amber-600 rounded-xl p-6 space-y-4"><h2>Перенести сюда результат {candidate.result!.title}?</h2><p>Подтверди, что это твой результат. Псевдоним, архетип и ход теста сохранятся на сервере Ориенты в России и будут доступны по твоему коду. В Telegram и ИИ они не отправляются. Существующий результат не заменится.</p><Button disabled={state.status!=='saved'} onClick={async()=>{try{setMessage('');await client.saveIntro(candidate);setMessage('Архетип сохранён в профиле.');}catch(error){setMessage((error as Error).message);}}}>Это мой результат, сохранить</Button></section>}
 <div className="flex flex-wrap gap-4"><a href="#hub" className="underline">К бесплатной вводной</a><Button variant="secondary" onClick={()=>{void client.retry();}}>Обновить профиль</Button><Button disabled={!state.courseAvailable||state.status!=='saved'} onClick={async()=>{try{setMessage('Загружаем курс…');const data=await client.loadCourse();if(typeof data.script!=='string'||typeof data.css!=='string')throw Error('Некорректный модуль');setMessage('');setCourse(data);}catch{setMessage('Не удалось получить курс. Проверь подключение и доступ.');}}}>Открыть полный курс</Button></div>{!state.courseAvailable&&<p>Полный курс пока не открыт. Оплата ещё не подключена, бесплатная регистрация не выдаёт платный доступ.</p>}<a href="https://t.me/sense_house" target="_blank" rel="noopener noreferrer" className="underline">Сообщество в Telegram</a></section></main>;
};
