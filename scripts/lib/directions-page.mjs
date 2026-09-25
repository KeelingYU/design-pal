// 配色方向页：同一组件库样式下并排比较 2～3 个配色（缩略图为草稿演示页的真实渲染）
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function directionsHtml(state, libraryName = state.library) {
  const cards = state.directions.map((d) => `
    <div class="dir">
      <div class="head"><span class="letter">${esc(d.label)}</span><div><h2>${esc(d.name)}</h2><p>${esc(d.desc || '')}</p></div></div>
      <div class="chips">${['primary', 'bg', 'surface2', 'text', 'text2', 'success', 'warning', 'danger'].map((k) => `<i data-k="${k}" data-light="${d.light[k]}" data-dark="${d.dark[k]}" style="background:${d.light[k]}"></i>`).join('')}</div>
      <div class="frame"><iframe tabindex="-1" data-theme="${esc(d.id)}" title="${esc(d.name)}"></iframe></div>
    </div>`).join('');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>配色方向 · ${esc(state.name)} · design-pal</title>
<style>
  body { margin: 0; background: #F5F5F4; color: #1C1917; font: 14px/1.6 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }
  .bar { height: 56px; display: flex; align-items: center; gap: 14px; padding: 0 20px; background: #fff; border-bottom: 1px solid #E7E5E4; }
  .spacer { flex: 1; } .muted { color: #57534E; }
  .seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 8px; background: #F0EFED; }
  .seg button { padding: 4px 12px; border: 0; border-radius: 6px; background: none; font: 500 13px inherit; cursor: pointer; }
  .seg button[aria-pressed="true"] { background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / .08); }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 28px 24px 80px; }
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
  .dir { overflow: hidden; border: 1px solid #E7E5E4; border-radius: 14px; background: #fff; }
  .head { display: flex; gap: 12px; padding: 14px 18px; }
  .letter { width: 28px; height: 28px; flex: none; display: grid; place-items: center; border-radius: 8px; background: #1C1917; color: #fff; font-weight: 700; }
  h2 { margin: 0; font-size: 16px; } .head p { margin: 2px 0 0; color: #57534E; font-size: 13px; }
  .chips { display: flex; gap: 4px; padding: 0 18px 12px; }
  .chips i { width: 22px; height: 22px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .08); }
  .frame { position: relative; height: 260px; overflow: hidden; border-top: 1px solid #E7E5E4; }
  .frame iframe { position: absolute; top: 0; left: 0; width: 760px; border: 0; transform-origin: 0 0; pointer-events: none; }
  .next { margin-top: 20px; padding: 16px 20px; border: 1px solid #E7E5E4; border-radius: 14px; background: #fff; }
  .next ul { margin: 8px 0 0; padding-left: 20px; color: #57534E; }
</style></head>
<body>
<header class="bar"><b>design-pal</b><span class="muted">${esc(libraryName)}组件库 · 新颜色主题「${esc(state.name)}」 · 第 1 步：选配色方向</span><span class="spacer"></span>
  <div class="seg" id="mode"><button data-m="light" aria-pressed="true">亮色</button><button data-m="dark" aria-pressed="false">暗色</button></div></header>
<main class="wrap">
  <p class="muted">布局、形状、交互都沿用组件库，这里只比较配色。</p>
  <div class="cols">${cards}</div>
  <div class="next"><strong>下一步：回到对话里告诉 Agent 你的选择</strong><ul><li>直接选：「选 A」</li><li>混搭或微调：「A 的主色 + B 的底色」「C 再低调一点」</li><li>都不满意：说哪里不对，Agent 重新出方向</li></ul></div>
</main>
<script>
  let mode = 'light';
  function render() {
    document.querySelectorAll('iframe').forEach((f) => { f.src = 'directions-demo.html?theme=' + f.dataset.theme + '&mode=' + mode + '#mini'; const box = f.parentElement, k = box.clientWidth / 760; f.style.transform = 'scale(' + k + ')'; f.style.height = box.clientHeight / k + 'px'; });
    document.querySelectorAll('.chips i').forEach((i) => (i.style.background = i.dataset[mode]));
  }
  document.querySelectorAll('#mode button').forEach((b) => (b.onclick = () => { document.querySelectorAll('#mode button').forEach((x) => x.setAttribute('aria-pressed', x === b)); mode = b.dataset.m; render(); }));
  addEventListener('resize', render);
  render();
</script>
</body></html>
`;
}
