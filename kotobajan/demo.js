// ことば雀の紹介ページで、牌を触って試せるようにする（hiragana-mahjong #74）。
// ロゴの こ・と・ば、牌の並べ替えのミニデモ、並べ替えパズルの1問のお試し。
// 入れ替えの手触り（ドラッグして重ねるか、2枚を続けてタップ）・光り方・音はアプリに合わせる
// （hiragana-mahjong の src/ui/TitleLogo.tsx・index.css・sound.ts）。
// 語のデータ（demo-data.js）と役の判定（yaku.js）は、hiragana-mahjong の tools/site/export.ts で書き出したもの
import data from './demo-data.js'
import { createCategoryLookup, evaluateYaku } from './yaku.js'

const SLOT_SIZES = [2, 3, 3, 3, 3]
// これより動かしたらドラッグとみなす（タップの指のぶれと区別する。アプリと同じ）
const DRAG_THRESHOLD_PX = 8
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const lookup = createCategoryLookup({
  categories: data.categories,
  words: Object.fromEntries(Object.entries(data.words).map(([w, [, smalls]]) => [w, smalls])),
})
const isWord = (w) => Object.hasOwn(data.words, w)
/** 表記の札の文字（2つまで並べ、多ければ「…」で省く）。表記がなければ null */
function spellingLabel(w) {
  const list = data.words[w]?.[0] ?? []
  if (list.length === 0) return null
  return list.length <= 2 ? list.join('・') : `${list.slice(0, 2).join('・')}…`
}

/* 画面の文。置いた所の言語（lang）で選ぶ。英語の文はアプリの英語の画面（hiragana-mahjong の src/ui/text.ts）に合わせる */

const TEXTS = {
  ja: {
    category: (name) => name,
    soundOn: '音：あり',
    soundOff: '音：なし',
    reset: '最初の並びに戻す',
    words: (n) => `単語になった枠 ${n} / 5`,
    win: 'アガリ！',
    noYaku: '同じ分類の単語を揃えると、役が付きます',
    yaku: (name, count, value) => `${name}×${count} ${value}`,
    yakuJoin: '・',
    han: (n) => `${n}翻`,
    yakuman: (n) => (n > 1 ? 'ダブル役満' : '役満'),
    originalTag: '元の語',
    hint: 'ヒント',
    hintCategory: (category) => `ヒント: 5つとも「${category}」の単語で作れます`,
    noHint: 'ヒントなし',
    perfect: (category) => `★ 5つとも「${category}」`,
    answers: (n) => `身近な語で作れる答えは ${n} 通りあります`,
  },
  en: {
    category: (name) => data.categoryNamesEn[name] ?? name,
    soundOn: 'Sound: On',
    soundOff: 'Sound: Off',
    reset: 'Start Over',
    words: (n) => `Words: ${n} / 5`,
    win: 'Win!',
    noYaku: 'Collect words from the same category to score yaku',
    yaku: (name, count, value) => `${name} ×${count} ${value}`,
    yakuJoin: ', ',
    han: (n) => `${n} han`,
    yakuman: (n) => (n > 1 ? 'Double Yakuman' : 'Yakuman'),
    originalTag: 'Original',
    hint: 'Hint',
    hintCategory: (category) => `Hint: all five can come from ${category}`,
    noHint: 'No hints',
    perfect: (category) => `★ All ${category}`,
    answers: (n) => `There are ${n} answers with familiar words`,
  },
}
const textFor = (el) => (el.closest('[lang]')?.lang.startsWith('en') ? TEXTS.en : TEXTS.ja)

/* 音。アプリと同じく Web Audio で合成する。鳴らすかは、この端末に覚える */

const SOUND_KEY = 'kotobajan-sound'
let soundOn = true
try {
  soundOn = localStorage.getItem(SOUND_KEY) !== 'off'
} catch {
  // 覚えられなくても、鳴らす
}
let audio = null

function getAudio() {
  if (!soundOn) return null
  try {
    if (audio === null) {
      const ctx = new AudioContext()
      const out = ctx.createGain()
      out.gain.value = 0.6
      out.connect(ctx.destination)
      const noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
      const ch = noise.getChannelData(0)
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1
      audio = { ctx, out, noise }
    }
    if (audio.ctx.state === 'suspended') void audio.ctx.resume()
    return audio
  } catch {
    return null
  }
}
// 触れたときに鳴らす準備をする（iPhone の制限）
document.addEventListener('pointerdown', () => void getAudio(), { capture: true, passive: true })

/** 牌が当たる音 */
function click(a, at, freq, gain, decay) {
  const src = a.ctx.createBufferSource()
  src.buffer = a.noise
  const band = a.ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = freq
  band.Q.value = 2.5
  const env = a.ctx.createGain()
  env.gain.setValueAtTime(gain, at)
  env.gain.exponentialRampToValueAtTime(0.001, at + decay)
  src.connect(band).connect(env).connect(a.out)
  src.start(at)
  src.stop(at + decay + 0.02)
}

/** 音程のある音。bell なら倍音を足して鈴のように */
function tone(a, at, freq, gain, decay, type = 'sine', bell = false) {
  const partials = bell ? [[1, 1], [2.76, 0.3], [5.4, 0.1]] : [[1, 1]]
  for (const [ratio, level] of partials) {
    const osc = a.ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq * ratio
    const env = a.ctx.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(gain * level, at + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay)
    osc.connect(env).connect(a.out)
    osc.start(at)
    osc.stop(at + decay + 0.02)
  }
}

const C5 = 523.25
const E5 = 659.25
const G5 = 783.99
const C6 = 1046.5
const E6 = 1318.5
const G6 = 1568
const C7 = 2093
// パズルが解けたとき、枠を1つずつ光らせながら上がる音（ド・ミ・ソ・ド・ミ）
const CLEAR_NOTES = [C5, E5, G5, C6, E6]

/** place: 牌を置いた、word: 単語ができた、win: アガリ、yakuman: 役満、step: 解けた枠（step 番目） */
function playSound(kind, step = 0) {
  const a = getAudio()
  if (a === null) return
  const t = a.ctx.currentTime + 0.005
  switch (kind) {
    case 'place':
      click(a, t, 2600, 0.35, 0.045)
      tone(a, t, 220, 0.08, 0.05)
      return
    case 'word':
      tone(a, t, C6, 0.16, 0.35, 'sine', true)
      tone(a, t + 0.07, E6, 0.14, 0.45, 'sine', true)
      return
    case 'win':
      for (const [i, f] of [C5, E5, G5, C6].entries()) tone(a, t + i * 0.08, f, 0.16, 0.6, 'triangle', true)
      for (const f of [C6, E6, G6]) tone(a, t + 0.36, f, 0.08, 1.2, 'sine', true)
      return
    case 'yakuman':
      for (const [i, f] of [C5, E5, G5, C6, E6, G6, C7].entries()) tone(a, t + i * 0.06, f, 0.14, 0.7, 'triangle', true)
      for (const f of [C6, E6, G6]) {
        tone(a, t + 0.45, f, 0.09, 1.8, 'sine', true)
        tone(a, t + 0.75, f, 0.06, 1.6, 'sine', true)
      }
      return
    case 'step':
      tone(a, t, CLEAR_NOTES[step], 0.15, 0.4, 'triangle', true)
      return
  }
}

/** 音の切り替えのボタン（ページの中のどれを押しても、全部そろえて切り替わる） */
function soundButton(t) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'sound-toggle'
  button.dataset.sound = ''
  const update = (b) => {
    b.setAttribute('aria-pressed', String(soundOn))
    b.textContent = soundOn ? b.dataset.on : b.dataset.off
  }
  button.dataset.on = t.soundOn
  button.dataset.off = t.soundOff
  update(button)
  button.addEventListener('click', () => {
    soundOn = !soundOn
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off')
    } catch {
      // 覚えられなくても、今のページでは効いている
    }
    for (const b of document.querySelectorAll('[data-sound]')) update(b)
  })
  return button
}

/* 牌の入れ替え。root の中の data-i の付いた牌を、ドラッグして重ねるか、2枚を続けてタップして入れ替える */

function swappable(root, { onSwap, onPress }) {
  let selected = null
  let pressed = null
  let ghost = null
  let over = null
  // ドラッグの直後に続けて来るクリックを、タップとして扱わない
  let suppressClick = false
  let enabled = true

  const tileEl = (i) => root.querySelector(`[data-i="${i}"]`)
  const tileAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-i]')
    return el && root.contains(el) ? Number(el.dataset.i) : null
  }
  const setSelected = (i) => {
    if (selected !== null) tileEl(selected)?.classList.remove('selected')
    selected = i
    if (i !== null) tileEl(i)?.classList.add('selected')
  }
  const setOver = (i) => {
    if (over !== null) tileEl(over)?.classList.remove('drop-target')
    over = i
    if (i !== null) tileEl(i)?.classList.add('drop-target')
  }
  const endDrag = () => {
    ghost?.remove()
    ghost = null
    setOver(null)
    if (pressed !== null) tileEl(pressed.from)?.classList.remove('dragging')
    pressed = null
  }

  root.addEventListener('pointerdown', (e) => {
    if (!enabled || e.button !== 0) return
    const t = e.target.closest('[data-i]')
    if (t === null || !root.contains(t)) return
    pressed = { from: Number(t.dataset.i), x: e.clientX, y: e.clientY, dragging: false }
    onPress?.()
  })
  window.addEventListener('pointermove', (e) => {
    const p = pressed
    if (p === null) return
    if (!p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD_PX) return
    if (!p.dragging) {
      p.dragging = true
      setSelected(null)
      const source = tileEl(p.from)
      source.classList.add('dragging')
      // 指に付いてくる牌。元の牌の大きさをそのまま写す（大きさの変数は置き場所で変わるため）
      ghost = source.cloneNode(true)
      ghost.removeAttribute('data-i')
      ghost.classList.remove('dragging', 'selected', 'wobble')
      ghost.classList.add('drag-ghost')
      ghost.style.setProperty('--tile-w', `${source.getBoundingClientRect().width}px`)
      ghost.setAttribute('aria-hidden', 'true')
      document.body.append(ghost)
    }
    ghost.style.left = `${e.clientX}px`
    ghost.style.top = `${e.clientY}px`
    const to = tileAt(e.clientX, e.clientY)
    setOver(to === p.from ? null : to)
  })
  const up = (e) => {
    const p = pressed
    if (p?.dragging) {
      suppressClick = true
      setTimeout(() => {
        suppressClick = false
      }, 0)
      const to = e.type === 'pointerup' ? tileAt(e.clientX, e.clientY) : null
      endDrag()
      if (to !== null && to !== p.from) onSwap(p.from, to)
      return
    }
    pressed = null
  }
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)

  // タップ: 1枚目を選び（持ち上がる）、2枚目で入れ替える。同じ牌をもう一度押すとやめる
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-i]')
    if (!enabled || suppressClick || t === null || !root.contains(t)) return
    const i = Number(t.dataset.i)
    if (selected === null) setSelected(i)
    else if (selected === i) setSelected(null)
    else {
      const from = selected
      selected = null
      onSwap(from, i)
    }
  })

  return {
    /** 牌を作り直した後に、選んだ印を付け直す */
    refresh: () => setSelected(selected),
    setEnabled: (on) => {
      enabled = on
      if (!on) {
        endDrag()
        setSelected(null)
      }
    },
    isBusy: () => selected !== null || pressed !== null,
  }
}

/** 2・3・3・3・3 の枠の文字列に分ける */
function slotTexts(chars) {
  const texts = []
  let at = 0
  for (const size of SLOT_SIZES) {
    texts.push(chars.slice(at, at + size).join(''))
    at += size
  }
  return texts
}

/* ロゴの こ・と・ば。ときどきぷるっと震え、入れ替えて単語（ことば・こばと）になれば光って表記の札が付く。
   一度でも動かすまでは、ことば の札を出さずにふつうのロゴとして見せる */

function mountLogo() {
  const logo = document.querySelector('.logo')
  const tiles = logo?.querySelector('.logo-tiles')
  if (!tiles) return
  let order = [...data.logo]
  let touched = false
  let wobbleTimer = 0

  const render = (placed = []) => {
    const word = order.join('')
    const lit = touched && isWord(word)
    tiles.classList.toggle('word', lit)
    tiles.replaceChildren(
      ...order.map((c, i) => {
        const el = document.createElement('span')
        el.className = `tile${placed.includes(i) ? ' placed' : ''}`
        el.dataset.i = String(i)
        el.textContent = c
        return el
      }),
    )
    const label = lit ? spellingLabel(word) : null
    if (label !== null) {
      const tag = document.createElement('span')
      tag.className = 'spelling-tag'
      tag.textContent = label
      tiles.prepend(tag)
    }
  }

  const swap = swappable(tiles, {
    onSwap: (a, b) => {
      ;[order[a], order[b]] = [order[b], order[a]]
      touched = true
      render([a, b])
      swap.refresh()
      playSound(isWord(order.join('')) ? 'word' : 'place')
    },
  })

  // ときどき1枚がぷるっと震える。触っている間は震えない
  const scheduleWobble = () => {
    clearTimeout(wobbleTimer)
    wobbleTimer = setTimeout(
      () => {
        if (!swap.isBusy() && !document.hidden) {
          const el = tiles.querySelector(`[data-i="${Math.floor(Math.random() * order.length)}"]`)
          el?.classList.add('wobble')
          setTimeout(() => el?.classList.remove('wobble'), 600)
        }
        scheduleWobble()
      },
      3000 + Math.random() * 3000,
    )
  }
  render()
  if (!reducedMotion) scheduleWobble()
}

/* 手牌の枠（ミニデモとパズルで使う） */

function mountBoard(el, { tiles, originals = [], originalTag = '', onChange }) {
  const start = [...tiles]
  let chars = [...start]
  let wordSlots = new Set()
  const hand = document.createElement('div')
  hand.className = 'hand'
  el.append(hand)

  const render = (placed = []) => {
    const texts = slotTexts(chars)
    const nextWords = new Set()
    let at = 0
    hand.replaceChildren(
      ...texts.map((text, s) => {
        const slot = document.createElement('div')
        slot.className = 'slot'
        slot.dataset.slot = String(s)
        const original = originals.includes(text)
        if (original) {
          slot.classList.add('original')
          const tag = document.createElement('span')
          tag.className = 'spelling-tag original-tag'
          tag.textContent = originalTag
          slot.append(tag)
        } else if (isWord(text)) {
          nextWords.add(s)
          slot.classList.add('word')
          // 新しく単語になった枠だけ、ふくらんで光る
          if (!wordSlots.has(s)) slot.classList.add('word-new')
          const label = spellingLabel(text)
          if (label !== null) {
            const tag = document.createElement('span')
            tag.className = 'spelling-tag'
            tag.textContent = label
            slot.append(tag)
          }
        }
        for (const c of text) {
          const tile = document.createElement('button')
          tile.type = 'button'
          tile.className = `board-tile${placed.includes(at) ? ' placed' : ''}`
          tile.dataset.i = String(at)
          tile.textContent = c
          slot.append(tile)
          at++
        }
        return slot
      }),
    )
    const madeWord = [...nextWords].some((s) => !wordSlots.has(s))
    wordSlots = nextWords
    return madeWord
  }

  const swap = swappable(hand, {
    onSwap: (a, b) => {
      ;[chars[a], chars[b]] = [chars[b], chars[a]]
      const madeWord = render([a, b])
      swap.refresh()
      onChange(slotTexts(chars), madeWord)
    },
  })
  render()

  return {
    hand,
    texts: () => slotTexts(chars),
    reset: () => {
      chars = [...start]
      wordSlots = new Set()
      render()
      swap.setEnabled(true)
    },
    lock: () => swap.setEnabled(false),
  }
}

/** ボタン */
function button(label, onClick, className = 'board-button') {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = className
  b.textContent = label
  b.addEventListener('click', onClick)
  return b
}

/** 役の文（果物×5 ダブル役満、果物×3 4翻・色×2 2翻） */
function yakuText(words, t) {
  const yaku = evaluateYaku(words, lookup)
  const groups = yaku.groups.map((g) =>
    t.yaku(t.category(g.small ?? g.big), g.words.length, g.yakuman > 0 ? t.yakuman(g.yakuman) : t.han(g.han)),
  )
  return { yaku, text: groups.join(t.yakuJoin) }
}

/* ミニデモ。牌を入れ替えて、5つの枠をすべて単語にすればアガリ。役も付ける */

function mountDemo(root) {
  const t = textFor(root)
  const boardEl = root.querySelector('.board')
  const status = root.querySelector('.board-status')
  const board = mountBoard(boardEl, {
    tiles: data.demo,
    onChange: (texts, madeWord) => {
      const words = texts.filter(isWord).length
      if (words === texts.length) {
        const { yaku, text } = yakuText(texts, t)
        board.hand.classList.add('won')
        board.lock()
        playSound(yaku.yakuman > 0 ? 'yakuman' : 'win')
        status.replaceChildren(
          Object.assign(document.createElement('strong'), { className: yaku.yakuman > 0 ? 'win yakuman' : 'win', textContent: t.win }),
          document.createTextNode(text === '' ? t.noYaku : text),
        )
        return
      }
      playSound(madeWord ? 'word' : 'place')
      status.textContent = t.words(words)
    },
  })
  const reset = () => {
    board.hand.classList.remove('won')
    board.reset()
    status.textContent = t.words(0)
  }
  status.textContent = t.words(0)
  root.querySelector('.board-controls').append(button(t.reset, () => reset()), soundButton(t))
}

/* 並べ替えパズルの1問。元の5語を1つも使わずに、別の5語を作る。ヒントは1つ目（分類）だけ見られる */

function mountPuzzle(root) {
  const t = textFor(root)
  const p = data.puzzle
  const boardEl = root.querySelector('.board')
  const hint = root.querySelector('.puzzle-hint')
  const clear = root.querySelector('.puzzle-clear')
  let hinted = false
  let timers = []

  root.querySelector('.puzzle-original').append(
    ...p.words.map((w) => Object.assign(document.createElement('span'), { className: 'puzzle-original-word', textContent: w })),
  )

  const board = mountBoard(boardEl, {
    tiles: p.words.join(''),
    originals: p.words,
    originalTag: t.originalTag,
    onChange: (texts, madeWord) => {
      const solved = texts.every((w) => isWord(w) && !p.words.includes(w))
      if (!solved) {
        playSound(madeWord ? 'word' : 'place')
        return
      }
      board.lock()
      hintButton.disabled = true
      // 5つの枠を左から1つずつ光らせて牌を跳ねさせ、ド・ミ・ソ・ド・ミと上がってから、クリアを出す
      const slots = [...board.hand.querySelectorAll('.slot')]
      slots.forEach((slot, i) => {
        timers.push(
          setTimeout(() => {
            slot.classList.add('cleared')
            playSound('step', i)
          }, i * 160),
        )
      })
      timers.push(setTimeout(() => showClear(texts), slots.length * 160 + 250))
    },
  })

  const showClear = (texts) => {
    const perfect = p.answer.every((w) => texts.includes(w))
    playSound(perfect || !hinted ? 'yakuman' : 'win')
    const badges = clear.querySelector('.puzzle-badges')
    badges.replaceChildren()
    if (!hinted) badges.append(Object.assign(document.createElement('span'), { className: 'puzzle-badge', textContent: t.noHint }))
    if (perfect) badges.append(Object.assign(document.createElement('span'), { className: 'puzzle-badge', textContent: t.perfect(t.category(p.category)) }))
    clear.classList.toggle('special', perfect || !hinted)
    clear.querySelector('.puzzle-made').textContent = texts.join('・')
    clear.querySelector('.puzzle-teaser').hidden = perfect
    clear.querySelector('.puzzle-answers').textContent = t.answers(p.answerCount)
    clear.hidden = false
    clear.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' })
  }

  const reset = () => {
    for (const timer of timers) clearTimeout(timer)
    timers = []
    hinted = false
    hint.hidden = true
    hintButton.disabled = false
    clear.hidden = true
    board.reset()
  }
  const hintButton = button(t.hint, () => {
    hinted = true
    hint.textContent = t.hintCategory(t.category(p.category))
    hint.hidden = false
    hintButton.disabled = true
  })
  root.querySelector('.board-controls').append(hintButton, button(t.reset, () => reset()), soundButton(t))
  clear.querySelector('.puzzle-retry').addEventListener('click', () => {
    reset()
    boardEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' })
  })
}

mountLogo()
for (const root of document.querySelectorAll('[data-demo]')) mountDemo(root)
for (const root of document.querySelectorAll('[data-puzzle]')) mountPuzzle(root)
for (const el of document.querySelectorAll('[data-js-only]')) el.hidden = false
