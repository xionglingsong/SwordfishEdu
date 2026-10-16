import java.nio.file.*;
import java.util.*;
import org.json.*;
import com.maxprograms.swordfish.*;
import com.maxprograms.swordfish.xliff.XliffStore;
import com.maxprograms.swordfish.xliff.XliffUtils;

public class AutoIntakeTest {
 static int checks;
 static void check(boolean value,String message){checks++;if(!value)throw new AssertionError(message);}
 static JSONObject call(JSONObject request)throws Exception{return BusinessStore.execute(request);}
 static JSONObject request(Path dir,String client,String project){return new JSONObject().put("op","auto-intake").put("clientName",client).put("projectName",project).put("description","Customer asked for a translation")
  .put("paths",new JSONArray().put(new JSONObject().put("path",dir.toString())))
  .put("task",new JSONObject().put("srcLang","en").put("tgtLang","zh-CN").put("deadline","2026-10-23T17:00:00+08:00").put("requirementsConfirmed",true).put("brief",new JSONObject().put("aiPolicy","allowed")));}
 public static void main(String[]args)throws Exception {
  Path home=Files.createTempDirectory("auto-intake-");System.setProperty("user.home",home.toString());
  Path settings=home.resolve(System.getProperty("os.name").toLowerCase().startsWith("mac")?"Library/Application Support/Swordfish":".config/Swordfish");Files.createDirectories(settings);
  Files.writeString(settings.resolve("preferences.json"),new JSONObject().put("catalog",Path.of("catalog/catalog.xml").toAbsolutePath().toString()).put("srx",Path.of("srx/default.srx").toAbsolutePath().toString()).put("acceptUnconfirmed",true).put("caseSensitiveSearches",false).put("fuzzyTermSearches",false).toString());
  try {
   Path materials=home.resolve("input");Files.createDirectories(materials.resolve("chapter"));Files.writeString(materials.resolve("a.txt"),"First original sentence.");Files.writeString(materials.resolve("chapter/b.txt"),"Second original sentence.");
   JSONObject req=request(materials,"Client A","Project A");JSONObject result=call(req);check(result.getString("outcome").equals("created"),"created");String pid=result.getString("projectId");
   JSONObject intake=result.getJSONObject("intake");check(intake.getJSONArray("files").length()==2,"multi file one project");check(Files.isDirectory(Path.of(intake.getString("archiveFolder")).resolve("01-source")),"archive organized");
   check(Files.readString(materials.resolve("a.txt")).equals("First original sentence."),"original unchanged");
   JSONObject repeat=call(req);check(repeat.getString("projectId").equals(pid)&&repeat.getString("outcome").equals("unchanged"),"retry no duplicate");
   Path xliff=settings.resolve("projects").resolve(pid).resolve("project.xlf");
   XliffStore store=new XliffStore(xliff.toString(),"en","zh-CN");JSONObject segment;
   try {
    segment=store.agentRequest(new JSONObject().put("action","read")).getJSONArray("segments").getJSONObject(0);
    var target=XliffUtils.buildElement(segment.getString("target"));target.setText("已翻译第一句。");segment.put("target",target.toString());
    store.agentRequest(new JSONObject().put("action","apply").put("edits",new JSONArray().put(segment)));
   } finally {store.close();}
   Files.writeString(materials.resolve("chapter/c.txt"),"Third added sentence.");
   JSONObject append=call(req);check(append.getString("outcome").equals("appended")&&append.getInt("addedFiles")==1,"append only new file");check(append.getString("projectId").equals(pid),"same project");
   check(append.getJSONObject("intake").getBoolean("additionalScopeUnpriced"),"new scope not silently repriced");
   store=new XliffStore(xliff.toString(),"en","zh-CN");
   try {
    JSONArray segments=store.agentRequest(new JSONObject().put("action","read")).getJSONArray("segments");check(segments.length()==3,"three source segments");
    boolean preserved=false;for(Object o:segments)if(((JSONObject)o).getString("target").contains("已翻译第一句"))preserved=true;
    check(preserved,"existing translation preserved");check(store.agentRequest(new JSONObject().put("action","history")).getJSONArray("batches").length()==1,"agent history preserved");
    Path exported=home.resolve("exported");Files.createDirectories(exported);store.exportTranslations(exported.toString());check(Files.walk(exported).anyMatch(p->p.toString().endsWith(".txt")),"appended project exports");
   }finally{store.close();}
   check(call(req).getString("outcome").equals("unchanged"),"append retry no duplicates");
   JSONObject other=call(request(materials,"Client B","Project A"));check(!other.getString("projectId").equals(pid),"different clients separated");
   JSONObject incomplete=request(materials,"Client C","Project C");incomplete.getJSONObject("task").remove("deadline");JSONObject missing=call(incomplete);check(missing.getString("outcome").equals("needs-information"),"missing asks only required");
   incomplete.getJSONObject("task").put("deadline","2026-10-23T17:00:00+08:00");check(call(incomplete).getJSONObject("intake").getString("id").equals(missing.getJSONObject("intake").getString("id")),"resume same draft");
   JSONObject conflict=request(materials,"Client A","Project A");conflict.getJSONObject("task").put("tgtLang","fr");check(call(conflict).getString("outcome").equals("needs-information"),"conflict not overwrite");
   // Same filename with changed bytes is a preserved additional version, never replacement.
   Files.writeString(materials.resolve("a.txt"),"Revised original sentence.");
   JSONObject revised=call(req);check(revised.getInt("addedFiles")==1,"same-name changed bytes append version");
   check(Files.readString(materials.resolve("a.txt")).equals("Revised original sentence."),"no destructive source move");
   store=new XliffStore(xliff.toString(),"en","zh-CN");try{check(store.agentRequest(new JSONObject().put("action","read")).getJSONArray("segments").length()==4,"old version retained");}finally{store.close();}
   Path link=home.resolve("symlink.txt");Files.createSymbolicLink(link,materials.resolve("a.txt"));
   try{IntakeArchive.discover(new JSONArray().put(new JSONObject().put("path",link.toString())));throw new AssertionError("symlink accepted");}catch(IllegalArgumentException expected){checks++;}
   Path chat=home.resolve("chat.png");Files.write(chat,new byte[]{1,2,3});
   JSONObject refs=request(chat,"Client A","Project A");refs.getJSONArray("paths").getJSONObject(0).put("role","communication");
   JSONObject archived=call(refs);check(archived.getString("outcome").equals("unchanged"),"communication archived without translation");
   check(archived.getJSONObject("intake").getJSONArray("archiveBatches").length()>=3,"archive manifests preserved");
   // Failed append restores old database and clears pending marker so later manual edits survive retries.
   Path bad=home.resolve("broken.txt"),badX=home.resolve("bad.xlf");Files.writeString(bad,"New text");Files.writeString(badX,"not XML");
   JSONObject badFile=new JSONObject().put("role","source").put("snapshot",bad.toString()).put("sha256",IntakeArchive.hash(bad)).put("xliff",badX.toString()).put("xliffHash",IntakeArchive.hash(badX)).put("format","Text").put("encoding","UTF-8");
   try{ProjectAppend.append(pid,"failure-test",new JSONObject().put("files",new JSONArray().put(badFile)));throw new AssertionError("bad XML accepted");}catch(org.xml.sax.SAXException expected){checks++;}
   store=new XliffStore(xliff.toString(),"en","zh-CN");try{check(store.agentRequest(new JSONObject().put("action","read")).getJSONArray("segments").length()==4,"append rollback preserves source rows");check(store.agentRequest(new JSONObject().put("action","history")).getJSONArray("batches").length()==1,"append rollback preserves audit");}finally{store.close();}
   check(!Files.exists(settings.resolve("business/append-recovery").resolve(pid+"-failure-test/pending")),"failed append not marked interrupted");
   Path docx=materials.resolve("append.docx");
   try(var zip=new java.util.zip.ZipOutputStream(Files.newOutputStream(docx))){
    Map<String,String> entries=Map.of("[Content_Types].xml","<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>","_rels/.rels","<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>","word/document.xml","<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>Appended Word document.</w:t></w:r></w:p></w:body></w:document>");
    for(var e:entries.entrySet()){zip.putNextEntry(new java.util.zip.ZipEntry(e.getKey()));zip.write(e.getValue().getBytes(java.nio.charset.StandardCharsets.UTF_8));zip.closeEntry();}
   }
   JSONObject office=call(req);check(office.getString("projectId").equals(pid)&&office.getInt("addedFiles")==1,"DOCX appends to same mixed-format project");
   store=new XliffStore(xliff.toString(),"en","zh-CN");try{Path delivery=home.resolve("office-delivery");Files.createDirectories(delivery);store.exportTranslations(delivery.toString());try(var paths=Files.walk(delivery)){Path resultDocx=paths.filter(p->p.toString().endsWith(".docx")).findFirst().orElseThrow();try(var zip=new java.util.zip.ZipFile(resultDocx.toFile())){check(new String(zip.getInputStream(zip.getEntry("word/document.xml")).readAllBytes(),java.nio.charset.StandardCharsets.UTF_8).contains("Appended Word document"),"DOCX export after append");}}}finally{store.close();}
   System.out.println("AutoIntake: "+checks+" checks passed");
  } finally {try(var paths=Files.walk(home)){for(Path p:paths.sorted(Comparator.reverseOrder()).toList())Files.delete(p);}}
 }
}
