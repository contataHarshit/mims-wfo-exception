import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpEvent,
} from "@angular/common/http";
import { catchError, tap, timeout } from "rxjs/operators";
import { throwError } from "rxjs";
import { inject } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { Environment } from "../environments/environment";

const API_TIMEOUT = 20000; // 20 sec

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);

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
    timeout(API_TIMEOUT),

    tap({
      next: (_event: HttpEvent<any>) => {
        // success – nothing to do
      },
    }),

    catchError((error: any) => {
      const is401 =
        error instanceof HttpErrorResponse && error.status === 401;

      const isNetwork =
        error instanceof HttpErrorResponse && error.status === 0;

      const isTimeout = error?.name === "TimeoutError";

      if (is401 || isNetwork || isTimeout) {
        toastr.error(
          isTimeout
            ? "Session timeout. Redirecting to mims…"
            : "Session expired. Redirecting to mims…",
          "Authentication Error",
          {
            timeOut: 3000,
            progressBar: true,
            closeButton: true,
            tapToDismiss: false,
          }
        );

        // ⏳ Redirect AFTER toast finishes
        setTimeout(() => {
          localStorage.clear();
          window.location.href = Environment.redirectURL;
        }, 3000);
      }

      return throwError(() => error);
    })
  );
};
