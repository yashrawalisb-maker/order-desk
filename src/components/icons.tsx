import type { ReactElement, ReactNode } from 'react';
import type { Channel } from '../types';

const S = (size: number, children: ReactNode, fill = false, sw = 2): ReactElement => (
  <span className="ic" aria-hidden="true">
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </span>
);

export const I = {
  back: () => S(22, <path d="M15 18l-6-6 6-6" />),
  mic: () => S(16, <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>),
  chit: () => S(16, <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  text: () => S(16, <path d="M4 5h16v11H9l-5 4z" />),
  call: () => S(16, <path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />),
  photo: () => S(16, <><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></>),
  play: () => S(14, <path d="M7 4l13 8-13 8z" />, true),
  pause: () => S(14, <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>, true),
  flag: () => S(14, <path d="M5 21V4h11l-2 4 2 4H5" />, false, 2.2),
  ok: () => S(15, <path d="M5 12.5l4.5 4.5L19 7" />, false, 2.6),
  okBig: () => S(26, <path d="M5 12.5l4.5 4.5L19 7" />, false, 2.6),
  spark: () => S(16, <><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>, true),
  inbox: () => S(20, <><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 3h6l1-3h5" /></>),
  bolt: () => S(20, <path d="M13 2L4 14h7l-1 8 9-12h-7z" />),
  brain: () => S(20, <path d="M12 3v18M8 7a3 3 0 1 0-3 5 3 3 0 0 0 3 5M16 7a3 3 0 1 1 3 5 3 3 0 0 1-3 5" />),
  chart: () => S(20, <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  list: () => S(20, <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeWidth={3} /></>),
  doc: () => S(16, <><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>),
  search: () => S(16, <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>),
  bell: () => S(16, <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  rupee: () => S(16, <path d="M7 4h11M7 9h11M9 4c5 0 6 5 0 5H7l8 11" />),
  shield: () => S(18, <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5L15.5 10" /></>),
  link: () => S(18, <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
};

export const chIcon = (c: Channel) => ({ voice: I.mic, chit: I.chit, text: I.text, call: I.call, photo: I.photo })[c]();
export const chName = (c: Channel) => ({ voice: 'Voice note', chit: 'Chit photo', text: 'WhatsApp text', call: 'Salesman call', photo: 'Chit photo' })[c];
