/**
 * Phonics V2 Core Engine
 * Handcrafted for Performance and Elegance
 */

const state = {
  currentCategory: null,
  currentPattern: null,
  patterns: [],
  words: [],
  allWords: [],
  wordLimit: 15,
  currentWordIndex: 0,
  theme: localStorage.getItem('theme') || 'light',
  dataLoaded: false
};

const dom = {
  main: document.getElementById('main'),
  app: document.getElementById('app')
};

// --- Initializers ---
async function init() {
  initTheme();
  initRouter();

  // 不阻塞首屏：路由先渲染，数据后台加载
  loadPhonicsData().then((ok) => {
    state.dataLoaded = ok;
    // 数据加载完成后刷新当前页面（Home 统计 & Learn 列表）
    handleRoute();
  });
}

function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
}

// --- Router ---
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash || '#/';
  const path = hash.split('/')[1] || 'home';

  // Update Nav Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === hash);
  });

  // Content Switching with simple fade effect
  dom.main.style.opacity = 0;
  setTimeout(() => {
    switch (path) {
      case 'home': renderHome(); break;
      case 'learn': renderLearn(); break;
      default: renderHome();
    }
    dom.main.style.opacity = 1;
  }, 150);
}

// --- Renderers ---

function renderHome() {
  const stats = state.dataLoaded ? `${getCategories().length} 个分类` : '加载中...';

  dom.main.innerHTML = `
        <section class="hero">
            <div class="container">
                <h1>自然拼读，从零开始</h1>
                <p>系统学习 100+ 发音规则，掌握「见词能读、听音能写」的核心能力。适合英语初学者和教学工作者。</p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <a href="#/learn" class="btn btn-primary">开始学习</a>
                    <a href="https://github.com/cocojojo5213/phonics-app" target="_blank" class="btn" style="border: 1px solid var(--border-soft)">GitHub</a>
                </div>
                
                <div class="category-grid" style="margin-top: 5rem; text-align: left;">
                    <div class="card">
                        <h3 style="margin-bottom: 0.5rem;">科学分类</h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted)">16 大发音分类，从字母到音节，循序渐进。</p>
                    </div>
                    <div class="card">
                        <h3 style="margin-bottom: 0.5rem;">拼读分解</h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted)">每个单词标注音素拆解，彩色高亮核心发音。</p>
                    </div>
                    <div class="card">
                        <h3 style="margin-bottom: 0.5rem;">真人发音</h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted)">高质量语音合成，支持单词和例句朗读。</p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

async function renderLearn() {
  if (!state.dataLoaded) {
    dom.main.innerHTML = `<div class="container" style="padding-top: 100px; text-align: center;">
            <p>正在加载数据...</p>
        </div>`;
    return;
  }

  dom.main.innerHTML = `
        <div class="container" style="padding-top: 40px;">
            <div style="margin-bottom: 3rem;">
                <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">学习路径</h2>
                <p style="color: var(--text-muted)">选择一个发音分类，开始您的阶梯式练习。</p>
            </div>
            
            <div class="category-grid" id="category-list">
                <!-- Loaded by JS -->
            </div>
            
            <div id="pattern-section" style="margin-top: 2rem; display:none;">
                <div id="pattern-list" class="pattern-box"></div>
                <div id="practice-container"></div>
            </div>
        </div>
    `;

  loadCategories();
}

function loadCategories() {
  const categories = getCategories();
  const container = document.getElementById('category-list');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
        <div class="card" onclick="selectCategory('${escapeHtml(cat.id)}')">
            <h3 style="margin-bottom: 0.4rem;">${cat.name}</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted)">${cat.desc}</p>
        </div>
    `).join('');
}

function selectCategory(catId) {
  state.currentCategory = catId;
  const patternSection = document.getElementById('pattern-section');
  patternSection.style.display = 'block';

  // Smooth scroll to patterns
  patternSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const patterns = getPatternsByCategory(catId);
  const container = document.getElementById('pattern-list');

  if (patterns.length === 0) {
    container.style.display = 'none';
    document.getElementById('practice-container').innerHTML = `
            <div style="text-align: center; padding: 4rem; color: var(--text-muted);">
                该分类暂时没有数据，请选择其他分类练习。
            </div>
        `;
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = patterns.map(p => {
    // 判断是否是概念类规则（中文长文本 pattern）
    const isConceptChip = p.pattern.length > 4 || /[\u4e00-\u9fa5]/.test(p.pattern);
    return `
        <button class="pattern-chip ${isConceptChip ? 'concept-chip' : ''} ${state.currentPattern === p.pattern ? 'active' : ''}" 
                onclick="selectPattern('${escapeHtml(p.pattern)}')">
            <span class="p-text">${p.pattern}</span>
            <span class="p-ipa">${p.pronunciation}</span>
        </button>
    `;
  }).join('');

  selectPattern(patterns[0].pattern);
}

function selectPattern(pattern) {
  state.currentPattern = pattern;
  const pInfo = getPatternInfo(state.currentCategory, pattern);

  state.allWords = pInfo.words || [];
  state.currentWordIndex = 0;

  renderPracticeAction(pInfo);
}

function nextWord() {
  if (state.currentWordIndex < state.allWords.length - 1) {
    state.currentWordIndex++;
    renderPracticeAction();
  }
}

function prevWord() {
  if (state.currentWordIndex > 0) {
    state.currentWordIndex--;
    renderPracticeAction();
  }
}

function renderPracticeAction(data) {
  const container = document.getElementById('practice-container');
  const pInfo = data || getPatternInfo(state.currentCategory, state.currentPattern);
  if (!pInfo) return;

  const isConceptPattern = pInfo.pattern.length > 4 || /[\u4e00-\u9fa5]/.test(pInfo.pattern);


  const word = state.allWords[state.currentWordIndex];
  if (!word) {
    container.innerHTML = `<div class="card" style="margin-top:2rem">请选择一个有效的发音模式</div>`;
    return;
  }

  container.innerHTML = `
        <div class="practice-stage">
            <!-- Header Info (Clickable for Real Human Voice) -->
             <div class="practice-header" onclick="app.playPattern()">
                 <div class="practice-pattern ${isConceptPattern ? 'is-concept' : ''}">${pInfo.pattern}</div>
                 <div class="practice-ipa">${pInfo.pronunciation}</div>
                 ${pInfo.pattern.toLowerCase() === 'qu' ? '<div class="practice-note">(Q 几乎总是与 U 一起出现)</div>' : ''}
             </div>

            <!-- Flashcard Frame -->
            <div class="flashcard-wrapper">
                <button class="nav-btn prev" onclick="prevWord()" ${state.currentWordIndex === 0 ? 'disabled' : ''}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>

                <div class="card flashcard active" id="current-flashcard" onclick="app.playWord('${escapeHtml(word.word)}')">
                     <div class="word-main">${formatWord(word.word, pInfo.pattern)}</div>
                    
                    ${word.breakdown ? `
                        <div class="breakdown-display">
                            ${formatBreakdown(word.breakdown, word.highlight, pInfo.pattern, word.tokenFlags)}
                        </div>
                    ` : ''}
                    
                    ${formatSyllables(word.syllables, word.word)}
                    
                     <div class="word-meaning">${word.meaning || ''}</div>
                    
                    ${word.sentence ? `
                        <div class="sentence-box" onclick="app.playSentence(event, '${escapeHtml(word.word)}', '${escapeHtml(word.sentence)}')">
                            <div class="sentence-en">${word.sentence}</div>
                            <div class="sentence-cn">${word.sentence_cn || ''}</div>
                            <div class="play-tag">🔊 点击阅读例句</div>
                        </div>
                    ` : ''}
                </div>

                <button class="nav-btn next" onclick="nextWord()" ${state.currentWordIndex === state.allWords.length - 1 ? 'disabled' : ''}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
            </div>

            <div class="practice-actions" aria-label="练习操作">
                <button class="btn nav-action" onclick="prevWord()" ${state.currentWordIndex === 0 ? 'disabled' : ''}>上一词</button>
                <button class="btn btn-primary nav-action" onclick="app.playWord('${escapeHtml(word.word)}')">播放单词</button>
                ${word.sentence ? `<button class="btn nav-action" onclick="app.playSentence(event, '${escapeHtml(word.word)}', '${escapeHtml(word.sentence)}')">播放例句</button>` : ''}
                <button class="btn nav-action" onclick="nextWord()" ${state.currentWordIndex === state.allWords.length - 1 ? 'disabled' : ''}>下一词</button>
            </div>

            <div class="practice-progress">
                ${state.currentWordIndex + 1} / ${state.allWords.length}
            </div>
            <div class="mobile-hint">
                左右滑动切换单词
            </div>
        </div>
    `;

  initTouchEvents();
}

let touchStartX = 0;
let touchStartY = 0;
let isScrolling = null; // null: unknown, true: vertical scroll, false: horizontal swipe

function initTouchEvents() {
  const card = document.getElementById('current-flashcard');
  if (!card) return;

  // Use passive: false to allow e.preventDefault()
  card.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isScrolling = null; // Reset state
  }, { passive: false });

  card.addEventListener('touchmove', (e) => {
    if (!touchStartX || !touchStartY) return;

    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;

    const diffX = touchStartX - touchCurrentX;
    const diffY = touchStartY - touchCurrentY;

    // Determine intent on first significant move
    if (isScrolling === null) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        isScrolling = false; // Intention is horizontal swipe
      } else {
        isScrolling = true; // Intention is vertical scroll
      }
    }

    // If decided it's a horizontal swipe, block vertical scroll
    if (isScrolling === false) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  card.addEventListener('touchend', (e) => {
    if (isScrolling === false) {
      // Logic for horizontal swipe completion
      const touchEndX = e.changedTouches[0].clientX;
      handleSwipe(touchStartX, touchEndX);
    }

    // Reset
    touchStartX = 0;
    touchStartY = 0;
    isScrolling = null;
  }, { passive: false });
}

function handleSwipe(start, end) {
  const threshold = 50;
  if (start - end > threshold) {
    nextWord(); // Swipe Left (Next)
  } else if (end - start > threshold) {
    prevWord(); // Swipe Right (Prev)
  }
}

// 音素颜色配置 - 按类型固定颜色
const PHONEME_COLORS = {
  consonant: 'var(--phoneme-1)',  // 蓝色 - 辅音
  vowel: 'var(--phoneme-2)',      // 绿色 - 元音
  digraph: 'var(--phoneme-4)',    // 紫色 - 字母组合
  focus: 'var(--phoneme-5)',      // 红色 - 高亮
  silent: 'var(--slate-400)',     // 灰色 - 静音
};

// 元音和 digraph 的识别
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'y'];
const VOWEL_TEAMS = [
  'ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'oi', 'oy', 'ou', 'au', 'aw', 'oo',
  'ie', 'ei', 'ue', 'ew', 'ey', 'ui', 'igh', 'eigh'
];
const CONSONANT_DIGRAPHS = [
  'sh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'nk', 'qu', 'wr', 'kn', 'mb', 'gn',
  'tch', 'dge', 'gh'
];
const R_CONTROLLED = ['ar', 'er', 'ir', 'or', 'ur'];
const DOUBLE_CONSONANTS = ['ll', 'ss', 'ff', 'zz', 'dd', 'tt', 'pp', 'nn', 'mm', 'bb', 'gg', 'cc', 'rr'];
const COMMON_ENDINGS = ['le', 'al', 'el', 'il', 'ol', 'ul', 'ing', 'ang', 'ong', 'ung', 'ink', 'ank', 'onk', 'unk', 'ed', 'es', 'tion', 'sion', 'ture'];

// 合并所有 digraphs
const DIGRAPHS = [...new Set([...VOWEL_TEAMS, ...CONSONANT_DIGRAPHS, ...R_CONTROLLED, ...DOUBLE_CONSONANTS, ...COMMON_ENDINGS])];

function formatWord(word, pattern, highlight) {
  // 简单高亮模式（向后兼容）
  const regex = new RegExp(`(${escapeRegex(pattern)})`, 'gi');
  return word.replace(regex, `<span class="word-highlight">$1</span>`);
}

function formatBreakdown(breakdown, highlight, pattern, tokenFlags = []) {
  if (!breakdown) return '';

  const tokens = breakdown.split('|');
  const highlightValue = highlight?.value?.toLowerCase() || pattern?.toLowerCase() || '';
  const highlightType = highlight?.type || 'token';
  const highlightIndices = highlight?.indices || [];

  // 创建静音索引 Set
  const silentIndices = new Set();
  if (tokenFlags && Array.isArray(tokenFlags)) {
    tokenFlags.forEach(flag => {
      if (flag.flag === 'silent') {
        silentIndices.add(flag.index);
      }
    });
  }

  return tokens.map((token, index) => {
    const tokenLower = token.toLowerCase();
    let isHighlight = false;
    let isSilent = silentIndices.has(index);

    // 检查是否是高亮部分
    if (highlightType === 'split') {
      isHighlight = highlightIndices.includes(index);
    } else {
      isHighlight = highlightValue && tokenLower === highlightValue;
    }

    // 判断音素类型并分配固定颜色
    let typeClass = 'phoneme-consonant';
    let color = PHONEME_COLORS.consonant;

    if (isSilent) {
      typeClass = 'phoneme-silent';
      color = PHONEME_COLORS.silent;
    } else if (isHighlight) {
      color = PHONEME_COLORS.focus;
    } else if (VOWEL_TEAMS.includes(tokenLower) || R_CONTROLLED.includes(tokenLower)) {
      typeClass = 'phoneme-digraph phoneme-vowel-team';
      color = PHONEME_COLORS.digraph;
    } else if (CONSONANT_DIGRAPHS.includes(tokenLower) || DOUBLE_CONSONANTS.includes(tokenLower)) {
      typeClass = 'phoneme-digraph';
      color = PHONEME_COLORS.digraph;
    } else if (VOWELS.includes(tokenLower)) {
      typeClass = 'phoneme-vowel';
      color = PHONEME_COLORS.vowel;
    } else if (COMMON_ENDINGS.includes(tokenLower)) {
      typeClass = 'phoneme-ending';
      color = PHONEME_COLORS.digraph;
    }

    return `<span class="phoneme ${typeClass} ${isHighlight ? 'phoneme-focus' : ''}" style="--phoneme-color: ${color}">${token}</span>`;
  }).join('<span class="phoneme-sep">·</span>');
}

// 音节显示格式化（每个音节可点击发音）
function formatSyllables(syllables, word) {
  // 防御性检查：必须是数组且有多个音节才显示
  if (!syllables || !Array.isArray(syllables) || syllables.length <= 1) {
    return '';
  }

  // 验证：拼接后应该等于原单词（忽略大小写）
  const joined = syllables.map(s => s.replace(/\|/g, '')).join('');
  if (word && joined.toLowerCase() !== word.toLowerCase()) {
    console.warn(`音节划分不匹配: ${word} vs ${joined}`);
  }

  const chips = syllables.map((s, i) =>
    `<span class="syllable-chip" title="点击发音" onclick="app.playSyllable(event, '${escapeHtml(word)}', ${i})">${s.replace(/\|/g, '')}</span>`
  ).join('<span class="syllable-sep">·</span>');

  return `<div class="syllables-display">音节划分：${chips}</div>`;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}


// --- Global App Object ---
window.app = {
  toggleTheme: toggleTheme,
  playPattern: () => {
    AudioLoader.playPattern(state.currentCategory, state.currentPattern);
  },
  playWord: (word) => {
    AudioLoader.playWord(state.currentCategory, state.currentPattern, word);
  },
  playSentence: (event, word, sentence) => {
    if (event) event.stopPropagation();
    AudioLoader.playSentence(state.currentCategory, state.currentPattern, word, sentence);
  },
  playSyllable: (event, word, index) => {
    if (event) event.stopPropagation(); // 阻止触发整个单词的播放
    const w = state.allWords[state.currentWordIndex];
    const text = (w && w.syllables && w.syllables[index])
      ? w.syllables[index].replace(/\|/g, '')
      : '';
    AudioLoader.playSyllable(state.currentCategory, state.currentPattern, word, index, text);
  }
};

// --- Start ---
window.onload = init;
