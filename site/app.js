// lesson-08 site router: 先从相对路径取 md，失败回退 GitHub raw
const RAW = 'https://raw.githubusercontent.com/xinchun575924529/n8n-lesson-08-branded-ai-chatbot/main/';
const docs = [
  ['课程主页',        'README.md'],
  ['约定 LEGEND',     'LEGEND.md'],
  ['00 总览',         'docs/00-overview.md'],
  ['01 入口与品牌化', 'docs/01-trigger-and-branding.md'],
  ['02 Agent 与工具', 'docs/02-agent-and-tools.md'],
  ['03 空闲算法深拆', 'docs/03-freetimeslots-algorithm.md'],
  ['04 免费替身架构', 'docs/04-outlook-trio-and-free-replace.md'],
  ['05 坑与防御',     'docs/05-pitfalls-defense.md'],
  ['工作流导览',      'workflows/README.md'],
  ['口播稿',          'script/short-video.md'],
  ['练习',            'exercises/exercises.md'],
];
const nav = document.getElementById('nav');
docs.forEach((d, i) => {
  const a = document.createElement('a');
  a.textContent = d[0]; a.href = '#/' + i; a.dataset.i = i;
  nav.appendChild(a);
});
function cur() { const m = location.hash.match(/#\/(\d+)/); return m ? Number(m[1]) : 0; }
async function fetchText(path) {
  try {
    const r = await fetch(path, { cache: 'no-store' });
    if (r.ok) return await r.text();
  } catch (e) { /* 继续走 raw */ }
  const r2 = await fetch(RAW + path, { cache: 'no-store' });
  if (!r2.ok) throw new Error('HTTP ' + r2.status);
  return await r2.text();
}
async function show(i) {
  nav.querySelectorAll('a').forEach(a => a.className = Number(a.dataset.i) === i ? 'on' : '');
  const el = document.getElementById('doc'); el.innerHTML = '<p class="lb">加载中…</p>';
  try {
    const t = await fetchText(docs[i][1]);
    document.title = docs[i][0] + ' · n8n 教案08';
    el.innerHTML = marked.parse(t);
  } catch (e) { el.innerHTML = '<p>加载失败：' + e.message + '</p>'; }
}
window.addEventListener('hashchange', () => show(cur()));
show(cur());