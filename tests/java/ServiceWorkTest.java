import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;
import org.json.*;
import com.maxprograms.swordfish.BusinessStore;

public class ServiceWorkTest {
 static int checks;
 static void check(boolean v,String m){checks++;if(!v)throw new AssertionError(m);}
 static JSONObject call(JSONObject r)throws Exception{return BusinessStore.execute(r);}
 static JSONObject op(String name,JSONObject row){return new JSONObject().put("op",name).put("id",row.getString("id")).put("revision",row.getInt("revision"));}
 static void reject(JSONObject r,String msg)throws Exception{try{call(r);throw new AssertionError("Expected "+msg);}catch(IllegalArgumentException e){check(e.getMessage().contains(msg),e.getMessage());}}
 public static void main(String[]args)throws Exception {
  Path home=Files.createTempDirectory("service-work-");System.setProperty("user.home",home.toString());
  try {
   JSONObject client=call(new JSONObject().put("op","client-save").put("client",new JSONObject().put("name","Service client"))).getJSONObject("client");
   JSONObject row=call(new JSONObject().put("op","save").put("intake",new JSONObject().put("orderKind","service").put("name","Interpreting").put("clientId",client.getString("id")).put("service","interpreting").put("deadline","2026-10-23T17:00:00+08:00"))).getJSONObject("intake");
   check(!row.getJSONArray("missing").toString().contains("files"),"no files required");
   JSONObject price=new JSONObject().put("basis","hours").put("currency","CNY").put("rate","180.00").put("per",1).put("rounding","exact");
   JSONObject rate=call(new JSONObject().put("op","rate-save").put("rate",new JSONObject().put("name","Client interpreting").put("clientId",client.getString("id")).put("service","interpreting").put("pricing",price))).getJSONObject("rate");
   row=call(op("quote",row).put("rateId",rate.getString("id")).put("pricing",new JSONObject().put("quantity","2.5").put("countConfirmed",true))).getJSONObject("intake");
   JSONObject quote=row.getJSONArray("quotes").getJSONObject(0);check(quote.getString("total").equals("450.00"),"fractional hours quoted");check(quote.getString("quantitySource").equals("manual-confirmed"),"manual basis recorded");
   rate.put("pricing",new JSONObject(price.toString()).put("rate","200.00"));call(new JSONObject().put("op","rate-save").put("rate",rate));
   check(quote.getJSONObject("rateSnapshot").getJSONObject("pricing").getString("rate").equals("180.00"),"quote retains old rate");
   row=call(op("confirm-quote",row).put("quoteId",quote.getString("id"))).getJSONObject("intake");
   row=call(new JSONObject().put("op","save").put("intake",new JSONObject().put("id",row.getString("id")).put("revision",row.getInt("revision")).put("requirementsConfirmed",true))).getJSONObject("intake");
   row=call(op("confirm-order",row)).getJSONObject("intake");check(row.has("orderConfirmedAt")&&!row.has("projectId"),"standalone order confirmed without CAT");
   reject(op("create",row),"Service orders");
   check(row.getJSONObject("work").isNull("contractHourly"),"zero hours null");
   JSONObject entry=new JSONObject().put("id",UUID.randomUUID().toString()).put("date",LocalDate.now().toString()).put("minutes",150).put("activity","Interpreting");
   JSONObject request=op("time-add",row).put("entry",entry);row=call(request).getJSONObject("intake");
   check(call(request).getJSONObject("intake").getJSONArray("timeEntries").length()==1,"time idempotency");
   check(row.getJSONObject("work").getString("contractHourly").equals("180.00"),"contract hourly");
   JSONObject payment=new JSONObject().put("id",UUID.randomUUID().toString()).put("date",LocalDate.now().toString()).put("amount","90.00").put("currency","CNY");
   row=call(op("payment",row).put("payment",payment)).getJSONObject("intake");check(row.getJSONObject("work").getString("receivedHourly").equals("36.00"),"received hourly independent");
   reject(op("time-void",row).put("entryId",entry.getString("id")).put("reason",""),"reason");
   row=call(op("time-void",row).put("entryId",entry.getString("id")).put("reason","Duplicate work record")).getJSONObject("intake");
   check(row.getJSONObject("work").getInt("minutes")==0&&row.getJSONArray("timeEntries").getJSONObject(0).has("voidedAt"),"void retains audit");
   reject(new JSONObject().put("op","save").put("intake",new JSONObject().put("id",row.getString("id")).put("revision",row.getInt("revision")).put("orderKind","cat")),"scope frozen");
   JSONObject expired=new JSONObject().put("name","Old").put("validTo","2000-01-01").put("pricing",price);
   expired=call(new JSONObject().put("op","rate-save").put("rate",expired)).getJSONObject("rate");
   reject(op("quote",row).put("rateId",expired.getString("id")).put("pricing",new JSONObject().put("quantity","1").put("countConfirmed",true)),"expired");
   for(String basis:List.of("pages","minutes","items","fixed")){
    JSONObject p=new JSONObject(price.toString()).put("basis",basis).put("quantity","3").put("countConfirmed",true);
    check(BusinessStore.calculate(row,p).getString("total").equals(basis.equals("fixed")?"180.00":"540.00"),"basis "+basis);
   }
   System.out.println("ServiceWork: "+checks+" checks passed");
  }finally{try(var paths=Files.walk(home)){for(Path p:paths.sorted(Comparator.reverseOrder()).toList())Files.delete(p);}}
 }
}
