// Fluidity refinement in the existing CoquiLearn study. No new scene nodes.
const page=await figma.getNodeByIdAsync('0:1');
await figma.setCurrentPageAsync(page);
const root=await figma.getNodeByIdAsync('16:85');
const lens=await figma.getNodeByIdAsync('16:95');
const tray=await figma.getNodeByIdAsync('16:112');
const action=await figma.getNodeByIdAsync('16:117');
const mutated=new Set();
const flow={type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:.32,y1:0,x2:.18,y2:1}};
const settle={type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:.22,y1:1,x2:.36,y2:1}};
const press={type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:.4,y1:0,x2:.2,y2:1}};
function track(node,field,points,type='FLOAT') {
  const prior=node.manualKeyframeTracks[field];
  node.applyManualKeyframeTrack({type:'PROPERTY',name:field},{
    ...(prior?{id:prior.id,baseValue:prior.baseValue}:{}),
    keyframes:points.map(([time,value,easing=settle],i)=>({
      ...(prior?.keyframes[i]?{id:prior.keyframes[i].id}:{}),
      timelinePosition:time,value:{type,value},easing
    }))
  });
  mutated.add(node.id);
}
track(lens,'TRANSLATION_Y',[[0,-64],[.3,-64],[.96,0,flow],[3.2,0]]);
track(lens,'SCALE_XY',[[0,{x:1,y:1}],[.3,{x:1,y:1}],[.54,{x:1.012,y:1.08},flow],[1.06,{x:1,y:1},settle],[3.2,{x:1,y:1}]],'VECTOR');
track(tray,'TRANSLATION_X',[[0,16],[.4,16],[1.12,0,settle],[3.2,0]]);
track(tray,'OPACITY',[[0,.88],[.4,.88],[1.02,1,settle],[3.2,1]]);
track(tray,'SCALE_XY',[[0,{x:.992,y:.992}],[.4,{x:.992,y:.992}],[1.12,{x:1,y:1},settle],[3.2,{x:1,y:1}]],'VECTOR');
track(action,'SCALE_XY',[[0,{x:1,y:1}],[1.65,{x:1,y:1}],[1.77,{x:.985,y:.985},press],[2.13,{x:1,y:1},settle]],'VECTOR');
const [timeline]=root.timelines;
if(timeline.duration<3.2){root.setTimelineDuration(timeline.id,3.2);mutated.add(root.id);}
const copy={
 '16:88':'A continuous selection glide; the context tray follows before it settles. UI motion study, not a grading result.',
 '16:122':'660ms · eased glide + soft stretch',
 '16:124':'Continuous material',
 '16:125':'Static highlight · moving glass',
 '16:128':'720ms · 16px, overlapping arrival'
};
for(const [id,characters] of Object.entries(copy)){
 const n=await figma.getNodeByIdAsync(id);
 await Promise.all(n.getStyledTextSegments(['fontName']).map(s=>figma.loadFontAsync(s.fontName)));
 n.characters=characters;mutated.add(n.id);
}
// Keep responsive feedback short; give shared-layout navigation a smoother tail.
const prototypeNodes=[];
for(const id of ['3:2','3:137','3:305','15:235','2:55']){
 const scope=await figma.getNodeByIdAsync(id);
 for(const n of scope.findAll(n=>'reactions' in n && n.reactions.length)){
  // Master component reactions flow to instances without new overrides.
  if(n.type==='INSTANCE' && !n.reactions.some(r=>(r.actions??(r.action?[r.action]:[])).some(a=>a.type==='NODE' && a.navigation==='NAVIGATE'))) continue;
  let changed=false;
  const reactions=n.reactions.map(r=>({trigger:r.trigger,actions:(r.actions??(r.action?[r.action]:[])).map(a=>{
   if(a.type!=='NODE'||!a.transition)return a;
   changed=true;
   const isNavigation=a.navigation==='NAVIGATE';
   const duration=isNavigation?(a.transition.type==='DISSOLVE'?.32:.44):(r.trigger.type==='MOUSE_DOWN'?.10:r.trigger.type==='MOUSE_UP'?.24:.18);
   return {...a,transition:{...a.transition,duration,easing:settle}};
  })}));
  if(changed){await n.setReactionsAsync(reactions);mutated.add(n.id);prototypeNodes.push(n.id);}
 }
}
return {
 createdNodeIds:[],mutatedNodeIds:[...mutated],duration:root.timelines,
 motionNodes:[lens,tray,action].map(n=>({id:n.id,name:n.name,tracks:n.manualKeyframeTracks})),
 prototypeNodes,
 textBounds:await Promise.all(Object.keys(copy).map(async id=>{const n=await figma.getNodeByIdAsync(id);return{id,width:n.width,height:n.height,parentWidth:n.parent.width,overflow:n.x+n.width>n.parent.width+.5||n.y+n.height>n.parent.height+.5};})),
 preview:{fps:60,width:960,reason:'Delivery playback for judging fluidity; prior diagnostic export was 10fps.'}
};
