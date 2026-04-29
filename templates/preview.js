// Preview mode — injects nav and auto-scales slide to fit viewport
(function(){
  // Add preview CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/templates/preview.css';
  document.head.appendChild(link);

  // Get all variants
  const slides = [...document.querySelectorAll('.slide')];
  const variants = slides.map(s => s.dataset.variant);

  // Build nav bar
  const nav = document.createElement('div');
  nav.className = 'preview-nav';
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = document.title || 'Template';
  nav.appendChild(title);

  variants.forEach(v => {
    const btn = document.createElement('button');
    btn.textContent = v;
    btn.onclick = () => {
      showVariant(v);
      nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      scaleSlide();
    };
    nav.appendChild(btn);
  });
  document.body.prepend(nav);

  // Auto-scale visible slide to viewport
  function scaleSlide(){
    const visible = document.querySelector('.slide[style=""], .slide:not([style*="display:none"]):not([style*="display: none"])');
    if(!visible) return;
    const navH = nav.offsetHeight + 20;
    const maxW = window.innerWidth - 40;
    const maxH = window.innerHeight - navH - 40;
    const scaleW = maxW / 1080;
    const scaleH = maxH / 1350;
    const scale = Math.min(scaleW, scaleH, 1);
    visible.style.transform = `scale(${scale})`;
    visible.style.marginTop = (navH + 10) + 'px';
    // hide overflow from unscaled size
    document.body.style.height = (1350 * scale + navH + 40) + 'px';
  }

  // Initial
  setTimeout(() => {
    nav.querySelector('button').classList.add('active');
    scaleSlide();
  }, 100);
  window.addEventListener('resize', scaleSlide);
})();
