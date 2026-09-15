import { LEVELS, SOURCES } from "./data.js?v=6";
import {
  COUNT,
  byId,
  makeExam,
  rememberSeen,
  score,
  load,
  save,
  emptyState,
} from "./engine.js?v=6";
const main = document.querySelector("#main"),
  notice = document.querySelector("#notice");
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
}
const restored = load(storage);
let state = restored.state,
  view = "home",
  chosenLevel = "easy";
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const grass =
  '<svg class="grass" aria-hidden="true" viewBox="0 0 100 70"><path d="M50 63V18M50 49C28 49 19 34 22 19c20 0 30 13 28 30Zm0-10C50 20 62 8 80 10c1 18-10 31-30 33M22 63h58" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const theoryNotice = `<aside class="warning theory-notice"><b>うわさ・考察について</b><p>特級にはファンのうわさ・考察を含みます。これらの内容は、本当の情報だと公式に確認できていません。考察問題の「正解」は、紹介する説の内容に合う選択肢という意味です。</p></aside>`;
const evidence = (q) => q.kind === "theory" ? `<aside class="warning theory-notice"><b>ファンの考察・未確認</b><p>本当の情報だと公式に確認できていません。説の内容を答える問題で、正体や設定を断定するものではありません。</p></aside>` : q.kind === "report" ? `<p class="small">報道された話題を扱う問題です。声の変化の正確な時期や学年は断定しません。</p>` : "";
const sister =
  '<a class="link-card" href="https://nanasisan12345-ops.github.io/chiikawa-character-match/"><div><span class="eyebrow">ANOTHER LITTLE DISCOVERY</span><h3>ちいかわキャラ診断へ</h3><p>あなたに近いのは誰？ 20キャラクターから見つけよう。</p></div><span aria-hidden="true">診断してみる →</span></a>';
function tell(text) {
  notice.textContent = text;
}
function persist() {
  const saved = save(storage, state);
  if (!saved)
    tell("このブラウザでは保存できません。画面を閉じずに続けてください。");
  return saved;
}
function mount(html, focus = true) {
  main.innerHTML = html;
  if (focus) {
    window.scrollTo(0, 0);
    main.querySelector("h1")?.focus({ preventScroll: true });
  }
}
function home() {
  view = "home";
  mount(
    `<section class="hero"><div><span class="tag">草むしりの、その先のひと休み。</span><p class="eyebrow">A LITTLE EXAM, A LOT OF LOVE</p><h1 tabindex="-1">思い出を、<br>ひとつずつ。</h1><p class="hero-copy">あの子のこと。あの日の冒険。<br>好きな物語を思い出しながら、ちいかわ検定に挑戦。<br>知らなかったことも、次の楽しみになる。</p><span class="small">全240問・各級40問から毎回10問 / 登録不要 / 時間制限なし</span></div><div class="hero-sheet" aria-hidden="true"><div class="mini">ちいかわ検定 · 受検のしおり</div><div class="sheet-title">好き、を育てる。</div>${grass}<div class="circle">5級<small>ここから一歩</small></div><p class="small">一問ずつ、ゆっくり。<br>今日のあなたの「知ってる」を集めよう。</p></div></section>${state.run ? `<section class="resume"><p><b>${LEVELS[state.run.level].name} ${state.run.done ? "の結果があります" : `の途中です（${state.run.answers.filter((a) => a !== null).length} / 10問回答）`}</b><br>保存した内容から${state.run.done ? "結果を見返せます" : "再開できます"}。</p><button class="secondary" data-action="resume">${state.run.done ? "前回の結果を見る" : "続きから"}</button></section>` : ""}<div class="section-heading"><h2>今日は、何級に挑戦する？</h2><span class="small">各級専用40問。どの級からでも受けられます。</span></div><section class="levels">${Object.entries(
      LEVELS,
    )
      .map(([key, l]) => {
        const rs = state.records.filter((r) => r.level === key),
          best = rs.length ? Math.max(...rs.map((r) => r.correct)) : null;
        return `<article class="level ${key === "special" ? "special-level" : ""}" style="--level:${l.color}"><span class="badge">${best === null ? "まだ見ぬ、あなたの記録" : best >= l.pass ? "合格済み · 最近の最高 " + best * 10 + "点" : "最近の最高 " + best * 10 + "点"}</span><div class="grade">${l.name}</div><h3>${l.title}</h3><p>${l.description}</p><small>10問中${l.pass}問正解で合格 · 約3分</small><button class="secondary" data-level="${key}">${l.name}に挑戦する <span aria-hidden="true">→</span></button></article>`;
      })
      .join(
        "",
      )}</section>${theoryNotice}<aside class="warning"><b>ネタバレ注意</b><p>全ての級で、漫画・アニメ・映画本編のネタバレを含みます。問題と解説には、登場人物の行動や物語の展開が出てきます。</p></aside><section class="intro"><div><b>01 級を選んで挑戦</b><span>未出題を優先してランダムに10問。<br>40問をひと巡りしたら、また新しい組み合わせで。</span></div><div><b>02 解説でおさらい</b><span>間違えた問題も、<br>物語を思い出すきっかけに。</span></div><div><b>03 合格証を集める</b><span>合格したら記念の一枚。<br>次の級にも挑戦しよう。</span></div></section><h2 class="records-heading">最近の記録</h2>${
      state.records.length
        ? `<div class="record-list">${state.records
            .slice(-6)
            .reverse()
            .map(
              (r) =>
                `<span class="record">${LEVELS[r.level].name} · ${r.correct * 10}点 · ${r.correct >= LEVELS[r.level].pass ? "合格" : "再挑戦"}</span>`,
            )
            .join("")}</div>`
        : '<p class="empty">最初の一歩が、ここに残ります。</p>'
    }${sister}<p class="small" style="margin-top:25px">回答と最近20回の記録は、このブラウザに保存されます。</p><button class="text-button" data-action="clear">保存した記録を消す</button>`,
    false,
  );
}
function setup(level) {
  chosenLevel = level;
  view = "setup";
  const l = LEVELS[level];
  mount(
    `<div class="narrow"><p class="eyebrow">BEFORE YOU START</p><section class="paper"><h1 tabindex="-1">${l.name} · ${l.title}</h1><p>10問中${l.pass}問正解で合格。<br>答えを選び「次の問題へ」で進みます。<br>正解と解説は、10問の採点後にまとめて表示します。</p><aside class="warning"><b>ネタバレ注意</b><p>漫画・アニメ・映画本編の展開や登場人物に関するネタバレを含みます。全ての級が対象です。</p></aside>${level === "special" ? theoryNotice : ""}<label class="consent"><input id="consent" type="checkbox">${level === "special" ? "ネタバレと未確認の考察が含まれることを確認しました" : "本編のネタバレが含まれることを確認しました"}</label>${state.run && !state.run.done ? '<p class="small">開始すると、現在の途中回答は新しい検定に置き換わります。</p>' : ""}<div class="actions"><button class="primary" data-action="start" disabled>検定をはじめる</button><button class="secondary" data-action="home">級を選び直す</button></div></section></div>`,
  );
}
function start() {
  if (!document.querySelector("#consent")?.checked) return;
  state.run = {
    id: crypto.randomUUID(),
    level: chosenLevel,
    date: new Date().toISOString(),
    set: makeExam(chosenLevel, state.last[chosenLevel], Math.random, state.seen[chosenLevel]),
    answers: Array(COUNT).fill(null),
    index: 0,
    done: false,
  };
  state.seen[chosenLevel] = rememberSeen(chosenLevel, state.seen[chosenLevel], state.run.set);
  state.last[chosenLevel] = state.run.set.map((e) => e.id);
  persist();
  question();
}
function question() {
  view = "question";
  const r = state.run,
    e = r.set[r.index],
    q = byId.get(e.id);
  mount(
    `<div class="narrow"><div class="question-meta"><span>${LEVELS[r.level].name} · ちいかわ検定</span><span>ネタバレあり</span></div><div class="progress" role="progressbar" aria-label="回答した問題数" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${r.answers.filter((a) => a !== null).length}"><i style="width:${r.answers.filter((a) => a !== null).length * 10}%"></i></div><section class="paper question"><div class="question-meta"><span class="eyebrow">QUESTION ${String(r.index + 1).padStart(2, "0")} / 10</span><span class="tag">${q.category}</span></div><h1 tabindex="-1">${esc(q.text)}</h1>${evidence(q)}<div class="answers" role="group" aria-label="回答をひとつ選択">${e.order.map((value, i) => `<button class="answer" data-answer="${value}" aria-pressed="${r.answers[r.index] === value}"><span class="letter" aria-hidden="true">${"ABCD"[i]}</span><span>${esc(q.options[value])}</span></button>`).join("")}</div><div class="question-footer"><button class="text-button" data-action="back" ${r.index === 0 ? "disabled" : ""}>前の問題</button><button class="primary" data-action="next" ${r.answers[r.index] === null ? "disabled" : ""}>${r.index === 9 ? "採点する" : "次の問題へ"} <span aria-hidden="true">→</span></button></div></section><button class="text-button" data-action="home">中断してトップへ</button><p class="small">選んだ回答は「次の問題へ」を押す前でも保存されます。</p></div>`,
  );
}
function finish() {
  const r = state.run;
  const s = score(r);
  r.done = true;
  if (!state.records.some((x) => x.id === r.id))
    state.records.push({
      id: r.id,
      level: r.level,
      date: r.date,
      correct: s.correct,
    });
  state.records = state.records.slice(-20);
  persist();
  result();
}
function result() {
  view = "result";
  const r = state.run,
    l = LEVELS[r.level],
    s = score(r);
  mount(
    `<div class="narrow"><section class="paper result"><p class="eyebrow">YOUR LITTLE ACHIEVEMENT</p>${grass}<h1 tabindex="-1">${s.passed ? "合格、おめでとう。" : "ここから、もう一歩。"}</h1><p>${l.name} · ${l.title}</p><div class="score">${s.points}<small> / 100点</small></div><p class="result-note">${s.correct} / 10問正解 · 合格ライン ${l.pass * 10}点<br>${s.passed ? "好きな世界のこと、またひとつ確かめられました。" : "知らなかったことも、今日からあなたの思い出に。解説を読んで、また挑戦してみよう。"}</p></section>${s.passed ? `<section class="certificate ${r.level === "special" ? "special-certificate" : ""}" id="certificate"><span class="certificate-ribbon">がんばったあなたへ</span><span class="eyebrow">CHIIKAWA FAN EXAM</span><h2>合 格 証</h2><div class="certificate-grade"><span>ちいかわ検定</span><strong>${l.name}</strong><small>${l.title}</small></div><p class="name" id="certificate-name">ちいかわ好きのあなた 様</p><p><b class="certificate-points">${s.points}点で合格！</b><br>好きな世界の思い出を、たくさん集めました。</p><div class="seal">${l.title}<br>合格</div><p>${new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(r.date))}</p><p class="small">非公式ファン検定 · 本サイト独自の記念証です</p></section><label class="name-field">合格証に入れる名前（任意・20文字まで／保存しません）<input id="certificate-input" maxlength="20" placeholder="ちいかわ好きのあなた" autocomplete="off"></label><button class="secondary" data-action="print">合格証を印刷する</button>` : ""}<div class="actions"><button class="primary" data-level="${r.level}">別の10問に挑戦する</button><button class="secondary" data-action="home">ほかの級を選ぶ</button></div><div class="actions"><button class="secondary" data-action="share">結果をシェアする</button></div><div id="share-fallback"></div><h2 class="review-heading">答え合わせの時間</h2><p class="small">問題を開くと、あなたの回答・正解・解説が見られます。</p>${r.set
      .map((e, i) => {
        const q = byId.get(e.id),
          ok = r.answers[i] === q.correct,
          src = SOURCES[q.source];
        return `<details class="review" ${ok ? "" : "open"}><summary><span class="${ok ? "correct" : "wrong"}">${ok ? "正解" : "不正解"}</span> · Q${i + 1} ${esc(q.text)}</summary>${evidence(q)}<p class="chosen">あなたの回答：${esc(q.options[r.answers[i]])}</p><p><b>正解：${esc(q.options[q.correct])}</b><br>${esc(q.explanation)}</p><a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.label}を読む（別タブ）</a></details>`;
      })
      .join("")}${sister}</div>`,
  );
}
async function share() {
  const r = state.run,
    s = score(r);
  const text = `ちいかわ検定 ${LEVELS[r.level].name}で${s.points}点！${s.passed ? "合格しました。" : "もう一度挑戦します。"}\nあなたも挑戦してみませんか？（本編ネタバレあり）`,
    url = "https://nanasisan12345-ops.github.io/chiikawa-kentei/";
  try {
    if (navigator.share) {
      await navigator.share({ title: "ちいかわ検定", text, url });
      return;
    }
  } catch (e) {
    if (e.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(text + "\n" + url);
    tell("結果とURLをコピーしました。");
  } catch {
    if (view !== "result") return;
    document.querySelector("#share-fallback").innerHTML =
      `<label class="small">この文章を選択してコピーできます<textarea class="manual-copy" readonly>${esc(text + "\n" + url)}</textarea></label>`;
  }
}
main.addEventListener("change", (e) => {
  if (e.target.id === "consent")
    main.querySelector('[data-action="start"]').disabled = !e.target.checked;
});
main.addEventListener("input", (e) => {
  if (e.target.id === "certificate-input")
    document.querySelector("#certificate-name").textContent =
      (e.target.value.trim() || "ちいかわ好きのあなた") + " 様";
});
main.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.level) {
    setup(b.dataset.level);
    return;
  }
  if (b.dataset.answer !== undefined && view === "question") {
    state.run.answers[state.run.index] = Number(b.dataset.answer);
    persist();
    const answered = state.run.answers.filter((a) => a !== null).length;
    main.querySelector(".progress").setAttribute("aria-valuenow", answered);
    main.querySelector(".progress i").style.width = answered * 10 + "%";
    main
      .querySelectorAll("[data-answer]")
      .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
    main.querySelector('[data-action="next"]').disabled = false;
    return;
  }
  switch (b.dataset.action) {
    case "home":
      home();
      break;
    case "start":
      start();
      break;
    case "resume":
      state.run.done ? result() : question();
      break;
    case "back":
      if (state.run.index > 0) {
        state.run.index--;
        persist();
        question();
      }
      break;
    case "next":
      if (view !== "question" || state.run.answers[state.run.index] === null)
        return;
      if (state.run.index === 9) finish();
      else {
        state.run.index++;
        persist();
        question();
      }
      break;
    case "print":
      window.print();
      break;
    case "share":
      share();
      break;
    case "clear":
      view = "clear";
      mount(
        '<div class="narrow paper"><h1 tabindex="-1">記録を消しますか？</h1><p>この検定の途中回答と成績を消します。キャラ診断の記録には影響しません。</p><div class="actions"><button class="primary" data-action="confirm-clear">記録を消す</button><button class="secondary" data-action="home">戻る</button></div></div>',
      );
      break;
    case "confirm-clear":
      state = emptyState();
      const cleared = persist();
      home();
      tell(cleared ? "この検定の記録を消しました。" : "画面上の記録を消しましたが、ブラウザの保存データを更新できませんでした。");
  }
});
home();
if (restored.error) tell(restored.error);
