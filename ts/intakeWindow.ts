import { ipcRenderer } from 'electron';

export class IntakeWindow {
    private current: any;
    private clients: any[] = [];
    private intakes: any[] = [];
    private files: any[] = [];
    private editingClient: any;
    private busy = false;
    private dirty = false;
    private deliveryDirty = false;
    private paymentId = crypto.randomUUID();
    private paymentPayload: any;
    private fields = ['name','clientId','srcLang','tgtLang','deadline','orderNumber','service','paymentTerms','notes','endClient'];
    private briefFields = ['purpose','audience','domain','tone','terminology','doNotTranslate','delivery','instructions','styleGuide','aiPolicy'];
    constructor() {
        document.getElementById('details')!.addEventListener('input', () => { this.dirty=true; });
        window.addEventListener('beforeunload', event => { if((this.dirty||this.deliveryDirty) && !confirm('有未保存的委托修改，仍要关闭？')) { event.preventDefault(); event.returnValue=false; } });
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (_event, theme: string) => { (document.getElementById('theme') as HTMLLinkElement).href=theme; });
        ipcRenderer.invoke('get-style-guides').then((guides: any[]) => {
            const select=this.input('styleGuide') as HTMLSelectElement;select.add(new Option('不指定',''));
            guides.forEach(g=>select.add(new Option(g.name,g.id)));
            if(this.current?.brief)select.value=this.current.brief.styleGuide||'';
        });
        this.bind('refresh',async()=>{await this.load();if(!document.getElementById('financePanel')!.hidden)await this.loadFinance();});
        this.bind('finance',async()=>{if(!this.discard())return;this.dirty=false;this.deliveryDirty=false;document.getElementById('details')!.hidden=true;document.getElementById('financePanel')!.hidden=false;await this.loadFinance();});
        this.bind('financeRefresh',async()=>this.loadFinance());
        this.bind('new',async()=>{if(!this.discard())return;this.current={};this.files=[];this.render();});
        this.bind('save',async()=>this.save());
        this.bind('editClient',async()=>{
            const client=this.clients.find(c=>c.id===this.value('clientId'));if(!client)throw Error('先选择客户');this.editingClient=client;
            for(const [field,id] of Object.entries(this.clientFields()))this.input(id).value=client[field]||'';
            document.getElementById('clientMode')!.textContent='正在编辑：'+client.name;
        });
        this.bind('newClient',async()=>{this.editingClient=undefined;for(const id of Object.values(this.clientFields()))this.input(id).value='';document.getElementById('clientMode')!.textContent='新增客户';});
        this.bind('saveClient',async()=>{
            const client:any={};for(const [field,id] of Object.entries(this.clientFields()))client[field]=this.value(id);
            if(this.editingClient){client.id=this.editingClient.id;client.revision=this.editingClient.revision;}
            const data=await this.call({op:'client-save',client});this.editingClient=data.client;
            await this.load();this.input('clientId').value=data.client.id;this.dirty=true;
            document.getElementById('clientMode')!.textContent='已保存：'+data.client.name;
        });
        this.bind('saveDelivery',async()=>{
            const data={op:'delivery',deliveryStatus:this.value('deliveryStatus'),deliveredDate:this.value('deliveredDate'),paymentDueDate:this.value('paymentDueDate'),timeZone:this.value('businessTimeZone')};
            this.deliveryDirty=false;
            if(this.dirty||!this.current?.id) { try {await this.save();} catch(error){this.deliveryDirty=true;throw error;} }
            try {await this.mutate(data);} catch(error){this.deliveryDirty=true;throw error;}
        });
        for(const id of ['deliveryStatus','deliveredDate','paymentDueDate','businessTimeZone'])this.input(id).addEventListener('input',event=>{this.deliveryDirty=true;event.stopPropagation();});
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
        this.load().then(()=>this.loadFinance()).catch(e=>this.message(String(e)));
    }
    private clientFields():Record<string,string> {return {name:'clientName',contact:'clientContact',email:'clientEmail',phone:'clientPhone',company:'clientCompany',wechat:'clientWechat',taxId:'clientTaxId',paymentTerms:'clientTerms'};}
    private paymentLabel(status:string):string {return ({unquoted:'尚未确认报价',unpaid:'未收款',partial:'部分收款',paid:'已收齐'} as Record<string,string>)[status]||status;}
    private async loadFinance():Promise<void> {
        const request:any={op:'finance',timeZone:this.value('financeZone')};
        if(this.value('financeFrom'))request.from=this.value('financeFrom');if(this.value('financeTo'))request.to=this.value('financeTo');
        const data=await this.call(request);this.input('financeFrom').value=data.from;this.input('financeTo').value=data.to;
        document.getElementById('financeMeta')!.textContent=`截至 ${data.asOf}（${data.timeZone}）；实收区间 ${data.from} 至 ${data.to}。${data.unquotedCount} 份委托尚无确认报价，${data.unknownDeliveryCount} 份已报价委托的交付状态待确认。`;
        const totals=document.getElementById('financeTotals')!;totals.replaceChildren();
        if(!data.totals.length)totals.textContent='暂无已确认报价或收款记录。';
        for(const total of data.totals) {
            const h=document.createElement('h2');h.textContent=total.currency;totals.appendChild(h);
            const table=document.createElement('table');
            for(const [key,label] of Object.entries({contract:'合同总额',outstanding:'未收余额',undeliveredOutstanding:'未交付待收',deliveredOutstanding:'已交付未收',unknownDeliveryOutstanding:'交付状态待确认余额',overdue:'已逾期未收',unknownDue:'付款日待确认余额',periodReceived:'所选期间实收'})) {
                const row=table.insertRow();row.insertCell().textContent=label;row.insertCell().textContent=total[key];
            }
            totals.appendChild(table);
        }
        const groups=document.getElementById('financeGroups')!;groups.replaceChildren();
        for(const group of data.groups) {
            const h=document.createElement('h2');h.textContent=`${group.clientName} · ${group.currency} 未收 ${group.outstanding} · 逾期 ${group.overdue}`;groups.appendChild(h);
            const table=document.createElement('table');const head=table.insertRow();['订单','交付进度','未收','付款到期日','账期状态'].forEach(text=>head.insertCell().textContent=text);
            for(const order of group.orders) {
                const row=table.insertRow();const button=document.createElement('button');button.textContent=order.name;
                button.addEventListener('click',async()=>{if(this.busy||!this.discard())return;this.busy=true;try{const result=await this.call({op:'get',id:order.id});this.current=result.intake;this.files=structuredClone(this.current.files||[]);this.render();}catch(e){this.message(String(e));}finally{this.busy=false;}});row.insertCell().appendChild(button);
                row.insertCell().textContent=({unknown:'待确认','not-started':'未开始','in-progress':'进行中',delivered:'已交付'} as Record<string,string>)[order.deliveryStatus]||order.deliveryStatus;
                row.insertCell().textContent=order.balance.remaining;row.insertCell().textContent=order.paymentDueDate||'待确认';
                row.insertCell().textContent=order.dueStatus==='overdue'?`逾期 ${order.overdueDays} 天`:order.dueStatus==='due-today'?'今日到期':order.dueStatus==='not-due'?'未到期':'账期待确认';
            }
            groups.appendChild(table);
        }
        this.message('应收看板已更新；各币种独立统计。');
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
    private discard():boolean { return (!this.dirty&&!this.deliveryDirty) || confirm('有未保存的委托或账期修改，仍要切换？'); }
    private renderFiles():void {const list=document.getElementById('fileList')!;list.replaceChildren();this.files.forEach(f=>{const line=document.createElement('div');line.textContent=(f.role==='reference'?'参考：':'原文：')+f.path;list.appendChild(line);});}
    private render():void {
        this.dirty=false;this.deliveryDirty=false;
        document.getElementById('financePanel')!.hidden=true;
        this.editingClient=undefined;document.getElementById('clientMode')!.textContent='新增客户';
        document.getElementById('details')!.hidden=false;
        for(const key of this.fields)this.input(key).value=this.current[key]||'';
        for(const key of this.briefFields)this.input(key).value=this.current.brief?.[key]||'';
        this.input('questions').value=(this.current.questions||[]).map((q:any)=>typeof q==='string'?q:JSON.stringify(q)).join('\n');
        (this.input('requirementsConfirmed') as HTMLInputElement).checked=!!this.current.requirementsConfirmed;
        (this.input('countConfirmed') as HTMLInputElement).checked=false;
        for(const key of ['deliveryStatus','deliveredDate','paymentDueDate','businessTimeZone'])this.input(key).value=this.current[key] || (key==='deliveryStatus'?'unknown':key==='businessTimeZone'?'Asia/Shanghai':'');
        document.getElementById('deliveryHistory')!.textContent=JSON.stringify(this.current.deliveryHistory||[],null,2);
        this.renderFiles();
        document.getElementById('evidence')!.textContent=JSON.stringify({evidence:this.current.evidence||[],materials:this.current.materials||[]},null,2);
        const a=this.current.analysis;document.getElementById('analysis')!.textContent=a?JSON.stringify({totals:a.totals,files:a.files.map((f:any)=>({name:f.name,role:f.role,words:f.words,characters:f.characters,han:f.han,segments:f.segments})),warnings:a.warnings},null,2):'尚未解析文件';
        document.getElementById('quotes')!.textContent=(this.current.quotes||[]).map((q:any)=>`${q.status} · ${q.currency} ${q.total}\n数量 ${q.quantity}；口径 ${q.pricing.basis}；单价 ${q.pricing.rate} / ${q.pricing.per}\nID ${q.id}`).join('\n\n');
        document.getElementById('balance')!.textContent=this.current.balance?`${this.current.balance.currency} 合同金额 ${this.current.balance.due}；已收 ${this.current.balance.paid}；未收 ${this.current.balance.remaining}；${this.paymentLabel(this.current.balance.paymentStatus)}`:'尚无已确认报价';
        document.getElementById('payments')!.textContent=JSON.stringify(this.current.payments||[],null,2);
        this.message(this.current.projectId?'已建项目：'+this.current.projectId:'草稿待补全：'+(this.current.missing||[]).join('、'));
    }
    private async save():Promise<void>{
        if(this.deliveryDirty)throw Error('请先保存交付与账期，再执行此操作。');
        const intake:any={};if(this.current?.id){intake.id=this.current.id;intake.revision=this.current.revision;}
        for(const key of this.fields)intake[key]=this.value(key);
        intake.brief={};for(const key of this.briefFields)intake.brief[key]=this.value(key);
        intake.files=this.files;intake.questions=this.value('questions').split('\n').filter(Boolean);
        intake.requirementsConfirmed=this.checked('requirementsConfirmed');
        const data=await this.call({op:'save',intake});this.current=data.intake;this.files=structuredClone(this.current.files||[]);await this.load();this.render();
    }
    private async mutate(request:any):Promise<void>{if(!this.current?.id)throw Error('请先保存委托');const data=await this.call({...request,id:this.current.id,revision:this.current.revision});this.current=data.intake;await this.load();this.render();}
}
