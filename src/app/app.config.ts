import { ApplicationConfig, importProvidersFrom } from "@angular/core";
import { provideRouter } from "@angular/router";
import { routes } from "./app.routes";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from "@angular/common/http"; // ✅ Add withInterceptors
import { AuthInterceptor } from "../interceptor/auth.interceptor";
import { ToastrModule } from "ngx-toastr";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch(), // ✅ Keep this for SSR support
      withInterceptors([AuthInterceptor]) // ✅ Add your interceptor here
    ),
    provideAnimationsAsync(),
        importProvidersFrom(
      ToastrModule.forRoot({
        timeOut: 3000,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        enableHtml: true, // ✅ for your HTML messages
      })
    ),
  ],

};
