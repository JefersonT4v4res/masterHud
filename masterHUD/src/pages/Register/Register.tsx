import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Topbar } from '../../components/layout/Topbar';
import { IconEye, IconEyeOff, IconLock, IconMail, IconUser } from '../../components/icons';
import { REGRAS_SENHA, senhaValida } from '../../utils/senha';
import masterhudIconLg from '../../assets/masterhud-icon-lg.png';
import styles from './Register.module.css';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro('Digite seu nome.');
      return;
    }
    if (password !== confirmPassword) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (!senhaValida(password)) {
      setErro('A senha não atende aos requisitos mínimos de segurança.');
      return;
    }

    setCarregando(true);
    try {
      await register(email, password, nome.trim());
      navigate('/');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className={styles.page}>
      <Topbar />
      <main className={styles.content}>
        <section className={styles.signup} aria-labelledby="signup-title">
          <img src={masterhudIconLg} alt="" className={styles.signup__mark} />
          <h1 className={styles.signup__title} id="signup-title">
            Criar conta
          </h1>

          <form className={styles.signup__form} onSubmit={handleSubmit}>
            <div className={styles.signup__fields}>
              <label className={styles.signup__field}>
                <IconUser
                  className={`${styles.signup__icon} ${styles['signup__icon--left']}`}
                  aria-hidden="true"
                />
                <input
                  className={styles.signup__input}
                  type="text"
                  name="name"
                  placeholder="Nome"
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </label>

              <label className={styles.signup__field}>
                <IconMail
                  className={`${styles.signup__icon} ${styles['signup__icon--left']}`}
                  aria-hidden="true"
                />
                <input
                  className={styles.signup__input}
                  type="email"
                  name="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className={styles.signup__field}>
                <IconLock
                  className={`${styles.signup__icon} ${styles['signup__icon--left']}`}
                  aria-hidden="true"
                />
                <input
                  className={styles.signup__input}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Senha"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className={styles.signup__eyeButton}
                >
                  {showPassword ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
                </button>
              </label>

              {password.length > 0 && (
                <ul className={styles.signup__rules}>
                  {REGRAS_SENHA.map((regra) => {
                    const ok = regra.valido(password);
                    return (
                      <li key={regra.id} className={ok ? styles['signup__rule--ok'] : styles['signup__rule--pending']}>
                        <span aria-hidden="true">{ok ? '✓' : '○'}</span> {regra.label}
                      </li>
                    );
                  })}
                </ul>
              )}

              <label className={styles.signup__field}>
                <IconLock
                  className={`${styles.signup__icon} ${styles['signup__icon--left']}`}
                  aria-hidden="true"
                />
                <input
                  className={styles.signup__input}
                  type={showPassword ? 'text' : 'password'}
                  name="confirm-password"
                  placeholder="Confirmar senha"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
            </div>

            {erro && <p role="alert" className={styles.signup__message}>{erro}</p>}

            <button className={styles.signup__button} type="submit" disabled={carregando}>
              {carregando ? 'Criando…' : 'Criar conta'}
            </button>
          </form>

          <div className={styles.signup__divider} aria-hidden="true"></div>

          <footer className={styles.signup__footer}>
            Já tem uma conta?&nbsp;
            <Link className={styles.signup__link} to="/login">
              Entrar
            </Link>
          </footer>
        </section>
      </main>
    </div>
  );
}
