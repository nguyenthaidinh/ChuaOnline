import { useState, type FormEvent } from 'react';

export function WelcomePanel({ onStart }: { onStart: (name: string, music: boolean) => void }) {
  const [name, setName] = useState('');
  const [music, setMusic] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart(name.trim().slice(0, 32) || 'Khách', music);
  };

  return (
    <form className="welcome-panel" onSubmit={submit}>
      <span className="eyebrow">MỘT KHOẢNG LẶNG CHO MÌNH</span>
      <h1 className="font-temple">Ghé vào chánh điện,<br />để tâm được thảnh thơi.</h1>
      <p>Một không gian thanh tịnh, miễn phí và không cần đăng nhập. Bạn có thể bắt đầu trong yên lặng.</p>
      <label htmlFor="display-name">Tên hiển thị <span>(không bắt buộc)</span></label>
      <input id="display-name" autoComplete="off" maxLength={32} placeholder="Bạn muốn được gọi là gì?" value={name} onChange={(event) => setName(event.target.value)} />
      <label className="check-label"><input type="checkbox" checked={music} onChange={(event) => setMusic(event.target.checked)} /> Bật nhạc nhẹ khi bắt đầu</label>
      <button className="primary-button" type="submit">Bắt đầu <span aria-hidden="true">→</span></button>
      <small>Tên chỉ dùng trong lần mở trang này.</small>
    </form>
  );
}
