import java.nio.file.*;
import java.util.*;
import org.json.*;
import com.maxprograms.swordfish.BusinessStore;

public class BusinessStoreTest {
    static int assertions;
    static void check(boolean b,String msg){assertions++;if(!b)throw new AssertionError(msg);}
    static JSONObject call(JSONObject r)throws Exception{return BusinessStore.execute(r);}
    static JSONObject operation(String op,JSONObject row){return new JSONObject().put("op",op).put("id",row.getString("id")).put("revision",row.getInt("revision"));}
    static void rejects(JSONObject req,String message)throws Exception{try{call(req);throw new AssertionError("Expected rejection: "+message);}catch(IllegalArgumentException e){check(e.getMessage().contains(message),e.getMessage());}}
    public static void main(String[]args)throws Exception{
        Path home=Files.createTempDirectory("swordfish-business-");System.setProperty("user.home",home.toString());
        Path settings=home.resolve(System.getProperty("os.name").toLowerCase().startsWith("mac")?"Library/Application Support/Swordfish":".config/Swordfish");Files.createDirectories(settings);
        Files.writeString(settings.resolve("preferences.json"),new JSONObject().put("catalog",Path.of("catalog/catalog.xml").toAbsolutePath().toString()).put("srx",Path.of("srx/default.srx").toAbsolutePath().toString()).put("acceptUnconfirmed",true).put("caseSensitiveSearches",false).put("fuzzyTermSearches",false).toString());
        try {
            JSONObject client=call(new JSONObject().put("op","client-save").put("client",new JSONObject().put("name","Test client").put("email","private@example.test"))).getJSONObject("client");
            Path source=home.resolve("source.txt");Files.writeString(source,"Hello world.\nSecond line.\n");
            JSONObject draft=new JSONObject().put("name","Commission").put("clientId",client.getString("id")).put("srcLang","en").put("tgtLang","zh-CN")
                .put("deadline","2026-10-23T17:00:00+08:00").put("notes","PRIVATE MONEY DETAILS")
                .put("evidence",new JSONArray().put(new JSONObject().put("field","deadline").put("source","chat.png").put("text","Friday 5pm").put("status","confirmed")))
                .put("files",new JSONArray().put(new JSONObject().put("path",source.toString()).put("role","source")))
                .put("brief",new JSONObject().put("purpose","User manual").put("audience","Beginners").put("aiPolicy","allowed").put("styleGuide","yikeke"));
            JSONObject row=call(new JSONObject().put("op","save").put("intake",draft)).getJSONObject("intake");
            check(row.getJSONArray("missing").toString().contains("requirementsConfirmed"),"requirements confirmation");
            rejects(operation("create",row),"Missing requirements");
            JSONObject stale=operation("analyze",row);
            row=call(operation("analyze",row)).getJSONObject("intake");
            check(row.getJSONObject("analysis").getJSONObject("totals").getLong("words")==4,"word count");
            rejects(stale,"Conflict");
            JSONObject update=new JSONObject().put("id",row.getString("id")).put("revision",row.getInt("revision")).put("requirementsConfirmed",true);
            row=call(new JSONObject().put("op","save").put("intake",update)).getJSONObject("intake");
            JSONObject pricing=new JSONObject().put("basis","words").put("currency","CNY").put("per",1000).put("rate","180.00").put("rounding","exact").put("countConfirmed",true);
            row=call(operation("quote",row).put("pricing",pricing)).getJSONObject("intake");
            JSONObject q=row.getJSONArray("quotes").getJSONObject(0);check(q.getString("total").equals("0.72"),"exact decimal quote");
            check(row.getJSONObject("balance").getString("currency").isEmpty(),"estimate not receivable");
            row=call(operation("confirm-quote",row).put("quoteId",q.getString("id"))).getJSONObject("intake");
            JSONObject payment=new JSONObject().put("id",UUID.randomUUID().toString()).put("amount","0.20").put("currency","CNY").put("date","2026-10-16").put("note","Deposit");
            JSONObject paymentRequest=operation("payment",row).put("payment",payment);
            row=call(paymentRequest).getJSONObject("intake");
            check(call(paymentRequest).getJSONObject("intake").getJSONArray("payments").length()==1,"payment idempotency");
            check(row.getJSONObject("balance").getString("remaining").equals("0.52"),"balance");
            rejects(operation("payment",row).put("payment",new JSONObject(payment.toString()).put("id",UUID.randomUUID().toString()).put("currency","USD")),"same currency");
            JSONObject create=operation("create",row);
            row=call(create).getJSONObject("intake");String project=row.getString("projectId");
            check(call(create).getString("projectId").equals(project),"project create idempotency");
            JSONObject brief=call(new JSONObject().put("op","brief").put("project",project));
            check(brief.getJSONObject("brief").getString("purpose").equals("User manual"),"brief purpose");
            check(!brief.toString().contains("private@example")&&!brief.toString().contains("PRIVATE MONEY")&&!brief.toString().contains("0.72"),"brief business data separation");
            JSONObject projects=new JSONObject(Files.readString(settings.resolve("projects/projects.json")));check(projects.getJSONArray("projects").length()==1,"one project registered");
            JSONObject registered=projects.getJSONArray("projects").getJSONObject(0);
            Path projectFile=settings.resolve("projects").resolve(registered.getString("xliff"));
            var store=new com.maxprograms.swordfish.xliff.XliffStore(projectFile.toString(),"en","zh-CN");
            try { store.exportTranslations(home.resolve("delivery.txt").toString());check(Files.readString(home.resolve("delivery.txt")).contains("Hello world"),"created project exports original-format file"); }
            finally {store.close();}
            rejects(new JSONObject().put("op","save").put("intake",new JSONObject().put("id",row.getString("id")).put("revision",row.getInt("revision")).put("srcLang","fr")),"Files frozen");
            // Failed analysis must not leave usable counts or register a project.
            Path bad=home.resolve("scan.pdf");Files.writeString(bad,"not a parseable document");
            JSONObject badInput=new JSONObject(draft.toString()).put("name","Bad file").put("files",new JSONArray().put(new JSONObject().put("path",bad.toString())));
            JSONObject badRow=call(new JSONObject().put("op","save").put("intake",badInput)).getJSONObject("intake");
            try {call(operation("analyze",badRow));throw new AssertionError("Expected failed parse");}catch(IllegalArgumentException expected){assertions++;}
            check(!call(new JSONObject().put("op","get").put("id",badRow.getString("id"))).getJSONObject("intake").has("analysis"),"failed parsing has no valid analysis");
            JSONObject duplicate=new JSONObject(draft.toString()).put("files",new JSONArray().put(new JSONObject().put("path",source.toString())).put(new JSONObject().put("path",source.toString())));
            JSONObject dupRow=call(new JSONObject().put("op","save").put("intake",duplicate)).getJSONObject("intake");
            rejects(operation("analyze",dupRow),"Duplicate file contents");
            JSONObject unknownBrief=new JSONObject().put("id",row.getString("id")).put("revision",row.getInt("revision")).put("brief",new JSONObject().put("email","secret"));
            rejects(new JSONObject().put("op","save").put("intake",unknownBrief),"Unknown brief field");
            rejects(operation("payment",row).put("payment",new JSONObject(payment.toString()).put("id",UUID.randomUUID().toString()).put("amount","1000.00")),"cannot exceed balance");
            Path docx=home.resolve("sample.docx");
            try(var zip=new java.util.zip.ZipOutputStream(Files.newOutputStream(docx))) {
                Map<String,String> entries=Map.of(
                    "[Content_Types].xml","<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>",
                    "_rels/.rels","<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>",
                    "word/document.xml","<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>Word document example.</w:t></w:r></w:p></w:body></w:document>");
                for(var entry:entries.entrySet()){zip.putNextEntry(new java.util.zip.ZipEntry(entry.getKey()));zip.write(entry.getValue().getBytes(java.nio.charset.StandardCharsets.UTF_8));zip.closeEntry();}
            }
            JSONObject officeDraft=new JSONObject(draft.toString()).put("name","Office import").put("files",new JSONArray().put(new JSONObject().put("path",docx.toString()).put("role","source")));
            JSONObject office=call(new JSONObject().put("op","save").put("intake",officeDraft)).getJSONObject("intake");
            office=call(operation("analyze",office)).getJSONObject("intake");
            check(office.getJSONObject("analysis").getJSONObject("totals").getLong("words")==3,"DOCX words counted");
            office=call(new JSONObject().put("op","save").put("intake",new JSONObject().put("id",office.getString("id")).put("revision",office.getInt("revision")).put("requirementsConfirmed",true))).getJSONObject("intake");
            office=call(operation("create",office)).getJSONObject("intake");
            Path officeXliff=settings.resolve("projects").resolve(office.getString("projectId")).resolve("project.xlf");
            var officeStore=new com.maxprograms.swordfish.xliff.XliffStore(officeXliff.toString(),"en","zh-CN");
            try { officeStore.exportTranslations(home.resolve("delivery.docx").toString());try(var zip=new java.util.zip.ZipFile(home.resolve("delivery.docx").toFile())){check(new String(zip.getInputStream(zip.getEntry("word/document.xml")).readAllBytes(),java.nio.charset.StandardCharsets.UTF_8).contains("Word document example"),"created DOCX project exports valid original document");} }
            finally { officeStore.close(); }
            JSONObject calcRow=new JSONObject().put("analysis",new JSONObject().put("id","a").put("totals",new JSONObject().put("characters",12480)));
            JSONObject p=new JSONObject(pricing.toString()).put("basis","characters");
            check(BusinessStore.calculate(calcRow,p).getString("total").equals("2246.40"),"per-thousand exact");
            check(BusinessStore.calculate(calcRow,new JSONObject(p.toString()).put("rounding","ceil-block")).getString("total").equals("2340.00"),"ceil blocks");
            System.out.println("BusinessStore: "+assertions+" checks passed; real text parse, quote, payment, project and brief");
        }finally{try(var paths=Files.walk(home)){for(Path p:paths.sorted(Comparator.reverseOrder()).toList())Files.delete(p);}}
    }
}
