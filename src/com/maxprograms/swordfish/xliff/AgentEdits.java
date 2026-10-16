package com.maxprograms.swordfish.xliff;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.TreeMap;
import java.util.UUID;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.json.JSONArray;
import org.json.JSONObject;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

/** Agent operations use the live store connection, never a second SQLite writer. */
public final class AgentEdits {
    private AgentEdits() { }

    public static JSONObject run(Connection conn, JSONObject request) throws Exception {
        return switch (request.getString("action")) {
            case "read" -> read(conn, request);
            case "validate", "apply" -> change(conn, request, false);
            case "undo" -> undo(conn, request);
            case "history" -> history(conn);
            default -> throw new IllegalArgumentException("Unknown agent action");
        };
    }

    private static JSONObject row(ResultSet rs) throws Exception {
        JSONObject row = new JSONObject();
        for (String key : List.of("file", "unit", "segment", "source", "target", "state", "translate")) {
            row.put(key, rs.getString(key));
        }
        row.put("revision", revision(row));
        return row;
    }

    private static String revision(JSONObject row) throws Exception {
        JSONArray fields = new JSONArray();
        for (String key : List.of("file", "unit", "segment", "source", "target", "state", "translate")) {
            fields.put(row.getString(key));
        }
        return digest(fields.toString());
    }

    private static String digest(String value) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    private static final String COLUMNS = "file, unitId AS unit, segId AS segment, source, target, state, translate";

    private static JSONObject read(Connection conn, JSONObject request) throws Exception {
        int offset = request.optInt("offset", 0);
        int limit = request.optInt("limit", 100);
        if (offset < 0 || limit < 1 || limit > 500) {
            throw new IllegalArgumentException("offset >= 0; limit must be 1..500");
        }
        JSONArray rows = new JSONArray();
        try (PreparedStatement stmt = conn.prepareStatement("SELECT " + COLUMNS
                + " FROM segments WHERE type='S' ORDER BY file, child, unitId, segId LIMIT ? OFFSET ?")) {
            stmt.setInt(1, limit + 1);
            stmt.setInt(2, offset);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) rows.put(row(rs));
            }
        }
        boolean hasMore = rows.length() > limit;
        if (hasMore) rows.remove(limit);
        return new JSONObject().put("segments", rows).put("hasMore", hasMore)
                .put("nextOffset", offset + rows.length());
    }

    private static JSONObject current(Connection conn, JSONObject edit) throws Exception {
        try (PreparedStatement stmt = conn.prepareStatement("SELECT " + COLUMNS
                + " FROM segments WHERE type='S' AND file=? AND unitId=? AND segId=?")) {
            stmt.setString(1, edit.getString("file"));
            stmt.setString(2, edit.getString("unit"));
            stmt.setString(3, edit.getString("segment"));
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) throw new IllegalArgumentException("Segment does not exist: " + edit.getString("segment"));
                return row(rs);
            }
        }
    }

    private static Element parse(String xml, String root) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        var document = factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
        Element element = document.getDocumentElement();
        if (!root.equals(element.getTagName()) || document.getChildNodes().getLength() != 1) {
            throw new IllegalArgumentException("Expected a single <" + root + "> element without comments or instructions");
        }
        return element;
    }

    private static String attributes(Element element) {
        TreeMap<String, String> attrs = new TreeMap<>();
        var nodes = element.getAttributes();
        for (int i = 0; i < nodes.getLength(); i++) attrs.put(nodes.item(i).getNodeName(), nodes.item(i).getNodeValue());
        return new JSONObject(attrs).toString();
    }

    // Preserve tag identity, attributes, order and nesting. Text may change only in text containers.
    private static String skeleton(Element element) {
        StringBuilder result = new StringBuilder();
        for (Node node = element.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node instanceof Element child) {
                result.append('<').append(child.getTagName()).append(attributes(child)).append('>');
                result.append(skeleton(child));
                if (!Set.of("pc", "mrk", "g", "sub").contains(child.getTagName())) {
                    result.append(new JSONArray().put(child.getTextContent()));
                }
                result.append("</").append(child.getTagName()).append('>');
            } else if (node.getNodeType() != Node.TEXT_NODE && node.getNodeType() != Node.CDATA_SECTION_NODE) {
                throw new IllegalArgumentException("Comments and processing instructions are not accepted in targets");
            }
        }
        return result.toString();
    }

    private static String validateTarget(JSONObject before, String xml, boolean restoring) throws Exception {
        Element target = parse(xml, "target");
        Element old = parse(before.getString("target").isBlank() ? "<target/>" : before.getString("target"), "target");
        Element source = parse(before.getString("source"), "source");
        String targetSkeleton = skeleton(target);
        String baseline = skeleton(old);
        if (baseline.isEmpty()) baseline = skeleton(source);
        // Undo restores a previously recorded target, including initially empty translations.
        if (!restoring && (!baseline.equals(targetSkeleton) || !attributes(old).equals(attributes(target)))) {
            throw new IllegalArgumentException("Inline tags, nesting, order or target attributes changed");
        }
        String plain = XliffUtils.pureText(XliffUtils.buildElement(xml));
        if (!restoring && plain.isBlank()) throw new IllegalArgumentException("Empty target is not accepted");
        return plain;
    }

    private static void ensureHistory(Connection conn) throws SQLException {
        try (var stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE IF NOT EXISTS agent_edits (id TEXT PRIMARY KEY, created TEXT NOT NULL, payload TEXT NOT NULL)");
        }
    }

    private static boolean hasHistory(Connection conn) throws SQLException {
        try (var stmt = conn.createStatement(); var rs = stmt.executeQuery(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='agent_edits'")) {
            return rs.next();
        }
    }

    private static JSONObject change(Connection conn, JSONObject request, boolean restoring) throws Exception {
        JSONArray edits = request.getJSONArray("edits");
        if (edits.isEmpty() || edits.length() > 200) throw new IllegalArgumentException("Batch must contain 1..200 edits");
        Set<String> seen = new HashSet<>();
        JSONArray changes = new JSONArray();
        List<String> plainTexts = new ArrayList<>();
        for (int i = 0; i < edits.length(); i++) {
            JSONObject edit = edits.getJSONObject(i);
            String key = new JSONArray().put(edit.getString("file")).put(edit.getString("unit"))
                    .put(edit.getString("segment")).toString();
            if (!seen.add(key)) throw new IllegalArgumentException("Duplicate segment in batch");
            JSONObject before = current(conn, edit);
            if (!before.getString("revision").equals(edit.getString("revision"))) {
                throw new IllegalArgumentException("Conflict: source, target or state changed for " + key);
            }
            if (!"Y".equals(before.getString("translate"))) throw new IllegalArgumentException("Segment is locked: " + key);
            if (!restoring && "final".equals(before.getString("state")) && !request.optBoolean("includeConfirmed", false)) {
                throw new IllegalArgumentException("Confirmed segment requires includeConfirmed: " + key);
            }
            String target = edit.getString("target");
            String plain = validateTarget(before, target, restoring);
            if (target.equals(before.getString("target")) && !restoring) continue;
            JSONObject after = new JSONObject(before.toString());
            after.put("target", target).put("state", restoring ? edit.getString("restoreState") : "translated");
            after.remove("revision");
            after.put("revision", revision(after));
            changes.put(new JSONObject().put("before", before).put("after", after).put("reason", edit.optString("reason", "")));
            plainTexts.add(plain);
        }
        JSONObject result = new JSONObject().put("changes", changes).put("count", changes.length());
        if ("validate".equals(request.getString("action"))) return result.put("applied", false);
        if (changes.isEmpty()) return result.put("applied", false);
        var savepoint = conn.setSavepoint();
        String batchId = UUID.randomUUID().toString();
        try {
            ensureHistory(conn);
            try (PreparedStatement stmt = conn.prepareStatement(
                    "UPDATE segments SET target=?, targetText=?, state=? WHERE type='S' AND file=? AND unitId=? AND segId=?")) {
                for (int i = 0; i < changes.length(); i++) {
                    JSONObject after = changes.getJSONObject(i).getJSONObject("after");
                    stmt.setString(1, after.getString("target"));
                    stmt.setString(2, plainTexts.get(i));
                    stmt.setString(3, after.getString("state"));
                    stmt.setString(4, after.getString("file"));
                    stmt.setString(5, after.getString("unit"));
                    stmt.setString(6, after.getString("segment"));
                    if (stmt.executeUpdate() != 1) throw new SQLException("Segment disappeared");
                }
            }
            String created = java.time.Instant.now().toString();
            result.put("batchId", batchId).put("created", created).put("instruction", request.optString("instruction", ""));
            try (PreparedStatement stmt = conn.prepareStatement("INSERT INTO agent_edits VALUES (?, ?, ?)")) {
                stmt.setString(1, batchId);
                stmt.setString(2, created);
                stmt.setString(3, result.toString());
                stmt.executeUpdate();
            }
            conn.releaseSavepoint(savepoint);
            conn.commit();
            return result.put("applied", true);
        } catch (Exception e) {
            conn.rollback();
            throw e;
        }
    }

    private static JSONObject undo(Connection conn, JSONObject request) throws Exception {
        if (!hasHistory(conn)) throw new IllegalArgumentException("No agent history");
        JSONObject batch;
        try (PreparedStatement stmt = conn.prepareStatement("SELECT payload FROM agent_edits WHERE id=?")) {
            stmt.setString(1, request.getString("batchId"));
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) throw new IllegalArgumentException("Unknown batchId");
                batch = new JSONObject(rs.getString(1));
            }
        }
        JSONArray edits = new JSONArray();
        for (Object entry : batch.getJSONArray("changes")) {
            JSONObject item = (JSONObject) entry;
            JSONObject before = item.getJSONObject("before");
            JSONObject edit = new JSONObject(item.getJSONObject("after").toString());
            edit.put("target", before.getString("target")).put("restoreState", before.getString("state"));
            edits.put(edit);
        }
        return change(conn, new JSONObject().put("action", "apply").put("edits", edits)
                .put("instruction", "Undo " + request.getString("batchId")), true);
    }

    private static JSONObject history(Connection conn) throws SQLException {
        JSONArray batches = new JSONArray();
        if (hasHistory(conn)) {
            try (var stmt = conn.createStatement(); var rs = stmt.executeQuery(
                    "SELECT payload FROM agent_edits ORDER BY created DESC LIMIT 100")) {
                while (rs.next()) {
                    JSONObject batch = new JSONObject(rs.getString(1));
                    batch.remove("changes");
                    batches.put(batch);
                }
            }
        }
        return new JSONObject().put("batches", batches);
    }
}
