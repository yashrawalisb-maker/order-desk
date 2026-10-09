import { useState, type Dispatch, type FormEvent } from 'react';
import { DISTRIBUTOR } from '../data/seed';
import type { Action } from '../state/store';
import { I } from '../components/icons';

// Demo sign-in: phone number + OTP, no backend. Any 6 digits work.

export function Login({ dispatch }: { dispatch: Dispatch<Action> }) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState(DISTRIBUTOR.phone);
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const digits = phone.replace(/\D/g, '');

  function sendOtp(e: FormEvent) {
    e.preventDefault();
    if (digits.length !== 10) return setErr('Enter a 10-digit mobile number.');
    setErr('');
    setStep('otp');
  }
  function verify(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setErr('Enter the 6-digit code.');
    dispatch({ type: 'login', phone: digits });
  }

  return (
    <main className="screen login">
      <div className="login-brand">
        <div className="login-mark" aria-hidden="true">{I.okBig()}</div>
        <h1>Order Desk</h1>
        <p>for Razorpay Agent Studio</p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={sendOtp} className="login-card" noValidate>
          <h2>Sign in</h2>
          <p className="muted">Use the mobile number your business is registered with.</p>
          <label className="field" htmlFor="phone">
            <span>Mobile number</span>
            <span className="phone-in">
              <span className="cc">+91</span>
              <input id="phone" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={14} />
            </span>
          </label>
          {err && <p className="note err" role="alert">{err}</p>}
          <button className="btn primary wide" type="submit">Send OTP</button>
        </form>
      ) : (
        <form onSubmit={verify} className="login-card" noValidate>
          <h2>Enter the code</h2>
          <p className="muted">Sent by SMS to +91 {digits.slice(0, 5)} {digits.slice(5)}.</p>
          <label className="field" htmlFor="otp">
            <span>6-digit code</span>
            <input id="otp" className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} autoFocus
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </label>
          <p className="hint">Demo: any 6 digits work. No SMS is sent.</p>
          {err && <p className="note err" role="alert">{err}</p>}
          <button className="btn primary wide" type="submit">Verify and continue</button>
          <button className="linkbtn" type="button" onClick={() => { setStep('phone'); setOtp(''); setErr(''); }}>Change number</button>
        </form>
      )}

      <p className="login-foot">{I.shield()} Prototype with sample data. Gupta Distributors and its retailers are fictional.</p>
    </main>
  );
}
