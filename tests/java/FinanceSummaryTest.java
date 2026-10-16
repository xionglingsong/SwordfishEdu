import java.time.LocalDate;
import org.json.*;
import com.maxprograms.swordfish.FinanceSummary;

public class FinanceSummaryTest {
    static int checks;
    static void check(boolean ok,String message){checks++;if(!ok)throw new AssertionError(message);}
    static JSONObject order(String id,String currency,String delivery,String due,String paid,String paidDate){
        JSONObject row=new JSONObject().put("id",id).put("clientId","client").put("name",id).put("created","2026-09-01")
            .put("quotes",new JSONArray().put(new JSONObject().put("status","confirmed").put("total","1000.00").put("currency",currency)))
            .put("payments",new JSONArray()).put("deliveryStatus",delivery).put("paymentDueDate",due);
        if(!paid.equals("0"))row.getJSONArray("payments").put(new JSONObject().put("amount",paid).put("date",paidDate).put("currency",currency));
        return row;
    }
    static JSONObject total(JSONObject report,String currency){for(Object o:report.getJSONArray("totals")){JSONObject t=(JSONObject)o;if(t.getString("currency").equals(currency))return t;}throw new AssertionError("Missing currency");}
    public static void main(String[]args){
        JSONObject prepaid=order("prepaid","CNY","in-progress","2026-10-31","1000.00","2026-10-10");
        check(FinanceSummary.balance(prepaid).getString("paymentStatus").equals("paid"),"fully paid");check(prepaid.getString("deliveryStatus").equals("in-progress"),"prepay does not deliver");
        JSONObject open=order("open","CNY","delivered","2026-10-31","300.00","2026-10-15");
        JSONObject overdue=order("late","CNY","delivered","2026-10-01","0","");
        JSONObject unknown=order("legacy","USD","unknown","","0","");unknown.remove("deliveryStatus");
        JSONObject data=new JSONObject().put("clients",new JSONArray().put(new JSONObject().put("id","client").put("name","Customer")))
            .put("intakes",new JSONArray().put(prepaid).put(open).put(overdue).put(unknown));
        JSONObject request=new JSONObject().put("from","2026-10-01").put("to","2026-10-31").put("timeZone","Asia/Shanghai");
        JSONObject report=FinanceSummary.summarize(data,request,LocalDate.of(2026,10,16));
        check(report.getJSONArray("totals").length()==2,"separate currencies");
        check(total(report,"CNY").getString("periodReceived").equals("1300.00"),"receipt dates, not creation dates");
        check(total(report,"CNY").getString("overdue").equals("1000.00"),"future due not overdue");
        check(total(report,"CNY").getString("deliveredOutstanding").equals("1700.00"),"partial payment outstanding");
        check(total(report,"USD").getString("unknownDue").equals("1000.00"),"unknown dates explicit");
        check(total(report,"USD").getString("unknownDeliveryOutstanding").equals("1000.00"),"legacy not inferred delivered");
        check(report.getJSONArray("groups").length()==2,"client currency groups");
        check(report.getInt("unknownDeliveryCount")==1,"legacy count");
        JSONObject today=FinanceSummary.summarize(data,request,LocalDate.of(2026,10,31));
        check(total(today,"CNY").getString("overdue").equals("1000.00"),"due today not overdue");
        JSONObject november=FinanceSummary.summarize(data,new JSONObject(request.toString()).put("from","2026-11-01").put("to","2026-11-02"),LocalDate.of(2026,11,2));
        check(total(november,"CNY").getString("overdue").equals("1700.00"),"overdue after due date");
        check(total(november,"CNY").getString("periodReceived").equals("0.00"),"outside date range excluded");
        check(FinanceSummary.balance(new JSONObject().put("quotes",new JSONArray()).put("payments",new JSONArray())).getString("paymentStatus").equals("unquoted"),"no quote is not paid");
        try{FinanceSummary.summarize(data,new JSONObject(request.toString()).put("to","2026-09-01"),LocalDate.now());throw new AssertionError("range accepted");}catch(IllegalArgumentException expected){checks++;}
        System.out.println("FinanceSummary: "+checks+" checks passed");
    }
}
