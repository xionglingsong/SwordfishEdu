package com.maxprograms.swordfish;

import java.io.File;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import org.json.*;
import com.maxprograms.converters.Convert;
import com.maxprograms.converters.FileFormats;
import com.maxprograms.converters.Join;
import com.maxprograms.languages.LanguageUtils;
import com.maxprograms.stats.RepetitionAnalysis;
import com.maxprograms.swordfish.models.Project;
import com.maxprograms.swordfish.models.SourceFile;
import com.maxprograms.swordfish.xliff.XliffUtils;
import com.maxprograms.xml.*;

/** Local commission ledger. Model inference stays in the Agent; money and writes stay here. */
public final class BusinessStore {
    private BusinessStore() { }
    private static final Set<String> BRIEF_FIELDS = Set.of("purpose", "audience", "domain", "textType", "tone", "terminology", "doNotTranslate", "delivery", "styleGuide", "aiPolicy", "instructions");
    private static final List<String> REQUIRED = List.of("name", "clientId", "srcLang", "tgtLang", "deadline");
    private static Path home() throws Exception { return TmsServer.getWorkFolder().toPath().resolve("business"); }
    private static JSONObject load() throws Exception {
        Path file=home().resolve("data.json");
        return Files.exists(file) ? new JSONObject(Files.readString(file)) : new JSONObject().put("clients",new JSONArray()).put("intakes",new JSONArray());
    }
    private static void save(JSONObject data) throws Exception {
        Files.createDirectories(home());
        Path tmp=Files.createTempFile(home(),"ledger-",".tmp");
        try {
            Files.writeString(tmp,data.toString(2),StandardCharsets.UTF_8);
            try { Files.move(tmp,home().resolve("data.json"),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING); }
            catch (AtomicMoveNotSupportedException e) { Files.move(tmp,home().resolve("data.json"),StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(tmp); }
    }
    private static JSONObject find(JSONArray rows,String id) {
        for(Object o:rows) { JSONObject r=(JSONObject)o; if(id.equals(r.optString("id"))) return r; }
        throw new IllegalArgumentException("Record not found: "+id);
    }
    private static void revision(JSONObject row,JSONObject req) {
        if(req.getInt("revision")!=row.getInt("revision"))throw new IllegalArgumentException("Conflict: reload the latest record before editing");
    }
    private static void touch(JSONObject row) { row.put("revision",row.optInt("revision",0)+1).put("updated",Instant.now().toString()); }
    private static String hash(byte[] bytes)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
    private static String fingerprint(JSONObject r)throws Exception{return hash(new JSONArray().put(r.optString("srcLang")).put(r.optString("tgtLang")).put(r.optJSONArray("files")).toString().getBytes(StandardCharsets.UTF_8));}
    private static JSONArray missing(JSONObject row) {
        JSONArray result=new JSONArray();
        for(String key:row.optString("orderKind","cat").equals("service")?List.of("name","clientId","service","deadline"):REQUIRED) if(row.optString(key).isBlank())result.put(key);
        if(!row.optString("orderKind","cat").equals("service") && (row.optJSONArray("files")==null || row.getJSONArray("files").isEmpty()))result.put("files");
        if(!row.optBoolean("requirementsConfirmed"))result.put("requirementsConfirmed");
        if(!row.optString("orderKind","cat").equals("service") && (row.optJSONObject("brief")==null || row.getJSONObject("brief").optString("aiPolicy").isBlank()))result.put("brief.aiPolicy");
        return result;
    }
    private static JSONObject view(JSONObject row) {
        JSONObject result=new JSONObject(row.toString()).put("missing",missing(row));
        result.put("balance",FinanceSummary.balance(row));
        result.put("work",ServiceWork.workSummary(row));
        result.put("orderKind",row.optString("orderKind","cat"));
        result.put("deliveryStatus",row.optString("deliveryStatus","unknown"));
        return result;
    }
    public static synchronized JSONObject execute(JSONObject req)throws Exception {
        JSONObject data=load();String op=req.getString("op");
        if(op.equals("discover"))return new JSONObject().put("files",IntakeArchive.discover(req.getJSONArray("paths")));
        if(op.equals("auto-intake"))return autoIntake(data,req);
        if(!data.has("rateCards"))data.put("rateCards",new JSONArray());
        if(op.equals("rate-save")) {
            JSONObject input=req.getJSONObject("rate"),rate;
            if(input.optString("id").isBlank()){rate=new JSONObject().put("id",UUID.randomUUID().toString());data.getJSONArray("rateCards").put(rate);}
            else {rate=find(data.getJSONArray("rateCards"),input.getString("id"));revision(rate,input);}
            for(String key:List.of("name","clientId","service","srcLang","tgtLang","validFrom","validTo","notes"))if(input.has(key))rate.put(key,input.getString(key));
            if(input.has("active"))rate.put("active",input.getBoolean("active"));
            if(input.has("pricing"))rate.put("pricing",input.getJSONObject("pricing"));
            if(!rate.optString("clientId").isBlank())find(data.getJSONArray("clients"),rate.getString("clientId"));
            ServiceWork.validateRate(rate);touch(rate);save(data);return new JSONObject().put("rate",rate);
        }
        if(op.equals("rate-list"))return new JSONObject().put("rates",data.getJSONArray("rateCards"));
        if(op.equals("finance"))return FinanceSummary.summarize(data,req,LocalDate.now(java.time.ZoneId.of(req.optString("timeZone","Asia/Shanghai"))));
        if(op.equals("list")) {JSONArray rows=new JSONArray();for(Object r:data.getJSONArray("intakes"))rows.put(view((JSONObject)r));return new JSONObject().put("intakes",rows).put("clients",data.getJSONArray("clients"));}
        if(op.equals("client-save")) {
            JSONObject input=req.getJSONObject("client");String name=input.getString("name").trim();if(name.isEmpty())throw new IllegalArgumentException("Client name required");
            JSONObject client;
            if(input.optString("id").isBlank()) {
                for(Object o:data.getJSONArray("clients"))if(name.equalsIgnoreCase(((JSONObject)o).getString("name")))throw new IllegalArgumentException("Client already exists; select its ID");
                client=new JSONObject().put("id",UUID.randomUUID().toString());data.getJSONArray("clients").put(client);
            } else {client=find(data.getJSONArray("clients"),input.getString("id"));revision(client,input);}
            for(Object other:data.getJSONArray("clients")) {JSONObject c=(JSONObject)other;if(!c.getString("id").equals(client.getString("id"))&&name.equalsIgnoreCase(c.getString("name")))throw new IllegalArgumentException("Client already exists; choose a distinct name");}
            input.put("name",name);
            for(String key:List.of("name","contact","email","phone","currency","paymentTerms","notes","company","wechat","taxId"))if(input.has(key))client.put(key,input.getString(key));
            touch(client);save(data);return new JSONObject().put("client",client);
        }
        if(op.equals("save")) {
            JSONObject input=req.getJSONObject("intake"),row;
            if(input.optString("id").isBlank()) {row=new JSONObject().put("id",UUID.randomUUID().toString()).put("quotes",new JSONArray()).put("payments",new JSONArray());data.getJSONArray("intakes").put(row);}
            else {row=find(data.getJSONArray("intakes"),input.getString("id"));revision(row,input);}
            JSONObject next=new JSONObject(row.toString());
            for(String key:List.of("name","clientId","srcLang","tgtLang","deadline","orderNumber","service","notes","paymentTerms","endClient","orderKind"))if(input.has(key))next.put(key,input.getString(key));
            for(String key:List.of("files","evidence","questions","materials"))if(input.has(key))next.put(key,input.getJSONArray(key));
            if(input.has("brief")) {
                JSONObject brief=input.getJSONObject("brief");
                for(String key:brief.keySet())if(!BRIEF_FIELDS.contains(key))throw new IllegalArgumentException("Unknown brief field: "+key);
                for(String key:brief.keySet())brief.getString(key);
                String policy=brief.optString("aiPolicy");if(!policy.isBlank() && !Set.of("allowed","local-only","forbidden").contains(policy))throw new IllegalArgumentException("aiPolicy must be allowed, local-only or forbidden");
                next.put("brief",brief);
            }
            if(!Set.of("cat","service").contains(next.optString("orderKind","cat")))throw new IllegalArgumentException("Invalid order kind");
            boolean scopeChanged=!next.optString("orderKind","cat").equals(row.optString("orderKind","cat")) || !next.optString("clientId").equals(row.optString("clientId")) || !next.optString("service").equals(row.optString("service"));
            if(scopeChanged) {
                if(row.has("projectId")||row.has("orderConfirmedAt")||!row.getJSONArray("payments").isEmpty())throw new IllegalArgumentException("Order scope frozen after confirmation or project creation");
                for(Object q:row.getJSONArray("quotes"))if("confirmed".equals(((JSONObject)q).optString("status")))throw new IllegalArgumentException("Order scope frozen after confirmed quote");
                for(Object q:next.getJSONArray("quotes"))((JSONObject)q).put("status","superseded");
            }
            if(input.has("requirementsConfirmed"))next.put("requirementsConfirmed",input.getBoolean("requirementsConfirmed"));
            if(row.has("projectId") && next.optJSONObject("brief",new JSONObject()).optString("aiPolicy").isBlank())throw new IllegalArgumentException("AI policy cannot be cleared on an existing project");
            if(!next.optString("clientId").isBlank())find(data.getJSONArray("clients"),next.getString("clientId"));
            for(String key:List.of("srcLang","tgtLang"))if(!next.optString(key).isBlank() && LanguageUtils.getLanguage(next.getString(key))==null)throw new IllegalArgumentException("Unknown language: "+key);
            if(!next.optString("deadline").isBlank())OffsetDateTime.parse(next.getString("deadline"));
            for(Object o:next.optJSONArray("files",new JSONArray())) {JSONObject f=(JSONObject)o;if(!Set.of("source","reference").contains(f.optString("role","source")))throw new IllegalArgumentException("Unknown file role");if(!Path.of(f.getString("path")).isAbsolute())throw new IllegalArgumentException("Absolute file paths required");}
            if(!fingerprint(row).equals(fingerprint(next))) {
                if(!row.getJSONArray("payments").isEmpty())throw new IllegalArgumentException("Files frozen after payment");
                if(row.has("projectId"))throw new IllegalArgumentException("Project already created; create a new intake for changed files/languages");
                next.remove("analysis");next.remove("materialAnalysis");for(Object q:next.getJSONArray("quotes"))((JSONObject)q).put("status","superseded");if(!next.optString("orderKind","cat").equals("service"))next.put("requirementsConfirmed",false);
            }
            // Any new requirements need renewed confirmation unless explicitly supplied in this save.
            if(!input.has("requirementsConfirmed") && !next.toString().equals(row.toString()))next.put("requirementsConfirmed",false);
            JSONArray rows=data.getJSONArray("intakes");for(int i=0;i<rows.length();i++)if(rows.getJSONObject(i).getString("id").equals(next.getString("id"))){touch(next);rows.put(i,next);break;}
            save(data);return new JSONObject().put("intake",view(next));
        }
        if(op.equals("brief"))return briefForProject(req.getString("project"));
        JSONObject row=find(data.getJSONArray("intakes"),req.getString("id"));
        if(op.equals("material-sample")) { revision(row,req);return MaterialAnalysis.sample(row).put("revision",row.getInt("revision")); }
        if(op.equals("get"))return new JSONObject().put("intake",view(row));
        if(op.equals("create") && row.has("projectId")) { if(!ProjectsHandler.hasBusinessProject(row.getString("projectId")))throw new IllegalArgumentException("Linked project was removed; create a new intake"); return new JSONObject().put("projectId",row.getString("projectId")).put("intake",view(row)); }
        if(op.equals("payment"))for(Object o:row.getJSONArray("payments")) {JSONObject old=(JSONObject)o;if(old.getString("id").equals(req.getJSONObject("payment").getString("id"))) {if(!old.similar(req.getJSONObject("payment")))throw new IllegalArgumentException("Payment ID reused with different values");return new JSONObject().put("intake",view(row));}}
        if(op.equals("time-add"))for(Object o:row.optJSONArray("timeEntries",new JSONArray())) {JSONObject old=(JSONObject)o;JSONObject entry=req.getJSONObject("entry");if(old.getString("id").equals(entry.getString("id"))){JSONObject original=new JSONObject(old.toString());original.remove("voidedAt");original.remove("voidReason");if(!original.similar(entry))throw new IllegalArgumentException("Time ID reused with different values");return new JSONObject().put("intake",view(row));}}
        revision(row,req);
        switch(op) {
            case "material-save" -> row.put("materialAnalysis",MaterialAnalysis.validate(row,req));
            case "material-adopt" -> MaterialAnalysis.adopt(row,req);
            case "material-autofill" -> {
                JSONObject brief=row.optJSONObject("brief",new JSONObject());JSONArray fields=new JSONArray();
                for(String key:List.of("domain","textType"))if(brief.optString(key).isBlank())fields.put(key);
                if(!fields.isEmpty()) {
                    boolean confirmed=row.optBoolean("requirementsConfirmed");
                    MaterialAnalysis.adopt(row,new JSONObject().put("suggestionId",req.getString("suggestionId")).put("fields",fields));
                    row.put("requirementsConfirmed",confirmed);
                    JSONObject provenance=row.optJSONObject("metadataProvenance",new JSONObject());
                    for(Object field:fields)provenance.put((String)field,new JSONObject().put("status","ai-inferred").put("suggestionId",req.getString("suggestionId")));
                    row.put("metadataProvenance",provenance);
                }
            }
            case "time-add" -> {
                JSONObject entry=req.getJSONObject("entry");UUID.fromString(entry.getString("id"));LocalDate date=LocalDate.parse(entry.getString("date"));
                if(date.isAfter(LocalDate.now(java.time.ZoneId.of(row.optString("businessTimeZone","Asia/Shanghai")))))throw new IllegalArgumentException("Work date cannot be in future");
                int minutes=entry.getInt("minutes");if(minutes<=0||minutes>1440||!entry.get("minutes").toString().equals(Integer.toString(minutes)))throw new IllegalArgumentException("Minutes must be an integer from 1 to 1440");
                for(String key:entry.keySet())if(!Set.of("id","date","minutes","activity","note").contains(key))throw new IllegalArgumentException("Unknown time entry field");
                JSONArray entries=row.optJSONArray("timeEntries",new JSONArray());entries.put(entry);row.put("timeEntries",entries);
            }
            case "time-void" -> {
                JSONObject entry=find(row.optJSONArray("timeEntries",new JSONArray()),req.getString("entryId"));
                String reason=req.getString("reason").trim();if(reason.isEmpty())throw new IllegalArgumentException("Void reason required");
                if(!entry.has("voidedAt"))entry.put("voidedAt",Instant.now().toString()).put("voidReason",reason);
            }
            case "confirm-order" -> {
                if(!row.optString("orderKind","cat").equals("service"))throw new IllegalArgumentException("Use create for a CAT project");
                if(!missing(row).isEmpty()||!row.optJSONArray("questions",new JSONArray()).isEmpty())throw new IllegalArgumentException("Resolve missing requirements and questions");
                if(!row.has("orderConfirmedAt"))row.put("orderConfirmedAt",Instant.now().toString());
            }
            case "delivery" -> {
                String state=req.getString("deliveryStatus");
                if(!Set.of("unknown","not-started","in-progress","delivered").contains(state))throw new IllegalArgumentException("Invalid delivery status");
                String delivered=req.optString("deliveredDate",row.optString("deliveredDate"));
                String due=req.optString("paymentDueDate",row.optString("paymentDueDate"));
                String zone=req.optString("timeZone",row.optString("businessTimeZone","Asia/Shanghai"));
                java.time.ZoneId timeZone=java.time.ZoneId.of(zone);
                if(state.equals("delivered")&&delivered.isBlank())throw new IllegalArgumentException("Actual delivery date required");
                if(!delivered.isBlank() && LocalDate.parse(delivered).isAfter(LocalDate.now(timeZone)))throw new IllegalArgumentException("Actual delivery date cannot be in the future");
                if(!state.equals("delivered")&&!delivered.isBlank())throw new IllegalArgumentException("Clear actual delivery date when reopening an order");
                if(!due.isBlank())LocalDate.parse(due);
                JSONObject previous=new JSONObject().put("deliveryStatus",row.optString("deliveryStatus","unknown")).put("deliveredDate",row.optString("deliveredDate"))
                    .put("paymentDueDate",row.optString("paymentDueDate")).put("timeZone",row.optString("businessTimeZone","Asia/Shanghai"));
                row.put("deliveryStatus",state).put("deliveredDate",delivered).put("paymentDueDate",due).put("businessTimeZone",zone);
                JSONArray history=row.optJSONArray("deliveryHistory",new JSONArray());
                history.put(new JSONObject().put("at",Instant.now().toString()).put("before",previous).put("after",new JSONObject().put("deliveryStatus",state).put("deliveredDate",delivered).put("paymentDueDate",due).put("timeZone",zone)));
                row.put("deliveryHistory",history);
            }
            case "analyze" -> {if(!row.getJSONArray("payments").isEmpty())throw new IllegalArgumentException("Cannot change analysis after payment");if(row.has("projectId"))throw new IllegalArgumentException("Analysis frozen after project creation");row.put("analysis",analyze(row));row.remove("materialAnalysis");row.put("requirementsConfirmed",false);for(Object q:row.getJSONArray("quotes"))((JSONObject)q).put("status","superseded");}
            case "quote" -> {
                JSONObject pricing=new JSONObject(req.getJSONObject("pricing").toString());
                JSONObject rate=null;
                if(req.has("rateId")) {
                    rate=find(data.getJSONArray("rateCards"),req.getString("rateId"));ServiceWork.checkRate(rate,row,LocalDate.now(java.time.ZoneId.of(row.optString("businessTimeZone","Asia/Shanghai"))));
                    JSONObject template=new JSONObject(rate.getJSONObject("pricing").toString());
                    for(String key:List.of("quantity","countConfirmed"))if(pricing.has(key))template.put(key,pricing.get(key));
                    pricing=template;
                }
                JSONObject q=calculate(row,pricing);
                if(rate!=null)q.put("rateSnapshot",new JSONObject(rate.toString()));
                for(Object o:row.getJSONArray("quotes"))if("estimate".equals(((JSONObject)o).optString("status")))((JSONObject)o).put("status","superseded");
                row.getJSONArray("quotes").put(q);
            }
            case "confirm-quote" -> {
                JSONObject q=find(row.getJSONArray("quotes"),req.getString("quoteId"));
                if(!q.getString("analysisId").equals(row.optString("orderKind","cat").equals("service")?"manual":row.getJSONObject("analysis").getString("id")))throw new IllegalArgumentException("Stale analysis: recalculate quote");
                if(!row.getJSONArray("payments").isEmpty())throw new IllegalArgumentException("Cannot replace a quote after payment; keep existing ledger");
                if(!"estimate".equals(q.getString("status")))throw new IllegalArgumentException("Only an estimate can be confirmed");
                for(Object o:row.getJSONArray("quotes"))if("confirmed".equals(((JSONObject)o).optString("status")))((JSONObject)o).put("status","superseded");
                q.put("status","confirmed");
            }
            case "payment" -> {
                JSONObject payment=req.getJSONObject("payment");UUID.fromString(payment.getString("id"));LocalDate.parse(payment.getString("date"));
                JSONObject balance=view(row).getJSONObject("balance");
                if(!payment.getString("currency").equals(balance.getString("currency")) || balance.getString("currency").isEmpty())throw new IllegalArgumentException("Payment requires a confirmed quote in the same currency");
                BigDecimal amount=money(payment.getString("amount"));if(amount.signum()<=0 || amount.compareTo(new BigDecimal(balance.getString("remaining")))>0)throw new IllegalArgumentException("Payment must be positive and cannot exceed balance");
                row.getJSONArray("payments").put(payment);
            }
            case "create" -> {
                if(row.optString("orderKind","cat").equals("service"))throw new IllegalArgumentException("Service orders use confirm-order; no CAT project required");
                if(!missing(row).isEmpty())throw new IllegalArgumentException("Missing requirements: "+missing(row));
                if(!row.optJSONArray("questions",new JSONArray()).isEmpty())throw new IllegalArgumentException("Resolve outstanding questions before project creation");
                row.put("projectId",createProject(row,data));
            }
            default -> throw new IllegalArgumentException("Unknown business operation");
        }
        touch(row);save(data);return new JSONObject().put("intake",view(row)).put("projectId",row.optString("projectId"));
    }
    private static JSONObject autoIntake(JSONObject data,JSONObject req)throws Exception {
        String clientName=req.optString("clientName").trim(),projectName=req.getString("projectName").trim();
        if(projectName.isBlank())throw new IllegalArgumentException("Project name must be explicit or resolved by the Agent");
        JSONObject client=null;
        if(req.has("clientId"))client=find(data.getJSONArray("clients"),req.getString("clientId"));
        else {
            if(clientName.isBlank())return new JSONObject().put("outcome","needs-information").put("questions",new JSONArray().put("请明确付款客户名称，以便归档和防止混单"));
            for(Object o:data.getJSONArray("clients"))if(clientName.equalsIgnoreCase(((JSONObject)o).getString("name").trim())) {
                if(client!=null)throw new IllegalArgumentException("Ambiguous customer; provide clientId");client=(JSONObject)o;
            }
            if(client==null){client=new JSONObject().put("id",UUID.randomUUID().toString()).put("name",clientName);touch(client);data.getJSONArray("clients").put(client);}
        }
        JSONObject row=null;
        if(req.has("intakeId")) {
            row=find(data.getJSONArray("intakes"),req.getString("intakeId"));
            if(!client.getString("id").equals(row.getString("clientId")))throw new IllegalArgumentException("Customer does not match selected project");
        } else for(Object o:data.getJSONArray("intakes")) {
            JSONObject candidate=(JSONObject)o;
            if(client.getString("id").equals(candidate.optString("clientId"))&&projectName.equalsIgnoreCase(candidate.optString("name").trim())) {
                if(row!=null)throw new IllegalArgumentException("Multiple matching commissions; specify intakeId");row=candidate;
            }
        }
        if(row==null) {
            JSONArray candidates=ProjectsHandler.findBusinessProjectCandidates(projectName,client.getString("name"));
            if(!candidates.isEmpty())return new JSONObject().put("outcome","needs-information").put("existingProjects",candidates)
                .put("questions",new JSONArray().put("发现同名已有 CAT 项目但未关联委托。请确认归属后使用不同项目名，避免重复建项；暂不自动接管旧项目。"));
        }
        if(row==null){row=new JSONObject().put("id",UUID.randomUUID().toString()).put("name",projectName).put("clientId",client.getString("id")).put("orderKind","cat")
            .put("quotes",new JSONArray()).put("payments",new JSONArray()).put("files",new JSONArray()).put("questions",new JSONArray()).put("brief",new JSONObject());data.getJSONArray("intakes").put(row);}
        if(!"cat".equals(row.optString("orderKind","cat")))throw new IllegalArgumentException("Matched commission is a service order; choose a separate CAT project");
        if(row.has("projectId"))ProjectsHandler.requireBusinessProjectClosed(row.getString("projectId"));
        JSONObject previous=new JSONObject(row.toString());
        JSONObject task=req.optJSONObject("task",new JSONObject());JSONArray conflicts=new JSONArray();
        for(String key:List.of("srcLang","tgtLang","deadline","service","orderNumber","paymentTerms","endClient"))if(task.has(key)&&!task.getString(key).isBlank()) {
            String value=task.getString(key);
            if(!row.optString(key).isBlank()&&!row.getString(key).equals(value))conflicts.put("已有 "+key+" 与本次描述不同，请确认沿用还是另建项目");
            else row.put(key,value);
        }
        JSONObject brief=row.getJSONObject("brief"),requestedBrief=task.optJSONObject("brief",new JSONObject());
        for(String key:requestedBrief.keySet()) {
            if(!BRIEF_FIELDS.contains(key))throw new IllegalArgumentException("Unknown brief field: "+key);
            String value=requestedBrief.getString(key);
            if(!value.isBlank()&&!brief.optString(key).isBlank()&&!value.equals(brief.getString(key)))conflicts.put("已有 brief."+key+" 不同；未覆盖");
            else if(brief.optString(key).isBlank())brief.put(key,value);
        }
        String policy=brief.optString("aiPolicy");if(!policy.isBlank()&&!Set.of("allowed","local-only","forbidden").contains(policy))throw new IllegalArgumentException("Invalid AI policy");
        if(!row.optString("deadline").isBlank())OffsetDateTime.parse(row.getString("deadline"));
        for(String lang:List.of("srcLang","tgtLang"))if(!row.optString(lang).isBlank()&&LanguageUtils.getLanguage(row.getString(lang))==null)throw new IllegalArgumentException("Unknown language: "+lang);
        if(!conflicts.isEmpty()){for(String key:new ArrayList<>(row.keySet()))row.remove(key);for(String key:previous.keySet())row.put(key,previous.get(key));touch(row);save(data);return new JSONObject().put("outcome","needs-information").put("questions",conflicts).put("intake",view(row));}
        JSONArray discovered=IntakeArchive.discover(req.getJSONArray("paths"));
        for(Object o:discovered){JSONObject file=(JSONObject)o;if(file.getString("role").equals("source")&&!file.getBoolean("sourceSupported"))conflicts.put("无法解析为原文："+file.getString("relative")+"；请由 Agent 确认是参考/沟通材料，还是需 OCR/转换");}
        if(!conflicts.isEmpty()){for(String key:new ArrayList<>(row.keySet()))row.remove(key);for(String key:previous.keySet())row.put(key,previous.get(key));touch(row);save(data);return new JSONObject().put("outcome","needs-information").put("questions",conflicts).put("intake",view(row));}
        Path archiveRoot=TmsServer.getWorkFolder().toPath().resolve("archive");
        JSONObject archive=IntakeArchive.archive(archiveRoot,client,row,discovered);
        JSONArray batches=row.optJSONArray("archiveBatches",new JSONArray());boolean known=false;
        Set<String> imported=new HashSet<>();
        if(row.has("projectId")&&row.has("analysis"))for(Object f:row.getJSONObject("analysis").getJSONArray("files")){JSONObject file=(JSONObject)f;imported.add(file.getString("sha256")+"|"+file.getString("role"));}
        for(Object b:batches){JSONObject prior=(JSONObject)b;if(prior.getString("batchId").equals(archive.getString("batchId")))known=true;if(prior.optBoolean("integrated"))for(Object f:prior.getJSONArray("files")){JSONObject file=(JSONObject)f;imported.add(file.getString("sha256")+"|"+file.getString("role"));}}
        if(known)for(Object b:batches)if(((JSONObject)b).getString("batchId").equals(archive.getString("batchId")))archive=(JSONObject)b;
        if(!known){batches.put(archive);row.put("archiveBatches",batches);}
        row.put("archiveFolder",archive.getString("folder"));
        JSONArray notes=row.optJSONArray("intakeSources",new JSONArray());
        if(!known)notes.put(new JSONObject().put("batchId",archive.getString("batchId")).put("description",req.optString("description")).put("evidence",req.optJSONArray("evidence",new JSONArray())).put("at",Instant.now().toString()));
        row.put("intakeSources",notes);
        if(task.has("questions"))row.put("questions",task.getJSONArray("questions"));
        // This field asserts the Agent has resolved the explicit requirements, not customer acceptance of a price.
        if(task.has("requirementsConfirmed"))row.put("requirementsConfirmed",task.getBoolean("requirementsConfirmed"));
        JSONArray fresh=new JSONArray();Set<String> batchSeen=new HashSet<>();int skipped=0;
        for(Object o:archive.getJSONArray("files")) {
            JSONObject file=(JSONObject)o;String key=file.getString("sha256")+"|"+file.getString("role");
            if(imported.contains(key)||!batchSeen.add(key)){skipped++;continue;}
            if(file.getString("role").equals("source"))fresh.put(new JSONObject().put("path",file.getString("archivedPath")).put("role","source").put("encoding",file.optString("encoding","UTF-8")));
        }
        // Save checkpoints before parsing/building so retries locate the same client/intake/archive.
        touch(row);save(data);
        JSONArray needed=new JSONArray();for(String key:List.of("srcLang","tgtLang","deadline"))if(row.optString(key).isBlank())needed.put(key);
        if(policy.isBlank())needed.put("brief.aiPolicy");if(!row.optBoolean("requirementsConfirmed"))needed.put("requirementsConfirmed");
        for(Object q:row.optJSONArray("questions",new JSONArray()))needed.put(q);
        if(!needed.isEmpty())return new JSONObject().put("outcome","needs-information").put("questions",needed).put("intake",view(row));
        if(fresh.isEmpty()) {
            if(!row.has("projectId"))return new JSONObject().put("outcome","needs-information").put("questions",new JSONArray().put("至少需要一份可解析的原文文件" )).put("intake",view(row));
            archive.put("integrated",true);touch(row);save(data);
            return new JSONObject().put("outcome","unchanged").put("skippedFiles",skipped).put("projectId",row.getString("projectId")).put("intake",view(row));
        }
        JSONObject batchAnalysis=archive.optJSONObject("analysis");
        if(batchAnalysis==null) {
            JSONObject draft=new JSONObject(row.toString()).put("files",fresh);batchAnalysis=analyze(draft);archive.put("analysis",batchAnalysis);touch(row);save(data);
        }
        boolean appending=row.has("projectId");
        if(appending)ProjectAppend.append(row.getString("projectId"),archive.getString("batchId"),batchAnalysis);
        JSONArray allFiles=row.getJSONArray("files");Set<String> existingPaths=new HashSet<>();for(Object f:allFiles)existingPaths.add(((JSONObject)f).getString("path"));for(Object f:fresh)if(existingPaths.add(((JSONObject)f).getString("path")))allFiles.put(f);
        if(appending) {
            JSONObject combined=new JSONObject(row.getJSONObject("analysis").toString());
            for(Object f:batchAnalysis.getJSONArray("files"))combined.getJSONArray("files").put(f);
            for(String key:List.of("words","characters","han","segments"))combined.getJSONObject("totals").put(key,combined.getJSONObject("totals").getLong(key)+batchAnalysis.getJSONObject("totals").getLong(key));
            combined.put("id",UUID.randomUUID().toString()).put("fingerprint",fingerprint(row));row.put("analysis",combined).remove("materialAnalysis");
            row.put("additionalScopeUnpriced",true);
        } else {
            batchAnalysis.put("fingerprint",fingerprint(row));row.put("analysis",batchAnalysis);
            row.put("projectId",createProject(row,data));
        }
        archive.put("integrated",true);touch(row);save(data);
        if(!appending && req.has("pricing")) {
            try {JSONObject quote=calculate(row,req.getJSONObject("pricing"));row.getJSONArray("quotes").put(quote);touch(row);save(data);}
            catch(Exception e){return new JSONObject().put("outcome","created-quote-needs-information").put("warning",e.getMessage()).put("projectId",row.getString("projectId")).put("intake",view(row));}
        }
        return new JSONObject().put("outcome",appending?"appended":"created").put("skippedFiles",skipped).put("addedFiles",fresh.length()).put("projectId",row.getString("projectId"))
            .put("classificationPending",policy.equals("allowed")&&!row.has("materialAnalysis")).put("intake",view(row));
    }

    private static BigDecimal money(String value) {BigDecimal d=new BigDecimal(value);if(d.signum()<0 || d.scale()>2)throw new IllegalArgumentException("Amounts require nonnegative decimals with at most two places");return d;}
    public static JSONObject calculate(JSONObject row,JSONObject pricing) {
        boolean manual=row.optString("orderKind","cat").equals("service");
        JSONObject analysis=manual?new JSONObject().put("id","manual"):row.getJSONObject("analysis");
        ServiceWork.validatePricing(pricing);
        if(!pricing.getBoolean("countConfirmed"))throw new IllegalArgumentException("Confirm extracted scope before quoting; images/OCR are not counted");
        String currency=pricing.getString("currency").toUpperCase(Locale.ROOT);
        if(!Set.of("CNY","USD","EUR","GBP","HKD","AUD","CAD").contains(currency))throw new IllegalArgumentException("Unsupported currency (two-decimal currencies only)");
        String basis=pricing.getString("basis");if(!(manual?ServiceWork.BASES:Set.of("words","characters","han","fixed")).contains(basis))throw new IllegalArgumentException("Unknown counting basis");
        int per=pricing.getInt("per");if(per!=1 && per!=1000)throw new IllegalArgumentException("per must be 1 or 1000");
        String rounding=pricing.getString("rounding");if(!Set.of("exact","ceil-block").contains(rounding))throw new IllegalArgumentException("Unknown rounding");
        BigDecimal rate=money(pricing.getString("rate"));
        BigDecimal quantity=basis.equals("fixed")?BigDecimal.ONE:manual?ServiceWork.quantity(pricing.getString("quantity")):BigDecimal.valueOf(analysis.getJSONObject("totals").getLong(basis));
        if(quantity.signum()<=0)throw new IllegalArgumentException("Billable quantity must be greater than zero");
        BigDecimal units=quantity.divide(BigDecimal.valueOf(basis.equals("fixed")?1:per),12,RoundingMode.HALF_UP);
        if(rounding.equals("ceil-block"))units=units.setScale(0,RoundingMode.CEILING);
        BigDecimal base=units.multiply(rate).setScale(2,RoundingMode.HALF_UP);
        BigDecimal total=base.max(money(pricing.optString("minimum","0"))).add(money(pricing.optString("surcharge","0"))).subtract(money(pricing.optString("discount","0")));
        if(total.signum()<0)throw new IllegalArgumentException("Discount exceeds charge");
        return new JSONObject().put("id",UUID.randomUUID().toString()).put("created",Instant.now().toString()).put("analysisId",analysis.getString("id"))
            .put("status","estimate").put("currency",currency).put("quantity",quantity).put("quantitySource",manual?"manual-confirmed":"file-analysis").put("pricing",new JSONObject(pricing.toString())).put("base",base.toPlainString()).put("total",total.setScale(2,RoundingMode.HALF_UP).toPlainString());
    }
    private static JSONObject analyze(JSONObject row)throws Exception {
        if(row.optString("srcLang").isBlank() || row.optString("tgtLang").isBlank())throw new IllegalArgumentException("Source and target languages required");
        JSONArray inputs=row.optJSONArray("files",new JSONArray());if(inputs.isEmpty())throw new IllegalArgumentException("No files");
        String id=UUID.randomUUID().toString();Path folder=home().resolve("analysis").resolve(id);Files.createDirectories(folder);
        JSONArray files=new JSONArray();Set<String> seen=new HashSet<>();long words=0,characters=0,han=0,segments=0;
        JSONObject prefs=TmsServer.getPreferences();
        try {
            for(Object o:inputs) {
                JSONObject f=(JSONObject)o;Path source=Path.of(f.getString("path"));
                if(!Files.isRegularFile(source) || Files.size(source)>100_000_000)throw new IllegalArgumentException("Missing or oversized file: "+source.getFileName());
                String digest=hash(Files.readAllBytes(source));if(!seen.add(digest))throw new IllegalArgumentException("Duplicate file contents: "+source.getFileName());
                int index=files.length();Path copied=folder.resolve(index+"-"+source.getFileName());Files.copy(source,copied);
                if(!digest.equals(hash(Files.readAllBytes(copied))))throw new IllegalArgumentException("File changed during snapshot");
                JSONObject item=new JSONObject().put("name",source.getFileName().toString()).put("sha256",digest).put("snapshot",copied.toString()).put("role",f.optString("role","source"));
                files.put(item);if(item.getString("role").equals("reference"))continue;
                String format=FileFormats.detectFormat(copied.toString());if(format==null && source.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".txt"))format=FileFormats.TEXT;if(format==null)throw new IllegalArgumentException("Unsupported file: "+source.getFileName());
                if(FileFormats.isBilingual(format))throw new IllegalArgumentException("Bilingual project packages require the existing import workflow; intake currently accepts original source documents");
                Path xliff=folder.resolve(index+".xlf"),skeleton=folder.resolve(index+".skl");
                Map<String,String> params=new HashMap<>();params.put("source",copied.toString());params.put("xliff",xliff.toString());params.put("skeleton",skeleton.toString());params.put("format",format);
                params.put("catalog",prefs.getString("catalog"));params.put("srxFile",prefs.getString("srx"));params.put("srcEncoding",f.optString("encoding","UTF-8"));
                params.put("srcLang",row.getString("srcLang"));params.put("tgtLang",row.getString("tgtLang"));params.put("paragraph","yes");params.put("xliff21","yes");params.put("maxThreads","2");params.put("xmlfilter","");
                List<String> converted=Convert.run(params);if(!"0".equals(converted.get(0)))throw new IllegalArgumentException("Cannot parse "+source.getFileName()+": "+converted);
                if(Files.exists(skeleton))item.put("skeleton",skeleton.toString()).put("skeletonHash",hash(Files.readAllBytes(skeleton)));
                long[] count=new long[4];count(new SAXBuilder().build(xliff.toFile()).getRootElement(),row.getString("srcLang"),count);
                if(count[3]==0)throw new IllegalArgumentException("No translatable segments: "+source.getFileName());
                item.put("xliff",xliff.toString()).put("xliffHash",hash(Files.readAllBytes(xliff))).put("format",format).put("encoding",f.optString("encoding","UTF-8"))
                    .put("words",count[0]).put("characters",count[1]).put("han",count[2]).put("segments",count[3]);
                words+=count[0];characters+=count[1];han+=count[2];segments+=count[3];
            }
            if(segments==0)throw new IllegalArgumentException("At least one source file required");
            return new JSONObject().put("id",id).put("fingerprint",fingerprint(row)).put("created",Instant.now().toString()).put("files",files)
                .put("totals",new JSONObject().put("words",words).put("characters",characters).put("han",han).put("segments",segments))
                .put("warnings",new JSONArray().put("统计仅覆盖转换器提取的 segment/source，包含重复与锁定段；不含图片文字/OCR，不保证覆盖隐藏内容或与 Word 字数相同。请核对计费范围。"))
                .put("countingVersion","openxliff-words+unicode-codepoints-v1");
        } catch(Exception e){TmsServer.deleteFolder(folder.toFile());throw e;}
    }
    private static void count(Element e,String language,long[] counts) {
        if(e.getName().equals("segment")) {Element source=e.getChild("source");if(source!=null){String text=XliffUtils.pureText(source);counts[0]+=RepetitionAnalysis.wordCount(text,language);text.codePoints().forEach(c->{if(!Character.isWhitespace(c)&&!Character.isSpaceChar(c))counts[1]++;if(Character.UnicodeScript.of(c)==Character.UnicodeScript.HAN)counts[2]++;});counts[3]++;}return;}
        for(Element child:e.getChildren())count(child,language,counts);
    }
    private static String createProject(JSONObject row,JSONObject data)throws Exception {
        JSONObject analysis=row.getJSONObject("analysis");if(!analysis.getString("fingerprint").equals(fingerprint(row)))throw new IllegalArgumentException("Analyze current files first");
        String id="intake-"+row.getString("id");if(ProjectsHandler.hasBusinessProject(id))return id;
        Path folder=ProjectsHandler.getWorkFolder().toPath().resolve(id);if(Files.exists(folder))TmsServer.deleteFolder(folder.toFile());Files.createDirectories(folder);
        List<String> xliffs=new ArrayList<>();List<SourceFile> sources=new ArrayList<>();
        try {
            for(Object o:analysis.getJSONArray("files")) {
                JSONObject file=(JSONObject)o;Path snapshot=Path.of(file.getString("snapshot"));
                if(!file.getString("sha256").equals(hash(Files.readAllBytes(snapshot))))throw new IllegalArgumentException("Snapshot integrity error");
                Path copied=folder.resolve(snapshot.getFileName());Files.copy(snapshot,copied);
                if(!"source".equals(file.getString("role")))continue;
                Path old=Path.of(file.getString("xliff"));if(!file.getString("xliffHash").equals(hash(Files.readAllBytes(old))))throw new IllegalArgumentException("XLIFF snapshot changed");
                Document doc=new SAXBuilder().build(old.toFile());
                for(Element f:doc.getRootElement().getChildren("file")) {
                    f.setAttribute("original",copied.getFileName().toString());Element sk=f.getChild("skeleton");
                    if(sk!=null && !sk.getAttributeValue("href").isBlank()) {
                        Path href=Path.of(sk.getAttributeValue("href"));if(!href.isAbsolute())href=old.getParent().resolve(href);
                        if(!file.has("skeleton") || !href.toRealPath().equals(Path.of(file.getString("skeleton")).toRealPath()) || !file.getString("skeletonHash").equals(hash(Files.readAllBytes(href))))throw new IllegalArgumentException("Unexpected or modified skeleton");
                        Path destination=folder.resolve(href.getFileName());if(!Files.exists(destination))Files.copy(href,destination);
                        sk.setAttribute("href",destination.toString());
                    }
                }
                Path x=folder.resolve(old.getFileName());try(var out=Files.newOutputStream(x)){new XMLOutputter().output(doc,out);}xliffs.add(x.toString());
                sources.add(new SourceFile(copied.getFileName().toString(),file.getString("format"),file.getString("encoding")));
            }
            Path main=folder.resolve("project.xlf");if(xliffs.size()==1)Files.copy(Path.of(xliffs.get(0)),main);else Join.join(xliffs,main.toString());
            JSONObject client=find(data.getJSONArray("clients"),row.getString("clientId"));
            Project project=new Project(id,row.getString("name"),0,LanguageUtils.getLanguage(row.getString("srcLang")),LanguageUtils.getLanguage(row.getString("tgtLang")),client.getString("name"),row.optJSONObject("brief",new JSONObject()).optString("domain"),"none","none",LocalDate.now(),false);
            project.setXliff(main.toString());project.setFiles(sources);ProjectsHandler.registerBusinessProject(project);return id;
        } catch(Exception e){if(!ProjectsHandler.hasBusinessProject(id))TmsServer.deleteFolder(folder.toFile());throw e;}
    }
    public static synchronized JSONObject briefForProject(String project)throws Exception {
        for(Object o:load().getJSONArray("intakes")) {
            JSONObject r=(JSONObject)o;if(!project.equals(r.optString("projectId")))continue;
            JSONObject brief=new JSONObject();JSONObject input=r.optJSONObject("brief",new JSONObject());
            for(String key:BRIEF_FIELDS)if(input.has(key))brief.put(key,input.getString(key));
            return new JSONObject().put("brief",brief).put("requirementsConfirmed",r.optBoolean("requirementsConfirmed")).put("srcLang",r.optString("srcLang")).put("tgtLang",r.optString("tgtLang")).put("briefRevision",r.getInt("revision"));
        }
        return new JSONObject().put("brief",new JSONObject());
    }
}
