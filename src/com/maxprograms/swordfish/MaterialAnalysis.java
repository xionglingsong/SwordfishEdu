package com.maxprograms.swordfish;

import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.json.*;
import com.maxprograms.xml.*;
import com.maxprograms.swordfish.xliff.XliffUtils;

/** Evidence is tied to immutable parsed source snapshots, never to filenames alone. */
public final class MaterialAnalysis {
    private MaterialAnalysis() { }
    public static void allowed(JSONObject row) {
        if(!"allowed".equals(row.optJSONObject("brief",new JSONObject()).optString("aiPolicy")))
            throw new IllegalArgumentException("Material analysis requires explicit permission for external AI; unknown, local-only and forbidden are blocked");
    }
    public static JSONObject sample(JSONObject row)throws Exception {
        allowed(row);
        JSONObject analysis=row.getJSONObject("analysis");JSONArray files=new JSONArray();
        int sourceCount=0;for(Object o:analysis.getJSONArray("files"))if("source".equals(((JSONObject)o).optString("role")))sourceCount++;
        if(sourceCount>20)throw new IllegalArgumentException("Analyze at most 20 source files per intake; split larger commissions");
        for(Object o:analysis.getJSONArray("files")) {
            JSONObject file=(JSONObject)o;if(!"source".equals(file.optString("role")))continue;
            Path path=Path.of(file.getString("xliff"));byte[] bytes=Files.readAllBytes(path);
            String digest=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
            if(!digest.equals(file.getString("xliffHash")))throw new IllegalArgumentException("Source snapshot changed; analyze files again");
            List<String> texts=new ArrayList<>();collect(new SAXBuilder().build(path.toFile()).getRootElement(),texts);
            JSONArray excerpts=new JSONArray();int n=Math.min(12,texts.size());boolean truncated=false;int visible=0,total=0;
            for(String text:texts)total+=text.codePointCount(0,text.length());
            for(int i=0;i<n;i++) {
                int index=n==1?0:(int)((long)i*(texts.size()-1)/(n-1));String text=texts.get(index);
                int length=text.codePointCount(0,text.length());boolean cut=length>400;
                if(cut){text=text.substring(0,text.offsetByCodePoints(0,400));truncated=true;}
                visible+=text.codePointCount(0,text.length());
                excerpts.put(new JSONObject().put("segment",index+1).put("text",text).put("truncated",cut));
            }
            files.put(new JSONObject().put("fileId",file.getString("sha256")).put("name",file.getString("name")).put("sourceHash",digest)
                .put("totalSegments",texts.size()).put("sampledSegments",n).put("totalCharacters",total).put("sampledCharacters",visible)
                .put("fullText",n==texts.size()&&!truncated).put("excerpts",excerpts));
        }
        return new JSONObject().put("analysisId",analysis.getString("id")).put("samplingVersion","distributed-12x400-v1")
            .put("srcLang",row.optString("srcLang")).put("tgtLang",row.optString("tgtLang")).put("files",files);
    }
    private static void collect(Element element,List<String> texts) {
        if(element.getName().equals("segment")){Element source=element.getChild("source");if(source!=null)texts.add(XliffUtils.pureText(source));return;}
        for(Element child:element.getChildren())collect(child,texts);
    }
    private static String text(JSONObject item,String key,int limit) {
        String value=item.getString(key).trim();if(value.isEmpty()||value.length()>limit)throw new IllegalArgumentException("Invalid classification field: "+key);return value;
    }
    public static JSONObject validate(JSONObject row,JSONObject request)throws Exception {
        JSONObject sample=sample(row);
        if(!sample.getString("analysisId").equals(request.getString("analysisId")))throw new IllegalArgumentException("Stale file analysis; classify the current snapshot");
        JSONArray incoming=request.getJSONArray("files"),sources=sample.getJSONArray("files"),clean=new JSONArray();
        if(incoming.length()!=sources.length())throw new IllegalArgumentException("Return one classification per source file");
        Set<String> seen=new HashSet<>();
        for(Object o:incoming) {
            JSONObject item=(JSONObject)o;String id=item.getString("fileId");JSONObject source=null;
            if(!seen.add(id))throw new IllegalArgumentException("Duplicate file classification");
            for(Object f:sources)if(((JSONObject)f).getString("fileId").equals(id))source=(JSONObject)f;
            if(source==null)throw new IllegalArgumentException("Unknown classification file");
            JSONObject result=new JSONObject().put("fileId",id).put("name",source.getString("name")).put("sourceHash",source.getString("sourceHash"));
            for(String key:List.of("domain","textType","rationale"))result.put(key,text(item,key,key.equals("rationale")?1500:200));
            String confidence=text(item,"confidence",20);if(!Set.of("high","medium","low","unknown").contains(confidence))throw new IllegalArgumentException("Invalid confidence");
            result.put("confidence",confidence);
            JSONArray evidence=item.getJSONArray("evidence"),valid=new JSONArray();
            if(evidence.length()>5 || (evidence.isEmpty()&&!confidence.equals("unknown")))throw new IllegalArgumentException("Provide 1..5 exact evidence quotes or unknown confidence");
            for(Object e:evidence) {
                JSONObject ev=(JSONObject)e;int segment=ev.getInt("segment");String quote=text(ev,"quote",400);boolean found=false;
                for(Object x:source.getJSONArray("excerpts")){JSONObject excerpt=(JSONObject)x;if(excerpt.getInt("segment")==segment&&excerpt.getString("text").contains(quote))found=true;}
                if(!found)throw new IllegalArgumentException("Evidence quote must occur in the sampled source segment");
                valid.put(new JSONObject().put("segment",segment).put("quote",quote));
            }
            result.put("evidence",valid);
            JSONObject coverage=new JSONObject(source.toString());coverage.remove("excerpts");result.put("coverage",coverage);
            JSONArray questions=item.optJSONArray("questions",new JSONArray()),checked=new JSONArray();
            if(questions.length()>5)throw new IllegalArgumentException("Too many classification questions");
            for(int i=0;i<questions.length();i++){String q=questions.getString(i);if(q.length()>500)throw new IllegalArgumentException("Question too long");checked.put(q);}
            result.put("questions",checked);clean.put(result);
        }
        return new JSONObject().put("id",UUID.randomUUID().toString()).put("analysisId",sample.getString("analysisId"))
            .put("created",java.time.Instant.now().toString()).put("origin",text(request,"origin",200)).put("status","suggested")
            .put("samplingVersion",sample.getString("samplingVersion")).put("files",clean);
    }
    public static void adopt(JSONObject row,JSONObject request)throws Exception {
        JSONObject result=row.getJSONObject("materialAnalysis");
        if(!result.getString("id").equals(request.getString("suggestionId")) || !result.getString("analysisId").equals(row.getJSONObject("analysis").getString("id")))throw new IllegalArgumentException("Stale material suggestion");
        // Revalidate hashes/evidence and permission before applying saved suggestions.
        validate(row,result);
        JSONArray fields=request.getJSONArray("fields");if(fields.isEmpty())throw new IllegalArgumentException("Select fields to adopt");
        JSONObject brief=row.optJSONObject("brief",new JSONObject());
        Set<String> selected=new HashSet<>();
        for(int i=0;i<fields.length();i++) {
            String field=fields.getString(i);if(!Set.of("domain","textType").contains(field)||!selected.add(field))throw new IllegalArgumentException("Select domain and/or textType once");
            if(!brief.optString(field).isBlank()&&!request.optBoolean("replaceExisting",false))throw new IllegalArgumentException("Brief field already set; explicit replaceExisting required: "+field);
        }
        JSONObject before=new JSONObject(brief.toString());
        for(String field:selected) {
            LinkedHashSet<String> values=new LinkedHashSet<>();List<String> byFile=new ArrayList<>();
            for(Object o:result.getJSONArray("files")){JSONObject f=(JSONObject)o;if(f.getString("confidence").equals("unknown"))throw new IllegalArgumentException("Unknown classifications require manual brief editing");values.add(f.getString(field));byFile.add(f.getString("name")+": "+f.getString(field));}
            brief.put(field,values.size()==1?values.iterator().next():"混合材料；"+String.join("；",byFile));
        }
        row.put("brief",brief).put("requirementsConfirmed",false);
        JSONArray history=row.optJSONArray("materialAdoptions",new JSONArray());
        history.put(new JSONObject().put("suggestionId",result.getString("id")).put("at",java.time.Instant.now().toString()).put("fields",fields).put("before",before).put("after",new JSONObject(brief.toString())));
        row.put("materialAdoptions",history);result.put("status","adopted");
    }
}
