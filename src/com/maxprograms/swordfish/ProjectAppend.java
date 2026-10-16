package com.maxprograms.swordfish;

import java.nio.file.*;
import java.util.*;
import org.json.*;
import com.maxprograms.swordfish.models.*;
import com.maxprograms.swordfish.xliff.XliffStore;
import com.maxprograms.xml.*;

/** Closed-project append with an on-disk recovery copy. Existing rows/history stay intact. */
public final class ProjectAppend {
    private ProjectAppend() { }
    private static void copyTree(Path from,Path to)throws Exception {
        try(var paths=Files.walk(from)){for(Path p:paths.toList()){Path target=to.resolve(from.relativize(p));if(Files.isDirectory(p))Files.createDirectories(target);else Files.copy(p,target,StandardCopyOption.REPLACE_EXISTING);}}
    }
    public static void append(String projectId,String batch,JSONObject analysis)throws Exception {
        ProjectsHandler.requireBusinessProjectClosed(projectId);
        Project project=ProjectsHandler.getBusinessProject(projectId);
        Path folder=Path.of(project.getXliff()).getParent();
        Path recovery=TmsServer.getWorkFolder().toPath().resolve("business/append-recovery").resolve(projectId+"-"+batch);
        Path backup=recovery.resolve("before"),done=recovery.resolve("done.json");
        Files.createDirectories(recovery);
        if(Files.exists(done)) {restoreRegistry(projectId,new JSONObject(Files.readString(done)));return;}
        if(Files.exists(recovery.resolve("pending"))) {
            TmsServer.deleteFolder(folder.toFile());copyTree(backup,folder);
        } else {
            if(Files.exists(backup))TmsServer.deleteFolder(backup.toFile());
            copyTree(folder,backup);Files.writeString(recovery.resolve("pending"),"restore this backup before retry if no done.json");
        }
        XliffStore store=null;
        try {
            Path inputs=folder.resolve("additions").resolve(batch);Files.createDirectories(inputs);
            List<String> xliffs=new ArrayList<>();JSONArray added=new JSONArray();
            for(Object o:analysis.getJSONArray("files")) {
                JSONObject f=(JSONObject)o;if(!"source".equals(f.getString("role")))continue;
                Path source=Path.of(f.getString("snapshot")),originalXliff=Path.of(f.getString("xliff"));
                if(!IntakeArchive.hash(source).equals(f.getString("sha256"))||!IntakeArchive.hash(originalXliff).equals(f.getString("xliffHash")))throw new IllegalArgumentException("Append snapshot modified");
                Path copied=inputs.resolve(source.getFileName());Files.copy(source,copied,StandardCopyOption.REPLACE_EXISTING);
                Document doc=new SAXBuilder().build(originalXliff.toFile());
                for(Element file:doc.getRootElement().getChildren("file")) {
                    file.setAttribute("original",batch.substring(0,12)+"-"+copied.getFileName().toString());
                    Element sk=file.getChild("skeleton");
                    if(sk!=null&&!sk.getAttributeValue("href").isBlank()) {
                        Path skeleton=Path.of(f.getString("skeleton"));
                        if(!IntakeArchive.hash(skeleton).equals(f.getString("skeletonHash")))throw new IllegalArgumentException("Append skeleton modified");
                        Path newSkeleton=inputs.resolve(skeleton.getFileName());Files.copy(skeleton,newSkeleton,StandardCopyOption.REPLACE_EXISTING);sk.setAttribute("href",newSkeleton.toString());
                    }
                }
                Path x=inputs.resolve(originalXliff.getFileName());try(var out=Files.newOutputStream(x)){new XMLOutputter().output(doc,out);}xliffs.add(x.toString());
                added.put(new SourceFile(batch.substring(0,12)+"-"+copied.getFileName().toString(),f.getString("format"),f.getString("encoding")).toJSON());
            }
            if(!xliffs.isEmpty()) {
                store=new XliffStore(project.getXliff(),project.getSourceLang().getCode(),project.getTargetLang().getCode());store.appendSourceFiles(xliffs);store.close();store=null;
            }
            JSONObject completed=new JSONObject().put("files",added);Path temp=recovery.resolve("done.tmp");Files.writeString(temp,completed.toString(2));Files.move(temp,done,StandardCopyOption.ATOMIC_MOVE);
            restoreRegistry(projectId,completed);
        } catch(Exception error) {
            if(store!=null)try{store.close();}catch(Exception ignored){}
            if(!Files.exists(done)){TmsServer.deleteFolder(folder.toFile());copyTree(backup,folder);Files.deleteIfExists(recovery.resolve("pending"));}
            throw error;
        }
    }
    private static void restoreRegistry(String id,JSONObject done)throws Exception {List<SourceFile> files=new ArrayList<>();for(Object o:done.getJSONArray("files"))files.add(new SourceFile((JSONObject)o));ProjectsHandler.updateBusinessProjectFiles(id,files);}
}
