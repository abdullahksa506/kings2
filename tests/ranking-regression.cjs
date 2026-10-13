/*
 * 🤖 الروبوت قال: كل شيء شغال لأن الصفحة فتحت!
 * قلنا له: جرّب الحساب والصلاحيات، مو زر التشغيل بس 😂🧪
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const ts = require(path.join(repo, 'node_modules/typescript'));
const source = fs.readFileSync(path.join(repo, 'src/lib/correctedRanking.server.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
const names = ['خالد', 'طلال', 'شوكا', 'حكير', 'هشام', 'نواف'];
const kingSource = fs.readFileSync(path.join(repo, 'src/components/KingsLeaderboard.tsx'), 'utf8');
const kingTree = ts.createSourceFile('KingsLeaderboard.tsx', kingSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let oldFetch;
function findOldFetch(node) { if (ts.isVariableDeclaration(node) && node.name.getText(kingTree) === 'fetchData') oldFetch = node.initializer.getText(kingTree); ts.forEachChild(node, findOldFetch); }
findOldFetch(kingTree);
const oldCompiled = ts.transpileModule(`exports.run = ${oldFetch};`, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
async function oldList(weeks) {
  let captured;
  const api = {exports:{}};
  vm.runInNewContext(oldCompiled, {exports:api.exports, setLoading:()=>{}, setData:data=>{captured=data;}, isRealOuting:w=>!w.isRandom&&names.includes(w.king)&&Number.isInteger(w.cycleNumber)&&w.cycleNumber>0&&w.cycleNumber<100, services:{getAllCompletedWeeks:async()=>weeks.filter(w=>w.status==='completed').map(week=>({week,averageScore:week.historicalAverageRating}))}});
  await api.exports.run(); return captured;
}
const makeDocs = rows => rows.map((row, i) => ({id: row.id || `doc${i}`, data: () => row}));
const snapshot = rows => {const docs = makeDocs(rows); return {docs, forEach: fn => docs.forEach(fn)};};
async function run(weeks, ratings = [], config = {}) {
  const api = {exports: {}};
  const adminDb = {collection: name => ({get: async () => snapshot(name === 'weeks' ? weeks : ratings), doc: () => ({get: async () => ({data: () => config})})})};
  vm.runInNewContext(compiled, {exports: api.exports, require: name => {assert.equal(name, '@/lib/firebase-admin'); return {adminDb};}});
  return api.exports.computeCorrectedRanking();
}
const complete = (cycles, scores = {}) => cycles.flatMap(cycle => names.map((king, index) => ({id: `w${cycle}_${index}`, king, cycleNumber: cycle, status: 'completed', historicalAverageRating: king === names[0] ? (scores[cycle] ?? 4) : 4})));
const plain = value => JSON.parse(JSON.stringify(value));
const results = [];
async function check(name, fn) { try {const details = await fn(); results.push({name, status:'confirmed', ...details});} catch (e) {results.push({name, status:'test-error', error:e.message});} }
(async () => {
  await check('weighted_average_for_complete_final_cycle', async () => {
    const r = await run(complete([1,7], {1:5,7:1}));
    const row = r.rows.find(r => r.king === names[0]);
    assert.ok(Math.abs(row.average - (5+1*2.5)/3.5) < 1e-12);
    return {correct:true, average:row.average, weightedCycle:r.weightedCycle};
  });
  await check('actual_old_list_algorithm_is_simple_mean', async () => {
    const rows=await oldList(complete([1,6],{1:5,6:1}));
    const row=rows.find(r=>r.king===names[0]); assert.equal(row.average,3); assert.equal(row.count,2);
    return {correct:true, actualOldListAverage:row.average, noCycleWeightOrDrop:true};
  });
  await check('seventh_cycle_immediate_weight_and_legacy_config_migration', async () => {
    const r = await run([...complete([1],{1:2}), complete([7], {7:5})[0]],[],{finalCycle:6});
    assert.equal(r.weightedCycle,7); assert.equal(r.finalCycle,7); assert.ok(!r.excludedCycles.includes(7));
    assert.ok(Math.abs(r.rows.find(r=>r.king===names[0]).average-(2+5*2.5)/3.5)<1e-12);
    return {correct:true, immediateSeventhCycleWeight:true};
  });
  await check('worst_outing_can_be_only_weighted_outing_per_user_law', async () => {
    const r = await run(complete([1,2,3,7], {1:3,2:4,3:4,7:1}));
    const row = r.rows.find(r => r.king === names[0]);
    assert.equal(row.droppedScore,1);assert.equal(row.average,11/3);
    return {correct:true, actual:row.average, droppedOnlyWeightedOuting:true};
  });
  await check('active_outings_do_not_count', async () => {
    const active = complete([6]).map(w => ({...w,status:'active'}));
    const r = await run(active);
    assert.equal(r.weightedCycle,null); assert.equal(r.rows.length,0);
    return {fixed:true, actualWeightedCycle:r.weightedCycle, expectedWeightedCycle:null};
  });
  await check('invalid_score_above_five_rejected', async () => {
    const r = await run(complete([1], {1:99}));
    assert.ok(r.rows.every(row=>row.average<=5)); assert.equal(r.rows.length,0);
    return {correct:true, rejectedOutOfRangeHistoricalScore:99};
  });
  await check('baseline_includes_partial_cycles', async () => {
    const weeks = [...complete([1], {1:2}), complete([6], {6:5})[0]];
    const r = await run(weeks); const row=r.rows.find(r=>r.king===names[0]);
    const actualOld = (await oldList(weeks)).find(r=>r.king===names[0]);
    assert.equal(row.baseAverage,3.5);
    assert.equal(actualOld.average,3.5);
    return {fixed:true, actualDisplayedBaseline:row.baseAverage, actualOldListAverage:actualOld.average};
  });
  await check('recusal_does_not_change_original_baseline', async () => {
    const weeks = complete([1]); delete weeks[0].historicalAverageRating;
    const ratings = [1,5,5,5].map((score,index)=>({weekId:weeks[0].id,userName:names[index+1],score}));
    const r=await run(weeks,ratings,{recusedPairs:[[names[0],names[1]]]});
    const row=r.rows.find(r=>r.king===names[0]); assert.equal(row.baseAverage,4);assert.equal(row.average,5);
    return {fixed:true, actualDisplayedBaseline:row.baseAverage, actualOldListAverage:4};
  });
  await check('recusal_three_raters_safeguard', async () => {
    const weeks=complete([1]); delete weeks[0].historicalAverageRating;
    const ratings=[1,5,5].map((score,index)=>({weekId:weeks[0].id,userName:names[index+1],score}));
    const r=await run(weeks,ratings,{recusedPairs:[[names[0],names[1]]]});
    const row=r.rows.find(r=>r.king===names[0]); assert.ok(Math.abs(row.average-11/3)<1e-12);
    return {correct:true, keptOriginalVotesWhenOnlyTwoRemain:true};
  });
  await check('random_outings_are_excluded', async () => {
    const r=await run(complete([1]).map(w=>({...w,isRandom:true}))); assert.equal(r.rows.length,0);
    return {correct:true};
  });
  await check('completed_sixth_cycle_has_normal_weight', async () => {
    const r = await run(complete([1,6],{1:5,6:1}),[],{finalCycle:6});
    assert.equal(r.finalCycle,7); assert.equal(r.weightedCycle,null);
    assert.equal(r.rows.find(r=>r.king===names[0]).average,3);
    return {correct:true};
  });
  await check('unweighted_incomplete_sixth_cycle_stays_excluded', async () => {
    const r = await run([...complete([1]),complete([6])[0]]);
    assert.ok(r.excludedCycles.includes(6)); assert.equal(r.weightedCycle,null);
    return {correct:true};
  });
  await check('king_average_does_not_weight_number_of_raters', async () => {
    const weeks = complete([1,2],{1:5,2:1});
    const ratings = [
      {weekId:'w1_0',userName:names[1],score:5},
      ...names.slice(1).map(userName=>({weekId:'w2_0',userName,score:1})),
    ];
    const row = (await run(weeks,ratings)).rows.find(r=>r.king===names[0]);
    assert.equal(row.average,3); assert.equal(row.baseAverage,3);
    assert.equal((await oldList(weeks)).find(r=>r.king===names[0]).average,3);
    return {correct:true,oneRaterAndFiveRatersHaveEqualOutingWeight:true};
  });
  const report={source:'Actual ranking source executed with synthetic snapshots; no production reads or writes.',results:plain(results)};

  console.log(JSON.stringify(report,null,2));
  if(results.some(r=>r.status==='test-error')) process.exitCode=1;
})();
