import java.nio.file.*;
import java.util.*;
import org.json.JSONObject;
import com.maxprograms.swordfish.xliff.XliffStore;
import com.maxprograms.xml.*;

public class ExportOrderTest {
    public static void main(String[] args) throws Exception {
        Path home=Files.createTempDirectory("swordfish-export-order-");
        System.setProperty("user.home",home.toString());
        Path settings=home.resolve(System.getProperty("os.name").toLowerCase().startsWith("mac") ? "Library/Application Support/Swordfish" : ".config/Swordfish");
        Files.createDirectories(settings);
        Files.writeString(settings.resolve("preferences.json"),new JSONObject().put("catalog",Path.of("catalog/catalog.xml").toAbsolutePath().toString())
            .put("acceptUnconfirmed",true).put("caseSensitiveSearches",false).put("fuzzyTermSearches",false).toString());
        Path xliff=home.resolve("source.xlf");
        StringBuilder xml=new StringBuilder("<xliff xmlns=\"urn:oasis:names:tc:xliff:document:2.0\" version=\"2.0\" srcLang=\"en\" trgLang=\"zh-CN\">");
        List<String> expected=new ArrayList<>();
        // File IDs deliberately differ from lexical AND numeric ordering.
        for(String file:List.of("10","2","1","z","a","3","4","5","6","7","8","9")) {
            xml.append("<file id=\"").append(file).append("\" original=\"").append(file).append(".txt\"><group id=\"g\">");
            for(int unit=1;unit<=12;unit++) {
                xml.append("<unit id=\"").append(unit).append("\">");
                for(String seg:List.of("2","10","1")) {
                    String text="source-"+file+"-"+unit+"-"+seg;
                    expected.add(text);
                    xml.append("<segment id=\"").append(seg).append("\" state=\"final\"><source>").append(text)
                       .append("</source><target>译文-").append(text).append("</target></segment>");
                }
                xml.append("</unit>");
            }
            xml.append("<unit id=\"draft\"><segment id=\"draft\" state=\"translated\"><source>draft</source><target>草稿</target></segment></unit></group></file>");
        }
        xml.append("</xliff>");Files.writeString(xliff,xml);
        XliffStore store=new XliffStore(xliff.toString(),"en","zh-CN");
        try {
            Path output=home.resolve("bilingual.tmx");
            store.exportTMX(output.toString(),"order","","");
            SAXBuilder builder=new SAXBuilder();builder.setEntityResolver(CatalogBuilder.getCatalog(Path.of("catalog/catalog.xml").toAbsolutePath().toString()));
            List<Element> units=builder.build(output.toFile()).getRootElement().getChild("body").getChildren("tu");
            List<String> actual=new ArrayList<>();
            for(Element tu:units) {
                List<Element> tuvs=tu.getChildren("tuv");
                String source=tuvs.get(0).getChild("seg").getText();
                String target=tuvs.get(1).getChild("seg").getText();
                if(!target.equals("译文-"+source))throw new AssertionError("Source/target pair changed");
                actual.add(source);
            }
            if(!actual.equals(expected))throw new AssertionError("TMX not in original document order; expected first="+expected.subList(0,6)+" actual first="+actual.subList(0,6));
            store.updateXliff();
            List<String> rewritten=new ArrayList<>();collect(builder.build(xliff.toFile()).getRootElement(),rewritten);
            if(!rewritten.equals(expected))throw new AssertionError("XLIFF update reordered segments");
            System.out.println("Export order: 432 paired segments, 12 files, arbitrary IDs and draft exclusion verified");
        } finally {
            store.close();
            try(var paths=Files.walk(home)){for(Path p:paths.sorted(Comparator.reverseOrder()).toList())Files.delete(p);}
        }
    }
    static void collect(Element e,List<String> result) {
        if(e.getName().equals("segment") && e.getAttributeValue("state").equals("final"))result.add(e.getChild("source").getText());
        for(Element child:e.getChildren())collect(child,result);
    }
}
