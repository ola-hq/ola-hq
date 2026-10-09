import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMatch,parseLeague,buildSnapshot,parsePremierLeagueFixtures} from './arsenal-sync.mjs';
const event = (date,state='pre') => ({
  id:'sample-123',date,status:{type:{state}},
  links:[{href:'https://www.espn.com/soccer/match/_/gameId/123'}],
  competitions:[{venue:{fullName:'Emirates Stadium'},competitors:[
    {team:{id:'359',displayName:'Arsenal',abbreviation:'ARS'},homeAway:'home',score:'2'},
    {team:{id:'357',displayName:'Leeds United'},homeAway:'away',score:'1'}
  ]}]
});
test('validates and normalizes a fixture',() => {
  const m=parseMatch(event('2026-10-10T11:30:00Z'));
  assert.equal(m.opponent,'Leeds United');
  assert.equal(m.date,'2026-10-10T11:30:00.000Z');
  assert.equal(m.status,'pre');
  assert.match(m.match_center_url,/gameId\/123/);
});
test('rejects unrelated games',() => {
  const other=event('2026-10-10T11:30:00Z');
  other.competitions[0].competitors[0].team.id='888';
  other.competitions[0].competitors[0].team.abbreviation='NOT';
  assert.equal(parseMatch(other),null);
});
test('keeps direct match link for the matching cached fixture only',() => {
  const old={meta:{sources:[]},snapshot:{next_match:{
    opponent:'Leeds United',kickoff_utc:'2026-10-10T11:30:00.000Z',
    match_center_url:'https://www.premierleague.com/en/match/2645245/essenal-vs-leeds-united/info'
  }}};
  const e=event('2026-10-10T11:30:00Z');
  delete e.links;
  const snapshot=buildSnapshot(old,{events:[e]},null,new Date('2026-10-08T20:00:00Z'));
  assert.equal(snapshot.snapshot.next_match.match_center_url,old.snapshot.next_match.match_center_url);
  assert.equal(snapshot.snapshot.league,null);
  assert.equal(snapshot.meta.refresh_strategy,'scheduled');
});
test('refuses an empty or invalid API response',() => {
  assert.throws(()=>buildSnapshot({snapshot:{}},{events:[]},null),/No valid Arsenal fixtures/);
});
test('parses league position and points when given reliable standings',() => {
  const table={children:[{standings:{entries:[{team:{id:'359'},stats:[
    {name:'rank',value:2},{name:'points',value:12},{name:'gamesPlayed',value:5}
  ]}]}}]};
  assert.deepEqual(parseLeague(table),{
    competition:'Premier League',position:2,points:12,played:5,
    wins:null,draws:null,losses:null,gf:null,ga:null,gd:null
  });
});

test('does not erase a verified upcoming fixture when schedule lists only completed games',() => {
  const verified={opponent:'Leeds United',kickoff_utc:'2026-10-10T11:30:00Z',venue:'Home',venue_name:'Emirates Stadium',competition:'Premier League',match_center_url:'https://www.premierleague.com/en/match/2645245/essenal-vs-leeds-united/info',status:'pre'};
  const old={meta:{updated_at:'2026-10-06T22:45:00-07:00',fixture_updated_at:'2026-10-08T21:00:00-07:00'},snapshot:{next_match:verified}};
  const finished=event('2026-09-20T11:30:00Z','post');
  const snapshot=buildSnapshot(old,{events:[finished]},null,new Date('2026-10-09T04:15:00Z'));
  assert.deepEqual(snapshot.snapshot.next_match,verified);
  assert.equal(snapshot.meta.fixture_source,'verified_cache');
  assert.equal(snapshot.meta.fixture_updated_at,'2026-10-08T21:00:00-07:00');
});

test('official Premier League fixtures identify Arsenal, opposition and localizable kickoff',() => {
  const teams={teams:[{id:1,name:'Arsenal',short_name:'ARS'},{id:11,name:'Leeds United',short_name:'LEE'}]};
  const fixtures=[{id:123,team_h:1,team_a:11,kickoff_time:'2026-10-10T11:30:00Z',started:false,finished:false,team_h_score:null,team_a_score:null}];
  const events=parsePremierLeagueFixtures(teams,fixtures);
  assert.equal(events.length,1);
  const match=parseMatch(events[0]);
  assert.equal(match.opponent,'Leeds United');
  assert.equal(match.status,'pre');
  assert.equal(match.date,'2026-10-10T11:30:00.000Z');
});

test('preserves verified match centre when official feed uses Leeds instead of Leeds United',() => {
  const teams={teams:[{id:1,name:'Arsenal',short_name:'ARS'},{id:11,name:'Leeds',short_name:'LEE'}]};
  const fixtures=[{id:51,team_h:1,team_a:11,kickoff_time:'2026-10-10T11:30:00Z',started:false,finished:false,team_h_score:null,team_a_score:null}];
  const prior={meta:{},snapshot:{next_match:{opponent:'Leeds United',venue:'Home',kickoff_utc:'2026-10-10T11:30:00.000Z',match_center_url:'https://www.premierleague.com/en/match/2645245/essenal-vs-leeds-united/info'}}};
  const next=buildSnapshot(prior,{events:parsePremierLeagueFixtures(teams,fixtures)},null,new Date('2026-10-09T04:15:00Z')).snapshot.next_match;
  assert.equal(next.opponent,'Leeds United');
  assert.equal(next.match_center_url,prior.snapshot.next_match.match_center_url);
  assert.equal(next.event_id,'pl-51');
});
