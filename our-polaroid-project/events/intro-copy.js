import {displayLabels} from './display-labels.js?v=20261125-labels1';
// Editorial introductions for approved Events entrances only.
// Dates, places, captions and private stories always stay in their canonical records.
export function eventIntroduction(event) {
  const labels = displayLabels(event), title = labels.title || 'Our Polaroid Wave';
  const common = {heading:title, dateLabel:labels.dateLabel, emphasis:'A little chapter, kept.', gridButton:'Step into the photographs ↓',
    fallbackDescription:'The people, the in-between moments, and the frames worth coming back to.'};
  if (event.id === 'la-ola-de-amor-2026') return {...common, celebration:true,
    emphasis:'One frame at a time.', gridButton:'Find your people ↓',
    editorialNote:'The big feeling. The little moments. A day to come back to.', promoteCollections:true};
  if (event.id === 'lib-2025') return {...common, emphasis:'The feeling comes back.',
    fallbackDescription:'A few days, a whole little world. The faces and frames we brought home from Lightning in a Bottle.'};
  if (event.id === 'lib-2026') return {...common, emphasis:'Back to that feeling.',
    fallbackDescription:'Another edition, another pocket of memories. Lightning in a Bottle, one instant at a time.'};
  if (event.id === 'martins-bach-party') return {...common, emphasis:'One for the memories.',
    fallbackDescription:'A weekend for Martin, kept in the photographs. Pick a frame and come back for a while.'};
  const name = title.toLowerCase();
  if (/birthday|\bbash\b/.test(name)) return {...common, emphasis:'Good people. Little keepsakes.'};
  if (/\blib\b|coachella|edsea|hard summer|crssd|lights down low/.test(name)) return {...common, emphasis:'Keep a little of the feeling.'};
  if (/wedding|engagement/.test(name)) return {...common, emphasis:'The moments around the moment.'};
  if (/beach|canc[uú]n|brazil|dominican|new york|chicago/.test(name)) return {...common, emphasis:'A place to come back to.'};
  return common;
}
