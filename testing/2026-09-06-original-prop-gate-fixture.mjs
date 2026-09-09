import {registerHooks} from 'node:module';
registerHooks({load(url,context,nextLoad){
 const result=nextLoad(url,context);
 if(url.includes('/WorldVisualSurfacePropLayer.js')){
  const source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
  return {...result,source:source.replace(/isGameplayFeatureEnabled\(GAMEPLAY_FEATURE_IDS\.LEVEL_TWO,\s*this\.scene\.gameplayCapabilities \|\| this\.scene\.registry\?\.\s*get\?\.\("gameplayCapabilities"\)\)/,'isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)')};
 }
 return result;
}});
await import('./2026-07-26-surface-props-contract.mjs');

