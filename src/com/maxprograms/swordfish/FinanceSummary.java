package com.maxprograms.swordfish;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/** Derived views only: payment facts never change workflow or vice versa. */
public final class FinanceSummary {
    private FinanceSummary() { }

    public static JSONObject balance(JSONObject row) {
        BigDecimal contract=BigDecimal.ZERO,paid=BigDecimal.ZERO;
        String currency="";
        for(Object o:row.optJSONArray("quotes",new JSONArray())) {
            JSONObject quote=(JSONObject)o;
            if("confirmed".equals(quote.optString("status"))) {
                contract=new BigDecimal(quote.getString("total"));currency=quote.getString("currency");
            }
        }
        for(Object o:row.optJSONArray("payments",new JSONArray())) {
            JSONObject payment=(JSONObject)o;
            if(!currency.isEmpty() && !currency.equals(payment.getString("currency")))throw new IllegalArgumentException("Ledger currency mismatch");
            paid=paid.add(new BigDecimal(payment.getString("amount")));
        }
        BigDecimal remaining=contract.subtract(paid);
        String paymentStatus=currency.isEmpty()?"unquoted":remaining.signum()<=0?"paid":paid.signum()>0?"partial":"unpaid";
        return new JSONObject().put("currency",currency).put("due",amount(contract)).put("paid",amount(paid))
            .put("remaining",amount(remaining)).put("paymentStatus",paymentStatus);
    }

    public static JSONObject summarize(JSONObject data,JSONObject request,LocalDate today) {
        ZoneId.of(request.optString("timeZone","Asia/Shanghai"));
        LocalDate from=LocalDate.parse(request.optString("from",today.withDayOfMonth(1).toString()));
        LocalDate to=LocalDate.parse(request.optString("to",today.toString()));
        if(to.isBefore(from))throw new IllegalArgumentException("End date must not precede start date");
        Map<String,JSONObject> totals=new LinkedHashMap<>(),groups=new LinkedHashMap<>();
        Map<String,String> clients=new LinkedHashMap<>();
        for(Object o:data.getJSONArray("clients")){JSONObject c=(JSONObject)o;clients.put(c.getString("id"),c.getString("name"));}
        int unquoted=0,unknownDelivery=0;
        for(Object o:data.getJSONArray("intakes")) {
            JSONObject row=(JSONObject)o,b=balance(row);
            // Cashflow uses receipt date, independent of contract, delivery or creation date.
            for(Object p:row.optJSONArray("payments",new JSONArray())) {
                JSONObject payment=(JSONObject)p;LocalDate date=LocalDate.parse(payment.getString("date"));
                if(!date.isBefore(from)&&!date.isAfter(to)) {
                    JSONObject total=totals.computeIfAbsent(payment.getString("currency"),FinanceSummary::emptyTotals);
                    add(total,"periodReceived",new BigDecimal(payment.getString("amount")));
                }
            }
            String currency=b.getString("currency");if(currency.isEmpty()){unquoted++;continue;}
            JSONObject total=totals.computeIfAbsent(currency,FinanceSummary::emptyTotals);
            add(total,"contract",new BigDecimal(b.getString("due")));add(total,"received",new BigDecimal(b.getString("paid")));
            BigDecimal remaining=new BigDecimal(b.getString("remaining")).max(BigDecimal.ZERO);
            add(total,"outstanding",remaining);
            String delivery=row.optString("deliveryStatus","unknown");
            if(delivery.equals("unknown"))unknownDelivery++;
            if(remaining.signum()==0)continue;
            add(total,delivery.equals("delivered")?"deliveredOutstanding":delivery.equals("unknown")?"unknownDeliveryOutstanding":"undeliveredOutstanding",remaining);
            String dueDate=row.optString("paymentDueDate");
            long overdueDays=dueDate.isEmpty()?0:Math.max(0,ChronoUnit.DAYS.between(LocalDate.parse(dueDate),today));
            String dueStatus=dueDate.isEmpty()?"unknown":overdueDays>0?"overdue":LocalDate.parse(dueDate).equals(today)?"due-today":"not-due";
            if(overdueDays>0)add(total,"overdue",remaining);
            if(dueDate.isEmpty())add(total,"unknownDue",remaining);
            String clientId=row.optString("clientId");String key=new JSONArray().put(clientId).put(currency).toString();
            JSONObject group=groups.computeIfAbsent(key,k->new JSONObject().put("clientId",clientId).put("clientName",clients.getOrDefault(clientId,"未关联客户"))
                .put("currency",currency).put("outstanding","0.00").put("overdue","0.00").put("orders",new JSONArray()));
            add(group,"outstanding",remaining);if(overdueDays>0)add(group,"overdue",remaining);
            group.getJSONArray("orders").put(new JSONObject().put("id",row.getString("id")).put("name",row.optString("name","未命名委托"))
                .put("endClient",row.optString("endClient")).put("deliveryStatus",delivery).put("deliveredDate",row.optString("deliveredDate"))
                .put("paymentDueDate",dueDate).put("dueStatus",dueStatus).put("overdueDays",overdueDays).put("balance",b));
        }
        return new JSONObject().put("asOf",today.toString()).put("timeZone",request.optString("timeZone","Asia/Shanghai"))
            .put("from",from.toString()).put("to",to.toString()).put("totals",new JSONArray(totals.values())).put("groups",new JSONArray(groups.values()))
            .put("unquotedCount",unquoted).put("unknownDeliveryCount",unknownDelivery);
    }
    private static JSONObject emptyTotals(String currency) {
        JSONObject result=new JSONObject().put("currency",currency);
        for(String field:new String[]{"contract","received","outstanding","deliveredOutstanding","undeliveredOutstanding","unknownDeliveryOutstanding","overdue","unknownDue","periodReceived"})result.put(field,"0.00");
        return result;
    }
    private static String amount(BigDecimal value){return value.setScale(2).toPlainString();}
    private static void add(JSONObject row,String key,BigDecimal value){row.put(key,amount(new BigDecimal(row.getString(key)).add(value)));}
}
