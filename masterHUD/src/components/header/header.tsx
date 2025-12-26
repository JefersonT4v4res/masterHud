import { NavLink } from 'react-router-dom'
import styles from './Header.module.css'
import logo from '../../assets/logo_MasterHud.png'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logoArea}>
        <img src={logo} alt="Logo" />
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? styles.active : undefined
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/combate"
          className={({ isActive }) =>
            isActive ? styles.active : undefined
          }
        >
          Combate
        </NavLink>
      </nav>
    </header>
  )
}