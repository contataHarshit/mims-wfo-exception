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
import { filter, firstValueFrom } from "rxjs";
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
  selectedView: "self" | "resource" = "self";

  constructor(
    public commonService: CommonService,
    private router: Router,
    private http: HttpService,
    private constants: ConstantService,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Track navigation
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects;
        this.isDashboardPage = url.includes("dashboard");
        this.updateActiveTabs(url);
      });

    // Restore view
    const savedView = localStorage.getItem("selectedView") || "self";
    this.selectedView = savedView as "self" | "resource";

    const storedToken = localStorage.getItem("jwtToken");
    const storedRole = localStorage.getItem("role");

    // Case 1: User already logged in
    if (storedToken && storedRole) {
      this.jwtToken = storedToken;
      this.role = storedRole;
      this.commonService.userDataLoaded$.next();
      await this.loadRoleSpecificData(storedRole);
      return;
    }

    // Case 2: No localStorage, but sessionid present (fresh login)
    this.route.queryParams.subscribe(async (params) => {
      const sessionId = params["sessionid"];
      if (!sessionId) return;

      try {
        const response: any = await firstValueFrom(
          this.http.auth(this.constants.auth, { sessionid: sessionId })
        );

        const employee = response?.data?.employee || {};
        this.jwtToken = response?.data?.token || null;

        // Save data in localStorage
        localStorage.setItem("jwtToken", this.jwtToken || "");
        localStorage.setItem("role", employee.role || "");
        localStorage.setItem("name", employee.name || "");
        localStorage.setItem("employeeNumber", employee.employeeNumber || "");
        localStorage.setItem("email", employee.email || "");

        this.role = employee.role || "";

        // Load additional role data
        await this.loadRoleSpecificData(this.role);

        // Notify app that user data is loaded
        this.commonService.userDataLoaded$.next();
      } catch (err) {
        console.error("Auth API Error:", err);
      }
    });
  }

  /** Load data based on user role */
  async loadRoleSpecificData(role: string) {
    if (role === "MANAGER") {
      await this.loadManagerData();
    } else if (role === "HR") {
      await this.loadAllEmployeeData();
    } else if (role === "ADMIN") {
      this.commonService.currentView = "resource";
    }
  }

  async loadAllEmployeeData() {
    try {
      const res: any = await firstValueFrom(this.http.getData(this.constants.allEmployeeData));
      localStorage.setItem("allEmployeeData", JSON.stringify(res.data.employees || []));
    } catch (err) {
      console.error("All Employee Data API Error:", err);
    }
  }

  async loadManagerData() {
    try {
      const res: any = await firstValueFrom(this.http.getData(this.constants.mangerEmployeeData));
      localStorage.setItem("managerEmployeeData", JSON.stringify(res.data.employees || []));
    } catch (err) {
      console.error("Manager Employee Data API Error:", err);
    }
  }

  ngDoCheck(): void {
    this.tabs.forEach((tab) => (tab.isActive = this.isActive(tab.path)));
  }

  navigateTo(path: string) {
    this.router.navigate([path], { queryParamsHandling: "preserve" });
  }

  isActive(path: string): boolean {
    const currentUrl = this.router.url.split("?")[0].replace(/^\/+/, "");
    const cleanedPath = path.replace(/^\/+/, "");
    if (cleanedPath === "") {
      return (
        currentUrl === "" || currentUrl.startsWith("create-wfo-exception-request")
      );
    }
    return currentUrl === cleanedPath || currentUrl.startsWith(cleanedPath + "/");
  }

  updateActiveTabs(url: string) {
    const currentUrl = url.split("?")[0].replace(/^\/+/, "");
    this.tabs.forEach((tab) => {
      const path = tab.path.replace(/^\/+/, "");
      tab.isActive =
        path === ""
          ? currentUrl === "" || currentUrl.startsWith("create-wfo-exception-request")
          : currentUrl === path || currentUrl.startsWith(path + "/");
    });
  }

  onViewChange(event: any) {
    this.selectedView = event.target.value;
    localStorage.setItem("selectedView", this.selectedView);
    this.commonService.viewChange(event);
  }
}
