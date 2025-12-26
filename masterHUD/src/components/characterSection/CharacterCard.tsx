import styles from './CharacterSection.module.css'
import type { Character } from '../../types/Character'

export default function CharacterCard({ character }: { character: Character }) {
  return (
    <div className={styles.card}>
      <span className={styles.username}>@{character.username}</span>

      <div className={styles.cardContent}>
        <img src={character.avatar} alt={character.name} />

        <div>
          <h3>{character.name}</h3>
          <p>
            Level {character.level} | {character.race} | {character.class}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <button>Chat</button>
        <button>Ver</button>
        <button>Editar</button>
        <button className={styles.delete}>Deletar</button>
      </div>
    </div>
  )
}