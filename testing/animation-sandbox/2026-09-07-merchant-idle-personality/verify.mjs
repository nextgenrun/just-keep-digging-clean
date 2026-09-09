import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MERCHANT_IDLE_PERSONALITY as C } from '../../../values/merchantIdlePersonalitySandbox.js';
import { MERCHANT_MOTION_CAST as CAST, MERCHANT_MOTION_CONFIG as M } from '../../../values/merchantMotion.js';
import { MERCHANT_MOTION_RIGS as RIGS } from '../../../values/merchantMotionRigs.js';
import { NPC_ACTIVITY_CONFIG as NPC } from '../../../values/npcActivityConfig.js';
import { GAME_CONFIG } from '../../../values/gameConfig.js';
import { sampleActivity } from './timeline.js';
import { weightsAt, samplePose, transformPoint } from '../../../systems/visual/merchantMotionMath.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const ids = C.activities.map(activity => activity.id);
const report = { created: new Date().toISOString(), scope: 'sandbox only', checks: {}, merchants: [], browser: 'See browser-validation.json for separately captured browser evidence' };
assert.equal(CAST.length, 6); assert.equal(ids.length, 7);
assert.deepEqual([...ids].sort(), [...NPC.activityIds].sort());
const routes = ['/testing/animation-sandbox/2026-09-07-merchant-idle-personality/index.html'];
for (let index = 0; index < CAST.length; index++) {
  const cast = CAST[index], meta = NPC.merchants[cast.id];
  const foot = meta.footBottomYAtReferencePx * M.referenceSize / NPC.render.referenceCanvasSizePx;
  assert.ok(Number.isFinite(foot) && foot > 0 && foot <= M.referenceSize);
  const seen = new Set();
  for (let cycle = 0; cycle < ids.length; cycle++) {
    const state = sampleActivity(C.firstActivity + index * C.naturalStagger + cycle * C.cycleSeconds + 2, index);
    seen.add(state.activity); assert.equal(state.mix, 1);
  }
  assert.deepEqual([...seen].sort(), [...ids].sort());
  for (const id of ids) {
    const route = C.activityPath + meta.assetSlug + '-' + id + '.webp';
    assert.ok((await fs.stat(path.join(root, route))).size > 1000); routes.push(route);
    for (let step = 0; step <= 240; step++) {
      const result = sampleActivity(step / 20, index, id);
      assert.ok(Number.isFinite(result.mix) && result.mix >= 0 && result.mix <= 1);
      assert.ok(result.activity === null || result.activity === id);
    }
  }
  const base = C.baselinePath + meta.assetSlug + '.webp';
  assert.ok((await fs.stat(path.join(root, base))).size > 1000); routes.push(base);
  const poseRig = RIGS[cast.id].filter(bone => ['body', 'head'].includes(bone.name));
  for (const rig of [RIGS[cast.id], poseRig]) {
    for (const time of [0, 1.1, 2.4, 5.7, 8.3]) {
      const pose = samplePose(cast, rig, time, time < C.actionSeconds ? time : -1);
      for (const x of [128, 512, 896]) {
        const point = weightsAt(rig, x, foot, foot).reduce((sum, [joint, weight]) => {
          const p = transformPoint(pose.matrices[joint], x, foot);
          return [sum[0] + p[0] * weight, sum[1] + p[1] * weight];
        }, [0, 0]);
        assert.ok(Math.abs(point[0] - x) < 1e-8 && Math.abs(point[1] - foot) < 1e-8);
      }
    }
  }
  const metadata = JSON.parse(await fs.readFile(path.join(root, 'sprites/npc/npc-v13-piskel-polished-activities/reports/' + meta.assetSlug + '-metadata.json'), 'utf8'));
  assert.equal(metadata.centeringPolicy.minUniformScale, metadata.centeringPolicy.maxUniformScale);
  assert.ok(Math.abs(metadata.centeringPolicy.runtimeBaselineY - meta.footBottomYAtReferencePx) < 1);
  report.merchants.push({ id: cast.id, recoveredPoses: seen.size, fixedPoseScale: true, footReferencePx: foot });
}
const sources = ['main.js','PersonalityCard.js','PersonalityRenderer.js','timeline.js'];
for (const name of sources) {
  const source = await fs.readFile(path.join(here, name), 'utf8');
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) assert.ok((await fs.stat(path.resolve(here, match[1]))).isFile());
  assert.ok(source.split('\n').length <= 300);
}
report.checks = { distinctActivityCoverage: '42 / 42', fixedScaleMetadata: '6 / 6', groundedMeshSamples: 'passed', finiteTransitionSamples: 'passed', modulePaths: 'passed', gameSpriteSizePx: GAME_CONFIG.playerDisplaySizePx * NPC.render.displayScale };
const http = await Promise.all(routes.map(async route => {
  const response = await fetch('http://127.0.0.1:8080' + route, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, route); return { route, status: response.status };
}));
report.checks.httpAssets = http.length + ' / ' + routes.length;
await fs.writeFile(path.join(here, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
