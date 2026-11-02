import { useEffect, useState } from 'react';
import { Leaf, LockKeyhole, Mail, Sprout } from 'lucide-react';

export default function LoginScreen({ language, initialError = '', onLanguageChange, onLogin }) {
  const isFrench = language === 'fr';
  const [email, setEmail] = useState('owner@mashtal.tn');
  const [password, setPassword] = useState('');
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

  return <main dir={isFrench ? 'ltr' : 'rtl'} className="flex min-h-screen items-center justify-center bg-[#f7f9f6] p-4 font-cairo dark:bg-[#121b15]">
    <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-green-950/10 dark:bg-slate-900 md:grid-cols-2">
      <section className="relative hidden min-h-[580px] overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-[#426c3f] p-10 text-white md:flex md:flex-col md:justify-between">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Leaf size={27} /></span><div><h1 className="text-xl font-extrabold">مشتل الزاهي</h1><p className="text-[10px] tracking-widest text-green-100/70">MASHTAL EZZAHI · TUNISIE</p></div></div>
        <div className="relative"><Sprout size={48} className="mb-5 text-green-200" /><h2 className="text-3xl font-extrabold leading-relaxed">{isFrench ? 'La gestion de votre pépinière, tout simplement.' : 'إدارة ذكية تنمّي مشتلَك كل يوم.'}</h2><p className="mt-4 max-w-sm text-sm leading-7 text-green-50/80">{isFrench ? 'Stock, ventes et production réunis dans un espace clair et sécurisé.' : 'مخزونك ومبيعاتك وإنتاجك في مساحة واحدة واضحة وآمنة.'}</p></div>
        <p className="relative text-xs text-green-100/60">© 2026 Mashtal Ezzahi</p>
      </section>
      <section className="flex min-h-[580px] flex-col justify-center p-7 sm:p-11">
        <div className="mb-10 flex items-center justify-between"><div className="flex items-center gap-3 md:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-white"><Leaf size={22} /></span><b className="text-slate-800 dark:text-white">مشتل الزاهي</b></div><button onClick={onLanguageChange} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-300">{isFrench ? 'العربية' : 'Français'}</button></div>
        <div><p className="mb-2 text-sm font-bold text-forest">{isFrench ? 'Espace professionnel' : 'مساحة العمل'}</p><h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">{isFrench ? 'Connexion' : 'تسجيل الدخول'}</h2><p className="mt-2 text-sm text-slate-400">{isFrench ? 'Connectez-vous pour accéder à votre pépinière.' : 'سجّل الدخول للمتابعة إلى لوحة المشتل.'}</p></div>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">{isFrench ? 'Adresse e-mail' : 'البريد الإلكتروني'}</span><span className="relative block"><Mail size={17} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" /><input autoComplete="username" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-3 text-sm outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></span></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">{isFrench ? 'Mot de passe' : 'كلمة المرور'}</span><span className="relative block"><LockKeyhole size={17} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" /><input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-3 text-sm outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></span></label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
          <button disabled={busy} className="h-12 w-full rounded-xl bg-forest text-sm font-extrabold text-white shadow-lg shadow-green-900/15 transition hover:bg-green-800 disabled:cursor-wait disabled:opacity-70">{busy ? (isFrench ? 'Connexion…' : 'جارٍ التحقق…') : (isFrench ? 'Se connecter' : 'دخول إلى النظام')}</button>
        </form>
        <p className="mt-7 text-center text-[11px] leading-5 text-slate-400">{isFrench ? 'Compte administrateur créé par la configuration initiale.' : 'حساب المدير يُنشأ عبر تهيئة النظام الآمنة.'}</p>
      </section>
    </div>
  </main>;
}
