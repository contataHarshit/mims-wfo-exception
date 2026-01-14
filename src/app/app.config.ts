import { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";
import { routes } from "./app.routes";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from "@angular/common/http"; // ✅ Add withInterceptors
import { AuthInterceptor } from "../interceptor/auth.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch(), // ✅ Keep this for SSR support
      withInterceptors([AuthInterceptor]) // ✅ Add your interceptor here
    ),
    provideAnimationsAsync(),
  ],
};
