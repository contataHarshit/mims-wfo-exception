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
    // Don't send token for auth API
    if (url.includes("auth")) {
      return new HttpHeaders();
    }

    // Get token from localStorage
    const token = localStorage.getItem("jwtToken");

    // Add Authorization header if token exists
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set("Authorization", `Bearer ${token}`);
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

  putData(id: string, data: any, url: string) {
    const headers = this.getAuthHeaders(url);
    const tempUrl = `${url}/${id}`;
    return this.http.put(tempUrl, data, { headers });
  }

  getData(url: string) {
    const headers = this.getAuthHeaders(url);
    return this.http.get(url, { headers });
  }
}
