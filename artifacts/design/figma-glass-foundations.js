// CoquiLearn v2. Exact base recipes inspected in the supplied kit's Native Fidelity Lab.
// Imports were attempted but these local, unpublished keys are unavailable cross-file.
const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
const existingText=page.findAllWithCriteria({types:['TEXT']});
const fontNames=[...new Map(existingText.flatMap(t=>t.getStyledTextSegments(['fontName']).map(s=>[JSON.stringify(s.fontName),s.fontName]))).values()];
await Promise.all(fontNames.map(f=>figma.loadFontAsync(f)));
const collections=await figma.variables.getLocalVariableCollectionsAsync();
const palette=collections.find(c=>c.id==='VariableCollectionId:2:2');
const theme=collections.find(c=>c.id==='VariableCollectionId:2:3');
const all=await figma.variables.getLocalVariablesAsync();const createdVariableIds=[],mutatedVariableIds=[],variables={};
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const colors={
 canvas:['#EBF0EB','#172127'], surface:['#FAFCF7','#202D34'], 'surface-soft':['#E0E9E2','#293940'],
 ink:['#253C35','#DDEDE5'], muted:['#526D63','#ACC4BB'], accent:['#316A49','#A9D9A0'],
 'accent-soft':['#CFE3D3','#304B42'], 'on-accent':['#F5FAF1','#17291D'], line:['#B9CEC0','#4A655E'],
 warning:['#855B29','#EDC99C'], 'warning-soft':['#F4E7D4','#4A3E30'], lilac:['#80709B','#C9BFE8'],
 teal:['#327A72','#96D5C5'], peach:['#A36042','#EBBEA0'], rose:['#9B586B','#E5B4C4'],
 sky:['#4A708B','#ABCDDF'], crust:['#D7E2D9','#10181E'], 'glass-chrome':['#D4E0DA','#30424A'],
 'glass-lens':['#EAF3ED','#41564F'], 'glass-edge':['#FFFFFF','#D2EBDA']
};
// Update-compatible adaptation of the skill createSemanticTokens helper.
for(const [name,pair]of Object.entries(colors)){
 let primitive=all.find(v=>v.variableCollectionId===palette.id&&v.name==='palette/'+name);
 if(!primitive){primitive=figma.variables.createVariable('palette/'+name,palette,'COLOR');createdVariableIds.push(primitive.id);}
 primitive.scopes=[];
 for(let i=0;i<2;i++)primitive.setValueForMode(palette.modes[i].modeId,{...rgb(pair[i]),a:1});
 let semantic=all.find(v=>v.variableCollectionId===theme.id&&v.name==='color/'+name);
 if(!semantic){semantic=figma.variables.createVariable('color/'+name,theme,'COLOR');createdVariableIds.push(semantic.id);}
 semantic.scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];
 for(const mode of theme.modes)semantic.setValueForMode(mode.modeId,{type:'VARIABLE_ALIAS',id:primitive.id});
 semantic.setVariableCodeSyntax('WEB','var(--color-'+name+')');
 semantic.setVariableCodeSyntax('iOS','Color.coqui'+name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(''));
 variables[name]=semantic.id;mutatedVariableIds.push(primitive.id,semantic.id);
}
const local=await figma.getLocalEffectStylesAsync();const styles={},createdStyleIds=[],mutatedStyleIds=[];
const shadow=(radius,y,alpha)=>({type:'DROP_SHADOW',color:{r:0.025,g:0.055,b:0.065,a:alpha},offset:{x:0,y},radius,spread:0,visible:true,blendMode:'NORMAL',showShadowBehindNode:true});
const rim=alpha=>({type:'INNER_SHADOW',color:{r:1,g:1,b:1,a:alpha},offset:{x:0,y:1},radius:1,spread:0,visible:true,blendMode:'NORMAL'});
const glass=(radius,refraction,depth,lightIntensity,dispersion=.005)=>({type:'GLASS',visible:true,radius,refraction,depth,lightAngle:-45,lightIntensity,dispersion});
function effect(name,effects,description,oldId=null){let n=oldId?local.find(x=>x.id===oldId):local.find(x=>x.name===name);if(!n){n=figma.createEffectStyle();createdStyleIds.push(n.id);}n.name=name;n.description=description;n.effects=effects;styles[name.split(' / ').pop()]=n.id;mutatedStyleIds.push(n.id);return n;}
effect('CoquiLearn / Glass / Kit chrome',[glass(22.5,.06,4,.28),rim(.10),shadow(24,8,.18)],'Exact Fidelity/Chrome/Refractive base from Apple Music kit Gz7WEiN8Y3Vvivvae0ZPlP, source 116:165. Recreated as editable local style because cross-file keys were unavailable.','S:efc4a8f3e628fb775f5bb13b17f790eb1fe51d56,');
effect('CoquiLearn / Glass / Kit control',[glass(15,.12,7,.42),rim(.20),shadow(9,3,.14)],'Exact Fidelity/Button/Refractive base from source 116:167. Use for selected pills and compact controls.');
effect('CoquiLearn / Glass / Kit content',[glass(45,.06,4,.28),rim(.10),shadow(24,8,.18)],'Exact Fidelity/Content/Refractive base from source 116:169. Reserved for material study; reading uses stable frost.');
effect('CoquiLearn / Glass / Canopy',[glass(26,.085,5,.38,.006),rim(.16),shadow(32,12,.24)],'Coqui extension: cool green chrome, slightly deeper rim and softer shadow. Navigation/sidebar/header only.');
effect('CoquiLearn / Glass / Lens',[glass(12,.18,10,.54,.008),rim(.28),shadow(14,5,.20)],'Coqui extension: more refractive, brighter compact interactive lens. Avoid long text.');
effect('CoquiLearn / Glass / Mist',[glass(32,.035,3,.22,.003),rim(.10),shadow(24,8,.18)],'Coqui extension: restrained frost for background inspectors and composition trays.');
effect('CoquiLearn / Glass / Reading',[{type:'BACKGROUND_BLUR',radius:18,visible:true},rim(.045),shadow(24,8,.13)],'High-opacity reading surface: calm text plane beneath refractive navigation.');
return {createdNodeIds:[],mutatedNodeIds:[],createdVariableIds,mutatedVariableIds,createdStyleIds,mutatedStyleIds,variables,styles,palette:colors,collections:{palette:palette.id,theme:theme.id},modes:{palette:{Light:palette.modes[0].modeId,Dark:palette.modes[1].modeId},theme:{Light:theme.modes[0].modeId,Dark:theme.modes[1].modeId}},fonts:fontNames};
