package com.maxprograms.swordfish;

import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Stream;
import org.json.*;
import com.maxprograms.converters.FileFormats;

/** Copies only regular files; archive batches never mutate the caller's originals. */
public final class IntakeArchive {
    private IntakeArchive() { }
    public static String hash(Path file)throws Exception {return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file)));}
    public static String slug(String value) {String s=value.replaceAll("[\\p{Cntrl}<>:\"/\\\\|?*]","_").replaceAll("^[. ]+|[. ]+$","");return s.isBlank()?"untitled":s.substring(0,Math.min(60,s.length()));}
    public static JSONArray discover(JSONArray paths)throws Exception {
        JSONArray files=new JSONArray();Set<String> seen=new HashSet<>();long total=0;
        for(Object o:paths) {
            JSONObject entry=(JSONObject)o;Path path=Path.of(entry.getString("path"));String role=entry.optString("role","source");
            if(!Set.of("source","reference","communication").contains(role))throw new IllegalArgumentException("Unknown file role");
            if(!path.isAbsolute() || Files.isSymbolicLink(path) || !Files.exists(path))throw new IllegalArgumentException("Expected an existing absolute file/directory, not a symlink: "+path);
            Path root=Files.isDirectory(path)?path:path.getParent();
            List<Path> items;
            if(Files.isDirectory(path))try(Stream<Path> walk=Files.walk(path)){items=walk.filter(p->Files.isRegularFile(p,LinkOption.NOFOLLOW_LINKS)).sorted().toList();}
            else items=List.of(path);
            for(Path item:items) {
                Path relative=root.relativize(item);boolean hidden=false;
                for(Path part:relative)if(part.toString().startsWith(".") || part.toString().startsWith("~$"))hidden=true;
                if(hidden)continue;
                if(!Files.isRegularFile(item,LinkOption.NOFOLLOW_LINKS))continue;
                if(!seen.add(item.toRealPath()+"|"+role))continue;
                long size=Files.size(item);total+=size;
                if(size>100_000_000 || total>500_000_000 || files.length()>=200)throw new IllegalArgumentException("Import limit: 200 files, 100 MB/file, 500 MB/batch");
                String type=FileFormats.detectFormat(item.toString());
                if(type==null&&item.toString().toLowerCase(Locale.ROOT).endsWith(".txt"))type=FileFormats.TEXT;
                boolean supported=type!=null&&!FileFormats.isBilingual(type);
                files.put(new JSONObject().put("path",item.toAbsolutePath().toString()).put("relative",relative.toString()).put("role",role)
                    .put("size",size).put("sha256",hash(item)).put("sourceSupported",supported).put("encoding",entry.optString("encoding","UTF-8")));
            }
        }
        if(files.isEmpty())throw new IllegalArgumentException("No regular visible files found");
        return files;
    }
    public static JSONObject archive(Path root,JSONObject client,JSONObject intake,JSONArray discovered)throws Exception {
        String batchKey=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(discovered.toString().getBytes(StandardCharsets.UTF_8)));
        Path project=intake.has("archiveFolder")?Path.of(intake.getString("archiveFolder")):root.resolve(slug(client.getString("name"))+"--"+client.getString("id")).resolve(slug(intake.getString("name"))+"--"+intake.getString("id"));
        if(!project.normalize().startsWith(root.normalize()))throw new IllegalArgumentException("Archive folder must remain in application archive root");
        Path manifest=project.resolve("manifests").resolve(batchKey+".json");
        if(Files.exists(manifest)) {
            JSONObject existing=new JSONObject(Files.readString(manifest));
            for(Object o:existing.getJSONArray("files")){JSONObject f=(JSONObject)o;if(!hash(Path.of(f.getString("archivedPath"))).equals(f.getString("sha256")))throw new IllegalArgumentException("Archived file was modified; restore archive before retry");}
            return existing;
        }
        JSONArray records=new JSONArray();
        int index=0;
        for(Object o:discovered){JSONObject f=new JSONObject(((JSONObject)o).toString());String section=switch(f.getString("role")){case "source"->"01-source";case "reference"->"02-reference";default->"03-communication";};
            Path target=project.resolve(section).resolve(batchKey).resolve(Integer.toString(index++)).resolve(f.getString("relative")).normalize();
            if(!target.startsWith(project))throw new IllegalArgumentException("Archive path escaped project");
            Files.createDirectories(target.getParent());
            if(!Files.exists(target))Files.copy(Path.of(f.getString("path")),target);
            if(!hash(target).equals(f.getString("sha256")))throw new IllegalArgumentException("File changed during archive; retry after source stabilizes");
            f.put("archivedPath",target.toString());records.put(f);
        }
        for(String name:List.of("04-deliverables","05-finance","manifests"))Files.createDirectories(project.resolve(name));
        JSONObject result=new JSONObject().put("batchId",batchKey).put("folder",project.toString()).put("created",java.time.Instant.now().toString()).put("files",records);
        Path tmp=Files.createTempFile(manifest.getParent(),"manifest-",".tmp");Files.writeString(tmp,result.toString(2));Files.move(tmp,manifest,StandardCopyOption.ATOMIC_MOVE);
        return result;
    }
}
