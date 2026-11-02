import { useState } from 'react';

export default function AuthScreen({ auth }) {
  const [tab, setTab] = useState('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localErr, setLocalErr] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (auth.busy) return;
    if (tab === 'register' && password.length < 8) return setLocalErr('Password must be at least 8 characters.');
    setLocalErr(null);
    if (tab === 'register') auth.register(name, email, password);
    else auth.login(email, password);
  };
  const switchTab = (t) => {
    setTab(t);
    setLocalErr(null);
    setPassword('');
  };

  return (
    <div className="authwrap">
      <form className="card auth" onSubmit={submit} noValidate>
        <div className="authtitle">FogSafe</div>
        <div className="seg" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            className={tab === 'register' ? 'on' : ''}
            onClick={() => switchTab('register')}
          >
            Register
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={tab === 'login' ? 'on' : ''}
            onClick={() => switchTab('login')}
          >
            Log in
          </button>
        </div>

        {tab === 'register' && (
          <label className="field">
            <span className="lbl">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={60}
              required
              autoFocus
            />
          </label>
        )}
        <label className="field">
          <span className="lbl">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>

        <label className="field">
          <span className="lbl">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
            minLength={8}
            maxLength={128}
            required
          />
          {tab === 'register' && <span className="small">At least 8 characters.</span>}
        </label>

        <button type="submit" className="on" disabled={auth.busy}>
          {auth.busy ? 'Please wait…' : tab === 'register' ? 'Create account' : 'Log in'}
        </button>
        {auth.note && <div className="small">{auth.note}</div>}
        {(localErr || auth.error) && <div className="err">{localErr || auth.error}</div>}
        <div className="small">
          {tab === 'register' ? 'Already registered?' : 'New here?'}{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              switchTab(tab === 'register' ? 'login' : 'register');
            }}
          >
            {tab === 'register' ? 'Log in' : 'Register'}
          </a>
        </div>
      </form>
    </div>
  );
}
