import { useState } from 'react'
import type { Character } from '../../types/Character'
import type { ChangeEvent } from 'react'
import styles from './CreateCharacterModal.module.css'

interface Props {
  onCreate: (character: Character) => void
  onClose: () => void
}

const CreateCharacterModal = ({ onCreate, onClose }: Props) => {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [race, setRace] = useState('')
  const [charClass, setCharClass] = useState('')

  function handleCreate() {
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name,
      username,
      level: 1,
      race,
      class: charClass,
      avatar: '/avatars/default.png',
    }

    onCreate(newCharacter)
    onClose()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Criar personagem</h2>

        <input
          placeholder="Nome"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.currentTarget.value)}
        />

        <input
          placeholder="Usuário"
          value={username}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.currentTarget.value)}
        />

        <input
          placeholder="Raça"
          value={race}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setRace(e.currentTarget.value)}
        />

        <input
          placeholder="Classe"
          value={charClass}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCharClass(e.currentTarget.value)}
        />

        <div className={styles.actions}>
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleCreate}>Criar</button>
        </div>
      </div>
    </div>
  )
}

export default CreateCharacterModal
