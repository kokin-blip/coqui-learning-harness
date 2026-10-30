import {_electron as electron} from 'playwright';
import fs from 'node:fs';
const executable=process.env.COQUI_EXECUTABLE;
if(!executable)throw new Error('Set COQUI_EXECUTABLE');
const app=await electron.launch({executablePath:executable,args:[]});
let leaveOpen=false;
try {
 const page=await app.firstWindow();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('heading',{name:'ChatGPT',exact:true}).waitFor();
 let state=await page.evaluate(()=>window.coqui.host('connections'));
 if(!state.chatgpt.accounts.some(a=>a.connected)) {
  await page.getByRole('button',{name:'Continue with ChatGPT',exact:true}).click();
  console.log('CHATGPT_SIGN_IN_OPEN: complete sign-in in the system browser.');
 }
 const deadline=Date.now()+240000;
 while(Date.now()<deadline) {
  state=await page.evaluate(()=>window.coqui.host('connections'));
  if(state.chatgpt.accounts.some(a=>a.connected)) {
   const catalog=await page.evaluate(()=>window.coqui.request({path:'/api/models'}));
   const report={at:new Date().toISOString(),connected:true,models:(catalog.body?.models??[]).filter(m=>m.provider==='chatgpt').map(m=>({id:m.id,name:m.name,input:m.input})),needsPlanConfirmation:state.chatgpt.needsPlanConfirmation};
   fs.writeFileSync('artifacts/implementation/chatgpt-live-connection.json',JSON.stringify(report,null,2));
   console.log(JSON.stringify(report));leaveOpen=true;break;
  }
  if(!state.chatgpt.pending&&state.chatgpt.error){console.log('CONNECTION_RESULT',JSON.stringify({connected:false,error:state.chatgpt.error}));break;}
  await page.waitForTimeout(1500);
 }
 if(!leaveOpen)fs.writeFileSync('artifacts/implementation/chatgpt-live-connection.json',JSON.stringify({at:new Date().toISOString(),connected:false,error:state.chatgpt.error??'Sign-in not completed'},null,2));
} finally {
 if(!leaveOpen)await app.close();
 else {console.log('Connection saved in CoquiLearn’s production credential vault.');await app.close();}
}
