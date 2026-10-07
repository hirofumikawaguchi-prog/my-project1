// TD4 ゲートレベル回路のテスト（node --test computer/td4/test/）
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// index.html に埋め込まれたコア部分（<script id="td4-core">）を取り出して読み込む
function loadTD4() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/<script id="td4-core">([\s\S]*?)<\/script>/);
  assert.ok(m, 'td4-core スクリプトが見つかりません');
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(m[1], sandbox);
  return sandbox.module.exports;
}
const TD4 = loadTD4();

// TD4 の仕様（データセレクタ・書き込み先の真理値表）だけから書いた動作モデル。
// ゲート回路とは独立した正解として使う。未定義命令もこの真理値表どおりに動く。
function reference(rom, inputs, steps) {
  let a = 0, b = 0, out = 0, pc = 0, c = 0;
  const trace = [];
  for (let t = 0; t < steps; t++) {
    const inp = inputs[t % inputs.length];
    const op = rom[pc] >> 4, im = rom[pc] & 15;
    const [d4, d5, d6, d7] = [0, 1, 2, 3].map((i) => (op >> i) & 1);
    const select = (d5 << 1) | (d4 | d7); // 00=A 01=B 10=IN 11=0
    const src = [a, b, inp, 0][select];
    const full = src + im, sum = full & 15, carry = full >> 4;
    let nextPc = (pc + 1) & 15;
    if (!d7 && !d6) a = sum;                    // ADD A / MOV A / IN A
    else if (!d7 && d6) b = sum;                // ADD B / MOV B / IN B
    else if (d7 && !d6) out = sum;              // OUT
    else if (d4 || !c) nextPc = sum;            // JMP / JNC
    c = carry; pc = nextPc;
    trace.push({ a, b, out, pc, c });
  }
  return trace;
}

function run(rom, inputs, steps) {
  const m = new TD4.Machine();
  m.setRom(rom);
  m.reset();
  const trace = [];
  for (let t = 0; t < steps; t++) {
    m.setIn(inputs[t % inputs.length]);
    m.step();
    const s = m.state();
    trace.push({ a: s.a, b: s.b, out: s.out, pc: s.pc, c: s.c });
  }
  return trace;
}

function rng(seed) {
  let x = seed >>> 0;
  return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

test('回路にループがなく、ゲートとFFが組み立てられている', () => {
  const m = new TD4.Machine();
  const { total } = m.stats();
  assert.equal(total.DFF, 17); // A,B,OUT,PC 各4 + C
  assert.ok(total.AND > 100 && total.OR > 10 && total.XOR >= 12 && total.NOT > 10);
});

test('定義済みの12命令はどれも動作モデルと一致する', () => {
  for (const [, op] of TD4.ISA) {
    for (let im = 0; im < 16; im++) {
      // 前処理で A=5, B=9 にしてから対象命令を実行する
      const rom = [0x35, 0x79, (op << 4) | im, 0xF3];
      assert.deepEqual(run(rom, [6], 6), reference(rom, [6], 6), `op=${op.toString(2)} im=${im}`);
    }
  }
});

test('ランダムなプログラム（未定義命令を含む）でも動作モデルと一致する', () => {
  const rand = rng(42);
  for (let k = 0; k < 300; k++) {
    const rom = Array.from({ length: 16 }, () => Math.floor(rand() * 256));
    const inputs = Array.from({ length: 7 }, () => Math.floor(rand() * 16));
    assert.deepEqual(run(rom, inputs, 64), reference(rom, inputs, 64), `program #${k}: ${rom}`);
  }
});

test('JNC は直前の命令の桁上がりで分岐する', () => {
  // A=15 にしてから +1（桁上がり）→ JNC は分岐しない
  const rom = TD4.assemble('MOV A,15\nADD A,1\nJNC 0\nOUT 0b1010\nJMP 4\n').bytes;
  const s = run(rom, [0], 5);
  assert.equal(s[3].out, 0b1010);
});

test('サンプル「LEDが左右に流れる」の出力順', () => {
  const sample = TD4.SAMPLES.find((s) => s.name.startsWith('LED'));
  const rom = TD4.assemble(sample.src).bytes;
  const outs = run(rom, [0], 20).map((s) => s.out);
  assert.deepEqual(outs.slice(0, 10), [3, 6, 12, 8, 8, 12, 6, 3, 1, 1]);
  assert.deepEqual(outs.slice(10, 19), [3, 6, 12, 8, 8, 12, 6, 3, 1]);
});

test('サンプル「入力 + 3 を出力」', () => {
  const sample = TD4.SAMPLES.find((s) => s.name.startsWith('入力 + 3'));
  const rom = TD4.assemble(sample.src).bytes;
  assert.equal(run(rom, [4], 4)[3].out, 7);
});

test('すべてのサンプルがエラーなくアセンブルできる', () => {
  for (const s of TD4.SAMPLES) {
    const r = TD4.assemble(s.src);
    assert.equal(r.errors.length, 0, s.name + ': ' + r.errors.join(' / '));
  }
});

test('アセンブル → 逆アセンブル → アセンブルで機械語が変わらない', () => {
  for (let byte = 0; byte < 256; byte++) {
    const mn = TD4.disassemble(byte);
    if (mn.startsWith('（')) continue; // 未定義命令
    const again = TD4.assemble(mn).bytes[0];
    const op = byte >> 4;
    const hasIm = [0x0, 0x3, 0x5, 0x7, 0xB, 0xE, 0xF].includes(op);
    assert.equal(again, hasIm ? byte : byte & 0xf0, mn);
  }
});

test('アセンブラは誤りを行番号つきで報告する', () => {
  const r = TD4.assemble('MOV A,16\nFOO\n');
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /^1行目/);
  assert.match(r.errors[1], /^2行目/);
});
