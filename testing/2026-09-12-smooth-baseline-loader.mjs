// Replay two older fixture failures without this pass's source changes, in memory only.
import { registerHooks } from 'node:module';
registerHooks({load(url,context,nextLoad){
  const result=nextLoad(url,context);
  if(!url.endsWith('/WorldModel.js') && !url.endsWith('/WorldVisualSurfaceMotionView.js'))return result;
  let source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
  if(url.endsWith('/WorldModel.js'))source=source
    .replace('    this.tileTypeRevision = 0;\n','')
    .replace('    if (this._types[index] !== type) this.tileTypeRevision += 1;\n','')
    .replace('    if (this._types[idx] !== type) this.tileTypeRevision += 1;\n','')
    .replace('      this.tileTypeRevision += 1;\n','');
  else source=source.replace('import { destroyScenicVideo } from "./destroyScenicVideo.js";\n','')
    .replace('    destroyScenicVideo(this.video);','    this.video?.stop?.(false);\n    this.video?.clearMask?.(false);\n    this.video?.destroy?.();');
  return {...result,source};
}});
