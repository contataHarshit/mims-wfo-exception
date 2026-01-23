import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConstantService } from "./constant.service";
import { ToastrService } from "ngx-toastr";
import { throwError } from "rxjs";
import { timeout, catchError } from "rxjs/operators";
import { Environment } from "../environments/environment";
@Injectable({
  providedIn: "root",
})
export class HttpService {
  constructor(
    private http: HttpClient,
    private constants: ConstantService,
    private toastr: ToastrService,
  ) {}

  /**
   * 🔐 Auth API (session-based login)
   * This bypasses the interceptor — we manually set headers here.
   */
  auth(url: string, body: { sessionid: string }): Observable<any> {
    const headers = new HttpHeaders({
      sessionid: body.sessionid,
    });

    return this.http.post(url, {}, { headers }).pipe(
      timeout(20000),
      catchError((error) => {
        const isTimeout = error?.name === "TimeoutError";
        const is404 = error?.status === 404;

        if (isTimeout || is404) {
          this.toastr.error(
            isTimeout
              ? "Session timeout. Redirecting to mims…"
              : "Session expired. Redirecting to mims…",
            "Authentication Error",
            {
              timeOut: 3000,
              progressBar: true,
              closeButton: true,
              tapToDismiss: false,
            },
          );

          // ⏳ Redirect AFTER toast finishes
          setTimeout(() => {
            localStorage.clear();
            window.location.href = Environment.redirectURL;
          }, 3000);
        }

        return throwError(() => error);
      }),
    );
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
