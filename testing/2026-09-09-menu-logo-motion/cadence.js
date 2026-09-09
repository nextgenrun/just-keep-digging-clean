// Instrument the review's own media players; no game-state inspection is needed.
export function watchMedia(sprite, name, limit) {
  const stats = { name, gaps: [], wraps: [], callbacks: 0, hiddenBreaks: 0 };
  let last = null, handle = null, disposed = false;
  const video = sprite.video;
  let baseline=video.getVideoPlaybackQuality?.()??{},started=performance.now();
  const reset = () => { stats.gaps=[];stats.wraps=[];stats.callbacks=0;stats.hiddenBreaks=0;last=null;baseline=video.getVideoPlaybackQuality?.()??{};started=performance.now(); };
  const tick = (now, frame) => {
    if (disposed) return;
    if (!document.hidden && !video.paused) {
      if (last) {
        const gap = now-last.now;
        stats.gaps.push(gap);if(stats.gaps.length>limit)stats.gaps.shift();
        if(frame.mediaTime<last.time)stats.wraps.push({gapMs:Math.round(gap*10)/10,from:last.time,to:frame.mediaTime});
      }
      last={now,time:frame.mediaTime};stats.callbacks++;
    } else last=null;
    handle=video.requestVideoFrameCallback?.(tick);
  };
  const visibility = () => {last=null;stats.hiddenBreaks++;};
  document.addEventListener('visibilitychange',visibility);
  handle=video.requestVideoFrameCallback?.(tick);
  return {
    reset,
    sample(){
      const q=video.getVideoPlaybackQuality?.();const sorted=[...stats.gaps].sort((a,b)=>a-b);
      return {name,time: +video.currentTime.toFixed(2),duration:video.duration,width:video.videoWidth,height:video.videoHeight,
        paused:video.paused,readyState:video.readyState,error:video.error?.message??null,
        sampleSeconds:Math.round((performance.now()-started)/1000),totalFrames:(q?.totalVideoFrames??0)-(baseline.totalVideoFrames??0),droppedFrames:(q?.droppedVideoFrames??0)-(baseline.droppedVideoFrames??0),callbacks:stats.callbacks,
        gapP95:Math.round((sorted[Math.floor(sorted.length*.95)]??0)*10)/10,
        gapMax:Math.round((sorted.at(-1)??0)*10)/10,wraps:stats.wraps,hiddenBreaks:stats.hiddenBreaks};
    },
    stop(){disposed=true;video.cancelVideoFrameCallback?.(handle);document.removeEventListener('visibilitychange',visibility);}
  };
}
