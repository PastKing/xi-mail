(() => {
  try {
    const saved = localStorage.getItem('ui');
    if (!saved) return;
    const { dark } = JSON.parse(saved);
    document.documentElement.classList.toggle('dark', Boolean(dark));
    const isMobile = !window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    const color = dark ? (isMobile ? '#141414' : '#000000') : (isMobile ? '#FFFFFF' : '#F1F1F1');
    document.getElementById('theme-color-meta').setAttribute('content', color);
  } catch {
    // A broken theme preference must not prevent application startup.
  }
})();
