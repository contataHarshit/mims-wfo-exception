import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpEvent,
} from "@angular/common/http";
import { catchError, tap, timeout } from "rxjs/operators";
import { throwError } from "rxjs";
import { Environment } from "../environments/environment";

const API_TIMEOUT = 20000; // ⏱ 20 seconds (adjust if needed)

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  console.log("🔵 Interceptor fired for:", req.url);

  // Skip auth & assets
  if (req.url.includes("auth") || req.url.includes("/assets/")) {
    return next(req);
  }

  const token = localStorage.getItem("token");

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    // ⏱️ HANDLE LONG PENDING REQUESTS
    timeout(API_TIMEOUT),

    tap({
      next: (event: HttpEvent<any>) => {
        console.log("✅ Request success:", req.url);
      },
    }),

    catchError((error: any) => {
      console.error("🔴 INTERCEPTOR ERROR:", error);

      const shouldRedirect =
        error instanceof HttpErrorResponse &&
        (
          error.status === 401 ||     // Unauthorized
          error.status === 0          // Network / CORS / fetch failed
        );

      // ⏱ TimeoutError does NOT have status
      const isTimeout =
        error.name === "TimeoutError";

      if (shouldRedirect || isTimeout) {
        console.warn("🚨 Redirect condition met");
        console.warn("➡ Redirecting to:", Environment.redirectURL);

        localStorage.clear();

        setTimeout(() => {
          window.location.href = Environment.redirectURL;
        }, 100);
      }

      return throwError(() => error);
    })
  );
};
