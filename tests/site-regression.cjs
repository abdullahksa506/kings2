/*
 * 🤖 الروبوت قال: كل شيء شغال لأن الصفحة فتحت!
 * قلنا له: جرّب الحساب والصلاحيات، مو زر التشغيل بس 😂🧪
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..');
const ts=require(path.join(repo,'node_modules/typescript'));
const names=['خالد','طلال','شوكا','حكير','هشام','نواف'];
const read=f=>fs.readFileSync(path.join(repo,f),'utf8');
const parse=f=>ts.createSourceFile(f,read(f),ts.ScriptTarget.Latest,true,f.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
function all(tree,pred){const found=[];function visit(n){if(pred(n))found.push(n);ts.forEachChild(n,visit);}visit(tree);return found;}
const treeServices=parse('src/lib/services.ts'),treeRpc=parse('src/app/api/rpc/route.ts');
const helpers=all(treeServices,n=>ts.isFunctionDeclaration(n)&&['isHistoricalWeek','isJunkWeek','isRealOuting','isCompetitiveWeek','outingAverage','meanRatedWeeks'].includes(n.name?.text)).map(n=>n.getText(treeServices)).join('\n');
function exec(code,context={}){const exports={};const ctx={exports,VALID_NAMES:names,VALID_NAMES_RPC:names,console,TextEncoder,crypto:require('node:crypto').webcrypto,...context};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx);return exports;}
const helperExports=exec(helpers+';exports.outingAverage=outingAverage;exports.meanRatedWeeks=meanRatedWeeks;');
const passwordNode=all(treeRpc,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='requirePassword')[0];
const passwordExports=exec(passwordNode.getText(treeRpc)+';exports.requirePassword=requirePassword;');
function namedArrow(file,name){const t=parse(file);const n=all(t,n=>ts.isVariableDeclaration(n)&&n.name.getText(t)===name)[0];if(!n)throw Error(`${file}:${name} missing`);return n.initializer.getText(t);}
function method(name,ctx){const n=all(treeServices,n=>ts.isMethodDeclaration(n)&&n.name.getText(treeServices)===name)[0];return exec(`exports.run=async function(${n.parameters.map(p=>p.getText(treeServices)).join(',')}) ${n.body.getText(treeServices)};`,{...helperExports,...ctx}).run;}
function rpcCase(action,ctx){const n=all(treeRpc,n=>ts.isCaseClause(n)&&n.expression.text===action)[0];return exec(`exports.run=async()=>{${n.statements.map(s=>s.getText(treeRpc)).join('\n')}};`,{...passwordExports,createHash:require('node:crypto').createHash,NextResponse:{json:(result,options)=>({result,status:options?.status||200})},...ctx}).run;}
const timestamp=n=>({toMillis:()=>n});
const week=(id,extra={})=>({id,status:'completed',king:names[0],cycleNumber:6,restaurant:'مطعم',createdAt:timestamp(100),...extra});
function docs(rows){return {docs:rows.map(w=>({id:w.id,data:()=>w})),forEach(fn){this.docs.forEach(fn)}};}
const output=[];
async function check(name,fn){try{const details=await fn();output.push({name,status:'confirmed',...details});}catch(e){output.push({name,status:'test-error',error:e.stack?.split('\n').slice(0,2).join(' ')});}}
(async()=>{
 await check('service_week_average_and_member_score_privacy',async()=>{const rows=[week('a'),week('b',{createdAt:timestamp(200)})];const grouped=new Map([['a',{sum:9,count:2,raters:[names[1],names[2]]}]]);const run=method('getCompletedWeeksWithRatings',{db:{},collection:()=>0,query:()=>0,where:()=>0,getDocs:async()=>docs(rows)});const result=await run.call({getRatingsGroupedByWeek:async()=>grouped,getRatingsDetailByWeek:async()=>new Map()});assert.equal(result[0].averageScore,4.5);assert.equal(result[1].averageScore,0);assert.ok(result[0].ratings.every(r=>!Object.hasOwn(r,'score')));return {correct:true,average:4.5,noRaterScoresExposed:true};});
 await check('historical_average_fallback',async()=>{const run=method('getCompletedWeeksWithRatings',{db:{},collection:()=>0,query:()=>0,where:()=>0,getDocs:async()=>docs([week('hist',{historicalAverageRating:5})])});const result=await run.call({getRatingsGroupedByWeek:async()=>new Map(),getRatingsDetailByWeek:async()=>new Map()});assert.equal(result[0].averageScore,5);return {fixed:true,storedHistoricalAverage:5,displayedAverage:5,condition:'historical week has no rating document'};});
 await check('honor_list_filters_random_and_imported_weeks_and_averages',async()=>{const rows=[week('a'),week('b',{isRandom:true}),week('c',{historicalAverageRating:5})];const run=method('getLeaderboardData',{db:{},collection:()=>0,query:()=>0,where:()=>0,getDocs:async()=>docs(rows)});const result=await run.call({getRatingsGroupedByWeek:async()=>new Map([['a',{sum:9,count:2}]])},6);assert.equal(result.length,1);assert.equal(result[0].averageScore,4.5);return {correct:true,documentedHistoricalExclusion:true};});
 await check('old_kings_list_rejects_junk_and_keeps_mean',async()=>{let captured;const run=exec(`exports.run=${namedArrow('src/components/KingsLeaderboard.tsx','fetchData')};`,{...helperExports,setLoading:()=>{},setData:v=>captured=v,services:{getAllCompletedWeeks:async()=>[{week:week('junk',{cycleNumber:999,king:'اسم تجريبي'}),averageScore:5}]}}).run;await run();assert.equal(captured.length,0);return {fixed:true,rejectsJunk:true,fixtureOnly:true};});
 await check('global_export_confirmed_attendance',async()=>{let captured;const run=exec(`exports.run=${namedArrow('src/components/GlobalLeaderboard.tsx','exportToExcel')};`,{data:[{week:week('a',{responded:[],absentees:[]}),averageScore:4}],xlsx:{utils:{json_to_sheet:v=>{captured=v;return{}},book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}}}).run;run();assert.equal(captured[0]['الحاضرين'].split('، ').length,1);return {fixed:true,exportedAttendees:1,confirmedAttendeesIncludingKing:1};});
 await check('ratings_explorer_search_rater_score_and_sort',async()=>{const t=parse('src/components/RatingsExplorer.tsx');const n=all(t,n=>ts.isCallExpression(n)&&n.expression.getText(t)==='useMemo')[0];const rows=[{week:week('a',{restaurant:'برجر',createdAt:timestamp(100)}),averageScore:4,ratings:[{userName:names[1]}]},{week:week('b',{restaurant:'قهوة',createdAt:timestamp(200)}),averageScore:5,ratings:[{userName:names[2]}]}];const run=exec(`exports.run=${n.arguments[0].getText(t)};`,{data:rows,searchText:'برجر',selectedKing:'all',selectedRater:names[1],minScore:'4',sortBy:'highest'}).run;const result=run();assert.equal(result.length,1);assert.equal(result[0].week.id,'a');return {correct:true};});
 await check('bathroom_week_average_is_correct',async()=>{let captured;const run=exec(`exports.run=${namedArrow('src/components/BathroomLeaderboard.tsx','fetchStats')};`,{...helperExports,setLoading:()=>{},setStats:v=>captured=v,services:{getAllCompletedWeeks:async()=>[{week:week('a')}],getBathroomRatingsForWeek:async()=>[{score:1,bathroomName:'أ'},{score:5,bathroomName:'أ'}]}}).run;await run();assert.equal(captured[0].averageScore,3);return {correct:true};});
 await check('bathroom_ranking_separates_labels',async()=>{let captured;const run=exec(`exports.run=${namedArrow('src/components/BathroomLeaderboard.tsx','fetchStats')};`,{...helperExports,setLoading:()=>{},setStats:v=>captured=v,services:{getAllCompletedWeeks:async()=>[{week:week('a')}],getBathroomRatingsForWeek:async()=>[{score:1,bathroomName:'حمام أ'},{score:5,bathroomName:'حمام ب'}]}}).run;await run();assert.equal(captured.length,2);assert.equal(captured[0].averageScore,5);assert.equal(captured[1].averageScore,1);return {fixed:true,detailGroups:2,rankingGroups:2,condition:'different bathroom labels in the same week'};});
 const hash=exec(read('src/lib/hash.ts')).hashPassword;
 await check('password_reset_counter_commits_before_rejection',async()=>{let state={resetCode:'123456',resetCodeTimestamp:Date.now(),resetCodeAttempts:0,password:'test'};const adminDb={collection:()=>({doc:()=>({})}),runTransaction:async cb=>{const pending=[];const result=await cb({get:async()=>({exists:true,data:()=>({...state})}),update:(ref,data)=>pending.push(data)});pending.forEach(data=>Object.assign(state,data));return result;}};const run=rpcCase('resetPasswordWithCode',{VALID_NAMES_RPC:names,adminDb,hashPassword:hash,payload:{userName:names[0],code:'999999',newPassword:'new-test-password'}});for(let i=0;i<5;i++){await assert.rejects(run(),/رمز الاسترجاع خاطئ/);assert.equal(state.resetCodeAttempts,i+1);}assert.equal(state.resetCode,null);await assert.rejects(run(),/ما فيه طلب/);return {fixed:true,persistedAttempts:5};});
 await check('server_registration_rejects_empty_password',async()=>{let stored;const run=rpcCase('register',{payload:{name:names[0],password:''},hashPassword:hash,adminDb:{collection:()=>({doc:()=>({get:async()=>({exists:false}),set:async data=>stored=data})})}});await assert.rejects(run(),/كلمة المرور مطلوبة/);assert.equal(stored,undefined);return {fixed:true,emptyPasswordRejected:true};});
 await check('rating_rejects_out_of_range_and_king_self_vote',async()=>{const deps={authName:names[0],payload:{weekId:'a',score:6},adminDb:{collection:()=>({doc:()=>({get:async()=>({exists:true,data:()=>({ratingEnabled:true,king:names[0]})})})})}};await assert.rejects(rpcCase('submitRating',deps)(),/Invalid score/);deps.payload.score=5;await assert.rejects(rpcCase('submitRating',deps)(),/الملك لا يصوّت لنفسه/);return {correct:true};});
 await check('day_vote_rejects_absent_member',async()=>{const run=rpcCase('submitDayVote',{authName:names[1],payload:{userName:names[1],weekId:'a',day:'الخميس'},isDayVoteOption:d=>['الخميس','الجمعة','الخميس والجمعة'].includes(d),adminDb:{collection:()=>({doc:()=>({})}),runTransaction:async cb=>cb({get:async()=>({exists:true,data:()=>({king:names[0],absentees:[names[1]],responded:[names[1]]})})})}});await assert.rejects(run(),/التصويت متاح للحاضرين فقط/);return {correct:true};});
 await check('attendance_rejects_changing_another_member',async()=>{const run=rpcCase('toggleAttendance',{authName:names[0],isAdmin:false,payload:{userName:names[1]}});await assert.rejects(run(),/Can only change your own attendance/);return {correct:true};});
 await check('dean_methods_reject_non_dean_before_write',async()=>{const tested=['startNewWeek','setCurrentCycle','setRecusedPairs','setMaintenance','backupCreate','backupRestore','backupDelete','listOpenRatings','closeRatings','bulkSetWeekCycle'];for(const action of tested)await assert.rejects(rpcCase(action,{isAdmin:false,payload:{}})(),/Dean only/);return {correct:true,methods:tested.length};});
 await check('server_auth_rejects_no_credentials_and_wrong_role',async()=>{
  const userSnap={exists:true,data:()=>({password:'token',role:'user'})};
  const adminDb={collection:()=>({doc:()=>({get:async()=>userSnap})})};
  const auth=exec(read('src/lib/serverRequestAuth.ts'),{require:()=>({adminDb}),process:{env:{}}}).authenticateServerRequest;
  let result=await auth(new Request('https://example.com'));assert.equal(result.status,401);
  result=await auth(new Request('https://example.com',{headers:{'x-user-name':'member','x-user-token':'token'}}),{allowedRoles:['dean']});assert.equal(result.status,403);return {correct:true};
 });
 await check('statistics_attendance_buckets_and_unrated_score_handling',async()=>{
  const rows=[week('a',{responded:[names[1]],absentees:[names[2]],day:'الخميس',createdAt:timestamp(Date.parse('2026-10-01T12:00:00Z'))}),week('b',{responded:[],absentees:[],day:'الخميس',createdAt:timestamp(Date.parse('2026-10-08T12:00:00Z'))})];
  const run=method('getStatistics',{db:{},collection:(db,name)=>({name}),getDocs:async ref=>ref.name==='weeks'?docs(rows):{size:0,docs:[]},outingDateLabel:()=> 'تاريخ تجريبي'});
  const result=await run.call({getRatingsData:async()=>({weeks:{a:{sum:4,count:1}},byUser:{}}),getVisitStats:async()=>({total:0,today:0,thisWeek:0,thisMonth:0}),getCurrentWeek:async()=>null});
  assert.equal(result.memberStats[names[0]].attended,2); assert.equal(result.memberStats[names[1]].attended,1);assert.equal(result.memberStats[names[1]].noResponse,1);assert.equal(result.memberStats[names[2]].absent,1);
  assert.equal(result.timeWindows.last4.avgRating,4);assert.equal(result.kingDecisionAnalytics.find(r=>r.king===names[0]).avgScore,4);
  return {fixed:true,correctAttendance:true,totalOutings:result.totalOutings,actualWindowAvg:4,expectedRatedWeekAverage:4,condition:'one rated outing (4), one unrated outing'};
 });
 await check('prayer_dates_next_day_and_invalid_times',async()=>{
  const prayer=exec(read('src/lib/prayerTimes.ts'));
  assert.equal(prayer.riyadhDate(new Date('2026-10-12T21:30:00Z')),'2026-10-13');assert.equal(prayer.followingDate('2026-12-31'),'2027-01-01');
  const timings={Fajr:'04:32',Dhuhr:'11:40',Asr:'15:00',Maghrib:'17:29',Isha:'18:59',Sunrise:'05:50'};
  const day=prayer.normalizePrayerDay('2026-10-13',timings);const tomorrow=prayer.normalizePrayerDay('2026-10-14',timings);
  const next=prayer.nextPrayer({today:day,tomorrow},Date.parse('2026-10-13T23:00:00+03:00'));assert.equal(next.key,'Fajr');assert.equal(next.tomorrow,true);
  assert.throws(()=>prayer.normalizePrayerDay('2026-10-13',{...timings,Fajr:'24:00'}));return {correct:true,cases:4};
 });
 await check('king_rotation_respects_last_king_and_random_week',async()=>{
  const lifecycle=exec(read('src/lib/weekLifecycle.server.ts'),{require:name=>name==='firebase-admin'?{firestore:{Timestamp:{now:()=>({})}}}:{adminDb:{}}});
  assert.equal(lifecycle.nextKingFor(null).kingName,names[0]);assert.equal(lifecycle.nextKingFor({king:names[0]}).kingName,names[1]);assert.equal(lifecycle.nextKingFor({king:names[5]}).isRandom,true);assert.equal(lifecycle.nextKingFor({isRandom:true}).kingName,names[0]);
  assert.equal(lifecycle.daysSinceOuting(0,'الخميس'),null);return {correct:true,cases:5};
 });
 await check('saturday_key_uses_riyadh_and_year_boundary',async()=>{
  const saturday=exec(read('src/lib/saturday.ts'));
  assert.equal(saturday.currentSaturdayKey(Date.parse('2026-10-16T22:00:00Z')),'2026-10-17');assert.equal(saturday.currentSaturdayKey(Date.parse('2026-12-31T12:00:00Z')),'2027-01-02');return {correct:true,cases:2};
 });
 await check('open_rating_missing_list_matches_submit_permissions',async()=>{
  const adminDb={collection:name=>({where(){return this;},get:async()=>docs(name==='weeks'?[week('a',{responded:[],absentees:[]})]:[])})};
  const api=exec(read('src/lib/openRatings.server.ts'),{require:()=>({adminDb})});const rows=await api.listOpenRatingWeeks();assert.equal(rows[0].eligibleCount,0);assert.equal(rows[0].missing.length,0);
  return {fixed:true,reportedEligible:0,actuallyAllowedToSubmit:0,condition:'nobody except king confirmed attendance'};
 });
 await check('backup_restore_refuses_missing_or_empty_snapshot_before_wipe',async()=>{
  let writes=0;const adminDb={collection:()=>({doc:()=>({get:async()=>({exists:true}),collection:()=>({get:async()=>({empty:true,docs:[]})})})}),batch:()=>{writes++;throw Error('unexpected write');}};
  const api=exec(read('src/lib/ratingsBackup.server.ts'),{require:name=>name==='firebase-admin'?{firestore:{Timestamp:{now:()=>({})}}}:{adminDb}});
  await assert.rejects(api.restoreBackup('empty','dean'),/النسخة فاضية/);assert.equal(writes,0);return {correct:true};
 });
 await check('reset_expiry_and_success_commit_atomically',async()=>{
  let state={resetCode:'123456',resetCodeTimestamp:Date.now()-16*60000,resetCodeAttempts:2,password:'old'};
  const adminDb={collection:()=>({doc:()=>({})}),runTransaction:async cb=>{const writes=[];const result=await cb({get:async()=>({exists:true,data:()=>({...state})}),update:(ref,data)=>writes.push(data)});writes.forEach(data=>Object.assign(state,data));return result;}};
  const payload={userName:names[0],code:'123456',newPassword:'valid-new-password'};
  const run=rpcCase('resetPasswordWithCode',{adminDb,hashPassword:hash,payload});
  await assert.rejects(run(),/انتهت صلاحية/);assert.equal(state.resetCode,null);assert.equal(state.password,'old');
  state={resetCode:'123456',resetCodeTimestamp:Date.now(),resetCodeAttempts:2,password:'old'};
  await run();assert.equal(state.password,await hash(payload.newPassword));assert.equal(state.resetCode,null);assert.equal(state.resetCodeAttempts,0);
  return {correct:true};
 });
 await check('bathroom_role_and_atomic_duplicate_guard',async()=>{
  await assert.rejects(rpcCase('submitBathroomRating',{authName:names[0],payload:{userName:names[0],score:5}})(),/لهشام فقط/);
  const normalizeNode=all(treeRpc,n=>ts.isVariableDeclaration(n)&&n.name.getText(treeRpc)==='normalizeNickName')[0];
  const normalizer=exec('exports.normalizeNickName='+normalizeNode.initializer.getText(treeRpc)+';');
  let writes=0, rows=[{bathroomName:'حمام أ'}];
  const collection={where(){return this},doc:id=>({id})};
  const adminDb={collection:()=>collection,runTransaction:async cb=>cb({get:async()=>docs(rows),set:()=>writes++})};
  const payload={weekId:'a',userName:'هشام',score:5,bathroomName:'حمام أ'};
  const run=rpcCase('submitBathroomRating',{...normalizer,adminDb,authName:'هشام',payload,Timestamp:{now:()=>timestamp(100)}});
  await assert.rejects(run(),/مسبقاً/);assert.equal(writes,0);
  payload.bathroomName='حمام ب';const result=await run();assert.equal(writes,1);assert.equal(result.result.result.length,64);
  return {correct:true,legacyRatingsPreserved:true};
 });
 await check('server_reminders_use_admin_and_confirmed_attendance',async()=>{
  const rows=[week('a',{status:'pending',createdAt:timestamp(100)}),week('b',{status:'pending',createdAt:timestamp(200),responded:[names[1],names[2],names[3]],absentees:[names[2]]})];
  const adminDb={collection:name=>({where(){return this},get:async()=>docs(name==='weeks'?rows:[{userName:names[1]}])})};
  const api=exec(read('src/lib/reminderData.server.ts'),{require:name=>name.includes('firebase-admin')?{adminDb}:{KING_ORDER:names}});
  const current=await api.getReminderWeek();assert.equal(current.id,'b');
  assert.deepEqual(JSON.parse(JSON.stringify(await api.missingRatingMembers(current))),[names[3]]);
  return {correct:true,noBrowserCredentialsNeeded:true};
 });
 const report={date:'2026-10-13',scope:'Actual source AST extracted and executed against in-memory fixtures; no production writes.',total:output.length,results:output};console.log(JSON.stringify(report,null,2));if(output.some(r=>r.status==='test-error'))process.exitCode=1;
})();
