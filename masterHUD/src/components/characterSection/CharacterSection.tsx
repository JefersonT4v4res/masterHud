import styles from './CharacterSection.module.css'
import CharacterCard from './CharacterCard'
import type { Character } from '../../types/Character'

interface Props {
  title: string
  count: number
  limit: number
  onInvite?: () => void
  characters: Character[]
}

export default function CharacterSection({
  title,
  count,
  limit,
  onInvite,
  characters,
}: Props) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span className={styles.arrow}>▲</span>
          <h2>
            {title} <small>({count}/{limit})</small>
          </h2>
        </div>

        {onInvite && (
          <button className={styles.inviteButton} onClick={onInvite}>
            + Convidar jogador
          </button>
        )}
      </header>

      <div className={styles.cards}>
        {characters.map((char) => (
          <CharacterCard key={char.id} character={char} />
        ))}
      </div>
    </section>
  )
}