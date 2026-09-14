import { useEffect, useState } from 'react'
import './App.css'

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type Action = 'hit' | 'stand' | 'double' | 'split'
type PracticeMode = 'decisions' | 'counting'

type Card = {
  rank: string
  value: number
  suit: Suit
}

const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const ranks = [
  ['A', 11], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6],
  ['7', 7], ['8', 8], ['9', 9], ['10', 10], ['J', 10], ['Q', 10], ['K', 10],
] as const

const suitSymbols: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
}

const actions: { id: Action; label: string; key: string }[] = [
  { id: 'hit', label: 'Hit', key: 'H' },
  { id: 'stand', label: 'Stand', key: 'S' },
  { id: 'double', label: 'Double', key: 'D' },
  { id: 'split', label: 'Split', key: 'P' },
]

function buildShoe(deckCount = 1) {
  return Array.from({ length: deckCount }, () => suits.flatMap((suit) => ranks.map(([rank, value]) => ({ rank, value, suit })))).flat()
}

function shuffle(cards: Card[]) {
  return [...cards].sort(() => Math.random() - 0.5)
}

function countValue(card: Card) {
  if (card.value >= 10 || card.rank === 'A') return -1
  if (card.value >= 2 && card.value <= 6) return 1
  return 0
}

function handValue(hand: Card[]) {
  let value = hand.reduce((total, card) => total + card.value, 0)
  let aces = hand.filter((card) => card.rank === 'A').length
  while (value > 21 && aces > 0) {
    value -= 10
    aces -= 1
  }
  return value
}

function handLabel(hand: Card[]) {
  const value = handValue(hand)
  const hasUsableAce = hand.some((card) => card.rank === 'A') && value <= 21 && hand.reduce((sum, card) => sum + card.value, 0) !== value
  return hasUsableAce ? `Soft ${value}` : `${value}`
}

function getBasicStrategy(player: Card[], dealer: Card): Action {
  const value = handValue(player)
  const isPair = player.length === 2 && player[0].value === player[1].value
  const hasUsableAce = player.some((card) => card.rank === 'A') && player.reduce((sum, card) => sum + card.value, 0) === value + 10
  const dealerValue = dealer.value === 11 ? 11 : dealer.value

  if (isPair) {
    const pairRank = player[0].rank
    if (pairRank === 'A' || pairRank === '8') return 'split'
    if (pairRank === '9' && dealerValue !== 7 && dealerValue !== 10 && dealerValue !== 11) return 'split'
    if (pairRank === '7' || pairRank === '3' || pairRank === '2') return dealerValue <= 7 ? 'split' : 'hit'
    if (pairRank === '6') return dealerValue >= 2 && dealerValue <= 6 ? 'split' : 'hit'
    if (pairRank === '4') return dealerValue === 5 || dealerValue === 6 ? 'split' : 'hit'
    if (pairRank === '10' || pairRank === 'J' || pairRank === 'Q' || pairRank === 'K') return 'stand'
  }
  if (hasUsableAce && player.length === 2) {
    if (value >= 19) return 'stand'
    if (value === 18) return dealerValue >= 9 ? 'hit' : 'stand'
    if (value === 17 || value === 16) return dealerValue >= 3 && dealerValue <= 6 ? 'double' : 'hit'
    return dealerValue >= 5 && dealerValue <= 6 ? 'double' : 'hit'
  }
  if (value >= 17) return 'stand'
  if (value >= 13) return dealerValue >= 2 && dealerValue <= 6 ? 'stand' : 'hit'
  if (value === 12) return dealerValue >= 4 && dealerValue <= 6 ? 'stand' : 'hit'
  if (value === 11) return player.length === 2 ? 'double' : 'hit'
  if (value === 10) return player.length === 2 && dealerValue <= 9 ? 'double' : 'hit'
  if (value === 9) return player.length === 2 && dealerValue >= 3 && dealerValue <= 6 ? 'double' : 'hit'
  return 'hit'
}

function getDecisionReason(player: Card[], dealer: Card, chosen: Action, recommended: Action) {
  const playerTotal = handLabel(player)
  const dealerCard = `${dealer.rank}${suitSymbols[dealer.suit]}`
  if (chosen === 'split') return `You have a pair against the dealer's ${dealerCard}. Basic strategy says to ${recommended} with ${playerTotal}.`
  if (chosen === 'double') return `Doubling commits another bet for one card. With ${playerTotal} against ${dealerCard}, basic strategy says to ${recommended}.`
  if (chosen === 'stand') return `Standing keeps ${playerTotal}. Against the dealer's ${dealerCard}, basic strategy says to ${recommended} to improve your expected result.`
  return `Hitting risks another card with ${playerTotal}. Against the dealer's ${dealerCard}, basic strategy says to ${recommended}.`
}

function CardView({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  return hidden ? <div className="playing-card card-back"><span>♠</span></div> : (
    <div className={`playing-card ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : ''}`}>
      <div className="card-corner">{card.rank}<span>{suitSymbols[card.suit]}</span></div>
      <div className="card-suit">{suitSymbols[card.suit]}</div>
      <div className="card-corner bottom">{card.rank}<span>{suitSymbols[card.suit]}</span></div>
    </div>
  )
}

function App() {
  const [deckCount, setDeckCount] = useState(6)
  const [nextDelay, setNextDelay] = useState(2)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('decisions')
  const [flashSpeed, setFlashSpeed] = useState(1000)
  const [countCardTotal, setCountCardTotal] = useState(10)
  const [flashCards, setFlashCards] = useState<Card[]>([])
  const [flashIndex, setFlashIndex] = useState(0)
  const [flashing, setFlashing] = useState(false)
  const [countInput, setCountInput] = useState('')
  const [countResult, setCountResult] = useState<boolean | null>(null)
  const [shoe, setShoe] = useState<Card[]>(() => shuffle(buildShoe(6)))
  const [player, setPlayer] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [feedback, setFeedback] = useState<{ action: Action; correct: boolean } | null>(null)
  const [rounds, setRounds] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)

  function deal() {
    let nextShoe = shoe.length < 10 ? shuffle(buildShoe(deckCount)) : [...shoe]
    const nextPlayer = [nextShoe.pop()!, nextShoe.pop()!]
    const nextDealer = [nextShoe.pop()!, nextShoe.pop()!]
    setShoe(nextShoe)
    setPlayer(nextPlayer)
    setDealer(nextDealer)
    setFeedback(null)
  }

  function chooseAction(action: Action) {
    if (!player.length || feedback) return
    const isCorrect = action === getBasicStrategy(player, dealer[0])
    setFeedback({ action, correct: isCorrect })
    setRounds((current) => current + 1)
    setCorrect((current) => current + (isCorrect ? 1 : 0))
    setStreak((current) => isCorrect ? current + 1 : 0)
    window.setTimeout(deal, nextDelay * 1000)
  }

  function updateDeckCount(value: number) {
    setDeckCount(value)
    setShoe(shuffle(buildShoe(value)))
    setPlayer([])
    setDealer([])
    setFeedback(null)
  }

  const accuracy = rounds ? Math.round((correct / rounds) * 100) : 0
  const recommended = player.length ? getBasicStrategy(player, dealer[0]) : null
  const targetCount = flashCards.reduce((total, card) => total + countValue(card), 0)

  useEffect(() => {
    if (!flashing) return
    if (flashIndex >= flashCards.length) {
      setFlashing(false)
      return
    }
    const timer = window.setTimeout(() => setFlashIndex((current) => current + 1), flashSpeed)
    return () => window.clearTimeout(timer)
  }, [flashing, flashIndex, flashCards.length, flashSpeed])

  function startCountingRound() {
    const sequence = shuffle(buildShoe(deckCount)).slice(0, Math.max(5, countCardTotal))
    setFlashCards(sequence)
    setFlashIndex(0)
    setCountInput('')
    setCountResult(null)
    setFlashing(true)
  }

  function verifyCount() {
    if (flashing || !flashCards.length || countInput.trim() === '') return
    setCountResult(Number(countInput) === targetCount)
  }

  function resetCountingSetup() {
    setFlashing(false)
    setFlashCards([])
    setFlashIndex(0)
    setCountInput('')
    setCountResult(null)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">♠</span><span>DEALER'S<br /><strong>EDGE</strong></span></div>
        <div className="trainer-tag"><span className="live-dot" /> PRACTICE MODE</div>
        <div className="top-actions"><span className="shoe-count">♣ {shoe.length} cards</span><button className="icon-button" aria-label="Settings" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>⚙</button></div>
        {settingsOpen && <div className="settings-panel"><div className="settings-title">TABLE SETTINGS</div><label>DECKS IN SHOE<select value={deckCount} onChange={(event) => updateDeckCount(Number(event.target.value))}><option value={1}>1 deck</option><option value={2}>2 decks</option><option value={4}>4 decks</option><option value={6}>6 decks</option><option value={8}>8 decks</option></select></label><label>NEXT HAND DELAY<select value={nextDelay} onChange={(event) => setNextDelay(Number(event.target.value))}><option value={2}>2 seconds</option><option value={4}>4 seconds</option><option value={6}>6 seconds</option></select></label><label>CARD FLASH SPEED<select value={flashSpeed} onChange={(event) => setFlashSpeed(Number(event.target.value))}><option value={500}>500 ms</option><option value={1000}>1 second</option><option value={2000}>2 seconds</option></select></label></div>}
      </header>

      <section className="stats-bar">
        <div><span className="stat-label">SESSION ACCURACY</span><strong>{accuracy}%</strong></div>
        <div><span className="stat-label">CURRENT STREAK</span><strong>{streak} <small>hands</small></strong></div>
        <div><span className="stat-label">HANDS PLAYED</span><strong>{rounds}</strong></div>
        <div className="progress-wrap"><div className="progress-label"><span>SESSION PROGRESS</span><span>{rounds} / 20</span></div><div className="progress"><span style={{ width: `${Math.min(rounds / 20 * 100, 100)}%` }} /></div></div>
      </section>

      <section className="practice-area">
        <div className="mode-switch"><button className={practiceMode === 'decisions' ? 'active' : ''} onClick={() => setPracticeMode('decisions')}>DECISION TRAINER</button><button className={practiceMode === 'counting' ? 'active' : ''} onClick={() => setPracticeMode('counting')}>CARD COUNTING</button></div>

        {practiceMode === 'decisions' ? <>
          <div className="section-heading"><div><span className="eyebrow">DECISION TRAINER</span><h1>Make the right move.</h1></div><span className="round-pill">ROUND {String(rounds + 1).padStart(2, '0')}</span></div>

        <div className={`feedback top-feedback ${feedback ? 'visible' : 'idle'} ${feedback?.correct ? 'good' : feedback ? 'bad' : ''}`}><span className="feedback-icon">{feedback?.correct ? '✓' : feedback ? '!' : '•'}</span><div><strong>{feedback ? (feedback.correct ? 'Excellent decision.' : `The correct move is ${recommended?.toUpperCase()}.`) : 'Ready when you are.'}</strong><p>{feedback ? (feedback.correct ? 'That is the basic strategy play for this hand.' : getDecisionReason(player, dealer[0], feedback.action, recommended!)) : 'Use basic strategy to build your instincts.'}</p></div>{feedback && <button onClick={deal}>DEAL NOW <span>→</span></button>}</div>

        <div className="table">
          <div className="table-felt-glow" />
          <div className="dealer-zone"><div className="zone-label">DEALER <span>UP CARD</span></div><div className="cards-row">{dealer.length ? <><CardView card={dealer[0]} /><CardView card={dealer[1]} hidden /></> : <span className="empty-state">Deal a hand to begin</span>}</div></div>
          <div className="table-divider"><span>◆</span><i /><span>◆</span></div>
          <div className="player-zone"><div className="zone-label">YOUR HAND <span>{player.length ? handLabel(player) : '--'}</span></div><div className="cards-row">{player.map((card, index) => <CardView card={card} key={`${card.rank}-${card.suit}-${index}`} />)}</div></div>
          {!player.length && <button className="deal-button" onClick={deal}>DEAL NEW HAND <span>→</span></button>}
        </div>

        <div className="decision-panel">
          <div className="decision-copy"><span className="eyebrow">WHAT'S YOUR MOVE?</span><p>Choose the optimal play for this situation.</p></div>
          <div className="action-grid">{actions.map(({ id, label, key }) => <button className={`action-button ${feedback?.action === id ? (feedback.correct ? 'selected-correct' : 'selected-wrong') : ''}`} disabled={!player.length || Boolean(feedback)} key={id} onClick={() => chooseAction(id)}><span className="action-key">{key}</span><span>{label}</span></button>)}</div>
        </div>
        </> : <>
          <div className="section-heading"><div><span className="eyebrow">CARD COUNTING</span><h1>Keep the count.</h1></div><span className="round-pill">HI-LO SYSTEM</span></div>
          <div className="counting-table">
            <div className="counting-instruction">{flashing ? 'Watch the cards.' : flashCards.length ? 'What is the running count?' : 'Set your round, then start counting.'}</div>
            <div className="flash-card-stage">{flashing && flashCards[flashIndex] ? <CardView card={flashCards[flashIndex]} /> : flashCards.length ? <span className="count-hidden">CARDS HIDDEN</span> : <span className="count-hidden">READY</span>}</div>
            <div className="flash-progress">{flashCards.length ? `${Math.min(flashIndex + (flashing ? 1 : 0), flashCards.length)} / ${flashCards.length} cards` : 'Ready to begin'}</div>
            {!flashing && !countResult && <div className="count-controls">{!flashCards.length && <><label>CARDS<input aria-label="Number of cards" type="number" min="5" step="1" value={countCardTotal} onChange={(event) => setCountCardTotal(Math.max(5, Number(event.target.value) || 5))} /></label><label>FLASH TIME<select aria-label="Flash time" value={flashSpeed} onChange={(event) => setFlashSpeed(Number(event.target.value))}><option value={500}>500 ms</option><option value={1000}>1 second</option><option value={2000}>2 seconds</option></select></label><button className="deal-button count-start" onClick={startCountingRound}>START ROUND <span>→</span></button></>}{flashCards.length > 0 && <><input aria-label="Running count" type="number" value={countInput} onChange={(event) => setCountInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && verifyCount()} placeholder="0" /><span className="enter-hint">PRESS ENTER TO VERIFY</span></>}</div>}
            {countResult !== null && <div className={`count-result ${countResult ? 'good' : 'bad'}`}><strong>{countResult ? 'Correct count.' : `The count was ${targetCount > 0 ? '+' : ''}${targetCount}.`}</strong><span>{countResult ? 'Your Hi-Lo running count is accurate.' : 'Remember: 2–6 is +1, 7–9 is 0, and 10–A is -1.'}</span><button onClick={resetCountingSetup}>RESTART <span>↻</span></button></div>}
          </div>
        </>}

      </section>
      <footer><span>✦ {practiceMode === 'counting' ? 'HI-LO COUNTING' : 'BASIC STRATEGY'}</span><span>{deckCount}-DECK SHOE</span><span>{practiceMode === 'counting' ? '10 CARD FLASH ROUND' : 'DEALER STANDS ON 17'}</span></footer>
    </main>
  )
}

export default App