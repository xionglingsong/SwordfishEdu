import java.sql.*;
import java.nio.file.*;
import org.json.*;
import com.maxprograms.swordfish.xliff.AgentEdits;

public class AgentEditsTest {
    static Connection db;
    static int checks;
    static void check(boolean value, String message) {
        checks++;
        if (!value) throw new AssertionError(message);
    }
    static JSONObject call(String action) throws Exception {
        return AgentEdits.run(db, new JSONObject().put("action", action));
    }
    static JSONObject row(int n) throws Exception { return call("read").getJSONArray("segments").getJSONObject(n); }
    static JSONObject edit(int n, String target) throws Exception {
        JSONObject result = row(n); result.put("target", target); return result;
    }
    static JSONObject batch(String action, JSONObject... edits) {
        return new JSONObject().put("action", action).put("edits", new JSONArray(edits));
    }
    static void reject(JSONObject request, String contains) throws Exception {
        try { AgentEdits.run(db, request); throw new AssertionError("Expected rejection: " + contains); }
        catch (IllegalArgumentException e) { check(e.getMessage().contains(contains), e.getMessage()); }
    }
    public static void main(String[] args) throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path path = Files.createTempFile("swordfish-agent-test", ".db");
        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + path)) {
            db = conn; db.setAutoCommit(false);
            try (Statement s = db.createStatement()) {
                s.execute("CREATE TABLE segments (file TEXT, unitId TEXT, segId TEXT, source TEXT, target TEXT, sourceText TEXT, targetText TEXT, state TEXT, translate TEXT, type TEXT, child INTEGER)");
                s.execute("INSERT INTO segments VALUES ('f','u','1','<source>Hello</source>','<target>你好</target>','Hello','你好','translated','Y','S',1)");
                s.execute("INSERT INTO segments VALUES ('f','u','2','<source>A<ph id=\"1\"/></source>','<target>甲<ph id=\"1\"/></target>','A','甲','translated','Y','S',2)");
                s.execute("INSERT INTO segments VALUES ('f','u','3','<source>Locked</source>','<target>锁定</target>','Locked','锁定','translated','N','S',3)");
                s.execute("INSERT INTO segments VALUES ('f','u','4','<source>Final</source>','<target>确认</target>','Final','确认','final','Y','S',4)");
                s.execute("INSERT INTO segments VALUES ('f','u','5','<source>New<ph id=\"2\"/></source>','<target/>','New','','initial','Y','S',5)");
            }
            db.commit();
            JSONObject page = AgentEdits.run(db,new JSONObject().put("action","read").put("limit",2));
            check(page.getBoolean("hasMore") && page.getInt("nextOffset")==2,"pagination");
            JSONObject first = edit(0,"<target>您好 &amp; 欢迎</target>");
            JSONObject valid = AgentEdits.run(db,batch("validate", first));
            check(!valid.getBoolean("applied") && row(0).getString("target").equals("<target>你好</target>"),"dry run");
            reject(batch("apply",first,edit(1,"<target>乙</target>")),"Inline tags");
            check(row(0).getString("target").equals("<target>你好</target>"),"atomic validation");
            reject(batch("apply",edit(2,"<target>changed</target>")),"locked");
            reject(batch("apply",edit(3,"<target>changed</target>")),"Confirmed");
            reject(batch("apply",first,first),"Duplicate");
            reject(batch("apply",edit(1,"<target>乙<ph id=\"9\"/></target>")),"Inline tags");
            reject(batch("apply",edit(0,"<target xml:space=\"preserve\">您好</target>")),"attributes");
            try { AgentEdits.run(db,batch("apply",edit(0,"<!DOCTYPE target [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><target>&x;</target>"))); throw new AssertionError("XXE"); }
            catch (org.xml.sax.SAXException expected) { checks++; }
            JSONObject applied = AgentEdits.run(db,batch("apply",first,edit(1,"<target>乙<ph id=\"1\"/></target>")));
            check(applied.getBoolean("applied") && call("history").getJSONArray("batches").length()==1,"history");
            try (Connection other = DriverManager.getConnection("jdbc:sqlite:"+path); Statement st=other.createStatement(); ResultSet rs=st.executeQuery("SELECT targetText FROM segments WHERE segId='1'")) {
                check(rs.next() && rs.getString(1).equals("您好 & 欢迎"),"durable Unicode and entity text");
            }
            reject(batch("apply",first),"Conflict");
            AgentEdits.run(db,new JSONObject().put("action","undo").put("batchId",applied.getString("batchId")));
            check(row(0).getString("target").equals("<target>你好</target>"),"undo");
            JSONObject confirmed = AgentEdits.run(db,batch("apply",edit(3,"<target>已改</target>")).put("includeConfirmed",true));
            check(row(3).getString("state").equals("translated"),"demote confirmation");
            AgentEdits.run(db,new JSONObject().put("action","undo").put("batchId",confirmed.getString("batchId")));
            check(row(3).getString("state").equals("final"),"restore confirmation");
            JSONObject fresh = AgentEdits.run(db,batch("apply",edit(4,"<target>新<ph id=\"2\"/></target>")));
            AgentEdits.run(db,new JSONObject().put("action","undo").put("batchId",fresh.getString("batchId")));
            check(row(4).getString("target").equals("<target/>"),"restore empty target");
            JSONObject a = AgentEdits.run(db,batch("apply",edit(0,"<target>A</target>")));
            AgentEdits.run(db,batch("apply",edit(0,"<target>B</target>")));
            reject(new JSONObject().put("action","undo").put("batchId",a.getString("batchId")),"Conflict");
            // Force a write failure after the first row has been updated; all rows and history roll back.
            try (Statement st=db.createStatement()) { st.execute("CREATE TRIGGER fail_edit BEFORE UPDATE ON segments WHEN NEW.targetText='FAIL' BEGIN SELECT RAISE(ABORT,'forced failure'); END"); }
            db.commit();
            int history = call("history").getJSONArray("batches").length();
            try { AgentEdits.run(db,batch("apply",edit(0,"<target>C</target>"),edit(1,"<target>FAIL<ph id=\"1\"/></target>"))); throw new AssertionError("Expected SQL failure"); }
            catch (SQLException expected) { checks++; }
            check(row(0).getString("target").equals("<target>B</target>") && call("history").getJSONArray("batches").length()==history,"rollback on write failure");
            System.out.println("AgentEdits: " + checks + " checks passed");
        } finally { Files.deleteIfExists(path); }
    }
}
