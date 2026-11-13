/* Gelatin Art Experience: scroll-scrubbed frame sequences + small UI bits.
 *
 * Orders go through Instagram DM (as on the shop's Instagram bio): the form
 * copies the visitor's request and opens a DM to INSTAGRAM.
 * ORDER_EMAIL (optional): set it to send requests by email instead.
 */
const INSTAGRAM = 'gelatinartexperience';
const ORDER_EMAIL = '';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = x => Math.min(1, Math.max(0, x));

/* ---------- frame sequence player ---------- */
class FrameSequence {
  constructor(section) {
    this.section = section;
    this.canvas = section.querySelector('canvas.frames');
    this.ctx = this.canvas.getContext('2d');
    this.name = section.dataset.frames;
    this.count = +section.dataset.count;
    this.images = new Array(this.count);
    this.loaded = new Array(this.count).fill(false);
    this.started = false;
    this.current = 0; this.target = 0; this.drawn = -1;
    this.beats = [...section.querySelectorAll('[data-in]')];
    this.bar = section.querySelector('.progress i');
    this.resize();
  }
  src(i) { return `frames/${this.name}/${String(i + 1).padStart(4, '0')}.webp`; }
  load() {
    if (this.started) return; this.started = true;
    // coarse-to-fine order so scrubbing works before every frame has arrived
    const order = [], seen = new Set();
    for (const step of [16, 8, 4, 2, 1])
      for (let i = 0; i < this.count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    if (!seen.has(this.count - 1)) order.push(this.count - 1);
    let next = 0;
    const pump = () => {
      if (next >= order.length) return;
      const i = order[next++], img = new Image();
      img.decoding = 'async';
      img.onload = () => { this.loaded[i] = true; this.images[i] = img; if (this.drawn < 0 || Math.abs(i - this.current) < 2) this.drawn = -1; pump(); };
      img.onerror = pump;
      img.src = this.src(i);
    };
    for (let k = 0; k < 6; k++) pump(); // 6 parallel requests
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.drawn = -1;
  }
  progress() {
    const r = this.section.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp01(-r.top / total) : 0;
  }
  nearestLoaded(i) {
    for (let d = 0; d < this.count; d++) {
      if (this.loaded[i - d]) return i - d;
      if (this.loaded[i + d]) return i + d;
    }
    return -1;
  }
  draw(i) {
    const k = this.nearestLoaded(i);
    if (k < 0) return;
    const img = this.images[k], cw = this.canvas.width, ch = this.canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    this.drawn = k === i ? i : -1; // keep redrawing until the exact frame shows up
  }
  tick() {
    const p = this.progress();
    this.target = p * (this.count - 1);
    this.current = reduceMotion ? this.target : this.current + (this.target - this.current) * 0.18;
    const i = Math.round(this.current);
    if (i !== this.drawn) this.draw(i);
    for (const b of this.beats) {
      const a = +b.dataset.in, z = +b.dataset.out, f = 0.06;
      const op = Math.min(a <= 0 ? 1 : clamp01((p - a) / f), z > 1 ? 1 : clamp01((z - p) / f));
      b.style.opacity = op.toFixed(3);
      b.style.transform = `translateY(${((1 - op) * 30).toFixed(1)}px)`;
      b.classList.toggle('on', op > 0.5);
    }
    if (this.bar) this.bar.style.transform = `scaleX(${p.toFixed(4)})`;
  }
}

const sequences = [...document.querySelectorAll('.scrolly')].map(s => new FrameSequence(s));
sequences[0]?.load(); // hero loads right away

const lazy = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) {
    sequences.find(s => s.section === e.target)?.load();
    lazy.unobserve(e.target);
  }
}, { rootMargin: '150% 0px' });
sequences.slice(1).forEach(s => lazy.observe(s.section));

addEventListener('resize', () => sequences.forEach(s => s.resize()));

const nav = document.getElementById('nav');
(function loop() {
  for (const s of sequences) {
    const r = s.section.getBoundingClientRect();
    if (r.bottom > -innerHeight && r.top < innerHeight * 2) s.tick();
  }
  nav.classList.toggle('solid', scrollY > innerHeight * 3.6);
  requestAnimationFrame(loop);
})();

/* ---------- reveal on scroll ---------- */
const revealer = new IntersectionObserver(entries => {
  // also reveal anything a jump (menu link, fast fling) carried past the top of the screen
  entries.forEach(e => { if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); revealer.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`;
  revealer.observe(el);
});

/* ---------- order form ---------- */
const form = document.getElementById('order-form'), F = form.elements;
const msg = document.getElementById('form-msg');
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = F.name.value.trim();
  F.name.setAttribute('aria-invalid', !name);
  if (!name) {
    msg.className = 'form-msg err';
    msg.textContent = 'Please add your name so we know who the request is from.';
    return;
  }
  const flavors = [...form.querySelectorAll('input[name="flavor"]:checked')].map(c => c.value).join(', ') || 'Open to ideas';
  const chosen = [...picks.values()].map((p, i) => `${i + 1}. ${p.alt} (${GALLERY[p.kind].title}) ${IG}${p.post}/`).join('\n');
  const body = `Hi Gelatin Art Experience! I'd like to order.\nName: ${name}\nEvent date: ${F.date.value || 'TBD'}\n${F.size.value}\nCraving: ${flavors}`
    + (chosen ? `\nCakes I picked:\n${chosen}` : '')
    + `\nNotes: ${F.notes.value.trim() || '-'}`;
  if (ORDER_EMAIL) {
    location.href = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent('Order request from ' + name)}&body=${encodeURIComponent(body)}`;
    msg.className = 'form-msg ok';
    msg.textContent = 'Your email app should open with your request ready to send. Thank you!';
    return;
  }
  // Orders happen by Instagram DM. Instagram doesn't let websites pre-fill a DM,
  // so we copy the request for the customer and walk them through pasting it.
  openSendDialog(name, body);
});

/* ---------- "almost done" window: copy request, open DM, paste ---------- */
const sendDlg = document.getElementById('send-dialog');
const sendText = document.getElementById('send-text');
const sendStatus = document.getElementById('send-status');
const isTouch = matchMedia('(hover: none)').matches;
document.getElementById('send-paste-hint').textContent = isTouch
  ? 'Tap the message box, hold your finger down, then tap Paste.'
  : 'Click the message box and press Ctrl + V (Cmd + V on a Mac).';
document.getElementById('send-open').href = `https://ig.me/m/${INSTAGRAM}`;

async function copyRequest() {
  const text = sendText.value;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
    try { sendText.select(); ok = document.execCommand('copy'); } catch (e2) { ok = false; }
  }
  sendStatus.className = 'send-status ' + (ok ? 'ok' : 'err');
  sendStatus.textContent = ok ? '✓ Your request is copied' : 'Copy didn’t work. Select the text below and copy it.';
  return ok;
}
function openSendDialog(name, body) {
  document.getElementById('send-title').textContent = `Almost done, ${name}!`;
  sendText.value = body;
  sendDlg.showModal();
  copyRequest();
  msg.className = 'form-msg ok';
  msg.textContent = `Thanks, ${name}! Your request is ready to send on Instagram.`;
}
document.getElementById('send-copy').onclick = copyRequest;
document.getElementById('send-open').addEventListener('click', () => { copyRequest(); });
document.getElementById('send-close').onclick = () => sendDlg.close();
sendDlg.addEventListener('click', e => { if (e.target === sendDlg) sendDlg.close(); });

/* ---------- cake photo viewer ----------
 * Tapping a "What are you craving?" choice shows only that kind of cake.
 * Photos come from @gelatinartexperience on Instagram (site/gallery/).
 * To add one: save it in site/gallery/ and add a line to the right list below.
 */
const IG = 'https://www.instagram.com/p/';
const GALLERY = {
  jello: { title: 'Jello cakes', photos: [
    ['jello-1.jpg', 'Layered jello ring crowned with colorful jelly hearts', 'DfTSQ5siedO'],
    ['jello-2.jpg', 'Red and orange jello ring with roses', 'DfN9PO9hLve'],
    ['jello-3.jpg', 'Pink jello with white orchids', 'DexSbHBEqI0'],
    ['jello-4.jpg', 'Pink flower jello ring with a golden center', 'De2zQ24GYmO'],
    ['jello-5.jpg', 'Red jello ring topped with autumn fruit', 'DfTRRIPCcgo'],
    ['jello-6.jpg', 'Berry jello cake with roses', 'DfBawTABi8l'],
    ['jello-7.jpg', 'Orange layered jello with autumn decorations', 'DeiTeYBBrEG'],
    ['jello-8.jpg', 'Golden jello ring with suspended fruit', 'DeiSultmF8e'],
    ['jello-9.jpg', 'Raspberry red jello with mint and berries', 'DeiM1I8mdIX'],
    ['jello-10.jpg', 'Green layered jello with strawberries', 'DeiIioFhgqZ'],
    ['jello-11.jpg', 'Sunny yellow jello with a sunflower', 'DeiIcRcB1hw'],
    ['jello-12.jpg', 'Red layered jello crowned with flowers and fruit', 'Deh_9nPAQIm'],
    ['jello-13.jpg', 'Starburst jello ring with fruit inside', 'Deh7jwQAZMd'],
    ['jello-14.jpg', 'Blush pink jello with a flower top', 'DefuUF2GMJq'],
    ['jello-15.jpg', 'Picture jello with a pomegranate still life', 'DevT2HnFGYp'],
    ['jello-16.jpg', 'Picture jello with pink peonies', 'DeiVJp2JeLq'],
    ['jello-17.jpg', 'Red jello topped with fresh berries', 'DeiMJFwGWxl'],
    ['jello-18.jpg', 'Picture jello with a wreath of red roses', 'DeiLMjUGXnj'],
    ['jello-19.jpg', 'Picture jello with a purple butterfly', 'DeiKH-gGZZd'],
    ['jello-20.jpg', 'Picture jello with pink roses', 'Deh50mLgeo6'],
    ['jello-21.jpg', 'Berry jello topped with strawberries and blackberries', 'DeiVhSVpiJd'],
    ['jello-22.jpg', 'Mango passion fruit jello with orchids', 'DfYH7XWAe8z'],
  ]},
  mousse: { title: 'Mousse', photos: [
    ['mousse-2.jpg', 'Layered chocolate mousse cake with fresh berries', 'DfN-Vb7mX0-'],
    ['mousse-3.jpg', 'Pistachio layer cake with lemon', 'DfDz_qaJOVv'],
  ]},
  cheesecake: { title: 'Cheesecake', photos: [
    ['cheesecake-1.jpg', 'Cheesecake with a stenciled cocoa design', 'DfBlQ9MFMPy'],
    ['cheesecake-2.jpg', 'Coconut cheesecake with Raffaello and pink bows', 'DeiSFweGOe0'],
    ['cheesecake-3.jpg', 'Oreo cheesecake with cocoa dusting', 'DeiR8RnhoOF'],
    ['cheesecake-4.jpg', 'Raspberry glazed cheesecake with fresh berries', 'DeiQsH-mJuQ'],
  ]},
  minicups: { title: 'Mini cups', photos: [
    ['minicups-1.jpg', 'Mini dessert cups with berries and pistachio', 'DfTKlbOBQ_2'],
    ['minicups-2.jpg', 'Colorful mini jellies on lace doilies', 'DexROhtySBq'],
    ['minicups-3.jpg', 'Box of mini desserts and dessert cups', 'DeiRP1Yh2Ll'],
  ]},
};
const gal = document.getElementById('cake-gallery');
const galImg = document.getElementById('gallery-img');
const galPhoto = document.getElementById('gallery-photo');
const galPick = document.getElementById('gallery-pick');
const galDone = document.getElementById('gallery-done');
const galThumbs = document.getElementById('gallery-thumbs');
const galPrev = gal.querySelector('.prev'), galNext = gal.querySelector('.next');
let galKind = null, galSet = null, galIdx = 0;

/* Cakes the customer chose: file -> { file, alt, post, kind }. They go into the order message. */
const picks = new Map();
const picksBox = document.getElementById('picks');
const picksList = document.getElementById('picks-list');

function togglePick() {
  const [file, alt, post] = galSet.photos[galIdx];
  if (picks.has(file)) picks.delete(file);
  else {
    picks.set(file, { file, alt, post, kind: galKind });
    const chip = document.querySelector(`input[data-gallery="${galKind}"]`);
    if (chip) chip.checked = true; // choosing a cake also ticks its type
  }
  refreshPickUI();
  renderPicks();
}
function refreshPickUI() {
  if (!galSet) return;
  const on = picks.has(galSet.photos[galIdx][0]);
  galPhoto.setAttribute('aria-pressed', on);
  galPhoto.setAttribute('aria-label', on ? 'Chosen. Tap to remove this cake from your order' : 'Tap to choose this cake for your order');
  galPick.setAttribute('aria-pressed', on);
  galPick.innerHTML = on ? '&#10003; Chosen for my order' : '&#9825; I want this cake';
  galThumbs.querySelectorAll('button').forEach((b, k) => b.classList.toggle('picked', picks.has(galSet.photos[k][0])));
  galDone.textContent = picks.size ? `Done (${picks.size} chosen)` : 'Done';
}
function renderPicks() {
  picksList.innerHTML = '';
  picks.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="pick-open"><img src="gallery/${p.file}" alt=""></button>`
      + `<button type="button" class="pick-remove">&times;</button><small></small>`;
    li.querySelector('small').textContent = p.alt;
    li.querySelector('.pick-open').setAttribute('aria-label', `See ${p.alt}`);
    li.querySelector('.pick-remove').setAttribute('aria-label', `Remove ${p.alt}`);
    li.querySelector('.pick-open').onclick = () =>
      openGallery(p.kind, GALLERY[p.kind].photos.findIndex(x => x[0] === p.file));
    li.querySelector('.pick-remove').onclick = () => { picks.delete(p.file); renderPicks(); refreshPickUI(); };
    picksList.appendChild(li);
  });
  picksBox.hidden = picks.size === 0;
}

function showPhoto(i) {
  const list = galSet.photos;
  galIdx = (i + list.length) % list.length;
  const [file, alt, post] = list[galIdx];
  galImg.src = `gallery/${file}`; galImg.alt = alt;
  document.getElementById('gallery-alt').textContent = alt;
  document.getElementById('gallery-count').textContent = list.length > 1 ? `${galIdx + 1} / ${list.length}` : '';
  document.getElementById('gallery-post').href = IG + post + '/';
  galThumbs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-current', k === galIdx));
  refreshPickUI();
}
function openGallery(kind, start = 0) {
  galSet = GALLERY[kind]; if (!galSet) return;
  galKind = kind;
  document.getElementById('gallery-title').textContent = galSet.title;
  const many = galSet.photos.length > 1;
  galPrev.hidden = galNext.hidden = galThumbs.hidden = !many;
  galThumbs.innerHTML = '';
  galSet.photos.forEach(([file, alt], k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', alt);
    b.innerHTML = `<img src="gallery/${file}" alt="" loading="lazy">`;
    b.onclick = () => showPhoto(k);
    galThumbs.appendChild(b);
  });
  showPhoto(Math.max(0, start));
  if (!gal.open) gal.showModal();
}
galPhoto.onclick = togglePick; // tap the photo itself to choose it
galPick.onclick = togglePick;
galPrev.onclick = () => showPhoto(galIdx - 1);
galNext.onclick = () => showPhoto(galIdx + 1);
gal.querySelector('.gallery-close').onclick = () => gal.close();
galDone.onclick = () => gal.close();
gal.addEventListener('click', e => { if (e.target === gal) gal.close(); }); // click outside closes
gal.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') showPhoto(galIdx - 1);
  if (e.key === 'ArrowRight') showPhoto(galIdx + 1);
});
document.querySelectorAll('input[data-gallery]').forEach(cb =>
  cb.addEventListener('change', () => { if (cb.checked) openGallery(cb.dataset.gallery); }));

document.getElementById('year').textContent = new Date().getFullYear();
