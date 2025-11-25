import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { catchError } from "rxjs/operators";
import { throwError } from "rxjs";
import { Environment } from "../environments/environment";
export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip auth endpoint to avoid recursion
  if (req.url.includes("auth")) {
    return next(req);
  }

  const token = localStorage.getItem("token");

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  // ✅ Handle all errors globally
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || !localStorage.getItem("token")) {
        console.warn("🚫 Unauthorized (401) detected. Redirecting...");

        // ✅ Clear token and redirect to login (same tab)
        localStorage.removeItem("token");
        window.location.href = Environment.redirectURL;
      } else {
        console.error("❌ HTTP Error:", {
          status: error.status,
          message: error.message,
          url: req.url,
        });
      }

      return throwError(() => error);
    })
  );
};
