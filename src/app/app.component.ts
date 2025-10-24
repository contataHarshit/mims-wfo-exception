import { Component, DoCheck, OnInit, Inject, PLATFORM_ID } from "@angular/core";
import {
  Router,
  RouterOutlet,
  ActivatedRoute,
  NavigationEnd,
  Event as RouterEvent,
} from "@angular/router";
import { HeaderComponent } from "../components/header/header.component";
import { CommonService } from "../service/common.service";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { HttpService } from "../service/http.service";
import { ConstantService } from "../service/constant.service";
import { HttpClientModule } from "@angular/common/http";
import { CommonLoaderComponent } from "../common/common-loader/common-loader.component";
import { filter } from "rxjs/operators";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    CommonModule,
    HttpClientModule,
    FormsModule,
    CommonLoaderComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements DoCheck, OnInit {
  title = "Mims-exception-wfo";

  tabs = [
    { label: "Create WFO Exception Request", path: "", isActive: false },
    { label: "WFO Dashboard", path: "dashboard", isActive: false },
  ];

  jwtToken: string | null = null;
  role = "";
  isDashboardPage = false;

  selectedView: "self" | "resource" = "self"; // Persist select value

  constructor(
    public commonService: CommonService,
    private router: Router,
    private http: HttpService,
    private constants: ConstantService,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Track route changes and maintain tab active
    this.router.events
      .pipe(
        filter(
          (event: RouterEvent): event is NavigationEnd =>
            event instanceof NavigationEnd
        )
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        this.isDashboardPage = url.includes("dashboard");
        this.updateActiveTabs(url);
      });

    // Restore selected view if saved
    const savedView = localStorage.getItem("selectedView") as
      | "self"
      | "resource"
      | null;
    if (savedView) this.selectedView = savedView;

    const storedToken = localStorage.getItem("jwtToken");

    this.route.queryParams.subscribe((params) => {
      const sessionId = params["sessionid"];

      if (!storedToken && sessionId) {
        this.http
          .auth(this.constants.auth, { sessionid: sessionId })
          .subscribe({
            next: (response: any) => {
              const employee = response?.data?.employee || {};
              this.jwtToken = response?.data?.token || null;

              Object.keys(employee).forEach((key) => {
                localStorage.setItem(key, employee[key]);
              });

              if (this.jwtToken)
                localStorage.setItem("jwtToken", this.jwtToken);

              this.loadEmployeeData();
            },
            error: (err) => console.error("Auth API Error:", err),
          });
      } else {
        this.jwtToken = storedToken;
        this.commonService.userDataLoaded$.next();
        this.loadEmployeeData();
        this.role = localStorage.getItem("role") || "";
        if (this.role === "MANAGER") this.loadManagerData();
        else if (this.role === "HR") this.loadAllEmployeeData();
      }
    });
  }

  loadAllEmployeeData() {
    this.http.getData(this.constants.allEmployeeData).subscribe({
      next: (res: any) =>
        localStorage.setItem(
          "allEmployeeData",
          JSON.stringify(res.data.employees || [])
        ),
      error: (err) => console.error("All Employee Data API Error:", err),
    });
  }

  loadManagerData() {
    this.http.getData(this.constants.mangerEmployeeData).subscribe({
      next: (res: any) =>
        localStorage.setItem(
          "managerEmployeeData",
          JSON.stringify(res.data.employees || [])
        ),
      error: (err) => console.error("Manager Employee Data API Error:", err),
    });
  }

  loadEmployeeData() {
    this.http.getData(this.constants.employeeData).subscribe({
      next: (res: any) => {
        localStorage.setItem(
          "projectManager",
          res?.data?.employee?.managerName?.name || ""
        );
        localStorage.setItem(
          "projectName",
          JSON.stringify(res?.data?.employee?.projects || [])
        );
        this.commonService.userDataLoaded$.next();
      },
      error: (err) => console.error("Employee Data API Error:", err),
    });
  }

  ngDoCheck(): void {
    // Ensure tabs are active on refresh
    this.tabs.forEach((tab) => {
      tab.isActive = this.isActive(tab.path);
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path], { queryParamsHandling: "preserve" }); // Maintain query params
  }

  isActive(path: string): boolean {
    const currentUrl = this.router.url.split("?")[0].replace(/^\/+/, ""); // remove query params and leading slash
    const cleanedPath = path.replace(/^\/+/, "");

    if (cleanedPath === "") {
      // Default tab
      return (
        currentUrl === "" ||
        currentUrl.startsWith("create-wfo-exception-request")
      );
    }

    return (
      currentUrl === cleanedPath || currentUrl.startsWith(cleanedPath + "/")
    );
  }

  updateActiveTabs(url: string) {
    const currentUrl = url.split("?")[0].replace(/^\/+/, ""); // remove query params
    this.tabs.forEach((tab) => {
      const path = tab.path.replace(/^\/+/, "");
      tab.isActive =
        path === ""
          ? currentUrl === "" ||
            currentUrl.startsWith("create-wfo-exception-request")
          : currentUrl === path || currentUrl.startsWith(path + "/");
    });
  }

  onViewChange(event: any) {
    this.selectedView = event.target.value;
    localStorage.setItem("selectedView", this.selectedView); // Persist selection
    this.commonService.viewChange(event);
  }
}
