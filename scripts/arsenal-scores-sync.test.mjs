import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeScores,matchESPN,enrichWithESPN,attachVerifiedArsenalLink,buildScores} from './arsenal-scores-sync.mjs';

const teams=[{id:1,name:'Arsenal',short_name:'ARS'},{id:2,name:'Leeds',short_name:'LEE'},{id:3,name:'Liverpool',short_name:'LIV'}];
const fixtures=Array.from({length:12},(_,i)=>({id:i+50,kickoff_time:new Date(Date.UTC(2026,9,10+i,11,30)).toISOString(),team_h:i%2?3:1,team_a:2,started:false,finished:false,team_h_score:null,team_a_score:null,minutes:0}));

test('rejects incomplete or empty fixture feeds without clearing cache',()=>{
  assert.throws(()=>normalizeScores([],[]),/not enough|missing required/i);
  assert.throws(()=>normalizeScores(teams,fixtures.slice(0,1)),/too few/i);
});
test('official fixture scores retain zero, real match statuses and valid kickoff',()=>{
  const data=fixtures.map(x=>({...x}));
  data[0].started=true;data[0].minutes=27;data[0].team_h_score=0;data[0].team_a_score=1;
  data[1].finished=true;data[1].team_h_score=2;data[1].team_a_score=0;
  const matches=normalizeScores(teams,data);
  assert.equal(matches.length,12);
  assert.equal(matches[0].home_score,0);
  assert.equal(matches[0].status,'in');
  assert.equal(matches[0].minute,27);
  assert.equal(matches[1].status,'post');
  assert.equal(matches[1].away_score,0);
  assert.equal(matches[2].status,'pre');
  assert.equal(matches[2].home_score,null);
});
test('ESPN matching requires both teams and kickoff proximity',()=>{
  const match=normalizeScores(teams,fixtures)[0];
  const event={id:'401879268',date:match.kickoff,competitions:[{competitors:[
    {homeAway:'home',team:{displayName:'Arsenal'},score:'0'},
    {homeAway:'away',team:{displayName:'Leeds United'},score:'1'}
  ]}]};
  assert.equal(matchESPN(match,[event]).id,event.id);
  assert.equal(matchESPN(match,[{...event,date:'2026-11-10T11:30:00Z'}]),null);
});
test('match stats appear only if sourced, and malformed extras stay absent',()=>{
  const match=normalizeScores(teams,fixtures)[0];
  const ev={id:'abc',date:match.kickoff,status:{type:{state:'pre'}},competitions:[{competitors:[
    {homeAway:'home',team:{displayName:'Arsenal'}},
    {homeAway:'away',team:{displayName:'Leeds United'}}
  ]}]};
  const withStats=enrichWithESPN(match,ev,{boxscore:{teams:[
    {team:{displayName:'Arsenal'},statistics:[{name:'possession',label:'Possession',displayValue:'64%'}]},
    {team:{displayName:'Leeds United'},statistics:[{name:'possession',label:'Possession',displayValue:'36%'}]}
  ]}});
  assert.deepEqual(withStats.stats,[{label:'Possession',home:'64%',away:'36%'}]);
  assert.deepEqual(withStats.events,[]);
  assert.equal(withStats.home_score,null);
});
test('verified Arsenal match centre survives abbreviated opponent name',()=>{
  const matches=normalizeScores(teams,fixtures);
  const cache={snapshot:{next_match:{opponent:'Leeds United',kickoff_utc:fixtures[0].kickoff_time,match_center_url:'https://www.premierleague.com/en/match/2645245/essenal-vs-leeds-united/info'}}};
  attachVerifiedArsenalLink(matches,cache);
  assert.equal(matches[0].match_url,cache.snapshot.next_match.match_center_url);
  assert.equal(matches[1].match_url,null);
});
test('built snapshot uses actual official data and metadata',async()=>{
 const result=await buildScores({teams},fixtures,[],new Map(),null,new Date('2026-10-09T15:00:00Z'));
 assert.equal(result.matches.length,12);
 assert.equal(result.meta.refresh_target_minutes,15);
 assert.equal(result.matches[0].home.name,'Arsenal');
 assert.equal(result.matches[0].stats.length,0);
});
