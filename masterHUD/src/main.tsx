import { render } from 'preact'
import { App } from './app.tsx'

import './styles/reset.css'
import './styles/variables.css'
import './styles/global.css'

render(<App />, document.getElementById('app')!)
