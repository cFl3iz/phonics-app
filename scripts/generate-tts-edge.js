/**
 * Edge TTS 音频生成脚本（替代 Google Cloud TTS，无需任何账号/凭据）
 *
 * 生成内容：
 *   1. 单词音频       audio/<word>.mp3
 *   2. 例句音频       audio/sentences/<sha1>.mp3（另附 <word>.mp3 副本，兼容局域网访问）
 *   3. 音节音频(新增) audio/syllables/<word>_<i>.mp3 —— 供前端音节点读
 *
 * 调用方式自动探测（按优先级）：
 *   py -3.15 → py -3.13 → py -3.12 → py -3.14 → python → edge-tts 命令
 *   （Python 3.14 在某些机器上运行 edge-tts 会崩溃，故放最后）
 *
 * 用法：node scripts/generate-tts-edge.js [word|sentence|syllable|all]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const CONFIG = {
    generatedWordsPath: path.join(__dirname, '../data/generated-words.json'),
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    audioOutputPath: path.join(__dirname, '../audio'),
    voiceWord: 'en-US-AriaNeural',
    voiceSentence: 'en-US-JennyNeural',
    syllableRate: '-15%'   // 音节读慢一点，方便跟读
};

const CANDIDATES = [
    { name: 'py -3.15 -m edge_tts', makeCmd: args => `py -3.15 -m edge_tts ${args}` },
    { name: 'py -3.13 -m edge_tts', makeCmd: args => `py -3.13 -m edge_tts ${args}` },
    { name: 'py -3.12 -m edge_tts', makeCmd: args => `py -3.12 -m edge_tts ${args}` },
    { name: 'py -3.14 -m edge_tts', makeCmd: args => `py -3.14 -m edge_tts ${args}` },
    { name: 'python -m edge_tts', makeCmd: args => `python -m edge_tts ${args}` },
    { name: 'edge-tts 命令', makeCmd: args => `edge-tts ${args}` }
];

function runCmd(fullCmd, timeoutMs = 90000) {
    return new Promise((resolve) => {
        exec(fullCmd, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
            (error, stdout, stderr) => resolve({ ok: !error, error, stdout: stdout || '', stderr: stderr || '' }));
    });
}

function lastLines(s, n = 5) {
    return s.trim().split('\n').filter(Boolean).slice(-n).join('\n   ');
}

function q(s) {
    return `"${String(s).replace(/"/g, '""')}"`;
}

function buildArgs(text, outputPath, voice, rate) {
    let args = `--voice ${q(voice)} --text ${q(text)}`;
    if (rate) args += ` --rate ${q(rate)}`;
    args += ` --write-media ${q(outputPath)}`;
    return args;
}

function isValidMp3(p) {
    try { return fs.existsSync(p) && fs.statSync(p).size > 100; } catch (e) { return false; }
}

async function findEngine() {
    const testPath = path.join(CONFIG.audioOutputPath, '__probe__.mp3');
    ensureDir(CONFIG.audioOutputPath);
    for (const c of CANDIDATES) {
        console.log(`🔍 探测: ${c.name} ...`);
        const r = await runCmd(c.makeCmd(buildArgs('hello', testPath, CONFIG.voiceWord)), 45000);
        if (r.ok && isValidMp3(testPath)) {
            fs.unlinkSync(testPath);
            console.log(`   ✅ 可用\n`);
            return c;
        }
        const detail = lastLines(r.stderr + r.stdout);
        if (detail) console.log(`   ❌ ${detail}\n`);
        else if (r.error) console.log(`   ❌ ${r.error.message}\n`);
        else console.log(`   ❌ 无输出且未生成文件\n`);
    }
    try { if (fs.existsSync(testPath)) fs.unlinkSync(testPath); } catch (e) {}
    return null;
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeSentence(text) {
    return text.trim().replace(/\s+/g, ' ');
}

function getSentenceHash(text) {
    return crypto.createHash('sha1').update(normalizeSentence(text), 'utf8').digest('hex');
}

async function synthesize(engine, text, outputPath, voice, rate) {
    if (isValidMp3(outputPath)) {
        console.log(`⏭️  跳过（已存在）: ${path.basename(outputPath)}`);
        return false;
    }
    const r = await runCmd(engine.makeCmd(buildArgs(text, outputPath, voice, rate)));
    if (r.ok && isValidMp3(outputPath)) {
        console.log(`✅ 生成: ${path.basename(outputPath)}`);
        return true;
    }
    const detail = lastLines(r.stderr + r.stdout, 3);
    console.error(`❌ 失败: ${text} - ${detail || (r.error ? r.error.message : '未知错误')}`);
    return false;
}

// 收集所有需要处理的单词（含音节数据）
function collectWords() {
    const words = new Map();

    const add = (word, sentence, syllables) => {
        if (!word) return;
        const key = word.toLowerCase();
        if (!words.has(key)) {
            words.set(key, { word, sentence: sentence || null, syllables: syllables || null });
        }
    };

    if (fs.existsSync(CONFIG.rulesPath)) {
        const rulesData = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));
        (rulesData.rules || []).forEach(rule => {
            (rule.examples || []).forEach(ex => add(ex.word, ex.sentence, ex.syllables));
        });
    }

    if (fs.existsSync(CONFIG.generatedWordsPath)) {
        const generated = JSON.parse(fs.readFileSync(CONFIG.generatedWordsPath, 'utf8'));
        Object.values(generated).forEach(ruleResult => {
            (ruleResult.items || []).forEach(item => add(item.word, item.sentence, item.syllables));
        });
    }

    return Array.from(words.values());
}

async function main() {
    const mode = process.argv[2] || 'all';
    console.log(`🔊 Edge TTS 生成模式: ${mode}\n`);

    const engine = await findEngine();
    if (!engine) {
        console.error('❌ 所有调用方式都失败。最常见解法：');
        console.error('   1. 安装 Python 3.13/3.15（python.org 下载，勿用 3.14）');
        console.error('   2. py -3.15 -m pip install edge-tts');
        console.error('   3. 重新运行本脚本');
        process.exit(1);
    }
    console.log(`🛠️  使用调用方式: ${engine.name}\n`);

    ensureDir(CONFIG.audioOutputPath);
    ensureDir(path.join(CONFIG.audioOutputPath, 'sentences'));
    ensureDir(path.join(CONFIG.audioOutputPath, 'syllables'));

    const words = collectWords();
    console.log(`📚 共 ${words.length} 个单词需要处理\n`);

    let wordCount = 0, sentenceCount = 0, syllableCount = 0;

    for (const item of words) {
        // 1. 单词音频
        if (mode === 'word' || mode === 'all') {
            const wordPath = path.join(CONFIG.audioOutputPath, `${item.word.toLowerCase()}.mp3`);
            if (await synthesize(engine, item.word, wordPath, CONFIG.voiceWord)) wordCount++;
        }

        // 2. 例句音频（哈希名 + 单词名副本）
        if ((mode === 'sentence' || mode === 'all') && item.sentence) {
            const sentencePath = path.join(
                CONFIG.audioOutputPath, 'sentences',
                `${getSentenceHash(item.sentence)}.mp3`);
            const wordSentencePath = path.join(
                CONFIG.audioOutputPath, 'sentences',
                `${item.word.toLowerCase()}.mp3`);
            if (await synthesize(engine, item.sentence, sentencePath, CONFIG.voiceSentence)) {
                sentenceCount++;
                if (!isValidMp3(wordSentencePath)) {
                    try { fs.copyFileSync(sentencePath, wordSentencePath); } catch (e) {}
                }
            } else if (isValidMp3(sentencePath) && !isValidMp3(wordSentencePath)) {
                try { fs.copyFileSync(sentencePath, wordSentencePath); } catch (e) {}
            }
        }

        // 3. 音节音频（新增）：audio/syllables/<word>_<i>.mp3
        if ((mode === 'syllable' || mode === 'all') && Array.isArray(item.syllables) && item.syllables.length > 1) {
            for (let i = 0; i < item.syllables.length; i++) {
                const sylText = item.syllables[i].replace(/\|/g, '');
                if (!sylText) continue;
                const sylPath = path.join(
                    CONFIG.audioOutputPath, 'syllables',
                    `${item.word.toLowerCase()}_${i}.mp3`);
                if (await synthesize(engine, sylText, sylPath, CONFIG.voiceWord, CONFIG.syllableRate)) syllableCount++;
                await new Promise(r => setTimeout(r, 100));
            }
        }

        await new Promise(r => setTimeout(r, 150));
    }

    console.log(`\n🎉 完成！单词: ${wordCount}，例句: ${sentenceCount}，音节: ${syllableCount}`);
    console.log(`📁 输出目录: ${CONFIG.audioOutputPath}`);
}

main().catch(console.error);