// CoquiLearn v2 material revision. Keeps the original screen IDs and lesson content.
const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
const texts=page.findAllWithCriteria({types:['TEXT']});
await Promise.all([...new Map(texts.flatMap(t=>t.getStyledTextSegments(['fontName']).map(s=>[JSON.stringify(s.fontName),s.fontName]))).values()].map(f=>figma.loadFontAsync(f)));
await figma.loadFontAsync({family:'Manrope',style:'Regular'});
const createdNodeIds=[],mutatedNodeIds=[],frames={};
const track=n=>(createdNodeIds.push(n.id),n),mark=n=>(mutatedNodeIds.push(n.id),n);
const coll=await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:2:3');
const primitive=await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:2:2');
const values=await figma.variables.getLocalVariablesAsync('COLOR');
const vars=Object.fromEntries(values.filter(v=>v.variableCollectionId===coll.id).map(v=>[v.name.replace('color/',''),v]));
const fx=Object.fromEntries((await figma.getLocalEffectStylesAsync()).filter(s=>s.name.startsWith('CoquiLearn / Glass / ')).map(s=>[s.name.split(' / ').pop(),s.id]));
const styles=Object.fromEntries((await figma.getLocalTextStylesAsync()).map(s=>[s.name.split(' / ').pop(),s.id]));
function paint(key,a=1){return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0},opacity:a},'color',vars[key]);}
function fill(n,key,a=1){n.fills=[paint(key,a)];mark(n);return n;}
function surface(n,role,key='glass-chrome',a=.6){n.fills=[paint(key,a)];n.effectStyleId=fx[role];n.strokes=[paint('glass-edge',role==='Lens'?.28:.12)];n.strokeWeight=1;n.strokeAlign='INSIDE';mark(n);return n;}
function mode(n,name){n.setExplicitVariableModeForCollection(coll, name==='Dark'?'2:3':'2:2');n.setExplicitVariableModeForCollection(primitive,name==='Dark'?'2:1':'2:0');mark(n);}
function stack(p,name,w,h,d='HORIZONTAL',gap=8,pad=0){const n=track(figma.createAutoLayout(d));n.name=name;n.resize(w,h);n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';n.itemSpacing=gap;n.paddingLeft=n.paddingRight=n.paddingTop=n.paddingBottom=pad;n.fills=[];p.appendChild(n);return n;}
function text(p,content,key='ink',size=14,w=null){const n=track(figma.createText());n.fontName={family:'Manrope',style:'Regular'};n.characters=content;n.fontSize=size;n.lineHeight={unit:'PIXELS',value:Math.round(size*1.45)};n.fills=[paint(key)];p.appendChild(n);if(w){n.textAutoResize='HEIGHT';n.resize(w,n.height);}n.name=content.slice(0,65);return n;}
function dots(sb){if(sb.children.some(n=>n.name==='macOS window controls'))return;const row=stack(sb,'macOS window controls',188,16,'HORIZONTAL',8);row.counterAxisAlignItems='CENTER';sb.insertChild(0,row);for(const h of ['#FF5F57','#FEBC2E','#28C840']){const n=track(figma.createEllipse());n.resize(11,11);n.fills=[{type:'SOLID',color:{r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255}}];row.appendChild(n);}}
function recolorVectors(root){const mapping={'17694f':'accent','183e34':'ink','566e63':'muted','9db7a4':'teal','ffffff':'on-accent'};for(const n of root.findAllWithCriteria({types:['VECTOR']})){for(const key of ['fills','strokes']){const a=n[key];if(!Array.isArray(a))continue;let changed=false;const b=a.map(p=>{if(p.type!=='SOLID'||p.boundVariables?.color)return p;const h=[p.color.r,p.color.g,p.color.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');const role=mapping[h];if(!role)return p;changed=true;return {...paint(role,h==='9db7a4'?.65:1),blendMode:p.blendMode};});if(changed){n[key]=b;mark(n);}}}}
function ambient(root){const old=root.children.find(n=>n.name==='Mint backdrop under glass');if(old){old.name='Canopy ambient light';fill(old,'accent-soft');old.opacity=.5;old.effects=[{type:'LAYER_BLUR',radius:90,visible:true}];}
 const n=track(figma.createRectangle());n.name='Coqui atmospheric light field';n.resize(root.width,root.height);n.fills=[{type:'GRADIENT_LINEAR',gradientTransform:[[.8,.5,-.2],[-.5,.8,.35]],gradientStops:[{position:0,color:{r:.58,g:.80,b:.70,a:.13}},{position:.48,color:{r:.6,g:.5,b:.8,a:.025}},{position:1,color:{r:.4,g:.65,b:.72,a:.08}}]}];root.insertChild(0,n);
}
// Existing component family: appearance states remain linked to all screen instances.
const family=await figma.getNodeByIdAsync('2:55');
for(const n of family.children){if(n.type!=='COMPONENT')continue;const primary=n.name.includes('Primary'),disabled=n.name.includes('Disabled'),hover=n.name.includes('Hover');surface(n,hover?'Lens':'Kit control',primary?'accent':'glass-lens',primary?.93:.24);if(disabled)n.opacity=.45;for(const t of n.findAllWithCriteria({types:['TEXT']}))fill(t,primary?'on-accent':'ink');}
const primary=await figma.getNodeByIdAsync('2:47');
const hover=await figma.getNodeByIdAsync('2:53');
let pressed=family.children.find(n=>n.name==='Kind=Primary, State=Pressed');
if(!pressed){pressed=track(primary.clone());family.appendChild(pressed);createdNodeIds.push(...pressed.findAll(()=>true).map(n=>n.id));pressed.name='Kind=Primary, State=Pressed';pressed.x=656;pressed.y=30;surface(pressed,'Lens','accent',.78);family.resize(820,104);mark(family);}
const tr={type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.14};
await primary.setReactionsAsync([{trigger:{type:'ON_HOVER'},actions:[{type:'NODE',destinationId:hover.id,navigation:'CHANGE_TO',transition:tr}]}]);
await hover.setReactionsAsync([{trigger:{type:'MOUSE_LEAVE',delay:0},actions:[{type:'NODE',destinationId:primary.id,navigation:'CHANGE_TO',transition:tr}]},{trigger:{type:'MOUSE_DOWN',delay:0},actions:[{type:'NODE',destinationId:pressed.id,navigation:'CHANGE_TO',transition:tr}]}]);
await pressed.setReactionsAsync([{trigger:{type:'MOUSE_UP',delay:0},actions:[{type:'NODE',destinationId:hover.id,navigation:'CHANGE_TO',transition:tr}]}]);mark(primary);mark(hover);mark(pressed);
const rootIds=['3:2','3:137','3:305','3:420'];
for(const id of rootIds){const root=await figma.getNodeByIdAsync(id);mode(root,'Dark');root.name=root.name.replace(/ · Moonforest$/,'')+' · Moonforest';frames[root.name]=root.id;ambient(root);recolorVectors(root);
 if(id==='3:420'){root.x=3168;root.y=160;surface(root.findOne(n=>n.name==='Glass mobile tab bar'),'Canopy','glass-chrome',.62);continue;}
 const sb=root.children.find(n=>n.name==='Glass sidebar');surface(sb,'Canopy','glass-chrome',.52);dots(sb);
 const header=root.children.find(n=>n.name==='Workspace header');header.y=16;header.resize(1140,64);header.paddingLeft=header.paddingRight=16;header.paddingTop=header.paddingBottom=10;header.cornerRadius=999;surface(header,'Canopy','glass-chrome',.42);
 const controls=header.children.filter(n=>n.type==='FRAME');for(const n of controls)surface(n,'Kit control','glass-lens',.22);
 const scene=root.findAllWithCriteria({types:['FRAME']});
 for(const n of scene){
  if(['Lesson reading surface','Practice problem'].includes(n.name)){surface(n,'Reading','surface',.97);n.strokes=[paint('glass-edge',.055)];}
  if(['Visible dependency plan','Background work','Practice focus'].includes(n.name))surface(n,'Mist','surface',.70);
  if(['Knowledge provenance','Proposed spaced review'].includes(n.name))surface(n,'Mist','accent-soft',.66);
  if(n.name==='New learning session dock')surface(n,'Canopy','surface',.62);
  if(n.name==='Map controls')surface(n,'Lens','glass-lens',.50);
  if(n.name==='Knowledge map canvas'){fill(n,'surface',.62);n.strokes=[paint('glass-edge',.08)];n.strokeWeight=1;}
  if(n.name.startsWith('Proposition / ')){surface(n,n.name.endsWith('Gradients')?'Kit control':'Mist',n.name.endsWith('Gradients')?'accent':'surface',n.name.endsWith('Gradients')?.90:.88);}
  if(n.name.startsWith('Navigation / ')&&n.fills.some(p=>p.boundVariables?.color?.id===vars['accent-soft'].id))surface(n,'Lens','accent-soft',.72);
  if(n.name==='Start a session')surface(n,'Kit control','accent',.90);
  if(n.name==='Answer option B')surface(n,'Lens','accent-soft',.78);
 }
 // Small pastels mark concept families, not grading or mastery.
 for(const [name,key]of [['Proposition / Derivatives','sky'],['Proposition / Linear algebra','lilac'],['Proposition / Loss functions','peach'],['Proposition / Optimization','teal'],['Proposition / Chain rule','rose']]){
  const n=root.findOne(x=>x.name===name);if(!n)continue;const t=n.findAllWithCriteria({types:['TEXT']})[0];fill(t,key);
 }
}
const lesson=await figma.getNodeByIdAsync('3:137');
if(page.children.some(n=>n.name==='Learn · Adaptive lesson · Dew'))throw new Error('Dew counterpart already exists; inspect before rerunning');
const light=track(lesson.clone());page.appendChild(light);createdNodeIds.push(...light.findAll(()=>true).map(n=>n.id));light.name='Learn · Adaptive lesson · Dew';light.x=1664;light.y=1200;mode(light,'Light');frames[light.name]=light.id;
const sources=[await figma.getNodeByIdAsync('3:2'),lesson,await figma.getNodeByIdAsync('3:305'),light];
const routes={'Navigation / Map':'3:2','Navigation / Learn':'3:137','Navigation / Review':'3:305','Button / Start learning':'3:137','Open related knowledge':'3:2'};
for(const root of sources)for(const [name,destinationId]of Object.entries(routes)){const n=root.findOne(x=>x.name===name);if(n&&destinationId!==root.id){await n.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.28}}]}]);mark(n);}}
for(const [root,target]of [[lesson,light.id],[light,lesson.id]]){const header=root.children.find(n=>n.name==='Workspace header');const n=stack(header,'Switch appearance',36,36,'HORIZONTAL',0,8);n.cornerRadius=999;surface(n,'Kit control','glass-lens',.28);const icon=track(figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ACC4BB" stroke-width="1.6"><circle cx="12" cy="12" r="7"/><path d="M12 5v14"/></svg>'));n.appendChild(icon);createdNodeIds.push(...icon.findAll(()=>true).map(x=>x.id));recolorVectors(n);await n.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:target,navigation:'NAVIGATE',transition:{type:'DISSOLVE',easing:{type:'EASE_OUT'},duration:.22}}]}]);}
const notes=await figma.getNodeByIdAsync('3:476');notes.resize(2944,120);mode(notes,'Dark');notes.y=2200;fill(notes,'canvas');for(const t of notes.findAllWithCriteria({types:['TEXT']})){if(t.fontSize>=20)t.characters='CoquiLearn · Moonforest + Dew · kit-derived refractive glass';else t.characters='Editable material revision using the supplied Apple Music kit’s Native Fidelity Lab. Pastel Coqui colors; exact base glass recipes plus Canopy, Lens and Mist extensions. Sidebar links and theme switch are prototype interactions. Learning data and review counts remain illustrative.';mark(t);}
page.name='CoquiLearn · Refractive glass';mark(page);
const zero=sources.flatMap(r=>r.findAllWithCriteria({types:['TEXT']})).filter(t=>t.width<=0).map(t=>t.id);
return {createdNodeIds:[...new Set(createdNodeIds)],mutatedNodeIds:[...new Set(mutatedNodeIds)],frames,buttonVariants:family.children.length,pressedId:pressed.id,lightFrameId:light.id,screenBounds:[...sources,await figma.getNodeByIdAsync('3:420')].map(n=>({id:n.id,name:n.name,x:n.x,y:n.y,width:n.width,height:n.height})),zeroWidthText:zero};
