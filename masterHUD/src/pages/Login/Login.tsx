import styles from './Login.module.css';

export function Login() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Adicionar lógica de login aqui
    console.log('Form submitted');
  };

  return (
    <main className={styles.page}>
      <section className={styles.login} aria-labelledby="login-title">
        <h1 className={styles.login__title} id="login-title">
          Login to Master Hud
        </h1>

        <form className={styles.login__form} onSubmit={handleSubmit}>
          <div className={styles.login__fields}>
            <label className={styles.login__field}>
              <img
                className={`${styles.login__icon} ${styles['login__icon--left']}`}
                src="https://www.figma.com/api/mcp/asset/8fcd7a6b-411e-4e60-88d1-2baafcdf2acf"
                alt="Email icon"
              />
              <input
                className={styles.login__input}
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="email"
              />
            </label>

            <label className={styles.login__field}>
              <img
                className={`${styles.login__icon} ${styles['login__icon--left']}`}
                src="https://www.figma.com/api/mcp/asset/369f0bcf-641c-44d1-8a9e-ab24521f5a14"
                alt="Password icon"
              />
              <input
                className={styles.login__input}
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="current-password"
              />
              <img
                className={`${styles.login__icon} ${styles['login__icon--right']}`}
                src="https://www.figma.com/api/mcp/asset/663f7d6c-da9a-4c87-ab54-d1c894ca00bc"
                alt="Password visibility icon"
              />
            </label>
          </div>

          <a className={styles.login__forgot} href="#">
            Forgot your password?
          </a>
          <button className={styles.login__button} type="submit">
            Login
          </button>
        </form>

        <div className={styles.login__divider} aria-hidden="true"></div>

        <footer className={styles.login__signup}>
          Don't have an account?&nbsp;
          <a className={styles.login__signup_link} href="#">
            Sign up
          </a>
        </footer>
      </section>
    </main>
  );
}
