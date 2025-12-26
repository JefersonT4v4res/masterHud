import { useState } from 'react'
import CharacterSection from '../../components/characterSection/CharacterSection'
import Header from '../../components/header/header'
import type { Character } from '../../types/Character'
import CreateCharacterModal from '../../components/CreateCharacterModal/CreateCharacterModal'

export const Dashboard = () => {
  const [creating, setCreating] = useState<'player' | 'npc' | null>(null)

  const [players, setPlayers] = useState<Character[]>([
    {
      id: '1',
      name: 'Ícaro',
      username: 'icaro',
      level: 1,
      race: 'Humano',
      class: 'Guerreiro',
      avatar: '../../src/assets/avatars/ícaro.png',
    },
    {
      id: '2',
      name: 'Rômulo',
      username: 'romulo',
      level: 1,
      race: 'Humano',
      class: 'Guerreiro',
      avatar: '../../src/assets/avatars/Rômulo.png',
    },
    {
      id: '3',
      name: 'Duda',
      username: 'duda',
      level: 1,
      race: 'Humano',
      class: 'Guerreiro',
      avatar: '../../src/assets/avatars/Duda.png',
    },
  ])

  const [npcs, setNpcs] = useState<Character[]>([])

  return (
    <main>
      <Header />

      <CharacterSection
        title="Jogadores"
        count={players.length}
        limit={10}
        onInvite={() => setCreating('player')}
        characters={players}
      />

      <CharacterSection
        title="NPCs"
        count={npcs.length}
        limit={99}
        onInvite={() => setCreating('npc')}
        characters={npcs}
      />

      {creating && (
        <CreateCharacterModal
          onCreate={(char) => {
            creating === 'player'
              ? setPlayers((prev) => [...prev, char])
              : setNpcs((prev) => [...prev, char])
            setCreating(null)
          }}
          onClose={() => setCreating(null)}
        />
      )}
    </main>
  )
}