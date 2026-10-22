import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Topbar } from '../../components/layout/Topbar';
import { IconEye, IconEyeOff, IconLock, IconMail } from '../../components/icons';
import { SESSION_EXPIRED_KEY } from '../../db';
import masterhudIconLg from '../../assets/masterhud-icon-lg.png';
import styles from './Login.module.css';

export function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_EXPIRED_KEY)) {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      setErro('Sua sessão expirou. Faça login novamente.');
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setCarregando(false);
    }
  };

  const handleForgotPassword = async () => {
    setErro(null);
    setAviso(null);
    if (!email) {
      setErro('Digite seu email acima para recuperar a senha.');
      return;
    }
    try {
      await resetPassword(email);
      setAviso('Enviamos um email com instruções para redefinir sua senha.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o email.');
    }
  };

  return (
    <div className={styles.page}>
      <Topbar />
      <main className={styles.content}>
        <section className={styles.login} aria-labelledby="login-title">
          <img src={masterhudIconLg} alt="" className={styles.login__mark} />
          <h1 className={styles.login__title} id="login-title">
            Entrar no MasterHUD
          </h1>

          <form className={styles.login__form} onSubmit={handleSubmit}>
            <div className={styles.login__fields}>
              <label className={styles.login__field}>
                <IconMail
                  className={`${styles.login__icon} ${styles['login__icon--left']}`}
                  aria-hidden="true"
                />
                <input
                  className={styles.login__input}
                  type="email"
                  name="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className={styles.login__field}>
                <IconLock
                  className={`${styles.login__icon} ${styles['login__icon--left']}`}
                  aria-hidden="true"
                />
                <input
                  className={styles.login__input}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className={styles.login__eyeButton}
                >
                  {showPassword ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
                </button>
              </label>
            </div>

            {erro && <p role="alert" className={styles.login__message}>{erro}</p>}
            {aviso && (
              <p role="status" className={`${styles.login__message} ${styles['login__message--success']}`}>
                {aviso}
              </p>
            )}

            <button
              type="button"
              className={styles.login__forgot}
              onClick={handleForgotPassword}
            >
              Esqueceu sua senha?
            </button>
            <button className={styles.login__button} type="submit" disabled={carregando}>
              {carregando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className={styles.login__divider} aria-hidden="true"></div>

          <footer className={styles.login__signup}>
            Não tem uma conta?&nbsp;
            <Link className={styles['login__signup-link']} to="/register">
              Cadastre-se
            </Link>
          </footer>
        </section>
      </main>
    </div>
  );
}
