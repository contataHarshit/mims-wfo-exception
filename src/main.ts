import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

// ✅ Merge animations + HTTP module into appConfig providers
bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    provideAnimations(), // 👈 enables PrimeNG popups (calendar, dropdown, dialog, etc.)
    importProvidersFrom(HttpClientModule),
  ],
}).catch((err) => console.error(err));
