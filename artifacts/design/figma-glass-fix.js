// One targeted visual correction pass: resolved paint fallbacks, alpha tokens, and overflowing practice tray.
const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
const texts=page.findAllWithCriteria({types:['TEXT']});
await Promise.all([...new Map(texts.flatMap(t=>t.getStyledTextSegments(['fontName']).map(s=>[JSON.stringify(s.fontName),s.fontName]))).values()].map(f=>figma.loadFontAsync(f)));
const createdNodeIds=[],mutatedNodeIds=[],createdVariableIds=[],mutatedVariableIds=[];
const palette=await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:2:2');
const theme=await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:2:3');
const existing=await figma.variables.getLocalVariablesAsync('COLOR');
const colors={
 chrome:['#D4E0DA','#30424A',.52,.52], 'kit-chrome':['#D4E0DA','#30424A',.60,.60],
 lens:['#EAF3ED','#41564F',.36,.36], 'kit-control':['#EAF3ED','#41564F',.32,.32],
 'kit-content':['#FAFCF7','#202D34',.66,.66], mist:['#FAFCF7','#202D34',.72,.72],
 reading:['#FAFCF7','#202D34',.97,.97], primary:['#316A49','#A9D9A0',.94,.94],
 selected:['#CFE3D3','#304B42',.78,.78], tint:['#CFE3D3','#304B42',.66,.66],
 edge:['#FFFFFF','#D2EBDA',.65,.13], 'edge-strong':['#FFFFFF','#D2EBDA',.88,.24]
};
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const materialVars={};
for(const [name,pair]of Object.entries(colors)){
 let p=existing.find(v=>v.name==='palette/material/'+name&&v.variableCollectionId===palette.id);
 if(!p){p=figma.variables.createVariable('palette/material/'+name,palette,'COLOR');createdVariableIds.push(p.id);}p.scopes=[];
 for(let i=0;i<2;i++)p.setValueForMode(palette.modes[i].modeId,{...rgb(pair[i]),a:pair[i+2]});
 let v=existing.find(v=>v.name==='color/material/'+name&&v.variableCollectionId===theme.id);
 if(!v){v=figma.variables.createVariable('color/material/'+name,theme,'COLOR');createdVariableIds.push(v.id);}v.scopes=['FRAME_FILL','SHAPE_FILL','STROKE_COLOR'];
 for(const m of theme.modes)v.setValueForMode(m.modeId,{type:'VARIABLE_ALIAS',id:p.id});
 v.setVariableCodeSyntax('WEB','var(--material-'+name+')');v.setVariableCodeSyntax('iOS','CoquiMaterial.'+name.replaceAll('-',''));
 materialVars[name]=v;mutatedVariableIds.push(p.id,v.id);
}
const all=[...existing,...Object.values(materialVars)];const variableMap=new Map(all.map(v=>[v.id,v]));
const effectStyles=await figma.getLocalEffectStylesAsync();const effectNames=new Map(effectStyles.map(s=>[s.id,s.name.split(' / ').pop()]));
function resolvedPaint(n,v){const value=v.resolveForConsumer(n).value;const paint=figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:value.r,g:value.g,b:value.b},opacity:value.a??1},'color',v);return {...paint,color:{r:value.r,g:value.g,b:value.b},opacity:value.a??1};}
const targets=['3:2','3:137','3:305','3:420','15:235','16:11','16:85','2:55','3:476'];
for(const id of targets){const root=await figma.getNodeByIdAsync(id);const nodes=[root,...root.findAll(()=>true)];
 for(const n of nodes){
  if(!('fills'in n)||!Array.isArray(n.fills))continue;
  const effect=effectNames.get(n.effectStyleId);const current=n.fills.find(p=>p.type==='SOLID'&&p.boundVariables?.color);
  const v=current?variableMap.get(current.boundVariables.color.id):null;const name=v?.name.replace('color/','');
  let material=null;
  if(effect){
   if(name==='accent'||name==='material/primary')material='primary';
   else if(name==='accent-soft'||name==='material/selected')material=['Lens','Kit control'].includes(effect)?'selected':'tint';
   else material=({'Canopy':'chrome','Lens':'lens','Mist':'mist','Reading':'reading','Kit chrome':'kit-chrome','Kit control':'kit-control','Kit content':'kit-content'})[effect];
  }
  if(material){n.fills=[resolvedPaint(n,materialVars[material])];n.strokes=effect==='Reading'?[]:[resolvedPaint(n,materialVars[['Lens','Kit control'].includes(effect)?'edge-strong':'edge'])];mutatedNodeIds.push(n.id);}
  // Resolve the fallback too: Figma's static export can retain black fallbacks on a new dark-mode binding.
  for(const key of ['fills','strokes']){if(!Array.isArray(n[key]))continue;let changed=false;const paints=n[key].map(p=>{if(p.type!=='SOLID'||!p.boundVariables?.color)return p;const variable=variableMap.get(p.boundVariables.color.id);if(!variable)return p;changed=true;return {...resolvedPaint(n,variable),blendMode:p.blendMode};});if(changed){n[key]=paints;mutatedNodeIds.push(n.id);}}
 }
}
const practice=await figma.getNodeByIdAsync('3:305');
const rail=practice.findOne(n=>n.name==='Practice inspector');rail.itemSpacing=20;
const recall=practice.findOne(n=>n.name==='Proposed spaced review');recall.resize(374,312);
const feedback=practice.findOne(n=>n.name==='Grading explanation');feedback.resize(374,92);feedback.paddingTop=feedback.paddingBottom=12;
mutatedNodeIds.push(rail.id,recall.id,feedback.id);
const motion=await figma.getNodeByIdAsync('16:85');
for(const t of motion.findAllWithCriteria({types:['TEXT']})){if(t.characters==='Specular response'){t.characters='Specular material';mutatedNodeIds.push(t.id);}if(t.characters==='Light .38 → .68 → .54'){t.characters='Static highlight · .54 intensity';mutatedNodeIds.push(t.id);}}
return {createdNodeIds,mutatedNodeIds:[...new Set(mutatedNodeIds)],createdVariableIds,mutatedVariableIds,materialVariableIds:Object.fromEntries(Object.entries(materialVars).map(([k,v])=>[k,v.id])),practiceRail:{height:rail.height,children:rail.children.map(n=>({id:n.id,name:n.name,y:n.y,height:n.height}))},note:'Glass effect animation setters did not retain tracks in this service; authored motion uses selection translation, tray translation/opacity, and press scale.'};
