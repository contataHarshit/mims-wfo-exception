import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { catchError } from "rxjs/operators";
import { throwError } from "rxjs";

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip auth endpoint to avoid recursion
  if (req.url.includes("auth")) {
    return next(req);
  }

  const token = localStorage.getItem("jwtToken");

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  // ✅ Handle all errors globally
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.warn("🚫 Unauthorized (401) detected. Redirecting...");

        // ✅ Clear token and redirect to login (same tab)
        localStorage.removeItem("jwtToken");
        window.location.href = "http://mimsqa/";
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
