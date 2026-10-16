package com.maxprograms.swordfish;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Set;
import org.json.*;

/** Explicit manual quantities, rate references and work-time accounting. */
public final class ServiceWork {
    private ServiceWork() { }
    public static final Set<String> BASES=Set.of("words","characters","han","fixed","hours","pages","minutes","items");
    public static BigDecimal quantity(String text) {
        if(!text.matches("(?:0|[1-9][0-9]{0,11})(?:\\.[0-9]{1,3})?"))throw new IllegalArgumentException("Quantity must be a nonnegative decimal with up to three places");
        return new BigDecimal(text);
    }
    public static void validatePricing(JSONObject p) {
        if(!BASES.contains(p.getString("basis")))throw new IllegalArgumentException("Unknown counting basis");
        if(!Set.of("CNY","USD","EUR","GBP","HKD","AUD","CAD").contains(p.getString("currency")))throw new IllegalArgumentException("Unsupported currency");
        for(String key:ListKeys.MONEY) {
            String value=p.optString(key,"0");
            if(!value.matches("(?:0|[1-9][0-9]{0,11})(?:\\.[0-9]{1,2})?"))throw new IllegalArgumentException("Invalid monetary value: "+key);
        }
        if(p.getInt("per")!=1&&p.getInt("per")!=1000)throw new IllegalArgumentException("per must be 1 or 1000");
        if(!Set.of("exact","ceil-block").contains(p.getString("rounding")))throw new IllegalArgumentException("Unknown rounding");
    }
    private static final class ListKeys {static final String[] MONEY={"rate","minimum","surcharge","discount"};}
    public static void validateRate(JSONObject rate) {
        if(rate.getString("name").isBlank())throw new IllegalArgumentException("Rate name required");
        validatePricing(rate.getJSONObject("pricing"));
        String from=rate.optString("validFrom"),to=rate.optString("validTo");
        if(!from.isEmpty())LocalDate.parse(from);if(!to.isEmpty())LocalDate.parse(to);
        if(!from.isEmpty()&&!to.isEmpty()&&to.compareTo(from)<0)throw new IllegalArgumentException("Rate validity dates reversed");
    }
    public static void checkRate(JSONObject rate,JSONObject row,LocalDate date) {
        if(!rate.optBoolean("active",true))throw new IllegalArgumentException("Rate is inactive");
        if(!rate.optString("validFrom").isEmpty()&&date.isBefore(LocalDate.parse(rate.getString("validFrom"))))throw new IllegalArgumentException("Rate is not yet effective");
        if(!rate.optString("validTo").isEmpty()&&date.isAfter(LocalDate.parse(rate.getString("validTo"))))throw new IllegalArgumentException("Rate has expired");
        for(String key:new String[]{"clientId","service","srcLang","tgtLang"})if(!rate.optString(key).isBlank()&&!rate.getString(key).equals(row.optString(key)))throw new IllegalArgumentException("Rate scope mismatch: "+key);
    }
    public static JSONObject workSummary(JSONObject row) {
        long minutes=0;
        for(Object o:row.optJSONArray("timeEntries",new JSONArray())) {JSONObject e=(JSONObject)o;if(!e.has("voidedAt"))minutes=Math.addExact(minutes,e.getInt("minutes"));}
        JSONObject balance=FinanceSummary.balance(row);
        JSONObject result=new JSONObject().put("minutes",minutes).put("hours",BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60),2,RoundingMode.HALF_UP).toPlainString()).put("currency",balance.getString("currency"));
        for(String key:new String[]{"due","paid"}) {
            String field=key.equals("due")?"contractHourly":"receivedHourly";
            result.put(field,minutes==0||balance.getString("currency").isEmpty()?JSONObject.NULL:new BigDecimal(balance.getString(key)).multiply(BigDecimal.valueOf(60)).divide(BigDecimal.valueOf(minutes),2,RoundingMode.HALF_UP).toPlainString());
        }
        return result;
    }
}
