import { useEffect, useState } from 'react';
import {
  ChartNoAxesColumnIncreasing,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  LogIn,
  Mail,
  Package,
  Sprout,
} from 'lucide-react';

export default function LoginScreen({ language, initialError = '', onLanguageChange, onLogin }) {
  const isFrench = language === 'fr';
  const [email, setEmail] = useState('owner@mashtal.tn');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  useEffect(() => setError(initialError), [initialError]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  };

  const features = [
    { icon: Package, text: isFrench ? 'Suivi des stocks en temps réel' : 'متابعة المخزون في الوقت الفعلي' },
    { icon: ChartNoAxesColumnIncreasing, text: isFrench ? 'Gestion des ventes' : 'إدارة المبيعات' },
    { icon: Sprout, text: isFrench ? 'Contrôle des plantes et produits' : 'متابعة النباتات والمنتجات' },
  ];

  return (
    <main dir={isFrench ? 'ltr' : 'rtl'} className="login-scene min-h-screen font-cairo">
      <div className="login-layout">
        <section className="login-brand-panel">
          <div className="login-brand">
            <span className="login-brand-mark"><Leaf size={54} strokeWidth={1.7} /></span>
            <div>
              <p className="login-brand-title">{isFrench ? 'Gestion de Stock' : 'إدارة المخزون'}</p>
              <p className="login-brand-arabic">مشتل الزاهي</p>
              <p className="login-brand-tagline">
                {isFrench ? 'Gérez votre stock, développez votre activité' : 'أدر مخزونك، وطوّر نشاطك'}
              </p>
            </div>
          </div>

          <div className="login-features">
            {features.map(({ icon: Icon, text }) => (
              <div className="login-feature" key={text}>
                <Icon size={20} strokeWidth={2.2} />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <p className="login-brand-quote">
            {isFrench ? <>Un jardin bien géré,<br />c’est une croissance assurée.</> : <>مشتلٌ مُدار بعناية،<br />ونموٌّ يزدهر كل يوم.</>}
          </p>
        </section>

        <section className="login-form-panel">
          <div className="login-card">
            <button type="button" onClick={onLanguageChange} className="login-language">
              {isFrench ? 'العربية' : 'Français'}
            </button>

            <div className="login-card-heading">
              <span className="login-card-mark"><Sprout size={48} strokeWidth={1.8} /></span>
              <h1>{isFrench ? 'Connexion' : 'تسجيل الدخول'}</h1>
              <p>{isFrench ? 'Accédez à votre espace de gestion' : 'ادخل إلى مساحة إدارة المشتل'}</p>
            </div>

            <form onSubmit={submit} className="login-form">
              <label className="login-input-wrap">
                <Mail size={21} aria-hidden="true" />
                <input
                  autoComplete="username"
                  aria-label={isFrench ? 'Adresse e-mail' : 'البريد الإلكتروني'}
                  placeholder={isFrench ? 'Adresse e-mail' : 'البريد الإلكتروني'}
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="login-input-wrap">
                <LockKeyhole size={21} aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  aria-label={isFrench ? 'Mot de passe' : 'كلمة المرور'}
                  placeholder={isFrench ? 'Mot de passe' : 'كلمة المرور'}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword
                    ? (isFrench ? 'Masquer le mot de passe' : 'إخفاء كلمة المرور')
                    : (isFrench ? 'Afficher le mot de passe' : 'إظهار كلمة المرور')}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </label>

              {error && <p role="alert" className="login-error">{error}</p>}

              <button disabled={busy} className="login-submit">
                <LogIn size={22} />
                <span>{busy
                  ? (isFrench ? 'Connexion…' : 'جارٍ التحقق…')
                  : (isFrench ? 'Se connecter' : 'دخول إلى النظام')}</span>
              </button>
            </form>

            <div className="login-card-footer">
              <span><Leaf size={20} /></span>
              <p>{isFrench ? 'مشتل · Gestion de Stock' : 'مشتل الزاهي · إدارة المخزون'}</p>
              <small>{isFrench ? 'Une pépinière qui grandit avec vous' : 'مشتلك ينمو معك'}</small>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
