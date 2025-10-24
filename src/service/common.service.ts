import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CommonService {
  header: string = "WFO Exception Dashboard";
  employeeName: string = "User";
  employeeId: string = "";
  employeeNumber: string = "";
  employeeEmail: string = "";
  projectName: string = "";
  projectManager: string = "";
  userDataLoaded$ = new Subject<void>();
  loading = false;
  managerEmployeeData: any[] = [];
  currentView: string = "self";
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.employeeName = localStorage.getItem("name") || "User";
      this.employeeId = localStorage.getItem("employeeId") || "";
      this.employeeNumber = localStorage.getItem("employeeNumber") || "";
      this.employeeEmail = localStorage.getItem("email") || "";
      this.projectName = localStorage.getItem("projectName") || "";
      this.projectManager = localStorage.getItem("projectManager") || "";
    }
  }

viewChange$ = new Subject<string>(); // emits current view

  viewChange(event: any) {
    if (event.target.value === "self") {
      this.currentView = "self";
    } else {
      this.currentView = "resource";
    }
    this.viewChange$.next(this.currentView); // notify subscribers
  }
}
