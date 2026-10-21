const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../tracking.js'),'utf8');
function run({url='https://recupereibr.com.br/obrigado-avaliacao',ref='',storage=new Map(),links=[]}={}) {
  const handlers={};const loc=new URL(url);const pixel=[];
  const document={referrer:ref,head:{appendChild(){}},createElement:()=>({}),querySelectorAll:()=>links,addEventListener:(type,fn)=>{handlers[type]=fn;}};
  const window={location:loc,history:{replaceState(_a,_b,path){const u=new URL(path,loc);Object.assign(loc,{href:u.href});}},crypto:{randomUUID:()=> 'test-event'},fbq:(...args)=>pixel.push(args)};
  const sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  vm.runInNewContext(source,{window,document,sessionStorage,URL,Date,Math});
  handlers.DOMContentLoaded();
  return {window,pixel,storage,submit:handlers.submit,leads:()=>window.dataLayer.filter(e=>e[0]==='event'&&e[1]==='generate_lead')};
}
test('direct thank-you visits do not create leads',()=>assert.equal(run().leads().length,0));
test('valid RD attempt plus same-origin redirect counts once; reload does not',()=>{
 const storage=new Map();const form=run({url:'https://recupereibr.com.br/avaliacao',storage});
 form.submit({target:{closest:()=>true,checkValidity:()=>true}});
 const args={storage,ref:'https://recupereibr.com.br/avaliacao'};
 assert.equal(run(args).leads().length,1);assert.equal(run(args).leads().length,0);
});
test('invalid, expired and external-referrer attempts never count',()=>{
 const storage=new Map();const form=run({url:'https://recupereibr.com.br/avaliacao',storage});
 form.submit({target:{closest:()=>true,checkValidity:()=>false}});
 assert.equal(run({storage,ref:'https://recupereibr.com.br/avaliacao'}).leads().length,0);
 storage.set('recupereibrRdPending',JSON.stringify({id:'test',at:Date.now()-310000}));
 assert.equal(run({storage,ref:'https://recupereibr.com.br/avaliacao'}).leads().length,0);
 storage.set('recupereibrRdPending',JSON.stringify({id:'test',at:Date.now()}));
 assert.equal(run({storage,ref:'https://another.example/avaliacao'}).leads().length,0);
});
test('analytics receives no free-form health parameters or sensitive query values',()=>{
 const r=run({url:'https://recupereibr.com.br/avaliacao?valor_mensal=900&email=private%40example.invalid&utm_source=google'});
 r.window.recupereibr.rastrear('Lead',{disease:'private diagnosis',monthlyIr:900},'id');
 r.window.recupereibr.rastrear('LeadDesqualificado',{motivo:'health'});
 const payload=JSON.stringify([r.window.dataLayer,r.pixel]);
 assert.doesNotMatch(payload,/private|diagnosis|monthlyIr|LeadDesqualificado|900/);
 assert.equal(r.leads().length,1);
 assert.equal(r.window.location.search,'?utm_source=google');
});
test('paid attribution survives an internal form link without forwarding answers',()=>{
 const link={href:'https://recupereibr.com.br/avaliacao?origem=home'};
 run({url:'https://recupereibr.com.br/?utm_source=google&utm_campaign=campaign1&gclid=click1&disease=private',links:[link]});
 const target=new URL(link.href);assert.equal(target.searchParams.get('utm_source'),'google');assert.equal(target.searchParams.get('gclid'),'click1');assert.equal(target.searchParams.has('disease'),false);
});
