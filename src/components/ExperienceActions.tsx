import type { RitualKind } from '../types/experience';

export function ExperienceActions({ disabled, busy, onAction, onBlessing }: {
  disabled: boolean; busy: boolean; onAction: (kind: RitualKind) => void; onBlessing: () => void;
}) {
  return <div className="experience-actions" aria-label="Thao tác trong chánh điện">
    <button type="button" disabled={disabled} onClick={() => onAction('incense')}><span aria-hidden="true">♨</span> Thắp hương</button>
    <button type="button" disabled={disabled} onClick={() => onAction('bow')}><span aria-hidden="true">🙏</span> Lễ Phật · 3 lạy</button>
    <button type="button" onClick={onBlessing}><span aria-hidden="true">❋</span> Nhận lời chúc</button>
    {busy && <small>Nhân vật đang thực hiện nghi lễ. Bạn vẫn có thể dùng âm thanh và nhận lời chúc.</small>}
  </div>;
}
