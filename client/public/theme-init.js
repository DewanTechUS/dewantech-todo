(function () {
  try {
    var pref = JSON.parse(localStorage.getItem('dt.theme') || '"system"');
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* storage unavailable: fall back to light until React mounts */
  }
})();
