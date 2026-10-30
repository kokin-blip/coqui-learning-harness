// Material specimens and a short authored motion study in the same CoquiLearn draft.
const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
const existing=page.findAllWithCriteria({types:['TEXT']});
await Promise.all([...new Map(existing.flatMap(t=>t.getStyledTextSegments(['fontName']).map(s=>[JSON.stringify(s.fontName),s.fontName]))).values()].map(f=>figma.loadFontAsync(f)));
const createdNodeIds=[],mutatedNodeIds=[];const track=n=>(createdNodeIds.push(n.id),n);
const c=await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:2:3'),pc=await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:2:2');
const vars=Object.fromEntries((await figma.variables.getLocalVariablesAsync('COLOR')).filter(v=>v.variableCollectionId===c.id).map(v=>[v.name.replace('color/',''),v]));
const fx=Object.fromEntries((await figma.getLocalEffectStylesAsync()).filter(s=>s.name.startsWith('CoquiLearn / Glass / ')).map(s=>[s.name.split(' / ').pop(),s.id]));
const paint=(key,a=1)=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0},opacity:a},'color',vars[key]);
function frame(p,name,x,y,w,h,key=null,r=20){const n=track(figma.createFrame());n.name=name;n.resize(w,h);n.x=x;n.y=y;n.cornerRadius=r;n.fills=key?[paint(key)]:[];n.clipsContent=false;p.appendChild(n);return n;}
function row(p,name,w,h,vertical=false,gap=8,pad=0){const n=track(figma.createAutoLayout(vertical?'VERTICAL':'HORIZONTAL'));n.name=name;n.resize(w,h);n.primaryAxisSizingMode=n.counterAxisSizingMode='FIXED';n.itemSpacing=gap;n.paddingLeft=n.paddingRight=n.paddingTop=n.paddingBottom=pad;n.fills=[];p.appendChild(n);return n;}
function text(p,s,size=14,key='ink',w=null,bold=false){const n=track(figma.createText());n.fontName={family:'Manrope',style:bold?'SemiBold':'Regular'};n.fontSize=size;n.lineHeight={unit:'PIXELS',value:Math.round(size*1.4)};n.characters=s;n.fills=[paint(key)];p.appendChild(n);if(w){n.textAutoResize='HEIGHT';n.resize(w,n.height);}n.name=s.slice(0,70);return n;}
function material(n,role,key='glass-chrome',a=.6){n.fills=[paint(key,a)];n.effectStyleId=fx[role];n.strokes=[paint('glass-edge',role==='Lens'?.28:.13)];n.strokeWeight=1;n.strokeAlign='INSIDE';}
function dark(n){n.setExplicitVariableModeForCollection(c,'2:3');n.setExplicitVariableModeForCollection(pc,'2:1');}
if(page.children.some(n=>n.name==='CoquiLearn / Glass & palette'))throw new Error('Specimen board already exists');
const board=frame(page,'CoquiLearn / Glass & palette',160,2630,1440,820,'canvas',28);dark(board);
const head=row(board,'Material heading',1344,90,true,8);head.x=48;head.y=36;text(head,'A softer palette. A sharper sense of glass.',30,'ink',1344,true);text(head,'Apple Music kit foundations, extended for CoquiLearn. All samples are editable materials.',15,'muted',1344);
const samples=[['Kit chrome','Kit chrome','Exact source · frost 22.5 / refraction .06'],['Kit control','Kit control','Exact source · frost 15 / refraction .12'],['Kit content','Kit content','Exact source · frost 45 / refraction .06'],['Canopy','Canopy','Navigation · deeper rim, green-tinted frost'],['Lens','Lens','Small controls · depth 10, refraction .18'],['Mist','Mist','Inspectors · soft frost, quieter refraction']];
for(let i=0;i<samples.length;i++){const [label,role,detail]=samples[i],x=48+(i%3)*456,y=154+Math.floor(i/3)*222;const slot=frame(board,'Specimen / '+label,x,y,432,198,'surface-soft',20);slot.clipsContent=true;
 const band=track(figma.createRectangle());band.name='Calibration light under glass';band.resize(460,90);band.x=-20;band.y=44;band.rotation=-12;band.fills=[{type:'GRADIENT_LINEAR',gradientTransform:[[1,0,0],[0,1,0]],gradientStops:[{position:0,color:{r:.66,g:.85,b:.63,a:.6}},{position:.5,color:{r:.59,g:.84,b:.77,a:.30}},{position:1,color:{r:.79,g:.75,b:.91,a:.5}}]}];slot.appendChild(band);
 const pane=row(slot,'Glass specimen / '+label,392,158,true,10,22);pane.x=20;pane.y=20;pane.cornerRadius=role==='Lens'?28:20;material(pane,role,'glass-chrome',role==='Kit control'||role==='Lens'?.48:.68);text(pane,label,23,'ink',348,true);text(pane,detail,13,'muted',348);text(pane,i<3?'Source recipe':'CoquiLearn extension',12,i<3?'sky':'accent',348);
}
const paletteRow=row(board,'Coqui pastel palette',1344,108,false,12);paletteRow.x=48;paletteRow.y=626;
for(const [name,key,hex]of [['Leaf','accent','#A9D9A0'],['Pond','teal','#96D5C5'],['Mist','sky','#ABCDDF'],['Orchid','lilac','#C9BFE8'],['Coquí blush','rose','#E5B4C4'],['Guava','peach','#EBBEA0'],['Moonforest','canvas','#172127'],['Dew','surface','#FAFCF7']]){const cell=row(paletteRow,'Color / '+name,156,106,true,8);const swatch=frame(cell,'Swatch / '+name,0,0,156,44,key,12);if(name==='Dew')swatch.fills=[{type:'SOLID',color:{r:.98,g:.99,b:.97}}];text(cell,name,13,'ink',156);text(cell,hex,12,'muted',156);}
const provenance=text(board,'Base: Gz7WEiN8Y3Vvivvae0ZPlP / Native Fidelity Lab · Controls refract; reading stays steady.',12,'muted',1344);provenance.x=48;provenance.y=766;
const motion=frame(page,'CoquiLearn / Motion · selection to focus',1664,2630,1440,820,'canvas',28);dark(motion);
const mh=row(motion,'Motion heading',1344,100,true,8);mh.x=48;mh.y=36;text(mh,'Glass that follows intent.',30,'ink',1344,true);text(mh,'A selection lens settles into place; the related context tray follows. Illustration of UI motion, not a grading result.',15,'muted',1344);
const stage=frame(motion,'Study stage',48,168,1344,470,'surface-soft',24);stage.clipsContent=true;
const wash=frame(stage,'Pond light',-30,45,1450,150,'teal',999);wash.opacity=.12;wash.rotation=-9;
const question=row(stage,'Lesson choices',714,398,true,20,28);question.x=24;question.y=28;question.cornerRadius=24;material(question,'Reading','surface',.93);text(question,'What would you like to explore next?',22,'ink',658,true);text(question,'Follow one connection in your learning map.',15,'muted',658);
const choiceArea=frame(question,'Concept choices',0,0,658,212,null,0);
const lens=frame(choiceArea,'Animated selection lens',0,64,658,52,'accent-soft',14);material(lens,'Lens','accent-soft',.82);
const choices=row(choiceArea,'Concept labels',658,192,true,12,0);choices.x=0;choices.y=0;
for(const [name,detail]of [['Rate of change','Build from the foundations'],['The gradient vector','Connect the partial derivatives'],['Gradient descent','Take a step toward less error']]){const n=row(choices,'Concept / '+name,658,52,false,14,12);n.counterAxisAlignItems='CENTER';const dot=track(figma.createEllipse());dot.resize(8,8);dot.fills=[paint(name==='The gradient vector'?'accent':'line')];n.appendChild(dot);const label=row(n,'Concept label',590,40,true,2);text(label,name,14,name==='The gradient vector'?'accent':'ink',590,true);text(label,detail,12,'muted',590);}
const panel=row(stage,'Animated context tray',534,398,true,20,28);panel.x=786;panel.y=28;panel.cornerRadius=24;material(panel,'Canopy','glass-chrome',.62);text(panel,'The gradient vector',23,'ink',478,true);text(panel,'From individual slopes to one direction.',16,'accent',478);text(panel,'Use the ideas you have already covered to make the next connection. The current question stays in place as the context changes.',17,'ink',478);text(panel,'Partial derivatives  →  Direction of change',13,'muted',478);
const action=row(panel,'Animated action',220,44,false,8,12);action.cornerRadius=999;action.primaryAxisAlignItems='CENTER';action.counterAxisAlignItems='CENTER';material(action,'Lens','accent',.92);text(action,'Open lesson',14,'on-accent',null,true);
const note=row(motion,'Motion specification',1344,102,false,28);note.x=48;note.y=678;
for(const [a,b]of [['Selection lens','280ms · spring-free ease-out'],['Specular response','Light .38 → .68 → .54'],['Context tray','320ms · 24px, interruptible'],['Reduced motion','Immediate focus + short fade']]){const n=row(note,a,315,102,true,10);text(n,a,16,'ink',315,true);text(n,b,13,'muted',315);}
const easing={type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:.16,y1:1,x2:.3,y2:1}};
const scalar=(time,value)=>({timelinePosition:time,value:{type:'FLOAT',value},easing});
lens.applyManualKeyframeTrack({type:'PROPERTY',name:'TRANSLATION_Y'},{keyframes:[scalar(0,-64),scalar(.16,-64),scalar(.44,0),scalar(2,0)]});
lens.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'SPECULAR_INTENSITY'},{keyframes:[scalar(0,.38),scalar(.16,.38),scalar(.32,.68),scalar(.64,.54),scalar(2,.54)]});
lens.applyManualKeyframeTrack({type:'INDEXED_ITEM',collection:'effects',index:0,field:'REFRACTION_INTENSITY'},{keyframes:[scalar(0,.10),scalar(.16,.10),scalar(.32,.22),scalar(.64,.18),scalar(2,.18)]});
panel.applyManualKeyframeTrack({type:'PROPERTY',name:'TRANSLATION_X'},{keyframes:[scalar(0,24),scalar(.40,24),scalar(.72,0),scalar(2,0)]});
panel.applyManualKeyframeTrack({type:'PROPERTY',name:'OPACITY'},{keyframes:[scalar(0,.45),scalar(.40,.45),scalar(.72,1),scalar(2,1)]});
action.applyManualKeyframeTrack({type:'PROPERTY',name:'SCALE_XY'},{keyframes:[{timelinePosition:0,value:{type:'VECTOR',value:{x:1,y:1}},easing},{timelinePosition:1.2,value:{type:'VECTOR',value:{x:1,y:1}},easing},{timelinePosition:1.32,value:{type:'VECTOR',value:{x:.97,y:.97}},easing},{timelinePosition:1.5,value:{type:'VECTOR',value:{x:1,y:1}},easing}]});
mutatedNodeIds.push(lens.id,panel.id,action.id);
const motionNodes=[lens,panel,action].map(n=>({id:n.id,name:n.name,tracks:n.manualKeyframeTracks}));
const fontFamilies=[...new Set([board,motion].flatMap(r=>r.findAllWithCriteria({types:['TEXT']})).map(n=>n.fontName.family))];
return {createdNodeIds,mutatedNodeIds,materialBoardId:board.id,motionFrameId:motion.id,motionNodes,timelines:motion.timelines,fontFamilies,specimens:6,colors:8};
