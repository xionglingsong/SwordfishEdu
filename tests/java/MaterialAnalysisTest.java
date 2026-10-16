import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.json.*;
import com.maxprograms.swordfish.MaterialAnalysis;

public class MaterialAnalysisTest {
 static int checks;
 static void check(boolean v,String m){checks++;if(!v)throw new AssertionError(m);}
 interface Run {void run()throws Exception;}
 static void reject(Run fn,String message)throws Exception{try{fn.run();throw new AssertionError("Expected "+message);}catch(IllegalArgumentException e){check(e.getMessage().contains(message),e.getMessage());}}
 static JSONObject file(Path path,String id)throws Exception{return new JSONObject().put("name",path.getFileName().toString()).put("role","source").put("sha256",id).put("xliff",path.toString()).put("xliffHash",HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(path))));}
 public static void main(String[] args)throws Exception {
  Path dir=Files.createTempDirectory("material-analysis-");
  try {
   Path longFile=dir.resolve("not-a-real-contract.xlf");StringBuilder xml=new StringBuilder("<xliff><file><unit>");
   for(int i=1;i<=40;i++)xml.append("<segment><source>Paragraph ").append(i).append(" about turbine maintenance ").append("文".repeat(410)).append("</source></segment>");
   xml.append("</unit></file></xliff>");Files.writeString(longFile,xml);
   Path shortFile=dir.resolve("short.xlf");Files.writeString(shortFile,"<xliff><file><unit><segment><source>Parties agree to the contract.</source></segment></unit></file></xliff>");
   JSONObject row=new JSONObject().put("brief",new JSONObject().put("aiPolicy","allowed").put("domain","Client domain")).put("srcLang","en").put("tgtLang","zh-CN").put("requirementsConfirmed",true)
    .put("analysis",new JSONObject().put("id","analysis-1").put("files",new JSONArray().put(file(longFile,"long")).put(file(shortFile,"short"))));
   JSONObject sample=MaterialAnalysis.sample(row);JSONArray sources=sample.getJSONArray("files");
   check(sources.length()==2,"per-file samples");JSONObject first=sources.getJSONObject(0);
   check(first.getInt("sampledSegments")==12&&first.getInt("totalSegments")==40,"bounded sampling");
   check(first.getJSONArray("excerpts").getJSONObject(0).getInt("segment")==1&&first.getJSONArray("excerpts").getJSONObject(11).getInt("segment")==40,"beginning/end coverage");
   check(!first.getBoolean("fullText")&&sources.getJSONObject(1).getBoolean("fullText"),"coverage labels");
   check(first.getInt("sampledCharacters")==4800,"character truncation");
   for(String policy:List.of("forbidden","local-only","")) {
    JSONObject denied=new JSONObject(row.toString());denied.getJSONObject("brief").put("aiPolicy",policy);reject(()->MaterialAnalysis.sample(denied),"permission");
   }
   JSONArray results=new JSONArray();
   for(Object o:sources){JSONObject f=(JSONObject)o,e=f.getJSONArray("excerpts").getJSONObject(0);results.put(new JSONObject().put("fileId",f.getString("fileId")).put("domain",f.getString("fileId").equals("long")?"Energy":"Law").put("textType",f.getString("fileId").equals("long")?"Manual":"Contract").put("confidence","high").put("rationale","Based on sampled text only").put("evidence",new JSONArray().put(new JSONObject().put("segment",e.getInt("segment")).put("quote",e.getString("text").substring(0,12)))).put("questions",new JSONArray().put("Target audience?")));}
   JSONObject request=new JSONObject().put("analysisId","analysis-1").put("origin","test-model").put("files",results);
   JSONObject suggestion=MaterialAnalysis.validate(row,request);row.put("materialAnalysis",suggestion);
   check(row.getJSONObject("brief").getString("domain").equals("Client domain"),"save does not overwrite");
   JSONObject forged=new JSONObject(request.toString());forged.getJSONArray("files").getJSONObject(0).getJSONArray("evidence").getJSONObject(0).put("quote","invented evidence");
   reject(()->MaterialAnalysis.validate(row,forged),"sampled source");
   reject(()->MaterialAnalysis.validate(row,new JSONObject(request.toString()).put("analysisId","old")),"Stale");
   JSONObject adopt=new JSONObject().put("suggestionId",suggestion.getString("id")).put("fields",new JSONArray().put("domain").put("textType"));
   reject(()->MaterialAnalysis.adopt(row,adopt),"already set");
   check(!row.getJSONObject("brief").has("textType"),"failed adopt is atomic");
   MaterialAnalysis.adopt(row,new JSONObject(adopt.toString()).put("replaceExisting",true));
   check(row.getJSONObject("brief").getString("domain").contains("混合材料"),"mixed files preserved");
   check(row.getJSONObject("brief").getString("textType").contains("Contract"),"text type adopted");
   check(!row.getBoolean("requirementsConfirmed")&&row.getJSONArray("materialAdoptions").length()==1,"review and provenance");
   Files.writeString(shortFile,"<xliff/>");reject(()->MaterialAnalysis.sample(row),"snapshot changed");
   System.out.println("MaterialAnalysis: "+checks+" checks passed");
  }finally{try(var paths=Files.walk(dir)){for(Path p:paths.sorted(Comparator.reverseOrder()).toList())Files.delete(p);}}
 }
}
