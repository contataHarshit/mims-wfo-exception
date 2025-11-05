import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConstantService } from "./constant.service";

@Injectable({
  providedIn: "root",
})
export class HttpService {
  constructor(private http: HttpClient, private constants: ConstantService) {}

  private getAuthHeaders(url: string): HttpHeaders {
    if (url.includes("auth")) {
      return new HttpHeaders();
    }

    const token = localStorage.getItem("jwtToken");
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set("Authorization", `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZUlkIjoyLCJlbXBsb3llZU51bWJlciI6IkhLMTYwNSIsIm5hbWUiOiJEZXYgS3VtYXIiLCJyb2xlIjoiTUFOQUdFUiIsImlhdCI6MTc2MjAxMjA2MiwiZXhwIjoxNzYyMTg0ODYyfQ.zogDsAsyZkP7gyXQ5ybHbNZGlU_WXK2cb9Y2JCrr5yI`);
    }

    return headers;
  }

  auth(url: string, body: { sessionid: string }): Observable<any> {
    const headers = new HttpHeaders({
      sessionid: body.sessionid,
    });
    return this.http.post(url, {}, { headers });
  }

  postData(data: any, url: string) {
    const headers = this.getAuthHeaders(url);
    return this.http.post(url, data, { headers });
  }

  /**
   * ✅ Automatically uses the exceptionRequest URL from ConstantService
   * Example: PUT http://localhost:3000/api/exception-requests?id=123
   */
  putData(url: string, data: any): Observable<any> {
  
    const headers = this.getAuthHeaders(url);
    return this.http.put(url, data, { headers });
  }

  getData(url: string) {
    const headers = this.getAuthHeaders(url);
    return this.http.get(url, { headers });
  }
}
