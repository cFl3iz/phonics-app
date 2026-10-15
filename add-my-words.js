/**
 * 添加自定义词库分类 / Add custom vocabulary category
 *
 * 作用：向 data/rules-master.json 追加一个独立的"我的单词"分类，
 *       包含用户自定义词表（不混入内置 16 个发音分类）。
 *
 * 用法：把本文件放到项目根目录（和 package.json 同级），执行：
 *       node add-my-words.js
 *
 * 可重复运行：每次运行会先删除旧的自定义分类再重新插入。
 */

const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, 'data', 'rules-master.json');
const CAT_ID = 'my-words';

// ==================== 自定义词表 ====================
// breakdown 用 | 分隔；digraph/元音组合合并为一个 token（如 ee, ea, ow, aw）
// highlight: {type:'token', value:'xx'} 或魔法e {type:'split', value:'a_e', indices:[i,j]}
const WORDS = [
    { word: 'orange', meaning: '桔子/橙子', sentence: 'The orange is sweet.', sentence_cn: '这个桔子很甜。',
      breakdown: 'o|r|a|n|g|e', highlight: { type: 'token', value: 'o' }, tokenFlags: [], syllables: ['o|r', 'a|n|g|e'] },

    { word: 'tree', meaning: '树', sentence: 'The tree is tall.', sentence_cn: '这棵树很高。',
      breakdown: 't|r|ee', highlight: { type: 'token', value: 'ee' }, tokenFlags: [], syllables: ['t|r|ee'] },

    { word: 'carrot', meaning: '胡萝卜', sentence: 'The carrot is orange.', sentence_cn: '胡萝卜是橙色的。',
      breakdown: 'c|a|r|r|o|t', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['c|a|r', 'r|o|t'] },

    { word: 'tomato', meaning: '西红柿（单数）', sentence: 'The tomato is red.', sentence_cn: '西红柿是红色的。',
      breakdown: 't|o|m|a|t|o', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['t|o', 'm|a', 't|o'] },

    { word: 'tomatoes', meaning: '西红柿（复数）', sentence: 'These tomatoes are fresh.', sentence_cn: '这些西红柿很新鲜。',
      breakdown: 't|o|m|a|t|o|e|s', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['t|o', 'm|a', 't|o|e|s'] },

    { word: 'garden', meaning: '花园', sentence: 'Grandpa has a garden.', sentence_cn: '爷爷有一个花园。',
      breakdown: 'g|a|r|d|e|n', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['g|a|r', 'd|e|n'] },

    { word: 'plant', meaning: '植物；种植', sentence: 'I plant a tree.', sentence_cn: '我种一棵树。',
      breakdown: 'p|l|a|n|t', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['p|l|a|n|t'] },

    { word: 'vegetable', meaning: '蔬菜', sentence: 'The vegetable is green.', sentence_cn: '蔬菜是绿色的。',
      breakdown: 'v|e|g|e|t|a|b|l|e', highlight: { type: 'token', value: 'e' }, tokenFlags: [], syllables: ['v|e|g', 'e|t|a', 'b|l|e'] },

    { word: 'welcome', meaning: '欢迎', sentence: 'Welcome to my home.', sentence_cn: '欢迎来到我家。',
      breakdown: 'w|e|l|c|o|m|e', highlight: { type: 'token', value: 'e' }, tokenFlags: [], syllables: ['w|e|l', 'c|o|m|e'] },

    { word: 'open', meaning: '开', sentence: 'Open the door, please.', sentence_cn: '请开门。',
      breakdown: 'o|p|e|n', highlight: { type: 'token', value: 'o' }, tokenFlags: [], syllables: ['o', 'p|e|n'] },

    { word: 'close', meaning: '关', sentence: 'Close your eyes.', sentence_cn: '闭上你的眼睛。',
      breakdown: 'c|l|o|s|e', highlight: { type: 'split', value: 'o_e', indices: [2, 4] }, tokenFlags: [{ index: 4, flag: 'silent' }], syllables: ['c|l|o|s|e'] },

    { word: 'morning', meaning: '上午；早晨', sentence: 'Good morning!', sentence_cn: '早上好！',
      breakdown: 'm|o|r|n|i|n|g', highlight: { type: 'token', value: 'o' }, tokenFlags: [], syllables: ['m|o|r', 'n|i|n|g'] },

    { word: 'afternoon', meaning: '下午', sentence: 'Good afternoon!', sentence_cn: '下午好！',
      breakdown: 'a|f|t|e|r|n|oo|n', highlight: { type: 'token', value: 'oo' }, tokenFlags: [], syllables: ['a|f', 't|e|r', 'n|oo|n'] },

    { word: 'our', meaning: '我们的', sentence: 'Our garden is beautiful.', sentence_cn: '我们的花园很美。',
      breakdown: 'ou|r', highlight: { type: 'token', value: 'ou' }, tokenFlags: [], syllables: ['ou|r'] },

    { word: 'beautiful', meaning: '美丽的', sentence: 'The flower is beautiful.', sentence_cn: '这朵花很美。',
      breakdown: 'b|eau|t|i|f|u|l', highlight: { type: 'token', value: 'eau' }, tokenFlags: [], syllables: ['b|eau', 't|i', 'f|u|l'] },

    { word: 'flower', meaning: '花', sentence: 'I see a flower.', sentence_cn: '我看见一朵花。',
      breakdown: 'f|l|ow|e|r', highlight: { type: 'token', value: 'ow' }, tokenFlags: [], syllables: ['f|l|ow', 'e|r'] },

    { word: 'tea', meaning: '茶', sentence: 'Grandpa drinks tea.', sentence_cn: '爷爷喝茶。',
      breakdown: 't|ea', highlight: { type: 'token', value: 'ea' }, tokenFlags: [], syllables: ['t|ea'] },

    { word: 'bee', meaning: '蜜蜂', sentence: 'The bee is busy.', sentence_cn: '蜜蜂很忙。',
      breakdown: 'b|ee', highlight: { type: 'token', value: 'ee' }, tokenFlags: [], syllables: ['b|ee'] },

    { word: 'grow', meaning: '种植；生长', sentence: 'Plants grow fast.', sentence_cn: '植物长得快。',
      breakdown: 'g|r|ow', highlight: { type: 'token', value: 'ow' }, tokenFlags: [], syllables: ['g|r|ow'] },

    { word: 'see', meaning: '看见', sentence: 'I see a bee.', sentence_cn: '我看见一只蜜蜂。',
      breakdown: 's|ee', highlight: { type: 'token', value: 'ee' }, tokenFlags: [], syllables: ['s|ee'] },

    { word: 'place', meaning: '位置；地方', sentence: 'This is my place.', sentence_cn: '这是我的位置。',
      breakdown: 'p|l|a|c|e', highlight: { type: 'split', value: 'a_e', indices: [1, 4] }, tokenFlags: [{ index: 4, flag: 'silent' }], syllables: ['p|l|a|c|e'] },

    { word: 'sunflower', meaning: '向日葵', sentence: 'The sunflower is big.', sentence_cn: '向日葵很大。',
      breakdown: 's|u|n|f|l|ow|e|r', highlight: { type: 'token', value: 'ow' }, tokenFlags: [], syllables: ['s|u|n', 'f|l|ow', 'e|r'] },

    { word: 'leaf', meaning: '叶子（单数）', sentence: 'The leaf is green.', sentence_cn: '叶子是绿色的。',
      breakdown: 'l|ea|f', highlight: { type: 'token', value: 'ea' }, tokenFlags: [], syllables: ['l|ea|f'] },

    { word: 'leaves', meaning: '叶子（复数）', sentence: 'The leaves are yellow.', sentence_cn: '叶子是黄色的。',
      breakdown: 'l|ea|v|e|s', highlight: { type: 'token', value: 'ea' }, tokenFlags: [], syllables: ['l|ea|v|e|s'] },

    { word: 'water', meaning: '给…浇水；水', sentence: 'I water the flowers.', sentence_cn: '我给花浇水。',
      breakdown: 'w|a|t|e|r', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['w|a', 't|e|r'] },

    { word: 'grandpa', meaning: '爷爷', sentence: 'My grandpa is kind.', sentence_cn: '我的爷爷很和蔼。',
      breakdown: 'g|r|a|n|d|p|a', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['g|r|a|n|d', 'p|a'] },

    { word: 'grandma', meaning: '奶奶', sentence: 'My grandma cooks well.', sentence_cn: '我的奶奶做饭很好吃。',
      breakdown: 'g|r|a|n|d|m|a', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['g|r|a|n|d', 'm|a'] },

    { word: 'some', meaning: '一些', sentence: 'I have some tea.', sentence_cn: '我有一些茶。',
      breakdown: 's|o|m|e', highlight: { type: 'token', value: 'o' }, tokenFlags: [{ index: 3, flag: 'silent' }], syllables: ['s|o|m|e'] },

    { word: 'many', meaning: '许多', sentence: 'There are many bees.', sentence_cn: '有许多蜜蜂。',
      breakdown: 'm|a|n|y', highlight: { type: 'token', value: 'a' }, tokenFlags: [], syllables: ['m|a|n|y'] },

    { word: 'strawberry', meaning: '草莓（单数）', sentence: 'The strawberry is sweet.', sentence_cn: '草莓很甜。',
      breakdown: 's|t|r|aw|b|e|r|r|y', highlight: { type: 'token', value: 'aw' }, tokenFlags: [], syllables: ['s|t|r|aw', 'b|e|r', 'r|y'] },

    { word: 'strawberries', meaning: '草莓（复数）', sentence: 'I like strawberries.', sentence_cn: '我喜欢草莓。',
      breakdown: 's|t|r|aw|b|e|r|r|i|e|s', highlight: { type: 'token', value: 'aw' }, tokenFlags: [], syllables: ['s|t|r|aw', 'b|e|r', 'r|i|e|s'] }
];
// ======================================================

function main() {
    if (!fs.existsSync(rulesPath)) {
        console.error(`❌ 找不到文件: ${rulesPath}`);
        console.error('   请确认本脚本放在项目根目录（和 package.json 同级）');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

    // 幂等处理：先移除旧的自定义分类和规则，再重新插入
    data.categories = (data.categories || []).filter(c => c.id !== CAT_ID);
    data.rules = (data.rules || []).filter(r => r.category !== CAT_ID);

    const maxOrder = Math.max(0, ...(data.categories || []).map(c => c.order || 0));

    data.categories.push({
        id: Unit3,
        name_cn: 'Unit3 Our garden 词汇表',
        name_en: 'Unit3 Our garden',
        order: maxOrder + 1
    });

    data.rules.push({
        id: 'my-words-unit1',
        category: Unit3,
        graphemes: ['My Words'],
        sound: { ipa: '', name_cn: '单元词汇', name_en: 'Vocabulary' },
        tts: { zh: '自定义词库：第一单元', en: '' },
        examples: WORDS.map(w => ({
            word: w.word,
            meaning: w.meaning,
            sentence: w.sentence,
            sentence_cn: w.sentence_cn,
            breakdown: w.breakdown,
            highlight: w.highlight,
            tokenFlags: w.tokenFlags,
            syllables: w.syllables
        }))
    });

    fs.writeFileSync(rulesPath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`✅ 已添加自定义分类「我的单词」，共 ${WORDS.length} 个单词`);
    console.log(`📁 已写入: ${rulesPath}`);
    console.log('');
    console.log('⚠️  接下来请务必清除浏览器缓存（PWA Service Worker 会缓存旧数据）：');
    console.log('    1. 主页按 F12 → Application → Service Workers → Unregister');
    console.log('    2. Application → Storage → Clear site data');
    console.log('    3. Ctrl + F5 强制刷新');
}

main();