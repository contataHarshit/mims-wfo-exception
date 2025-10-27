import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";
import { importProvidersFrom } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { HttpClientModule } from "@angular/common/http";
import { ToastrModule } from "ngx-toastr";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),

    // ✅ Import all required providers for Toastr + HTTP
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      ToastrModule.forRoot({
        timeOut: 3000,
        positionClass: "toast-top-right",
        preventDuplicates: true,
      })
    ),

    provideAnimations(),
  ],
}).catch((err) => console.error(err));
