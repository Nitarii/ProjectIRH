// Fifteen original procedural ambient compositions: three long arrangements
// for each of the five biomes, plus three for the central camp.
// Each phrase develops slowly; notes are intentionally sparse and soft.
export const MUSIC_BIOMES=6;
const MOTIFS=[
  [[0,null,2,4,5,null,4,2],[4,5,7,null,4,2,null,0],[0,2,null,5,7,5,4,null]],
  [[0,2,3,5,null,3,2,null],[5,3,null,2,0,null,-2,0],[0,null,3,5,7,null,5,3]],
  [[0,null,3,5,3,2,null,-2],[3,5,7,null,5,3,2,null],[0,2,null,5,8,7,null,3]],
  [[0,null,2,5,7,5,null,2],[5,7,null,9,7,5,2,null],[0,3,5,null,7,10,7,null]],
  [[0,2,4,null,7,5,4,2],[7,null,9,7,4,2,0,null],[0,4,null,5,9,7,5,4]],
  [[0,null,4,7,5,4,null,2],[5,7,9,null,7,4,2,null],[0,2,5,null,7,9,7,5]]
];
const MODES=[
  [0,2,4,7,9,12,14,16,19,21,24],
  [0,2,3,5,7,10,12,14,15,17,19],
  [0,2,3,5,8,10,12,14,15,17,20],
  [0,3,5,7,10,12,15,17,19,22,24],
  [0,2,4,5,7,9,11,12,14,16,17],
  [0,2,4,5,7,9,12,14,16,17,19]
];
const ROOTS=[54,50,48,53,52,55]; // MIDI notes
const SEQUENCES=[
  [[0,5,3,4],[0,3,5,2],[0,4,2,5]],
  [[0,5,3,4],[0,2,6,4],[0,3,4,2]],
  [[0,3,5,2],[0,4,5,3],[0,5,2,3]],
  [[0,5,2,3],[0,3,4,5],[0,4,2,3]],
  [[0,3,4,5],[0,2,5,4],[0,5,3,4]],
  [[0,4,5,3],[0,2,4,5],[0,5,4,3]]
];
const MIDI=midi=>440*Math.pow(2,(midi-69)/12);
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
export function createScore(biome,variant){
  const index=clamp(Number.isInteger(biome)?biome+1:0,0,5);
  const take=clamp(variant|0,0,2);
  const mode=MODES[index],root=ROOTS[index],motif=MOTIFS[index][take];
  const chords=SEQUENCES[index][take],events=[];
  const beats=128,tempo=[78,72,75,83,86,76][index]+[-4,0,4][take];
  // Eight four-bar movements; variations of phrase, arpeggio and rest position
  // result in distinct 80-110 second compositions, rather than a short loop.
  for(let bar=0;bar<32;bar++){
    const chord=chords[Math.floor(bar/2)%chords.length];
    const chordTone=mode[chord];
    const shift=(bar>=8&&bar<16)?2:(bar>=16&&bar<24)?-1:0;
    const density=(bar>=24||bar<4)?.56:.82;
    for(let step=0;step<8;step++){
      const beat=bar*4+step*.5;
      const token=motif[(step+(bar%4)*2)%motif.length];
      if(token===null||((bar+step*7+take)%11===0))continue;
      const degree=clamp(token+shift,0,mode.length-1);
      const pad=bar%8>=4?1:0;
      const midi=root+mode[degree]+(pad?12:0)+(bar%4===3?-12:0);
      events.push({beat,freq:MIDI(midi),len:1.8+((bar+step)%3)*.5,
        volume:step%4===0?.0165*density:.011*density,wave:'sine',attack:.24});
    }
    // Extremely soft broken harmonic bed; never repetitive percussive beeps.
    if(bar%2===0){
      const beat=bar*4;
      for(const [interval,offset] of [[0,0],[7,1.3],[12,2.6]]){
        events.push({beat:beat+offset,freq:MIDI(root-12+chordTone+interval),len:5.7,
          volume:.009,wave:'sine',attack:.95});
      }
    }
    if(bar%4===0){
      events.push({beat:bar*4,freq:MIDI(root-24+chordTone),len:10.5,
        volume:.0095,wave:'sine',attack:1.3});
    }
  }
  events.sort((a,b)=>a.beat-b.beat);
  const beatSeconds=60/tempo;
  return {biome:index,variant:take,tempo,beats,duration:beats*beatSeconds,
    events:events.map(e=>({...e,time:e.beat*beatSeconds,length:e.len*beatSeconds}))};
}
