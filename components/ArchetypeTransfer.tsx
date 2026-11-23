import React, { useState } from 'react';
import { Button } from './Button';

type Props = { blocked: boolean; ready: boolean; onSave: () => Promise<void> };

export const ArchetypeTransfer = ({ blocked, ready, onSave }: Props) => {
  const [confirm, setConfirm] = useState(false);
  if (blocked) return <p>Этот архетип хранится только в браузере. В профиле уже начат другой тест, поэтому его ответы не будут заменены.</p>;
  return <section className="camp-archetype-transfer" aria-label="Перенос архетипа">
    <p>Архетип сохранён только в этом браузере.</p>
    {!confirm ? <Button type="button" variant="outline" disabled={!ready} onClick={() => setConfirm(true)}>Сохранить архетип в профиле</Button> : <>
      <p>Псевдоним, архетип и ответы теста сохранятся в профиле Ориенты на сервере в России и будут доступны по твоему коду. В Telegram и ИИ они не отправляются. Ответы курса останутся как есть.</p>
      <Button type="button" variant="fantasy" disabled={!ready} onClick={() => { void onSave(); }}>Это мой результат, сохранить</Button>
      <Button type="button" variant="ghost" disabled={!ready} onClick={() => setConfirm(false)}>Отмена</Button>
    </>}
    {!ready && <p role="status">Проверяем подключение к профилю.</p>}
  </section>;
};
