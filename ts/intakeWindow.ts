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
    private rates: any[] = [];
    private editingRate: any;
    private timeId=crypto.randomUUID();
    private timePayload: any;
    private paymentId = crypto.randomUUID();
    private paymentPayload: any;
    private fields = ['name','clientId','srcLang','tgtLang','deadline','orderNumber','service','paymentTerms','notes','endClient','orderKind'];
    private briefFields = ['purpose','audience','domain','textType','tone','terminology','doNotTranslate','delivery','instructions','styleGuide','aiPolicy'];
    constructor() {
        document.getElementById('details')!.addEventListener('input', () => { this.dirty=true; });
        window.addEventListener('beforeunload', event => { if((this.dirty||this.deliveryDirty) && !confirm('有未保存的委托修改，仍要关闭？')) { event.preventDefault(); event.returnValue=false; } });
        document.getElementById('agentHelp')!.addEventListener('click',()=>ipcRenderer.send('show-agent-guide'));
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (_event, theme: string) => { (document.getElementById('theme') as HTMLLinkElement).href=theme; });
        ipcRenderer.invoke('get-style-guides').then((guides: any[]) => {
            const select=this.input('styleGuide') as HTMLSelectElement;select.add(new Option('不指定',''));
            guides.forEach(g=>select.add(new Option(g.name,g.id)));
            if(this.current?.brief)select.value=this.current.brief.styleGuide||'';
        });
        this.bind('refresh',async()=>{if(!this.discard())return;const id=this.current?.id;await this.load();if(!document.getElementById('financePanel')!.hidden)await this.loadFinance();else if(id){this.current=(await this.call({op:'get',id})).intake;this.files=structuredClone(this.current.files||[]);this.render();}});
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
        this.bind('materialAnalyze',async()=>{
            if(this.dirty||this.deliveryDirty)throw Error('请先保存任务和 AI 使用限制，再分析材料。');
            if(!this.current?.analysis)throw Error('请先解析并计数，建立原文快照。');
            const engine=await ipcRenderer.invoke('material-engine');
            if(!engine.engine)throw Error('请在机器翻译设置启用一个 LLM。');
            if(!confirm(`将每个源文件的分布取样正文发送到 ${engine.engine} / ${engine.model} 分析领域和文本类型，继续？`))return;
            const result=await ipcRenderer.invoke('material-classify',{id:this.current.id,revision:this.current.revision});
            if(result.status!=='Success')throw Error(result.reason||'材料分析失败');
            this.current=result.intake;await this.load();this.render();
        });
        for(const id of ['adopt_domain','adopt_textType'])this.input(id).addEventListener('input',event=>event.stopPropagation());
        this.bind('materialAdopt',async()=>{
            if(this.dirty||this.deliveryDirty)throw Error('请先保存现有简报再采纳建议。');
            const fields=['domain','textType'].filter(k=>this.checked('adopt_'+k));
            if(!fields.length)throw Error('请选择要采纳的字段');
            const replace=fields.some(k=>!!this.current?.brief?.[k]);
            if(replace&&!confirm('选中的 brief 字段已有内容。确定用本次分析建议替换？'))return;
            await this.mutate({op:'material-adopt',suggestionId:this.current.materialAnalysis?.id,fields,replaceExisting:replace});
            this.message('建议已采纳。请核对 brief 并重新确认任务要求后使用 AI。');
        });
        this.bind('openArchive',async()=>{if(!this.current?.id)throw Error('先保存委托');await ipcRenderer.invoke('open-intake-archive',this.current.id);});
        this.bind('analyze',async()=>{await this.save();await this.mutate({op:'analyze'});});
        this.bind('quote',async()=>{
            const pricing:any={};for(const key of ['basis','currency','rate','rounding','minimum','surcharge','discount'])pricing[key]=this.value(key);
            pricing.per=Number(this.value('per'));pricing.countConfirmed=this.checked('countConfirmed');pricing.quantity=this.value('quantity');
            const rateId=this.value('rateCard');
            await this.save();await this.mutate({op:'quote',pricing,...(rateId?{rateId}:{})});
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
            if(this.paymentPayload && (this.paymentPayload.order!==this.current?.id || JSON.stringify(this.paymentPayload.payment)!==JSON.stringify(payment)))throw Error('上次收款状态未确认。先刷新核对，或以原内容重试。');
            await this.save();this.paymentPayload={order:this.current.id,payment};
            try {await this.mutate({op:'payment',payment});this.paymentId=crypto.randomUUID();this.paymentPayload=undefined;this.input('paymentAmount').value='';}
            catch(error){for(const [id,value] of Object.entries({paymentAmount:payment.amount,paymentCurrency:payment.currency,paymentDate:payment.date,paymentNote:payment.note}))this.input(id).value=value;this.paymentId=payment.id;if(error instanceof BusinessRequestError)this.paymentPayload=undefined;throw error;}
        });
        this.bind('confirmOrder',async()=>{await this.save();await this.mutate({op:'confirm-order'});});
        this.bind('timeAdd',async()=>{
            const entry={id:this.timeId,date:this.value('workDate'),minutes:Number(this.value('workMinutes')),activity:this.value('workActivity'),note:this.value('workNote')};
            if(this.timePayload && (this.timePayload.order!==this.current?.id || JSON.stringify(this.timePayload.entry)!==JSON.stringify(entry)))throw Error('上次工时状态未确认，请以原内容重试。');
            await this.save();this.timePayload={order:this.current.id,entry};
            try {await this.mutate({op:'time-add',entry});this.timeId=crypto.randomUUID();this.timePayload=undefined;this.input('workMinutes').value='';}
            catch(error){this.timeId=entry.id;for(const [id,value] of Object.entries({workDate:entry.date,workMinutes:String(entry.minutes),workActivity:entry.activity,workNote:entry.note}))this.input(id).value=value;if(error instanceof BusinessRequestError)this.timePayload=undefined;throw error;}
        });
        this.bind('timeVoid',async()=>{const entryId=this.value('timeEntry'),reason=this.value('timeReason');await this.save();await this.mutate({op:'time-void',entryId,reason});});
        this.bind('rateNew',async()=>{this.editingRate=undefined;for(const key of ['rateName','rateClient','rateService','rateFrom','rateTo'])this.input(key).value='';});
        this.bind('rateEdit',async()=>{
            const rate=this.rates.find(r=>r.id===this.value('rateCard'));if(!rate)throw Error('请先选择报价参考');this.editingRate=rate;
            for(const [field,id] of Object.entries({name:'rateName',clientId:'rateClient',service:'rateService',validFrom:'rateFrom',validTo:'rateTo'}))this.input(id).value=rate[field]||'';
            this.setPricing(rate.pricing);
        });
        this.bind('rateSave',async()=>{
            const pricing:any={};for(const key of ['basis','currency','rate','rounding','minimum','surcharge','discount'])pricing[key]=this.value(key);pricing.per=Number(this.value('per'));
            const rate:any={name:this.value('rateName'),clientId:this.value('rateClient'),service:this.value('rateService'),validFrom:this.value('rateFrom'),validTo:this.value('rateTo'),pricing};
            if(this.editingRate){rate.id=this.editingRate.id;rate.revision=this.editingRate.revision;}
            const result=await this.call({op:'rate-save',rate});this.editingRate=result.rate;await this.loadRates();this.input('rateCard').value=result.rate.id;this.message('报价参考已保存，不会修改已有报价。');
        });
        this.input('rateCard').addEventListener('change',()=>{const rate=this.rates.find(r=>r.id===this.value('rateCard'));if(rate)this.setPricing(rate.pricing);});
        this.load().then(()=>this.loadFinance()).catch(e=>this.message(String(e)));
    }
    private setPricing(p:any):void {
        for(const key of ['basis','currency','rate','rounding','minimum','surcharge','discount','per'])this.input(key).value=String(p[key]??({basis:'characters',currency:'CNY',rate:'',rounding:'exact',minimum:'0',surcharge:'0',discount:'0',per:'1000'} as Record<string,string>)[key]);
    }
    private async loadRates():Promise<void>{
        const data=await this.call({op:'rate-list'});this.rates=data.rates;
        const selected=this.value('rateCard');const select=this.input('rateCard') as HTMLSelectElement;select.replaceChildren(new Option('手工填写，不使用模板',''));
        this.rates.forEach(r=>select.add(new Option(`${r.name} · ${r.pricing.currency} ${r.pricing.rate}/${r.pricing.per}`,r.id)));select.value=selected;
        const id=this.value('rateClient');const client=this.input('rateClient') as HTMLSelectElement;client.replaceChildren(new Option('不限客户',''));this.clients.forEach(c=>client.add(new Option(c.name,c.id)));client.value=id;
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
    private async call(request:any):Promise<any>{const data=await ipcRenderer.invoke('business-request',request);if(data.status!=='Success')throw new BusinessRequestError(data.reason||'操作失败');return data;}
    private async load():Promise<void>{
        const data=await this.call({op:'list'});this.clients=data.clients;this.intakes=data.intakes;
        const selected=this.value('clientId');const client=this.input('clientId') as HTMLSelectElement;client.replaceChildren(new Option('待确认',''));
        this.clients.forEach(c=>client.add(new Option(c.name,c.id)));client.value=selected;
        const list=document.getElementById('list')!;list.replaceChildren();
        this.intakes.forEach(row=>{const b=document.createElement('button');b.className='entry';b.textContent=(row.name||'未命名委托')+(row.projectId?' · CAT项目':row.orderConfirmedAt?' · 服务订单':' · 草稿');b.addEventListener('click',()=>{if(this.busy||!this.discard())return;this.current=row;this.files=structuredClone(row.files||[]);this.render();});list.appendChild(b);});
        await this.loadRates();
        this.message('已加载 '+this.intakes.length+' 份委托');
    }
    private discard():boolean { if(this.paymentPayload||this.timePayload){this.message('收款提交结果尚未确认，请保留当前订单并以原内容重试。');return false;} return (!this.dirty&&!this.deliveryDirty) || confirm('有未保存的委托或账期修改，仍要切换？'); }
    private renderFiles():void {const list=document.getElementById('fileList')!;list.replaceChildren();this.files.forEach(f=>{const line=document.createElement('div');line.textContent=(f.role==='reference'?'参考：':'原文：')+f.path;list.appendChild(line);});}
    private render():void {
        this.dirty=false;this.deliveryDirty=false;
        document.getElementById('financePanel')!.hidden=true;
        this.editingClient=undefined;document.getElementById('clientMode')!.textContent='新增客户';
        document.getElementById('details')!.hidden=false;
        for(const key of this.fields)this.input(key).value=this.current[key]||(key==='orderKind'?'cat':'');
        for(const key of this.briefFields)this.input(key).value=this.current.brief?.[key]||'';
        this.input('questions').value=(this.current.questions||[]).map((q:any)=>typeof q==='string'?q:JSON.stringify(q)).join('\n');
        (this.input('requirementsConfirmed') as HTMLInputElement).checked=!!this.current.requirementsConfirmed;
        (this.input('countConfirmed') as HTMLInputElement).checked=false;
        for(const key of ['deliveryStatus','deliveredDate','paymentDueDate','businessTimeZone'])this.input(key).value=this.current[key] || (key==='deliveryStatus'?'unknown':key==='businessTimeZone'?'Asia/Shanghai':'');
        document.getElementById('deliveryHistory')!.textContent=JSON.stringify(this.current.deliveryHistory||[],null,2);
        this.editingRate=undefined;this.input('rateCard').value='';
        const lastQuote=this.current.quotes?.at(-1);this.setPricing(lastQuote?.pricing||{});this.input('quantity').value=lastQuote?.pricing?.quantity||'';
        this.paymentId=crypto.randomUUID();this.timeId=crypto.randomUUID();
        for(const id of ['paymentAmount','paymentDate','paymentNote','workDate','workMinutes','workActivity','workNote','timeReason'])this.input(id).value='';
        this.input('paymentCurrency').value=this.current.balance?.currency||'';
        document.getElementById('workSummary')!.textContent=this.current.work?`已记录 ${this.current.work.minutes} 分钟；合同额时薪 ${this.current.work.contractHourly??'未计算'} ${this.current.work.currency}；实收时薪 ${this.current.work.receivedHourly??'未计算'} ${this.current.work.currency}`:'尚无工时';
        const times=this.input('timeEntry') as HTMLSelectElement;times.replaceChildren(new Option('选择需作废的工时',''));
        (this.current.timeEntries||[]).filter((e:any)=>!e.voidedAt).forEach((e:any)=>times.add(new Option(`${e.date} · ${e.minutes} 分钟 · ${e.activity||''}`,e.id)));
        document.getElementById('timeHistory')!.textContent=JSON.stringify(this.current.timeEntries||[],null,2);
        document.getElementById('archiveInfo')!.textContent=this.current.archiveFolder?'归档：'+this.current.archiveFolder+(this.current.additionalScopeUnpriced?'；新增文件范围尚未计价，原确认报价未改变。':''):'Agent 一站式导入后自动建立客户／项目归档。';
        this.renderFiles();
        document.getElementById('evidence')!.textContent=JSON.stringify({evidence:this.current.evidence||[],materials:this.current.materials||[],intakeSources:this.current.intakeSources||[],metadataProvenance:this.current.metadataProvenance||{}},null,2);
        const a=this.current.analysis;document.getElementById('analysis')!.textContent=a?JSON.stringify({totals:a.totals,files:a.files.map((f:any)=>({name:f.name,role:f.role,words:f.words,characters:f.characters,han:f.han,segments:f.segments})),warnings:a.warnings},null,2):'尚未解析文件';
        const materials=document.getElementById('materialResults')!;materials.replaceChildren();
        const suggestion=this.current.materialAnalysis;
        if(!suggestion)materials.textContent='尚无材料分析建议。';
        else {
            const info=document.createElement('p');info.className='hint';info.textContent=`${suggestion.origin} · ${suggestion.created} · ${suggestion.status==='adopted'?'已采纳（需核对 brief）':'AI 建议，尚未采纳'}`;materials.appendChild(info);
            for(const f of suggestion.files){const box=document.createElement('section');const title=document.createElement('h3');title.textContent=f.name;box.appendChild(title);
                const text=document.createElement('p');text.textContent=`领域：${f.domain}；文本类型：${f.textType}；判断把握：${({high:'较高',medium:'中等',low:'较低',unknown:'无法判断'} as Record<string,string>)[f.confidence]}。${f.rationale}`;box.appendChild(text);
                const coverage=document.createElement('p');coverage.className='hint';coverage.textContent=`${f.coverage.fullText?'全文覆盖':'取样分析'}：${f.coverage.sampledSegments}/${f.coverage.totalSegments} 段，${f.coverage.sampledCharacters}/${f.coverage.totalCharacters} 字符。`;box.appendChild(coverage);
                for(const evidence of f.evidence){const q=document.createElement('blockquote');q.textContent=`第 ${evidence.segment} 段：${evidence.quote}`;box.appendChild(q);}
                if(f.questions.length){const q=document.createElement('p');q.textContent='待确认：'+f.questions.join('；');box.appendChild(q);}materials.appendChild(box);
            }
        }
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

class BusinessRequestError extends Error {}
