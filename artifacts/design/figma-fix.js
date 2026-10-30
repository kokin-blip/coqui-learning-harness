const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
await Promise.all(['Regular','Medium','Semibold','Bold'].map(style=>figma.loadFontAsync({family:'SF Pro',style})));
await Promise.all(['Regular','Medium','SemiBold','Bold'].map(style=>figma.loadFontAsync({family:'Manrope',style})));
const mutatedNodeIds=[];
// SF Pro was reported available, but its glyph metrics resolved to width zero.
// Keep editable text and use a verified renderer-compatible fallback.
for(const s of await figma.getLocalTextStylesAsync())if(s.name.startsWith('CoquiLearn / ')){
 const old=s.fontName.style;s.fontName={family:'Manrope',style:old==='Semibold'?'SemiBold':old};
}
for(const t of page.findAllWithCriteria({types:['TEXT']})){
 const name=t.fontName;
 if(name!==figma.mixed && name.family==='SF Pro'){
  t.fontName={family:'Manrope',style:name.style==='Semibold'?'SemiBold':name.style};mutatedNodeIds.push(t.id);
 }
}
const byName=n=>page.findOne(t=>t.name===n);
function edit(n,p){if(!n)return;for(const [k,v]of Object.entries(p))n[k]=v;mutatedNodeIds.push(n.id);}
const left=byName('Lesson reading surface');edit(left,{itemSpacing:16,paddingTop:24,paddingBottom:24});
byName('Lesson identity').resize(678,64);mutatedNodeIds.push(byName('Lesson identity').id);
// Resize via API; width/height properties are read-only outside node.set().
byName('Teacher explanation').resize(678,116);mutatedNodeIds.push(byName('Teacher explanation').id);
byName('Structured understanding check').resize(678,264);mutatedNodeIds.push(byName('Structured understanding check').id);
const mobile=byName('Mobile question');edit(mobile,{itemSpacing:16});
byName('Mobile answer input').resize(294,154);mutatedNodeIds.push(byName('Mobile answer input').id);
edit(byName('CoquiLearn / Button'),{y:2390});
const issue=[];
for(const n of page.findAllWithCriteria({types:['FRAME']})){
 if(n.layoutMode!=='NONE')for(const c of n.children){
  if(c.x+c.width>n.width+1 || c.y+c.height>n.height+1)issue.push({parent:n.name,parentId:n.id,node:c.name,id:c.id,width:n.width,height:n.height,right:c.x+c.width,bottom:c.y+c.height});
 }
}
return {mutatedNodeIds:[...new Set(mutatedNodeIds)],createdNodeIds:[],fontFallback:'Manrope; SF Pro metrics were zero',overflow:issue};
