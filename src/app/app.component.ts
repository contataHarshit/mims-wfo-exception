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

    this.commonService.setLoading(true);

    // Track navigation
this.router.events
  .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
  .subscribe((event) => {
    const url = event.urlAfterRedirects;
    console.log("url---------",url);
    console.log("rrrrrrrrrrrrrrrr",this.router.url);
    
    this.isDashboardPage = url.split('?')[0].split('-')[0].includes("dashboard");
    this.updateActiveTabs(url);
  });

// 👇 Detect current route immediately
const currentUrl = this.router.url;
this.isDashboardPage = currentUrl.includes("dashboard");
console.log("Initial page check:", this.isDashboardPage);


    // Load stored token & role
    const storedToken = localStorage.getItem("jwtToken");
    const storedRole = localStorage.getItem("role");

    if (storedToken && storedRole) {
      this.jwtToken = storedToken;
      this.role = storedRole;
      if(storedRole=="ADMIN"){
        this.tabs.splice(0,1)
      }
      // Load stored view
      
        this.setDefaultViewByRole(this.role);
      

      // ✅ Set commonService.currentView here
      this.commonService.currentView = this.selectedView;

      await this.loadRoleSpecificData(this.role);
      this.commonService.userDataLoaded$.next();
      this.commonService.setLoading(false);
      return;
    }

    // If sessionid login
    this.route.queryParams.subscribe(async (params) => {
      const sessionId = params["sessionid"];
      if (!sessionId) {
        this.commonService.setLoading(false);
        return;
      }

      try {
        const response: any = await firstValueFrom(
          this.http.auth(this.constants.auth, { sessionid: sessionId })
        );

        const employee = response?.data?.employee || {};
        this.jwtToken = response?.data?.token || null;

        localStorage.setItem("jwtToken", this.jwtToken || "");
        localStorage.setItem("role", employee.role || "");
        localStorage.setItem("name", employee.name || "");
        localStorage.setItem("employeeNumber", employee.employeeNumber || "");
        localStorage.setItem("email", employee.email || "");

        this.role = employee.role || "";

        // Set selectedView based on role if not stored
        const savedView = localStorage.getItem("selectedView");
        if (savedView) {
          this.selectedView = savedView as "self" | "resource";
        } else {
          this.setDefaultViewByRole(this.role);
        }

        // ✅ Set commonService.currentView here
        this.commonService.currentView = this.selectedView;

        await this.loadRoleSpecificData(this.role);
        this.commonService.userDataLoaded$.next();
      } catch (err) {
        console.error("Auth API Error:", err);
      } finally {
        this.commonService.setLoading(false);
      }
    });
  }

  setDefaultViewByRole(role: string) {
    if (role === "EMPLOYEE" || role === "HR" || role === "MANAGER") {
      this.selectedView = "self";
    } else if (role === "ADMIN") {
      this.selectedView = "resource";
    }
    localStorage.setItem("selectedView", this.selectedView);
  }

  async loadRoleSpecificData(role: string) {
    // Load employee data
    this.http.getData(this.constants.employeeData).subscribe((res: any) => {
      if (res?.success && res.data?.employee) {
        this.commonService.setEmployeeData(res.data.employee);
        this.commonService.userDataLoaded$.next();
      }
    });

    if (role === "EMPLOYEE") {
      return;
    } else if (role === "MANAGER") {
      await this.loadManagerData();
    } else if (role === "HR" || role === "ADMIN") {
      await this.loadAllEmployeeData();
      this.tabs.push({
        label: "HR Admin Dashboard",
        path: "hr-admin-dashboard",
        isActive: false,
      });
    } else if (role === "ADMIN") {
      // Admin logic if needed
    }
  }

  async loadAllEmployeeData() {
    try {
      const res: any = await firstValueFrom(
        this.http.getData(this.constants.allEmployeeData)
      );
      localStorage.setItem(
        "allEmployeeData",
        JSON.stringify(res.data.employees || [])
      );
    } catch (err) {
      console.error("All Employee Data API Error:", err);
    }
  }

  async loadManagerData() {
    try {
      const res: any = await firstValueFrom(
        this.http.getData(this.constants.mangerEmployeeData)
      );
      localStorage.setItem(
        "managerEmployeeData",
        JSON.stringify(res.data.employees || [])
      );
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
        currentUrl === "" ||
        currentUrl.startsWith("create-wfo-exception-request")
      );
    }
    return (
      currentUrl === cleanedPath || currentUrl.startsWith(cleanedPath + "/")
    );
  }

  updateActiveTabs(url: string) {
    const currentUrl = url.split("?")[0].replace(/^\/+/, "");
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
    
    // ✅ Update localStorage
    localStorage.setItem("selectedView", this.selectedView);
    
    // ✅ Update commonService.currentView BEFORE triggering the change
    this.commonService.currentView = this.selectedView;
    
    console.log("View changed to:", this.selectedView);
    console.log("commonService.currentView:", this.commonService.currentView);
    
    // ✅ Now trigger the viewChange event
    this.commonService.viewChange(event);
  }
}