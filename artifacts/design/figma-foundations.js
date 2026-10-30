// CoquiLearn concept foundations; local fallback after Apple-library import refusal.
const page = await figma.getNodeByIdAsync('0:1');
await figma.setCurrentPageAsync(page);
page.name = 'CoquiLearn · macOS first';
const fonts = ['Regular','Medium','Semibold','Bold'];
await Promise.all(fonts.map(style=>figma.loadFontAsync({family:'SF Pro',style})));
const createdNodeIds=[], variables={}, styles={};
const rgb=hex=>({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
// Adapted from the skill createVariableCollection helper.
function createCollection(name,modeNames){const c=figma.variables.createVariableCollection(name);const modes={};c.renameMode(c.modes[0].modeId,modeNames[0]);modes[modeNames[0]]=c.modes[0].modeId;for(const n of modeNames.slice(1))modes[n]=c.addMode(n);return {c,modes};}
if((await figma.variables.getLocalVariableCollectionsAsync()).some(c=>c.name==='CoquiLearn / Theme'))throw new Error('Foundations already exist; inspect state before rerun');
const primitive=createCollection('CoquiLearn / Palette',['Light','Dark']);
const semantic=createCollection('CoquiLearn / Theme',['Light','Dark']);
const palette={
 'canvas':['#F3F5EF','#10241F'], 'surface':['#FFFFFF','#19352C'],
 'surface-soft':['#EAF1E9','#203F35'], 'ink':['#183E34','#F1F7F2'],
 'muted':['#566E63','#B6CCBF'], 'accent':['#17694F','#94DDAC'],
 'accent-soft':['#DCEEE0','#294C3C'], 'on-accent':['#FFFFFF','#10241F'],
 'line':['#CFDCD1','#3E5D4D'], 'warning':['#8C5713','#EDC47B'],
 'warning-soft':['#FBF0DB','#493A20'], 'lilac':['#E8E4F2','#3F354D']
};
for(const [name,values] of Object.entries(palette)){
 const p=figma.variables.createVariable('palette/'+name,primitive.c,'COLOR');p.scopes=[];
 const v=figma.variables.createVariable('color/'+name,semantic.c,'COLOR');
 v.scopes=name==='ink'||name==='muted'||name==='on-accent'?['TEXT_FILL','STROKE_COLOR']:['FRAME_FILL','SHAPE_FILL','STROKE_COLOR'];
 for(let i=0;i<2;i++){const mode=['Light','Dark'][i];p.setValueForMode(primitive.modes[mode],{...rgb(values[i]),a:1});v.setValueForMode(semantic.modes[mode],{type:'VARIABLE_ALIAS',id:p.id});}
 v.setVariableCodeSyntax('WEB','var(--color-'+name+')');v.setVariableCodeSyntax('iOS','Color.coqui'+name.split('-').map(t=>t[0].toUpperCase()+t.slice(1)).join(''));variables[name]=v.id;
}
const geometry=createCollection('CoquiLearn / Geometry',['Value']);
for(const n of [4,8,12,16,24,32,48]){const v=figma.variables.createVariable('space/'+n,geometry.c,'FLOAT');v.scopes=['GAP'];v.setValueForMode(geometry.modes.Value,n);v.setVariableCodeSyntax('WEB','var(--space-'+n+')');variables['space/'+n]=v.id;}
for(const n of [12,20,28,999]){const v=figma.variables.createVariable('radius/'+n,geometry.c,'FLOAT');v.scopes=['CORNER_RADIUS'];v.setValueForMode(geometry.modes.Value,n);v.setVariableCodeSyntax('WEB','var(--radius-'+n+')');variables['radius/'+n]=v.id;}
for(const [name,size,weight,line] of [['Display',36,'Semibold',42],['Title',24,'Semibold',30],['Section',19,'Semibold',26],['Body',17,'Regular',26],['UI',14,'Medium',20],['Caption',12,'Regular',17]]){
 const s=figma.createTextStyle();s.name='CoquiLearn / '+name;s.fontName={family:'SF Pro',style:weight};s.fontSize=size;s.lineHeight={unit:'PIXELS',value:line};styles[name]=s.id;
}
const paint=name=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:rgb(palette[name][0])},'color',figma.variables.getVariableById(variables[name]));
const shadow=figma.createEffectStyle();shadow.name='CoquiLearn / Glass chrome';shadow.effects=[{type:'BACKGROUND_BLUR',radius:28,visible:true},{type:'DROP_SHADOW',color:{...rgb('#183E34'),a:0.08},offset:{x:0,y:8},radius:28,spread:0,visible:true,blendMode:'NORMAL'}];styles.Glass=shadow.id;
// Adapted from the skill createComponentWithVariants helper, scoped to four variants.
const comps=[];
for(const [label,kind,state] of [['Continue','Primary','Default'],['Continue','Primary','Disabled'],['View sources','Secondary','Default'],['Continue','Primary','Hover']]){
 const c=figma.createComponent();createdNodeIds.push(c.id);c.name='Kind='+kind+', State='+state;c.resize(148,44);c.layoutMode='HORIZONTAL';c.primaryAxisAlignItems='CENTER';c.counterAxisAlignItems='CENTER';c.paddingLeft=20;c.paddingRight=20;c.cornerRadius=999;c.fills=[paint(kind==='Secondary'?'surface':state==='Disabled'?'line':'accent')];c.description='CoquiLearn action control; one clear verb. Minimum height 44pt. Focus ring supplied by platform implementation.';
 const t=figma.createText();createdNodeIds.push(t.id);t.fontName={family:'SF Pro',style:'Semibold'};t.characters=label;t.fontSize=14;t.fills=[paint(kind==='Secondary'?'ink':state==='Disabled'?'muted':'on-accent')];c.appendChild(t);comps.push(c);
}
const set=figma.combineAsVariants(comps,page);createdNodeIds.push(set.id);set.name='CoquiLearn / Button';set.x=160;set.y=2250;set.resize(660,104);set.description='Local editable fallback for glass-oriented app controls. Apple library imports were refused. Variants cover primary, secondary, disabled, and hover.';
comps.forEach((c,i)=>{c.x=16+i*160;c.y=30;});
return {createdNodeIds,mutatedNodeIds:[page.id],variables,styles,collections:{palette:primitive.c.id,theme:semantic.c.id,geometry:geometry.c.id},themeModes:semantic.modes,components:{button:set.id,primary:comps[0].id,disabled:comps[1].id,secondary:comps[2].id,hover:comps[3].id},counts:{paletteVariables:24,geometryVariables:11,textStyles:6,buttonVariants:4}};
