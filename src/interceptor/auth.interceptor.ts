import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpEvent,
} from "@angular/common/http";
import { catchError, tap } from "rxjs/operators";
import { throwError, Observable } from "rxjs";
import { Environment } from "../environments/environment";

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  console.log("🔵 Interceptor fired for:", req.url);

  // Skip auth endpoint and local assets
  if (req.url.includes("auth") || req.url.includes("/assets/")) {
    console.log("⚠️ Skipping interceptor for:", req.url);
    return next(req);
  }

  const token = localStorage.getItem("token");

  if (token) {
    console.log("✅ Adding token to request:", req.url);
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  } else {
    console.log("⚠️ No token available for:", req.url);
  }

  return next(req).pipe(
    tap({
      next: (event: HttpEvent<any>) => {
        console.log("✅ Request successful for:", req.url);
      },
    }),
    catchError((error: HttpErrorResponse) => {
      console.error("🔴 ========== INTERCEPTOR ERROR ==========");
      console.error("🔴 URL:", req.url);
      console.error("🔴 Status:", error.status);
      console.error("🔴 Status Text:", error.statusText);
      console.error("🔴 Error:", error);
      console.error("🔴 =====================================");

      if (error.status === 401) {
        console.warn("🚫 401 Unauthorized detected!");
        console.warn("🧹 Clearing localStorage...");
        localStorage.clear();

        console.warn("🚀 Redirecting to:", Environment.redirectURL);

        // Small delay to ensure logs complete
        setTimeout(() => {
          window.open(Environment.redirectURL);
        }, 100);
      }

      return throwError(() => error);
    })
  );
};
