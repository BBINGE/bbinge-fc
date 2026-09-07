document.querySelectorAll<HTMLElement>('[data-journey-ugc-video]').forEach((container) => {
  const videoId = container.dataset.youtubeId;
  const poster = container.querySelector<HTMLButtonElement>('.journey-ugc-video__poster, .journey-video-callout__trigger');
  const player = container.querySelector<HTMLElement>('.journey-ugc-video__player');
  const frame = container.querySelector<HTMLIFrameElement>('iframe');
  const close = player?.querySelector<HTMLButtonElement>('button');
  if (!videoId || !poster || !player || !frame || !close) return;

  const stop = () => {
    frame.removeAttribute('src');
    player.hidden = true;
    poster.hidden = false;
    container.classList.remove('is-playing');
    poster.focus();
  };

  poster.addEventListener('click', () => {
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1`;
    poster.hidden = true;
    player.hidden = false;
    container.classList.add('is-playing');
  });
  close.addEventListener('click', stop);
  container.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && container.classList.contains('is-playing')) stop();
  });
});
