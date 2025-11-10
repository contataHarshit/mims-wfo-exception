import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConstantService } from "./constant.service";

@Injectable({
  providedIn: "root",
})
export class HttpService {
  constructor(private http: HttpClient, private constants: ConstantService) {}

  /**
   * 🔐 Auth API (session-based login)
   * This bypasses the interceptor — we manually set headers here.
   */
  auth(url: string, body: { sessionid: string }): Observable<any> {
    const headers = new HttpHeaders({
      sessionid: body.sessionid,
    });
    return this.http.post(url, {}, { headers });
  }

  /**
   * ✅ POST request — interceptor automatically adds JWT headers
   */
  postData(data: any, url: string): Observable<any> {
    return this.http.post(url, data);
  }

  /**
   * ✅ PUT request — interceptor automatically adds JWT headers
   */
  putData(url: string, data: any): Observable<any> {
    return this.http.put(url, data);
  }

  /**
   * ✅ GET request — interceptor automatically adds JWT headers
   */
  getData(url: string): Observable<any> {
    return this.http.get(url);
  }
  deleteData(url: string): Observable<any> {
    return this.http.delete(url);
  }
}
