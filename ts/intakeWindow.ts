import { ipcRenderer } from 'electron';

export class IntakeWindow {
    private current: any;
    private clients: any[] = [];
    private intakes: any[] = [];
    private files: any[] = [];
    private busy = false;
    private dirty = false;
    private paymentId = crypto.randomUUID();
    private paymentPayload: any;
    private fields = ['name','clientId','srcLang','tgtLang','deadline','orderNumber','service','paymentTerms','notes'];
    private briefFields = ['purpose','audience','domain','tone','terminology','doNotTranslate','delivery','instructions','styleGuide','aiPolicy'];
    constructor() {
        document.getElementById('details')!.addEventListener('input', () => { this.dirty=true; });
        window.addEventListener('beforeunload', event => { if(this.dirty && !confirm('有未保存的委托修改，仍要关闭？')) { event.preventDefault(); event.returnValue=false; } });
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (_event, theme: string) => { (document.getElementById('theme') as HTMLLinkElement).href=theme; });
        ipcRenderer.invoke('get-style-guides').then((guides: any[]) => {
            const select=this.input('styleGuide') as HTMLSelectElement;select.add(new Option('不指定',''));
            guides.forEach(g=>select.add(new Option(g.name,g.id)));
            if(this.current?.brief)select.value=this.current.brief.styleGuide||'';
        });
        this.bind('refresh',async()=>this.load());
        this.bind('new',async()=>{if(!this.discard())return;this.current={};this.files=[];this.render();});
        this.bind('save',async()=>this.save());
        this.bind('saveClient',async()=>{
            const data=await this.call({op:'client-save',client:{name:this.value('clientName'),contact:this.value('clientContact'),email:this.value('clientEmail'),phone:this.value('clientPhone')}});
            await this.load();this.input('clientId').value=data.client.id;
        });
        for(const [id,role] of [['sourceFiles','source'],['referenceFiles','reference']])this.bind(id,async()=>{
            if(this.current?.projectId)throw Error('已建项目的文件已冻结；请新建委托处理新增原文。');
            const paths:string[]=await ipcRenderer.invoke('intake-files');paths.forEach(path=>{if(!this.files.some(f=>f.path===path))this.files.push({path,role,encoding:'UTF-8'});});this.dirty=true;this.renderFiles();
        });
        this.bind('clearFiles',async()=>{if(this.current?.projectId)throw Error('已建项目的文件已冻结');this.files=[];this.dirty=true;this.renderFiles();});
        this.bind('analyze',async()=>{await this.save();await this.mutate({op:'analyze'});});
        this.bind('quote',async()=>{
            const pricing:any={};for(const key of ['basis','currency','rate','rounding','minimum','surcharge','discount'])pricing[key]=this.value(key);
            pricing.per=Number(this.value('per'));pricing.countConfirmed=this.checked('countConfirmed');
            await this.save();await this.mutate({op:'quote',pricing});
        });
        this.bind('confirmQuote',async()=>{
            await this.save();
            const q=this.current?.quotes?.findLast((q:any)=>q.status==='estimate');if(!q)throw Error('请先计算报价草案');
            if(!confirm('确认这份报价已获接受？金额：'+q.currency+' '+q.total))return;
            await this.mutate({op:'confirm-quote',quoteId:q.id});
        });
        this.bind('create',async()=>{await this.save();await this.mutate({op:'create'});this.message('项目已创建：'+this.current.projectId+'。回到 Projects 刷新列表即可打开。');});
        this.bind('payment',async()=>{
            const payment={id:this.paymentId,amount:this.value('paymentAmount'),currency:this.value('paymentCurrency'),date:this.value('paymentDate'),note:this.value('paymentNote')};
            if(this.paymentPayload && JSON.stringify(this.paymentPayload)!==JSON.stringify(payment))throw Error('上次收款提交状态未确认，请先刷新核对记录；保留原金额重试可防止重复入账。');
            this.paymentPayload=payment;
            await this.save();
            await this.mutate({op:'payment',payment});this.paymentId=crypto.randomUUID();this.paymentPayload=undefined;this.input('paymentAmount').value='';
        });
        this.load().catch(e=>this.message(String(e)));
    }
    private input(id:string): HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement {return document.getElementById(id) as HTMLInputElement;}
    private value(id:string):string{return this.input(id).value.trim();}
    private checked(id:string):boolean{return (this.input(id) as HTMLInputElement).checked;}
    private message(text:string):void {document.getElementById('message')!.textContent=text;}
    private bind(id:string,run:()=>Promise<void>):void {document.getElementById(id)!.addEventListener('click',async()=>{
        if(this.busy)return;this.busy=true;this.message('处理中…');
        try{await run();}catch(e){this.message(String(e));}finally{this.busy=false;}
    });}
    private async call(request:any):Promise<any>{const data=await ipcRenderer.invoke('business-request',request);if(data.status!=='Success')throw Error(data.reason||'操作失败');return data;}
    private async load():Promise<void>{
        const data=await this.call({op:'list'});this.clients=data.clients;this.intakes=data.intakes;
        const selected=this.value('clientId');const client=this.input('clientId') as HTMLSelectElement;client.replaceChildren(new Option('待确认',''));
        this.clients.forEach(c=>client.add(new Option(c.name,c.id)));client.value=selected;
        const list=document.getElementById('list')!;list.replaceChildren();
        this.intakes.forEach(row=>{const b=document.createElement('button');b.className='entry';b.textContent=(row.name||'未命名委托')+(row.projectId?' · 已建项':' · 草稿');b.addEventListener('click',()=>{if(this.busy||!this.discard())return;this.current=row;this.files=structuredClone(row.files||[]);this.render();});list.appendChild(b);});
        this.message('已加载 '+this.intakes.length+' 份委托');
    }
    private discard():boolean { return !this.dirty || confirm('有未保存的委托修改，仍要切换？'); }
    private renderFiles():void {const list=document.getElementById('fileList')!;list.replaceChildren();this.files.forEach(f=>{const line=document.createElement('div');line.textContent=(f.role==='reference'?'参考：':'原文：')+f.path;list.appendChild(line);});}
    private render():void {
        this.dirty=false;
        document.getElementById('details')!.hidden=false;
        for(const key of this.fields)this.input(key).value=this.current[key]||'';
        for(const key of this.briefFields)this.input(key).value=this.current.brief?.[key]||'';
        this.input('questions').value=(this.current.questions||[]).map((q:any)=>typeof q==='string'?q:JSON.stringify(q)).join('\n');
        (this.input('requirementsConfirmed') as HTMLInputElement).checked=!!this.current.requirementsConfirmed;
        (this.input('countConfirmed') as HTMLInputElement).checked=false;
        this.renderFiles();
        document.getElementById('evidence')!.textContent=JSON.stringify({evidence:this.current.evidence||[],materials:this.current.materials||[]},null,2);
        const a=this.current.analysis;document.getElementById('analysis')!.textContent=a?JSON.stringify({totals:a.totals,files:a.files.map((f:any)=>({name:f.name,role:f.role,words:f.words,characters:f.characters,han:f.han,segments:f.segments})),warnings:a.warnings},null,2):'尚未解析文件';
        document.getElementById('quotes')!.textContent=(this.current.quotes||[]).map((q:any)=>`${q.status} · ${q.currency} ${q.total}\n数量 ${q.quantity}；口径 ${q.pricing.basis}；单价 ${q.pricing.rate} / ${q.pricing.per}\nID ${q.id}`).join('\n\n');
        document.getElementById('balance')!.textContent=this.current.balance?`${this.current.balance.currency} 应收 ${this.current.balance.due}；已收 ${this.current.balance.paid}；未收 ${this.current.balance.remaining}`:'尚无已确认报价';
        document.getElementById('payments')!.textContent=JSON.stringify(this.current.payments||[],null,2);
        this.message(this.current.projectId?'已建项目：'+this.current.projectId:'草稿待补全：'+(this.current.missing||[]).join('、'));
    }
    private async save():Promise<void>{
        const intake:any={};if(this.current?.id){intake.id=this.current.id;intake.revision=this.current.revision;}
        for(const key of this.fields)intake[key]=this.value(key);
        intake.brief={};for(const key of this.briefFields)intake.brief[key]=this.value(key);
        intake.files=this.files;intake.questions=this.value('questions').split('\n').filter(Boolean);
        intake.requirementsConfirmed=this.checked('requirementsConfirmed');
        const data=await this.call({op:'save',intake});this.current=data.intake;this.files=structuredClone(this.current.files||[]);await this.load();this.render();
    }
    private async mutate(request:any):Promise<void>{if(!this.current?.id)throw Error('请先保存委托');const data=await this.call({...request,id:this.current.id,revision:this.current.revision});this.current=data.intake;await this.load();this.render();}
}
