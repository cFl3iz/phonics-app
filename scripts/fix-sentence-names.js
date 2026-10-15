/**
 * 补全"按单词命名"的例句音频
 *
 * 背景：前端 audio-loader.js 在局域网 IP（如 192.168.x.x，非安全上下文）下
 *       无法使用 crypto.subtle 计算例句哈希，会回退查找 sentences/<单词>.mp3。
 *       本脚本把已有的 sentences/<sha1>.mp3 复制为 sentences/<单词>.mp3。
 *
 * 用法：node scripts/fix-sentence-names.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    generatedWordsPath: path.join(__dirname, '../data/generated-words.json'),
    audioDir: path.join(__dirname, '../audio'),
    sentencesDir: path.join(__dirname, '../audio/sentences')
};

function normalizeSentence(text) {
    return text.trim().replace(/\s+/g, ' ');
}

function getSentenceHash(text) {
    return crypto.createHash('sha1').update(normalizeSentence(text), 'utf8').digest('hex');
}

function collectWords() {
    const words = new Map();
    const add = (word, sentence) => {
        if (word && sentence && !words.has(word.toLowerCase())) {
            words.set(word.toLowerCase(), sentence);
        }
    };
    if (fs.existsSync(CONFIG.rulesPath)) {
        const data = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));
        (data.rules || []).forEach(rule => {
            (rule.examples || []).forEach(ex => add(ex.word, ex.sentence));
        });
    }
    if (fs.existsSync(CONFIG.generatedWordsPath)) {
        const generated = JSON.parse(fs.readFileSync(CONFIG.generatedWordsPath, 'utf8'));
        Object.values(generated).forEach(rr => {
            (rr.items || []).forEach(item => add(item.word, item.sentence));
        });
    }
    return words;
}

function main() {
    const words = collectWords();
    let copied = 0, skipped = 0, missing = 0;

    words.forEach((sentence, wordLower) => {
        const hashFile = path.join(CONFIG.sentencesDir, `${getSentenceHash(sentence)}.mp3`);
        const wordFile = path.join(CONFIG.sentencesDir, `${wordLower}.mp3`);

        if (fs.existsSync(wordFile)) { skipped++; return; }
        if (!fs.existsSync(hashFile)) {
            console.log(`⚠️  缺少哈希音频: ${wordLower} (${sentence})`);
            missing++;
            return;
        }
        fs.copyFileSync(hashFile, wordFile);
        console.log(`✅ 已复制: ${hashFile.slice(-45)} → ${wordLower}.mp3`);
        copied++;
    });

    console.log(`\n🎉 完成！复制: ${copied}，已存在跳过: ${skipped}，源文件缺失: ${missing}`);
    console.log('   刷新网页后例句即可播放');
}

main();
